# FieldPilot design

A portfolio MVP for small Australian renovation teams, built for a visitor to follow a real operational loop: customer → estimate → approval → scheduled job → completion → invoice → paid. Synthetic customer records and illustrative AUD prices are clearly labelled. Tanveer Singh is the author; the demo is not an operating renovation company.

React/TypeScript/Vite serves an accessible responsive workspace. A warm ivory canvas, forest sidebar, orange primary action, restrained typography and compact activity panels keep the product calm and useful. Overview, jobs, customers, and documents share one state. Forms use explicit validation, readable errors and focusable controls. Metrics derive from records.

The Node Vercel endpoint uses the supplied durable Postgres workspace adapter, a random browser token, optimistic persistence, and a server-side validated domain reducer. No silent fallback or pretend saved state. Typed commands and optional browser speech only propose editable estimates; confirmation is the sole write action. Browser speech support and permission are browser dependent. Commands are deterministic rules, not an LLM integration.

Alternatives considered: browser-only storage is simpler but weak for a full-stack portfolio; a complete CRM with authentication and third-party payments is unnecessary scope. The selected architecture is a scoped capability-token workspace with real persistence and no actual email or payment processing.

Limits: synthetic data, one browser workspace, no user accounts, no real payment or email delivery. No claims of production readiness, AI reasoning or actual trade pricing.
