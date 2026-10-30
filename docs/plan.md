# FieldPilot implementation plan

Goal: deliver a polished, persisted end-to-end renovation workspace.

1. Define domain contracts and failing tests for cents arithmetic, transition validation, duplicate approval/invoicing, customer creation and command previews. Observe red, implement reducer and run green.
2. Wire the shared createWorkspaceHandler to app=fieldpilot. All POST commands validate on the server; preserve request errors in the UI.
3. Build responsive overview, Kanban, customers and documents views. Add reusable estimate preview/form with editable line items, tax and explicit save confirmation. Expose complete lifecycle actions.
4. Add deterministic typed/speech command parsing with feature detection and a visible preview; never save on recognition.
5. Verify npm test, npm run typecheck and npm run build. Inspect responsive screens and document setup, architecture, API boundaries and limitations.
