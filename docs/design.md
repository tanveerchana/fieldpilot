# FieldPilot design

FieldPilot is an operations workspace for a small renovation team. The main flow is customer → estimate → approval → scheduled job → completed job → invoice → paid. New account workspaces and the separate Try Demo workspace begin with clearly identified synthetic Australian records and illustrative AUD prices.

## Layout and readability

The updated interface uses a neutral `#f6f8fa` canvas, white surfaces, slate `#18212f` text and restrained `#2563eb` primary actions. A small forest accent remains in the wordmark. There is no ornamental hero or marketing panel. Overview starts with equal-height metrics, followed by command entry, active jobs and recent activity. Customer cards, document tables and the job board use aligned operational controls.

Body text uses a 16px base. Main content and table text are 14–16px, metadata is at least 12px, desktop headings are 32px, and controls are at least 44px high. Layout uses 8/16/24px spacing and a 1440px content limit. At narrow widths, navigation becomes a horizontal list, metrics use two columns, and forms and job lanes stack.

## Accounts and access

The shared AccessRoot provides sign in, signup, Try Demo, workspace switching and team management. Account sessions use same-origin secure cookies and server-side Supabase authentication. Browser JavaScript does not store account session tokens. Every account request selects an explicit workspace, and the backend authorizes reads and each command independently of UI affordances.

Roles are owner, manager (stored as editor), staff and viewer. Owners manage members and all business records. Managers manage business records. Staff can move job status only. Viewers read records. Restricted roles receive readable explanations; disallowed creation controls are disabled and document mutation controls are omitted. The UI is not the authorization boundary.

Try Demo is a separate browser-capability workspace. Only that mode generates a 64-character random bearer token. Account workspace state and demo state are never silently substituted. Failures remain visible. Local Vite development dispatches the real shared handlers and requires the same server environment; no in-memory authorization bypass exists.

## Business behavior

Prices use integer cents, sequential status transitions are validated, approval creates one job and completed work produces one invoice. Commands and optional browser speech create editable previews; explicit confirmation is the only save action. Speech availability and permission depend on the browser. The parser uses deterministic rules, not an AI model.

No business email, real payment, automatic crew scheduling, account recovery UI or accounting integration is implemented. This remains a portfolio MVP; synthetic sample data does not become real customer information through account signup.
