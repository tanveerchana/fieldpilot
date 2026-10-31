import { can } from './access/access';
import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Plus, Trash2, X, ArrowUpRight, Check } from 'lucide-react';
import {
  totals,
  money,
  type Proposal,
  type Customer,
  type Estimate,
  type Invoice,
  type Workspace,
} from './domain';
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose}>
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EstimateForm({
  proposal,
  customers,
  onSave,
  onClose,
  busy,
}: {
  proposal: Proposal;
  customers: Customer[];
  onSave: (p: Proposal) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<Proposal>(structuredClone(proposal));
  const [error, setError] = useState('');
  let calculated;
  try {
    calculated = totals(draft.items, draft.taxRate);
  } catch {
    calculated = { subtotal: 0, tax: 0, total: 0 };
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onSave(draft);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal
      title="Review your estimate"
      subtitle="Review scope, quantities and prices before saving. Currency: AUD."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="preview-notice">
          <Check size={16} />
          <span>Editable draft · Review proposed scope and pricing before saving.</span>
        </div>
        <div className="form-grid">
          <label>
            Customer
            <select
              required
              value={draft.customerId}
              onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
            >
              <option value="">Choose customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proposed start date
            <input
              required
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
          <label className="full">
            Project title
            <input
              required
              maxLength={100}
              value={draft.title}
              placeholder="e.g. Living room repaint"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
        </div>
        <div className="line-heading">
          <h3>Scope & line items</h3>
          <span>AUD</span>
        </div>
        <div className="line-labels">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span />
        </div>
        {draft.items.map((item, index) => (
          <div className="item-row" key={index}>
            <input
              required
              aria-label={`Line ${index + 1} description`}
              placeholder="Work or materials"
              maxLength={160}
              value={item.description}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  items: draft.items.map((i, n) =>
                    n === index ? { ...i, description: e.target.value } : i,
                  ),
                })
              }
            />
            <input
              required
              aria-label={`Line ${index + 1} quantity`}
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              value={item.quantity}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  items: draft.items.map((i, n) =>
                    n === index ? { ...i, quantity: Number(e.target.value) } : i,
                  ),
                })
              }
            />
            <input
              required
              aria-label={`Line ${index + 1} unit price in dollars`}
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={item.unitCents / 100}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  items: draft.items.map((i, n) =>
                    n === index ? { ...i, unitCents: Math.round(Number(e.target.value) * 100) } : i,
                  ),
                })
              }
            />
            <button
              type="button"
              className="icon-button"
              disabled={draft.items.length === 1}
              aria-label={`Remove line ${index + 1}`}
              onClick={() =>
                setDraft({ ...draft, items: draft.items.filter((_, n) => n !== index) })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-button"
          disabled={draft.items.length >= 20}
          onClick={() =>
            setDraft({
              ...draft,
              items: [...draft.items, { description: '', quantity: 1, unitCents: 0 }],
            })
          }
        >
          <Plus size={15} /> Add line item
        </button>
        <div className="estimate-summary">
          <label>
            GST / tax rate (%)
            <input
              type="number"
              required
              min="0"
              max="25"
              step="0.01"
              value={draft.taxRate}
              onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) })}
            />
          </label>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(calculated.subtotal)}</dd>
            </div>
            <div>
              <dt>Tax ({draft.taxRate}%)</dt>
              <dd>{money(calculated.tax)}</dd>
            </div>
            <div className="grand-total">
              <dt>Estimate total</dt>
              <dd>{money(calculated.total)}</dd>
            </div>
          </dl>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Confirm & create estimate'}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function CustomerForm({
  onClose,
  onSave,
  busy,
}: {
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  busy: boolean;
}) {
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await onSave(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal
      title="Add customer"
      subtitle="Add contact and site details for estimates and jobs."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            Full name
            <input
              name="name"
              required
              maxLength={80}
              autoComplete="off"
              placeholder="e.g. Jamie Lee"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={120}
              placeholder="jamie@example.com"
            />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" required maxLength={40} placeholder="0400 000 000" />
          </label>
          <label className="full">
            Site address
            <input
              name="address"
              required
              maxLength={180}
              placeholder="A fictional Australian address"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Create customer'}
            <Plus size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function DocumentDetail({
  doc,
  kind,
  state,
  busy,
  onClose,
  onAction,
}: {
  doc: Estimate | Invoice;
  kind: 'estimate' | 'invoice';
  state: Workspace;
  busy: boolean;
  onClose: () => void;
  onAction: (command: Record<string, unknown>) => Promise<void>;
}) {
  const customer = state.customers.find((c) => c.id === doc.customerId)!;
  const t = totals(doc.items, doc.taxRate);
  const [error, setError] = useState('');
  const act = async () => {
    try {
      await onAction(
        kind === 'estimate'
          ? { type: 'approve_estimate', id: doc.id }
          : { type: 'pay_invoice', id: doc.id },
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal
      title={kind === 'estimate' ? 'Estimate details' : 'Invoice details'}
      subtitle={`${doc.id} · ${doc.status}`}
      onClose={onClose}
      wide
    >
      <div className="document-paper">
        <div className="document-brand">
          <span className="brand-dark">
            fieldpilot<span>↗</span>
          </span>
          <span>{kind.toUpperCase()}</span>
        </div>
        <h2>{doc.title}</h2>
        <div className="document-meta">
          <div>
            <small>PREPARED FOR</small>
            <strong>{customer.name}</strong>
            <span>{customer.address}</span>
            <span>{customer.email}</span>
          </div>
          <div>
            <small>{kind === 'estimate' ? 'PROPOSED START' : 'ISSUED'}</small>
            <strong>{doc.date}</strong>
            <span>Currency: AUD</span>
          </div>
        </div>
        <div className="document-lines">
          {doc.items.map((item, i) => (
            <div key={i}>
              <span>
                {item.description}
                <small>
                  {item.quantity} × {money(item.unitCents)}
                </small>
              </span>
              <strong>{money(Math.round(item.quantity * item.unitCents))}</strong>
            </div>
          ))}
        </div>
        <dl className="detail-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(t.subtotal)}</dd>
          </div>
          <div>
            <dt>Tax ({doc.taxRate}%)</dt>
            <dd>{money(t.tax)}</dd>
          </div>
          <div className="grand-total">
            <dt>Total AUD</dt>
            <dd>{money(t.total)}</dd>
          </div>
        </dl>
        <p className="paper-note">
          Synthetic demo document. No email, payment request or real transaction is sent.
        </p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Close
        </button>
        {(doc.status === 'draft' || doc.status === 'unpaid') &&
          can(kind === 'estimate' ? 'approve_estimate' : 'pay_invoice') && (
            <button className="button primary" onClick={act} disabled={busy}>
              {busy ? 'Saving…' : kind === 'estimate' ? 'Approve & schedule job' : 'Mark as paid'}
              <Check size={16} />
            </button>
          )}
      </div>
    </Modal>
  );
}
