import { useEffect, useState, useRef, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Command,
  FileText,
  Hammer,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  MapPin,
  Mic,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  money,
  totals,
  parseCommand,
  type Workspace,
  type Proposal,
  type Job,
  type Estimate,
  type Invoice,
} from './domain';
import { Modal, EstimateForm, CustomerForm, DocumentDetail } from './components';
import { can, currentAccess, handleAccessResponse, withWorkspaceAccess } from './access/access';
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'documents', label: 'Estimates & invoices', icon: FileText },
] as const;
type Page = (typeof navigation)[number]['id'];
type SpeechResult = { results: { 0: { 0: { transcript: string } } } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: SpeechResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function getToken() {
  let token = localStorage.getItem('fieldpilot-token');
  const created = Number(localStorage.getItem('fieldpilot-token-created'));
  if (
    !token ||
    !/^[a-f0-9]{64}$/.test(token) ||
    !created ||
    Date.now() - created > 6 * 24 * 60 * 60 * 1000
  ) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, '0'),
    ).join('');
    localStorage.setItem('fieldpilot-token', token);
    localStorage.setItem('fieldpilot-token-created', String(Date.now()));
  }
  return token;
}
async function api(command?: Record<string, unknown>) {
  const response = handleAccessResponse(
    await fetch(
      '/api/workspace',
      withWorkspaceAccess({
        method: command ? 'POST' : 'GET',
        headers: {
          ...(currentAccess().mode === 'demo' ? { Authorization: `Bearer ${getToken()}` } : {}),
          ...(command ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(command ? { body: JSON.stringify({ command }) } : {}),
      }),
    ),
  );
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Workspace API is unavailable. Please retry when the server is connected.');
  }
  if (!response.ok)
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || 'The workspace could not be saved. Please try again.',
    );
  return body as { state: Workspace; revision: number };
}
const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const statusLabel = (status: string) =>
  ({
    in_progress: 'In progress',
    scheduled: 'Scheduled',
    completed: 'Completed',
    draft: 'Awaiting approval',
    approved: 'Approved',
    unpaid: 'Unpaid',
    paid: 'Paid',
  })[status] || status;
function Pill({ status }: { status: string }) {
  return (
    <span className={`pill ${status}`}>
      <span />
      {statusLabel(status)}
    </span>
  );
}
const defaultProposal = (customerId = ''): Proposal => ({
  customerId,
  title: '',
  date: new Date().toISOString().slice(0, 10),
  taxRate: 10,
  items: [{ description: '', quantity: 1, unitCents: 0 }],
});
export default function App() {
  const access = currentAccess();
  const [state, setState] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState<Page>('overview'),
    [query, setQuery] = useState(''),
    [toast, setToast] = useState(''),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [newCustomer, setNewCustomer] = useState(false),
    [info, setInfo] = useState(false),
    [document, setDocument] = useState<{ id: string; kind: 'estimate' | 'invoice' } | null>(null),
    [docTab, setDocTab] = useState<'estimates' | 'invoices'>('estimates');
  const [command, setCommand] = useState(''),
    [commandError, setCommandError] = useState(''),
    [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const Speech =
    (
      window as unknown as {
        SpeechRecognition?: new () => Recognition;
        webkitSpeechRecognition?: new () => Recognition;
      }
    ).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition })
      .webkitSpeechRecognition;
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setState((await api()).state);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    return () => recognition.current?.stop();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const act = async (cmd: Record<string, unknown>, message = 'Workspace updated') => {
    if (!can(String(cmd.type))) throw new Error('Your workspace role does not permit this change.');
    setBusy(true);
    setError('');
    try {
      const data = await api(cmd);
      setState(data.state);
      setToast(message);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setBusy(false);
    }
  };
  const safeAct = (cmd: Record<string, unknown>, message?: string) => {
    void act(cmd, message).catch(() => {});
  };
  const preview = (e?: FormEvent, transcript?: string) => {
    e?.preventDefault();
    if (!state) return;
    setCommandError('');
    try {
      setProposal(parseCommand(transcript || command, state));
    } catch (err) {
      setCommandError((err as Error).message);
    }
  };
  const listen = () => {
    if (!Speech) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    setCommandError('');
    const rec = new Speech();
    recognition.current = rec;
    rec.lang = 'en-AU';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const words = e.results[0][0].transcript;
      setCommand(words);
      preview(undefined, words);
    };
    rec.onerror = (e) => {
      setListening(false);
      setCommandError(
        `Speech recognition: ${e.error.replaceAll('-', ' ')}. You can type your command instead.`,
      );
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setCommandError('Microphone could not start. Try typing your command.');
    }
  };
  const nav = (next: Page) => {
    setPage(next);
    setQuery('');
  };
  const customerName = (id: string) =>
    state?.customers.find((c) => c.id === id)?.name || 'Unknown customer';
  const projectTotal = (estimateId: string) => {
    const e = state?.estimates.find((e) => e.id === estimateId);
    return e ? totals(e.items, e.taxRate).total : 0;
  };
  const active = state?.jobs.filter((j) => j.status !== 'completed') || [];
  const draftCount = state?.estimates.filter((e) => e.status === 'draft').length || 0;
  const outstanding =
    state?.invoices
      .filter((i) => i.status === 'unpaid')
      .reduce((n, i) => n + totals(i.items, i.taxRate).total, 0) || 0;
  const paid =
    state?.invoices
      .filter((i) => i.status === 'paid')
      .reduce((n, i) => n + totals(i.items, i.taxRate).total, 0) || 0;
  const selectedDocument = document
    ? (document.kind === 'estimate' ? state?.estimates : state?.invoices)?.find(
        (d) => d.id === document.id,
      )
    : undefined;
  function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
    const invoiced = state!.invoices.some((i) => i.jobId === job.id);
    return (
      <article className={`job-card ${compact ? 'compact' : ''}`}>
        <div className="job-card-top">
          <span className={`trade-icon trade-${job.title.length % 3}`}>
            <Hammer size={18} />
          </span>
          <span className="job-code">{job.id}</span>
          {compact && <Pill status={job.status} />}
        </div>
        <h3>{job.title}</h3>
        <p className="job-customer">{customerName(job.customerId)}</p>
        <div className="job-location">
          <MapPin size={13} />
          {state!.customers
            .find((c) => c.id === job.customerId)
            ?.address.split(',')[1]
            ?.trim()}
        </div>
        <div className="job-details">
          <span>
            <CalendarDays size={13} />
            {dateLabel(job.date)}
          </span>
          <strong>{money(projectTotal(job.estimateId))}</strong>
        </div>
        <div className="job-card-bottom">
          <span className="crew">
            <span className="tiny-avatar">
              {job.crew === 'Team to be assigned' ? '?' : initials(job.crew)}
            </span>
            {job.crew}
          </span>
          {!compact &&
            (job.status === 'completed' ? (
              invoiced ? (
                <span className="muted mini-check">
                  <Check size={13} />
                  Invoiced
                </span>
              ) : (
                <button
                  disabled={busy || !can('create_invoice')}
                  title={!can('create_invoice') ? 'Requires manager or owner access' : undefined}
                  className="text-button"
                  onClick={() =>
                    safeAct(
                      { type: 'create_invoice', jobId: job.id },
                      'Invoice created. Find it in Estimates & invoices.',
                    )
                  }
                >
                  Invoice
                  <Plus size={14} />
                </button>
              )
            ) : (
              <button
                disabled={busy || !can('move_job')}
                title={!can('move_job') ? 'Your role can only view jobs' : undefined}
                className="text-button"
                onClick={() =>
                  safeAct(
                    {
                      type: 'move_job',
                      id: job.id,
                      status: job.status === 'scheduled' ? 'in_progress' : 'completed',
                    },
                    job.status === 'scheduled' ? 'Job started' : 'Job completed',
                  )
                }
              >
                {job.status === 'scheduled' ? 'Start job' : 'Complete'}
                <ArrowRight size={14} />
              </button>
            ))}
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav('overview');
          }}
          aria-label="FieldPilot overview"
        >
          <span className="brand-mark">
            <Leaf size={24} />
          </span>
          fieldpilot<span className="brand-dot">.</span>
        </a>
        <div className="workspace-switch">
          <span className="company-icon">
            <Hammer size={19} />
          </span>
          <div>
            <strong>Renovation operations</strong>
            <small>FieldPilot workspace</small>
          </div>
          <span className="workspace-indicator" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'selected' : ''}`}
              onClick={() => nav(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'jobs' && <span className="nav-count">{active.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setInfo(true)}>
            <CircleHelp size={18} />
            Workflow guide
            <ArrowUpRight size={14} />
          </button>
          <a
            className="project-credit"
            href="https://singhtanveer.com"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio by Tanveer Singh
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            WORKSPACE <span>/</span>{' '}
            <strong>{navigation.find((n) => n.id === page)?.label.toUpperCase()}</strong>
          </div>
          <div className="topbar-right">
            <button className="button secondary" onClick={() => setInfo(true)}>
              <CircleHelp size={18} />
              Workflow guide
            </button>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <ShieldCheck size={14} />
            <span>Sample records are synthetic. No emails or payments are sent.</span>

            <a href="https://singhtanveer.com" target="_blank" rel="noreferrer">
              Built by Tanveer
              <ArrowUpRight size={12} />
            </a>
          </div>
          {access.mode === 'account' && (access.role === 'viewer' || access.role === 'staff') && (
            <div className="role-notice">
              <ShieldCheck size={18} />
              <span>
                {access.role === 'viewer'
                  ? 'Viewer access: you can view records. Ask an owner to change your role if you need to make updates.'
                  : 'Staff access: you can start and complete jobs. Customer, estimate and invoice changes require a manager or owner.'}
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => void load()} disabled={loading}>
                Retry connection
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading && !state ? (
            <div className="loading-state">
              <LoaderCircle className="spin" size={28} />
              <h2>Getting your workspace ready</h2>
              <p>Connecting to your workspace…</p>
            </div>
          ) : !state ? (
            <div className="empty-state">
              <Wallet size={32} />
              <h2>Your workspace needs a connection</h2>
              <p>The server could not load your records. Retry to continue.</p>
              <button className="button primary" onClick={() => void load()}>
                Retry connection
              </button>
            </div>
          ) : (
            <>
              {page === 'overview' && (
                <>
                  <section className="page-title">
                    <div>
                      <h1>Overview</h1>
                      <p>Track active work, estimates and invoice balances.</p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!can('create_estimate')}
                      title={
                        !can('create_estimate') ? 'Requires manager or owner access' : undefined
                      }
                      onClick={() => setProposal(defaultProposal(state.customers[0]?.id))}
                    >
                      <Plus size={17} />
                      Create estimate
                    </button>
                  </section>
                  <section className="metrics" aria-label="Workspace metrics">
                    {[
                      {
                        label: 'Active jobs',
                        value: String(active.length).padStart(2, '0'),
                        note: `${state.jobs.filter((j) => j.status === 'in_progress').length} in progress right now`,
                        icon: BriefcaseBusiness,
                        tone: 'green',
                        goto: 'jobs',
                      },
                      {
                        label: 'Awaiting approval',
                        value: String(draftCount).padStart(2, '0'),
                        note: 'Estimates ready for your review',
                        icon: ClipboardList,
                        tone: 'orange',
                        goto: 'estimates',
                      },
                      {
                        label: 'Outstanding invoices',
                        value: money(outstanding),
                        note: `${state.invoices.filter((i) => i.status === 'unpaid').length} unpaid invoices`,
                        icon: Wallet,
                        tone: 'blue',
                        goto: 'invoices',
                      },
                      {
                        label: 'Revenue collected',
                        value: money(paid),
                        note: 'All paid demo invoices',
                        icon: ArrowDownLeft,
                        tone: 'sage',
                        goto: 'paid',
                      },
                    ].map((m) => (
                      <button
                        className="metric-card"
                        key={m.label}
                        onClick={() => {
                          if (m.goto === 'jobs') nav('jobs');
                          else {
                            setDocTab(m.goto === 'estimates' ? 'estimates' : 'invoices');
                            nav('documents');
                          }
                        }}
                      >
                        <div className="metric-top">
                          <span>{m.label}</span>
                          <span className={`metric-icon ${m.tone}`}>
                            <m.icon size={18} />
                          </span>
                        </div>
                        <strong>{m.value}</strong>
                        <div className="metric-note">
                          <span className={`small-dot ${m.tone}`} />
                          {m.note}
                          <ChevronRight size={13} />
                        </div>
                      </button>
                    ))}
                  </section>
                  {can('create_estimate') && (
                    <section className="command-panel">
                      <div className="command-title">
                        <span className="command-icon">
                          <Command size={19} />
                        </span>
                        <div>
                          <h3>Create an estimate from a command</h3>
                          <p>Proposed details are editable. Confirm to save.</p>
                        </div>
                        <span className="beta-pill">RULE-BASED</span>
                      </div>
                      <form className="command-form" onSubmit={preview}>
                        <input
                          aria-label="Estimate command"
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          placeholder="Create a painting estimate for Alex Morgan"
                        />
                        <button
                          type="button"
                          className={`mic-button ${listening ? 'listening' : ''}`}
                          onClick={listen}
                          disabled={!Speech}
                          aria-label={
                            listening
                              ? 'Stop listening'
                              : Speech
                                ? 'Use browser speech recognition'
                                : 'Browser speech recognition unavailable'
                          }
                          title={
                            Speech
                              ? 'Browser speech recognition'
                              : 'Speech recognition is not supported in this browser'
                          }
                        >
                          <Mic size={18} />
                        </button>
                        <button className="button dark" type="submit">
                          Preview estimate
                          <ArrowRight size={15} />
                        </button>
                      </form>
                      <p className="command-caption">
                        {listening
                          ? 'Listening… speak your estimate command.'
                          : Speech
                            ? 'Optional browser speech recognition · Microphone permission required · Always previewed before saving.'
                            : 'Browser speech is unavailable here. Typed commands work in every browser.'}
                      </p>
                      {commandError && (
                        <p className="form-error" role="alert">
                          {commandError}
                        </p>
                      )}
                    </section>
                  )}
                  <section className="dashboard-lower">
                    <div className="panel upcoming-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            Active jobs <span>{active.length}</span>
                          </h2>
                          <p>Scheduled and in-progress work.</p>
                        </div>
                        <button className="text-button" onClick={() => nav('jobs')}>
                          View all jobs
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="upcoming-list">
                        {active.slice(0, 3).map((j) => (
                          <button className="upcoming-row" key={j.id} onClick={() => nav('jobs')}>
                            <span className="date-tile">
                              <strong>{new Date(j.date + 'T12:00:00').getDate()}</strong>
                              <small>
                                {new Date(j.date + 'T12:00:00')
                                  .toLocaleDateString('en-AU', { month: 'short' })
                                  .toUpperCase()}
                              </small>
                            </span>
                            <div>
                              <h3>{j.title}</h3>
                              <p>
                                {customerName(j.customerId)} <span>·</span> {j.crew}
                              </p>
                            </div>
                            <Pill status={j.status} />
                            <ChevronRight size={16} />
                          </button>
                        ))}
                        {!active.length && (
                          <div className="inline-empty">
                            All jobs are complete. Approve an estimate to schedule more work.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="panel activity-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Recent activity</h2>
                          <p>Recent workspace changes.</p>
                        </div>
                        <Clock3 size={17} />
                      </div>
                      <div className="activity-list">
                        {state.activity.slice(0, 3).map((a, i) => (
                          <div className="activity-item" key={a.id}>
                            <span className={`activity-icon a${i}`}>
                              <Check size={13} />
                            </span>
                            <div>
                              <p>{a.text}</p>
                              <small>
                                {new Date(a.time).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                })}{' '}
                                ·{' '}
                                {new Date(a.time).toLocaleTimeString('en-AU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}
              {page === 'jobs' && (
                <>
                  <section className="page-title">
                    <div>
                      <h1>Jobs</h1>
                      <p>Start scheduled work, complete jobs and create invoices.</p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!can('create_estimate')}
                      title={
                        !can('create_estimate') ? 'Requires manager or owner access' : undefined
                      }
                      onClick={() => setProposal(defaultProposal(state.customers[0]?.id))}
                    >
                      <Plus size={17} />
                      Create estimate
                    </button>
                  </section>
                  <div className="board-toolbar">
                    <span>
                      <BriefcaseBusiness size={16} />
                      {state.jobs.length} total jobs
                    </span>
                    <div className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search jobs"
                        placeholder="Search jobs or customers"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="kanban">
                    {(['scheduled', 'in_progress', 'completed'] as const).map((status) => {
                      const jobs = state.jobs.filter(
                        (j) =>
                          j.status === status &&
                          `${j.title} ${customerName(j.customerId)}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      );
                      return (
                        <section className={`kanban-column ${status}`} key={status}>
                          <div className="column-heading">
                            <span className="column-dot" />
                            <h2>{statusLabel(status)}</h2>
                            <span className="column-count">{jobs.length}</span>
                          </div>
                          {jobs.map((j) => (
                            <JobCard key={j.id} job={j} />
                          ))}
                          {!jobs.length && (
                            <div className="column-empty">
                              {query
                                ? 'No matching jobs.'
                                : status === 'scheduled'
                                  ? 'Approved estimates appear here.'
                                  : status === 'in_progress'
                                    ? 'Start a scheduled job to move it here.'
                                    : 'Completed jobs appear here.'}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                  <p className="board-note">
                    <ShieldCheck size={14} />
                    Jobs move in order: scheduled → in progress → completed. Completed work can be
                    invoiced once.
                  </p>
                </>
              )}
              {page === 'customers' && (
                <>
                  <section className="page-title">
                    <div>
                      <h1>Customers</h1>
                      <p>
                        {state.customers.length} customer records. Search or add a customer to
                        prepare an estimate.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!can('create_customer')}
                      title={
                        !can('create_customer') ? 'Requires manager or owner access' : undefined
                      }
                      onClick={() => setNewCustomer(true)}
                    >
                      <Plus size={17} />
                      Add customer
                    </button>
                  </section>
                  <div className="panel">
                    <div className="table-toolbar">
                      <h2>Customer directory</h2>
                      <div className="search-field">
                        <Search size={16} />
                        <input
                          aria-label="Search customers"
                          placeholder="Search name, email or suburb"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="customer-grid">
                      {state.customers
                        .filter((c) =>
                          `${c.name} ${c.email} ${c.address}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((c, i) => (
                          <article className="customer-card" key={c.id}>
                            <div className="customer-head">
                              <span className={`customer-avatar color-${i % 4}`}>
                                {initials(c.name)}
                              </span>
                              <span className="customer-job-count">
                                {state.jobs.filter((j) => j.customerId === c.id).length} jobs
                              </span>
                            </div>
                            <h3>{c.name}</h3>
                            <p>{c.email}</p>
                            <p>{c.phone}</p>
                            <div className="customer-address">
                              <MapPin size={14} />
                              {c.address}
                            </div>
                            <button
                              className="text-button"
                              disabled={!can('create_estimate')}
                              title={
                                !can('create_estimate')
                                  ? 'Requires manager or owner access'
                                  : undefined
                              }
                              onClick={() => setProposal(defaultProposal(c.id))}
                            >
                              Create estimate
                              <ArrowUpRight size={15} />
                            </button>
                          </article>
                        ))}
                    </div>
                    {state.customers.filter((c) =>
                      `${c.name} ${c.email} ${c.address}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ).length === 0 && (
                      <div className="inline-empty">
                        No customers match “{query}”. Try another name or add a customer.
                      </div>
                    )}
                  </div>
                </>
              )}
              {page === 'documents' && (
                <>
                  <section className="page-title">
                    <div>
                      <h1>Estimates & invoices</h1>
                      <p>Review estimates, schedule approved work and track invoices.</p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!can('create_estimate')}
                      title={
                        !can('create_estimate') ? 'Requires manager or owner access' : undefined
                      }
                      onClick={() => setProposal(defaultProposal(state.customers[0]?.id))}
                    >
                      <Plus size={17} />
                      Create estimate
                    </button>
                  </section>
                  <div className="panel documents-panel">
                    <div className="table-toolbar">
                      <div className="tabs" role="tablist" aria-label="Document type">
                        <button
                          role="tab"
                          aria-selected={docTab === 'estimates'}
                          className={docTab === 'estimates' ? 'active' : ''}
                          onClick={() => {
                            setDocTab('estimates');
                            setQuery('');
                          }}
                        >
                          Estimates<span>{state.estimates.length}</span>
                        </button>
                        <button
                          role="tab"
                          aria-selected={docTab === 'invoices'}
                          className={docTab === 'invoices' ? 'active' : ''}
                          onClick={() => {
                            setDocTab('invoices');
                            setQuery('');
                          }}
                        >
                          Invoices<span>{state.invoices.length}</span>
                        </button>
                      </div>
                      <div className="search-field">
                        <Search size={16} />
                        <input
                          aria-label="Search documents"
                          placeholder="Search project or customer"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Project / document</th>
                            <th>Customer</th>
                            <th>{docTab === 'estimates' ? 'Proposed start' : 'Issued'}</th>
                            <th>Status</th>
                            <th className="number-cell">Total AUD</th>
                            <th>
                              <span className="sr-only">Action</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(docTab === 'estimates' ? state.estimates : state.invoices)
                            .filter((d) =>
                              `${d.title} ${d.id} ${customerName(d.customerId)}`
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                            )
                            .map((d) => (
                              <tr key={d.id}>
                                <td>
                                  <div className="document-cell">
                                    <span className="file-icon">
                                      <FileText size={18} />
                                    </span>
                                    <div>
                                      <strong>{d.title}</strong>
                                      <small>{d.id}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>{customerName(d.customerId)}</td>
                                <td>{dateLabel(d.date)}</td>
                                <td>
                                  <Pill status={d.status} />
                                </td>
                                <td className="number-cell">
                                  <strong>{money(totals(d.items, d.taxRate).total)}</strong>
                                </td>
                                <td>
                                  <button
                                    aria-label={`Review ${d.title}`}
                                    className="icon-button"
                                    onClick={() =>
                                      setDocument({
                                        id: d.id,
                                        kind: docTab === 'estimates' ? 'estimate' : 'invoice',
                                      })
                                    }
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {(docTab === 'estimates' ? state.estimates : state.invoices).filter((d) =>
                      `${d.title} ${d.id} ${customerName(d.customerId)}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ).length === 0 && (
                      <div className="inline-empty">
                        {query
                          ? 'No documents match your search.'
                          : 'Complete a job and create its invoice from the Jobs board.'}
                      </div>
                    )}
                    <div className="table-foot">
                      <ShieldCheck size={14} />
                      {docTab === 'estimates'
                        ? 'Approving an estimate creates a scheduled job automatically.'
                        : 'Demo payment tracking only. Marking paid records a status; it does not process payment.'}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={13} />
              Renovation operations
            </span>
            <span>
              FieldPilot · Portfolio MVP{' '}
              <a href="https://github.com/tanveerchana" target="_blank" rel="noreferrer">
                by Tanveer Singh
                <ArrowUpRight size={11} />
              </a>
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast('')}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {proposal && state && can('create_estimate') && (
        <EstimateForm
          proposal={proposal}
          customers={state.customers}
          busy={busy}
          onClose={() => setProposal(null)}
          onSave={async (p) => {
            await act(
              { type: 'create_estimate', ...p },
              'Estimate created. Review and approve it in Estimates & invoices.',
            );
            setProposal(null);
            setPage('documents');
            setDocTab('estimates');
          }}
        />
      )}
      {newCustomer && can('create_customer') && (
        <CustomerForm
          busy={busy}
          onClose={() => setNewCustomer(false)}
          onSave={async (c) => {
            await act({ type: 'create_customer', ...c }, 'Customer added to your directory');
            setNewCustomer(false);
          }}
        />
      )}
      {selectedDocument && document && state && (
        <DocumentDetail
          doc={selectedDocument as Estimate | Invoice}
          kind={document.kind}
          state={state}
          busy={busy}
          onClose={() => setDocument(null)}
          onAction={act}
        />
      )}
      {info && (
        <Modal
          title="FieldPilot workflow guide"
          subtitle="FieldPilot · A full-stack portfolio project by Tanveer Singh"
          onClose={() => setInfo(false)}
        >
          <div className="info-content">
            <p>
              Explore a working renovation operations flow with synthetic Australian sample records.
              Account workspaces are shared with invited members. Try Demo uses a separate browser
              workspace.
            </p>
            <ol>
              <li>Add a customer, then create an estimate with editable scope and prices.</li>
              <li>Review and approve the estimate to create a scheduled job.</li>
              <li>Start the job, complete the work and generate an invoice from the job board.</li>
              <li>Open the invoice and mark it paid. Overview metrics update from your records.</li>
            </ol>
            <h3>Commands that keep you in control</h3>
            <p>
              Try “Create a painting estimate for Alex Morgan”. A deterministic parser proposes
              illustrative prices. Edit and confirm before anything is saved. Optional speech uses
              your browser’s recognition service and requires microphone permission.
            </p>
            <p className="info-small">
              Sample data is synthetic. No emails, payment processing or AI model is connected.
              Account roles control access: owners manage the team, managers manage records, staff
              update job status, and viewers read records. Demo workspaces use a browser token and
              expire after seven days.
            </p>
            <a
              className="button dark"
              href="https://singhtanveer.com"
              target="_blank"
              rel="noreferrer"
            >
              Visit Tanveer’s portfolio
              <ArrowUpRight size={16} />
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
