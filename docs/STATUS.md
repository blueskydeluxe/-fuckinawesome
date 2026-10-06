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
