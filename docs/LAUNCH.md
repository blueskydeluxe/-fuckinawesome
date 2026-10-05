# Phase 1 launch handoff

The original index.html is preserved. The application uses Next.js App Router and Supabase Auth/Postgres; Vercel remains the hosting provider. No demo scores or submissions are presented as real activity.

## Connect the database

1. Create a Supabase project. Keep the database password private.
2. Run `supabase/001_foundation.sql` once in its SQL Editor.
3. Set Auth → URL Configuration → Site URL to `https://fuckinawesome.com`. Add the exact Vercel preview URL and `http://localhost:3000` as redirects for testing. Avoid broad wildcard redirects for production.
4. Configure a production email provider in Supabase Auth. The built-in email sender is for testing and is unsuitable for a public launch. Enable appropriate auth rate limits and bot protection before public launch.
5. Add the project URL and publishable key as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel. These two values are intended for browser use. Never add a service-role key to the client or repository.
6. Sign in once. In the SQL Editor, grant the owner moderator access using their exact user UUID:

```sql
update public.profiles set is_moderator = true where id = 'OWNER-USER-UUID';
```

The site cannot grant moderator status. Only database administration can do so.

## Vercel cutover

Use a preview deployment from `mvp-phase-1` first. Change framework preset from Other to Next.js, output directory to framework default, and remove any old static-build overrides. Install with pnpm; build with `pnpm build`. Set the public database environment variables for preview and production, then rebuild. Verify the preview before merging to the production branch. Preserve DNS and SSL configuration.

## Required verification before launch

- Run `pnpm test` and `pnpm build`.
- Run `supabase/security-tests.sql` in a dedicated test project after applying the schema. It rolls back its fixtures. This SQL suite passed against the newly created, empty project on October 5, 2026, with its fixtures rolled back.
- Sign in with two separate email accounts and confirm email redirects land on the intended host.
- Submit a discovery, refresh, and confirm it remains pending. Signed-out visitors and the other account must not see it.
- Approve with the owner account. Confirm ordinary users cannot approve, hide, or change moderator status through API requests.
- Vote from both accounts. Repeating a vote removes it; changing sides changes the aggregate. Confirm scores survive refresh and each account has only one vote per discovery.
- Confirm profiles save without exposing email addresses. Open member and discovery sharing links in a separate browser.
- Report a discovery. Confirm reports are visible only to moderators, and hiding the discovery removes it from the public feed.
- Test keyboard navigation, dialog Escape/Tab behavior, mobile layout, email delivery, empty states, and network failures.

## Current scope and remaining hardening

Submissions are links with category illustrations, rather than file uploads or fetched thumbnails. Links are never fetched by the server, avoiding an unnecessary URL-fetching attack surface. Sharing currently uses stable query-string URLs and generic site metadata; custom social images and per-discovery metadata remain future improvements.

The first release retrieves the newest 200 visible discoveries and ranks that set on the client. Before a larger launch, move ranking and pagination into database queries so older Hall of Fame entries remain discoverable at scale. Add a report resolution workflow, moderator search, account deletion/export, and formal community/privacy policies before opening the community broadly. Submission and report limits are enforced in the database; vote abuse monitoring and broader bot controls still need live validation.

Current validations cover successful local production builds with and without Supabase configured, ranking/link unit tests, the connected empty-feed browser check, and the database permission/voting suite. Real email sign-in, browser submissions/moderation, concurrency under load, and deployed Vercel behavior still need verification. No production launch is claimed. See STATUS.md for the connected project details.

The migration document was not present in this workspace or the referenced chat's attachments; reconcile it when supplied.

