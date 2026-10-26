# Discovery-first activation

## Behavior

- The homepage fetches an approved-only, bounded public opening selection on the server. Its first card and canonical discovery links exist in HTML before JavaScript runs. The supplied hero copy and swipe hint lead into the actual subject.
- Each discovery route has a server-rendered article with its title, cover, description, creator credit and original source. Existing gallery/voting controls remain available. Metadata descriptions lead with the subject rather than tiny-sample percentages.
- The opening deck lets guests save up to 25 preview choices locally, expiring 24 hours after the set is saved. After five choices it prompts for signup. Guests never call a vote endpoint. Continuing previews remains optional.
- Authentication alone does not cast votes. After authentication, the visitor explicitly selects **Lock in my votes**. The bounded database transaction commits new choices, retains existing account votes, and identifies unpublished discoveries without counting them. Retries do not toggle votes. Failed or unconfirmed requests retain the draft; a newer choice from another tab is not silently discarded.
- Agreement percentages require at least ten comparison votes and exclude the current voter after a confirmed vote. Preview results never change public totals or claim to be objectively correct.
- Consent-gated, allowlisted GA events cover first choice, five previews, signup CTA, authenticated previews ready and confirmed preview commitment. The authenticated-ready event is not proof of a new account. No discovery IDs, choices, email addresses or authentication data are sent with these events. Browser privacy signals remain honored.

## Existing protections audited

The votes table has a `(submission_id,user_id)` primary key. Anonymous vote execution and direct vote writes are not granted. Existing normal voting RPCs require `auth.uid()` and publication status. The email sign-in UI supplies a Turnstile token; production enforcement/configuration was not independently audited here. No blanket newcomer vote weighting was introduced. The new preview endpoint adds authenticated-only access, publication checks, bounded input, duplicate rejection, row locking, and non-overwriting replay behavior. It is not a general rate limiter for all existing vote paths.

## Release order and verification

1. Apply `supabase/038_preview_vote_commit.sql` to a test Supabase database with migrations 001–037. Run `supabase/preview-votes-tests.sql`; fixtures roll back. Also check concurrent commits, email/OAuth return, and existing opposite votes with real test accounts.
2. Run `node --test tests/*.test.mjs` and a complete production build against that test project. Test first viewport and the full five-preview flow at 320px, 390px and desktop widths, including reduced motion, keyboard voting, storage blocked, session change, failed network, and retry after a lost response.
3. Apply the additive migration to production before deploying the app. If the RPC is missing, preview counting fails visibly and retains choices; it never falls back to unauthenticated writes.
4. Verify raw HTML and real social previews for a published and withdrawn discovery. Confirm home first-card image, source link, and no JavaScript dependency for reading a discovery. Check real Google indexing separately; rendered HTML does not guarantee indexing or ranking.
5. Observe the consented funnel. Treat authenticated previews and counted votes separately from new-account signup and returning visitors. No growth claim is made by this release.

Rollback: revert the app change; the unused authenticated-only additive RPC may remain until separately removed. No ranking algorithm, real votes, content moderation, or daily automation was changed by this patch.

## Local validation limitations

Tests exercised component state, SSR markup, draft retention, agreement denominators, rapid confirmation, storage failures, and analytics privacy. The webpack bundle compiled successfully with the local build-worker setting disabled, but static page generation hit `EPERM` creating Next output directories (including the unchanged `/about` page). The local preview socket was inaccessible in the managed environment. Full build, rendered mobile/desktop QA, actual OAuth/email round-trip, PostgreSQL migration tests, and production verification remain outstanding. The temporary build setting and fixture API are not part of the production patch.
