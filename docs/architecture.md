# Architecture and operational boundaries

## Workspace identity

The client generates 32 cryptographically random bytes, encoded as exactly 64 lowercase hexadecimal characters. It sends the token only in `Authorization: Bearer …`, never in a URL. The shared adapter forwards a scoped capability header to Postgres under a publishable key. Row-level security must permit access only to that capability's workspace and app.

The browser stores the capability and a creation timestamp in localStorage. A capability rotates after six days because database workspace access expires after seven days. Clearing browser storage starts a fresh workspace. This is demo isolation, not a user account or authentication product.

## Read and write protocol

`GET /api/workspace` returns `{state, revision}`. `POST /api/workspace` accepts `{command}` and returns the saved `{state, revision, result?}`. The app sends no arbitrary complete state. The server reducer validates every requested write.

Supported commands:

| Type | Payload | Preconditions |
| --- | --- | --- |
| `create_customer` | `name`, `email`, `phone`, `address` | Required bounded strings, valid email, capacity available |
| `create_estimate` | `customerId`, `title`, `items`, `taxRate`, `date` | Existing customer, valid cents/prices, real ISO date |
| `approve_estimate` | `id` | Draft estimate; creates a scheduled job |
| `move_job` | `id`, `status` | Scheduled → in_progress → completed only |
| `create_invoice` | `jobId` | Completed job, no existing invoice |
| `pay_invoice` | `id` | Existing unpaid invoice |

The reducer clones the original state, validates inputs, applies a change and appends a bounded activity entry. A rejected operation cannot partially change the source state. The persistence adapter uses compare-and-swap revision checks and retries to avoid lost writes; duplicate approval, duplicate invoice and duplicate payment commands remain rejected on retry.

Money is integer cents. Line extension is rounded to cents; tax is rounded once against the complete subtotal. Inputs, line count, totals, quantities and record counts have bounds. Historical invoice line items are cloned from the approved estimate, preserving scope and prices.

## Failure behavior

The client updates displayed state only after a successful server response. Network and save failures remain visible. There is no automatic switch to browser storage. A failed save keeps its form open with a visible error. Development has an explicit in-memory backend and visible mode label; it does not ship into the production API.

## Speech and commands

The grammar is `create|make|draft [a|an] <service> estimate for <full customer name>`. Exact case-insensitive customer matching prevents an ambiguous record selection. A command produces a local editable proposal only. Browser speech, when available, populates that same proposal. Explicit confirmation creates a normal validated server command.

## Deployment checklist

1. Vercel build: `npm run build`; output: `dist`; Node 22+.
2. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as server environment variables. Do not prefix them with `VITE_`.
3. Apply the shared `portfolio_demo_workspaces` schema, RLS capability restrictions and `portfolio_demo_cas` RPC. The shared adapter expects apps `fieldpilot`, `webhooklab` and `payroute`.
4. Verify GET persistence with a new capability, POST a valid command, reload using the same token, and verify a different capability sees separate seed records.
5. Confirm invalid/duplicate commands return errors and no state change; inspect browser and function logs without exposing tokens.

The app does not implement identity, role-based permissions, real payments, messaging, customer PII protection beyond demo isolation, or a backup/retention product.
