# Phase 1 launch handoff

See STATUS.md for the current connected-project and verification state. Original index.html is preserved; the application uses Next.js App Router and Supabase. Vercel remains the hosting provider.

## Recreating an environment

Apply supabase/001_foundation.sql, 002_report_resolution.sql, 003_paginated_feed.sql, and 004_account_controls.sql in order, once. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel. Never commit service-role credentials. Use Next.js framework defaults and pnpm build. Configure exact Auth redirect URLs, production SMTP, and Turnstile with the correct hostnames and matching browser sitekey; the private Turnstile secret belongs only in Supabase Auth protection settings.

Run pnpm test and pnpm build. Run SQL suites with disposable fixtures and rollback in a test environment: security-tests.sql, report-resolution-tests.sql, feed-tests.sql, and account-controls-tests.sql. Review tests before using a populated database. Database tests do not replace browser/email delivery checks.

## Production cutover

Review the preview and community/privacy information with the owner. Confirm regular-member sign-in and moderation isolation. Merge the draft PR to main after release approval. Wait for Vercel Ready, then verify fuckinawesome.com sign-in, submission/review, voting, profile export, public sharing, report resolution, and mobile layout. Never delete the owner's account to test deletion; use disposable test identities. Preserve existing DNS and email records. Vercel deployment rollback provides an application rollback; never drop the database as a rollback step.

## Scope

Discoveries are external links with category illustrations, without file uploads or automatic URL fetching. Feed ranking is global SQL with 50-item offset pages and deterministic tie ordering; rankings can shift as new votes arrive. Custom share previews, moderator search, stronger vote-abuse detection, cursor pagination, and load testing remain future improvements. All submissions require moderator review. Account deletion removes associated community records; moderator accounts require support handling.

The migration document was not present in this workspace or the referenced conversation. Reconcile it when supplied.
