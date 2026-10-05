# Fuckin Awesome

A community-driven discovery platform for finding, voting on, and sharing things that are **FUCKIN AWESOME**.

## Phase 1
Next.js application with Supabase email sign-in, moderated link submissions, account-based votes, live aggregate scores, trending/new/Hall of Fame feeds, member profiles, sharing, and reports. The original index.html prototype remains preserved.

Install with pnpm, copy `.env.example` to `.env.local`, configure a Supabase test project using `supabase/001_foundation.sql`, and run `pnpm dev`.

Run `pnpm test` and `pnpm build`. See [launch instructions](docs/LAUNCH.md) for account setup, Vercel preview cutover, security verification, and current limitations. The application can be previewed without credentials, but community features remain unavailable until connected.
