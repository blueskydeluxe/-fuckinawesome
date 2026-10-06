# Phase 1 launch status — October 6, 2026

The original static index.html is preserved. MVP uses Next.js App Router, Supabase Auth/Postgres, Vercel hosting, Resend email, and Cloudflare Turnstile. Preview: https://fuckinawesome-git-mvp-phase-1-fuckin-awesome.vercel.app. Draft PR: https://github.com/blueskydeluxe/-fuckinawesome/pull/1.

Migrations 001 through 004 are applied to Supabase project blreebdgdgulnrmdaxlb. Do not rerun them. Public environment values are set in Vercel Preview and Production. Auth Site URL is https://fuckinawesome.com; redirects include the exact preview and localhost. Owner is a moderator. Sign-in email domain auth.fuckinawesome.com is verified. support@fuckinawesome.com receives mail, as tested by the owner. Turnstile protection is enabled and owner sign-in succeeded after refreshing the old form.

## Verified

- Build and all three unit tests passed.
- Database tests cover private pending content, protected moderator role/actions, vote uniqueness/change/removal, hidden content, and report resolution. Rerun security suite passed October 6; fixtures rolled back.
- Feed ranks all visible discoveries in SQL, with 50-item pages. A 205-discovery rollback test verified an older Hall of Fame winner and pagination/privacy boundaries.
- Browser checks passed for owner sign-in, submission, approval, vote change/removal/restoration, profile save, sharing, reporting, hide/reapprove, and marking reports handled. Mobile feed checked at 390x844.
- Account-control rollback tests passed: export isolation, exact deletion confirmation, complete active-data deletion, preservation of other accounts, and moderator deletion protection.

## Account controls

export_account() accepts no identity parameter and returns only the authenticated caller's account, profile, submissions, votes, and reports. It rejects anonymous and deleted users. Reports omit the resolving moderator ID.

delete_own_account(text) requires DELETE MY ACCOUNT and rejects moderator accounts. It removes the caller's submissions (with associated votes/reports/moderation records), clears profile foreign-key dependencies, and removes auth.users with cascading profile/votes/reports cleanup in one transaction. The app signs out locally afterward. Existing short-lived JWTs may remain cryptographically valid until expiry; removed profile/FK checks prevent writes and export. This project has no uploaded storage objects. Add a storage cleanup path if file uploads are introduced. No service-role secret is exposed.

## Before production cutover

- Verify deployed profile download and community/privacy pages.
- Have owner review community/privacy copy and support contact.
- Complete a second real email-account browser check (database isolation checks already pass).
- Review PR and merge to main only after release approval; verify production sign-in redirect, feed, and headers after deployment. Preserve website/email DNS and SSL.

No production launch is claimed. GitHub updates use the signed-in browser; local and remote git histories differ. Do not force push. The migration document was not available in this workspace or referenced chat.

## Saved covers release — 2026-10-06

Production release: https://github.com/blueskydeluxe/-fuckinawesome/pull/5 (merged), Vercel production commit 0032a328c7e6ce1d6c306e7e82e0b7ae5f653587 ready.

- Applied migrations 007, 009, then 008 after source-cover repairs. New link submissions require a stored JPEG cover; original source URLs and trusted video players are retained.
- Authors and moderators can add/change covers. Author changes return to pending review. Approval requires an existing stored cover; public discovery_feed excludes coverless entries while My discoveries and Moderation retain them.
- Cover reservations are scoped to one discovery, have a separate daily allowance (10 member / 50 moderator), and cannot be used for new submissions. New submission reservations retain the original 10/day limit.
- Repaired Ghost Core and Bagan from actual source imagery; burger cover uses its visible YouTube thumbnail. Four approved public discoveries now have stored covers. Six older approved links remain preserved for manual cover repair. No original discoveries were deleted.
- Verified automatic retrieval, blocked-source upload requirement, manual image preparation, stored link submission, source-link lightbox, cover replacement, trusted video iframe, and anonymous image access. All four anonymous public images loaded. Synthetic new test discovery was soft-deleted through the normal recovery mechanism.
- Nine JavaScript tests and production build passed. Required-cover SQL tests passed on the live schema and rolled back all fixtures, including ownership, missing file, approval/feed, URL credentials, repair despite exhausted new-submission allowance, and ticket misuse checks.
- Remaining user work: sign into production with the owner account, open My discoveries, use Add cover on six retained links, and upload relevant images they have permission to share. Owner preview login was not needed for the admin repairs.

## Engagement and sharing release
- Private saved discoveries with owner-only RLS, Saved feed, and account export coverage.
- Lightbox next/previous, arrow keys, horizontal swipe, voting, saving, and sharing.
- Installable PWA with local-only incoming link/photo drafts on supported Android browsers; iPhone copy/screenshot instructions.
- Rolling seven-day leaderboard requires at least three scoring discoverers; excludes self votes and unpublished content. Profiles show Hall of Fame count and progress toward the three-find badge.
- Moderator-reviewed editor's picks workflow with source credits and real uploaded covers. Moderator curation quota 50/day; ordinary members remain 10/day.
- Orange action buttons and unified gray navigation bar with orange active underline; approved wordmark retained.
- Google/Microsoft/Apple integration implemented, gated by actual enabled auth providers. All three remain externally blocked by missing developer application credentials. See SOCIAL_SIGN_IN.md.
- Local production build and 13 automated tests passed; live rollback database checks passed for bookmark privacy, hidden content, self-vote exclusion, and submission quotas.
- Three reviewed editor picks published on the existing production site: Mars helicopter flight, Webb Pillars of Creation, and General Sherman. Real covers and source credits; no added votes.
- Release PR #18 is blocked by Vercel's 100-deployment / 24-hour Hobby-team limit. Local browser checks confirm orange CTA colors, gray/orange active navigation, next/previous/keyboard viewer navigation, and guest save sign-in gating. Signed-in UI verification and native phone shares remain pending release/device availability.

## Tagged curated collection — 2026-10-06

- Added topic tags to all 11 existing approved discoveries.
- Applied 017_curation_capacity.sql: moderator new-discovery allowance 150/day; member allowance remains 10/day. Existing ownership, storage-ticket, JPEG, and moderation checks are retained.
- Moderator collection importer uses the normal authenticated upload, tagged submission, and approval RPCs. It skips exact source-URL duplicates and reports each result. No user accounts or votes are fabricated.
- Curated 100 new finds with original short descriptions and visually checked covers: 35 NASA images, 25 Cleveland Museum of Art CC0 objects, and 40 Wikimedia Commons images with allowed reusable licenses. Each Commons discovery includes creator credit, original photo source, license, and the resizing/compression notice. Lightbox descriptions now display clickable source/license URLs.
- Production build and all 15 automated tests passed. Publication verification and final public count are recorded after the batch completes.
- Final production verification: 100/100 new discoveries approved, 111 approved discoveries total, all 11 prior discoveries tagged, no source-URL duplicates or tag mismatches. Anonymous permitted signed-image checks returned JPEG 200 responses for all 100 new covers. New feed visibly displays the published finds; no synthetic votes added.

## Ranked halls and card density — 2026-10-06
- Large/Small cards control persists the visitor's preference in local storage. Small cards use four desktop columns and two phone columns, while maintaining the full viewer and voting controls.
- Both halls show numbered places across pagination. The first qualified discovery gets a full-width champion card; second/third receive silver/bronze rank treatments. Hall of Fame uses red and Hall of Bullshit uses its meter color for the champion.
- Category and tag filters combine within each hall and are applied by the existing server feed before pagination/ranking. Clicking or clearing a tag inside a hall preserves the hall and category. Ranking rules are explained beside the standings.
- Qualification remains at least 10 votes and greater than 80%; an empty hall explains its open top slot. No real votes or scores were changed for presentation.
- Production build passed. Temporary local-only fixtures verified champion/podium structure, hall-scoped tag filters, density controls, and phone layout without horizontal overflow. Fixture code was removed before the final build/release.
- Live verification: card-size preference survived reload; Art plus #space retained Hall of Fame and category; both halls showed the qualifying-vote empty state. New feed displayed the compact grid. Release commit 1e0f3e31043581a930bb689d0dc7c67290749b98.
