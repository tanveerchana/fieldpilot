# Architecture and operational boundaries

## Account identity and authorization

The shared AccessRoot gates sign in/signup, account workspace selection and the separate Try Demo entry. Account sessions use HttpOnly cookies. The client adds `X-Workspace-Mode: account`, `X-Workspace-Id` and `credentials: same-origin`; it never generates a demo bearer token in account mode. A 401 account response returns to the sign-in gate. Switching access scope remounts the app so records from different workspaces are not retained together.

Shared auth/team/workspace handlers enforce membership and command permissions server side. Owner manages the team and business commands, editor (labelled Manager in FieldPilot) manages business commands, staff can only `move_job`, and viewer can only read. Document actions are hidden for unauthorized roles; other creation controls are disabled with a role explanation. Those controls complement the backend checks.

Auth endpoints support sign in, signup, session lookup and logout. Team endpoints support workspace creation/listing, invitations, role changes and removal. Invitations do not trigger application email delivery. Signup email confirmation follows the Supabase project configuration.

## Demo workspace identity

The client generates 32 cryptographically random bytes, encoded as exactly 64 lowercase hexadecimal characters. It sends the token only in `Authorization: Bearer …`, never in a URL. The shared adapter forwards a scoped capability header to Postgres under a publishable key. Row-level security must permit access only to that capability's workspace and app.

The browser stores the capability and a creation timestamp in localStorage. A capability rotates after six days because database workspace access expires after seven days. Clearing browser storage starts a fresh workspace. This is demo isolation, not a user account or authentication product.

## Read and write protocol

`GET /api/workspace` returns `{state, revision}`. `POST /api/workspace` accepts `{command}` and returns the saved `{state, revision, result?}`. The app sends no arbitrary complete state. The server reducer validates every requested write.

Supported commands:

| Type               | Payload                                           | Preconditions                                             |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------- |
| `create_customer`  | `name`, `email`, `phone`, `address`               | Required bounded strings, valid email, capacity available |
| `create_estimate`  | `customerId`, `title`, `items`, `taxRate`, `date` | Existing customer, valid cents/prices, real ISO date      |
| `approve_estimate` | `id`                                              | Draft estimate; creates a scheduled job                   |
| `move_job`         | `id`, `status`                                    | Scheduled → in_progress → completed only                  |
| `create_invoice`   | `jobId`                                           | Completed job, no existing invoice                        |
| `pay_invoice`      | `id`                                              | Existing unpaid invoice                                   |

The reducer clones the original state, validates inputs, applies a change and appends a bounded activity entry. A rejected operation cannot partially change the source state. The persistence adapter uses compare-and-swap revision checks and retries to avoid lost writes; duplicate approval, duplicate invoice and duplicate payment commands remain rejected on retry.

Money is integer cents. Line extension is rounded to cents; tax is rounded once against the complete subtotal. Inputs, line count, totals, quantities and record counts have bounds. Historical invoice line items are cloned from the approved estimate, preserving scope and prices.

## Failure behavior

The client updates displayed state only after a successful server response. Network and save failures remain visible. There is no automatic switch to browser storage. A failed save keeps its form open with a visible error. Vite development loads and dispatches the real server handlers using server-only environment configuration. Missing services produce explicit errors; development never substitutes an in-memory account backend.

## Speech and commands

The grammar is `create|make|draft [a|an] <service> estimate for <full customer name>`. Exact case-insensitive customer matching prevents an ambiguous record selection. A command produces a local editable proposal only. Browser speech, when available, populates that same proposal. Explicit confirmation creates a normal validated server command.

## Deployment checklist

1. Apply both the demo workspace and account membership/authorization SQL migrations from the shared hosting setup.
2. Vercel build: `npm run build`; output: `dist`; Node 22+.
3. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the app-specific `PORTFOLIO_BACKEND_KEY` as server environment variables. Do not prefix them with `VITE_`, expose backend credentials to the browser, or log session tokens.
4. Apply the shared `portfolio_demo_workspaces` schema, RLS capability restrictions and `portfolio_demo_cas` RPC. The shared adapter expects apps `fieldpilot`, `webhooklab` and `payroute`.
5. Verify GET persistence with a new capability, POST a valid command, reload using the same token, and verify a different capability sees separate seed records.
6. Confirm invalid/duplicate commands return errors and no state change; inspect browser and function logs without exposing tokens.

The app implements account sessions, workspace membership and role-based permissions. It does not implement real payments, business messaging, a backup product, account recovery UI or a production customer-data compliance program.
