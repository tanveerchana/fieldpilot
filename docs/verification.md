# Verification record

Hosted demo workflow reverified on 1 November 2026. Earlier local and database evidence retains its stated date. This is an engineering portfolio demo using synthetic data.

## Local quality checks

- `npm test`: **48 tests pass**, including shared storage/HTTP boundary cases.
- `npm run typecheck`: passes.
- `npm run format:check`: passes.
- `npm run build`: passes.

The checked-in GitHub Actions workflow runs installation, tests, types, formatting and a production build on pushes and pull requests. It does not deploy or receive production credentials.

## Hosted demo workflow check — 1 November 2026

Tested the deployed application at https://fieldpilot-pied.vercel.app/ in a new cloud-browser tab. The page first showed the account gate with Log in, Create account and Try demo options. No account credentials were entered and no signup email was requested. Try demo opened the separate synthetic demo workspace.

The complete workflow passed through visible controls:

1. Entered `Create a painting estimate for Alex Morgan`. An editable preview proposed a $2,150.00 subtotal, $215.00 tax and $2,365.00 total. Canceling returned to the unchanged two-estimate awaiting-approval count.
2. Reopened the preview, changed its title to `Hosted QA painting 2026-11-01` and changed the materials price to $375.50. The preview recalculated subtotal $2,175.50, tax $217.55 and total **$2,393.05**.
3. Explicit confirmation created estimate `EST-bd03f45b`. Its document row showed Awaiting approval and the edited total.
4. Approving that estimate created scheduled job `JOB-0c0610dc`. Starting and completing it moved the job through the corresponding board lanes.
5. The completed job generated invoice `INV-12b0518c`, preserving the approved line items and **$2,393.05** total. Its job card then showed Invoiced rather than another invoice-creation action.
6. Marking the invoice paid changed its ledger row to Paid. A full browser reload retained the approved estimate and paid invoice; reopening Invoices showed the same ID, amount and status.
7. After reload, the overview showed three active jobs, two estimates awaiting approval, $2,035.00 outstanding and **$4,769.05** collected revenue ($2,376.00 existing paid seed invoice + $2,393.05 QA invoice).

The current neutral desktop interface was visually inspected: aligned equal-height metric cards, white/slate surfaces, restrained blue actions, readable document rows and no ornamental hero. No blocking workflow or visible desktop layout defect was found. Microphone recognition and narrow-device behavior were not exercised in this run.

`docs/preview.jpg` is the new clean overview screenshot captured after the persisted workflow. A separate screenshot of the paid invoice ledger was also captured for review. Both captures came directly from the hosted browser through its documented shared-file synchronization path.

## Account browser verification limit

The unauthenticated gate and Try demo path were verified in the browser. A full provider signup → confirmation email → login → account workspace journey remains **unverified**. The rollback-only hosted database role assertions below are separate evidence and must not be described as an end-to-end provider browser test.

## Account security verification

The account migration was applied to the hosted Supabase project on 31 October 2026. Rollback-only SQL assertions passed for cross-workspace/app isolation, viewer secret redaction and write denial, independent app-bound backend credentials, staff job transitions and financial isolation, owner-only membership management, verified-email invitation matching, membership removal, stale revisions, and scoped external ingestion. Two synthetic auth fixtures and all workspace fixtures were created inside the test transaction and rolled back; a follow-up query confirmed zero fixture rows remained.

The application requires both a verified provider session and current database membership. Account and demo transport tests prove that account requests cannot fall back to a demo token. Password exchange, refresh, cookie flags, same-origin checks, and error paths have injected-provider unit coverage. These tests do not establish real email delivery or a complete provider signup/confirmation/login browser run.

## Database boundary

The isolated PostgreSQL workspace table uses SHA-256 capability hashes, row-level security and an atomic revision compare-and-swap. An actual database role test verified owner reads, rejection of cross-token reads, rejection of reads without a token, and rejection of stale writes. Test changes were rolled back. Existing application tables were not changed.

Storage unit tests also exercise racing initialization, mutation conflicts, bounded retries, oversized bodies, invalid credentials and sanitized network errors. Those unit tests use an injected transport; they do not claim to be a hosted load test.

## Verification limits

Desktop browser workflows were exercised manually. Responsive breakpoints and reduced-motion rules are implemented, but dedicated device testing was not performed. Speech recognition, where available, depends on the visitor's browser and was not exercised with a microphone. This demo is not a production security certification, payment integration or real customer operations system. See the README for deliberate limits.
