# FieldPilot implementation plan

Goal: deliver a polished, persisted end-to-end renovation workspace.

1. Define domain contracts and failing tests for cents arithmetic, transition validation, duplicate approval/invoicing, customer creation and command previews. Observe red, implement reducer and run green.
2. Wire the shared createWorkspaceHandler to app=fieldpilot. All POST commands validate on the server; preserve request errors in the UI.
3. Build responsive overview, Kanban, customers and documents views. Add reusable estimate preview/form with editable line items, tax and explicit save confirmation. Expose complete lifecycle actions.
4. Add deterministic typed/speech command parsing with feature detection and a visible preview; never save on recognition.
5. Verify npm test, npm run typecheck and npm run build. Inspect responsive screens and document setup, architecture, API boundaries and limitations.

## Account and readability update

1. Replace ornamental hero, marketing copy and small text with an operation-focused neutral layout, 14–16px content, 12px metadata, 44px controls and aligned 8/16/24px spacing.
2. Wrap the app in shared AccessRoot; use cookie account requests with explicit workspace IDs, while generating capability tokens only for the separate Try Demo mode. Reset the account gate on a 401 response.
3. Gate all mutation controls by the shared permission helper. Add rendered document tests proving viewer/staff lack approval/payment actions and manager/owner retain them; retain independent server enforcement.
4. Replace the development-only in-memory backend with actual shared auth/team/workspace handlers and server-only environment loading.
5. Verify full tests, typecheck, format check and build after shared auth/backend files arrive; primary performs deployed screenshot and access QA.
