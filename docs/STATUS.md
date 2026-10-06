# Connected project status

Supabase project: fuckinawesome (blreebdgdgulnrmdaxlb), Free organization Fuckin Awesome, Canada Central.

Foundation migration and 002_report_resolution.sql have been applied. Do not rerun them. Database tests passed for pending-content isolation, role protection, moderator-only actions, vote uniqueness/change/removal, hidden-content isolation, and protected report resolution. Fixtures were rolled back.

Resend SMTP is configured for Fuckin Awesome <signin@auth.fuckinawesome.com>. The email domain is verified. Resend shows a delivered sign-in email, and the owner signed into the hosted preview. The owner has moderator access.

Browser checks passed: submission saved, approval, changing/removing/restoring votes, profile save, public profile/discovery links, report delivery, hide from feed, reapproval, and Mark handled. The launch-verification report was resolved. Mobile layout checked at 390x844. Unit tests and production build pass.

Hosted preview: https://fuckinawesome-git-mvp-phase-1-fuckin-awesome.vercel.app
Draft review: https://github.com/blueskydeluxe/-fuckinawesome/pull/1

Vercel uses Next.js defaults with public Supabase URL and publishable key set for Preview and Production. Exact auth redirects include the preview and localhost:3000; Site URL is https://fuckinawesome.com. No secrets are committed.

Production branch remains unmerged. Before broad public launch: second-account end-to-end check, bot protection, full-feed pagination/ranking beyond newest 200 items, account deletion/export, and owner-reviewed privacy/community policies. Passing current workflow tests does not complete these requirements.

GitHub changes were uploaded through the signed-in browser. Local history differs from remote history; reconcile before future command-line pushes. The migration document was not available in the referenced conversation or workspace.
