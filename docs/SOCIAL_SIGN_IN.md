# Google, Microsoft, and Apple sign-in

The client integration supports all three providers. Buttons appear automatically only for providers enabled in Supabase's public auth settings. Email magic links remain available if a provider is unavailable. No OAuth client secrets belong in GitHub or Vercel client variables.

Current setup: all three providers are disabled and their developer application credentials have not been supplied. This is an external account dependency, not a working production login yet.

Shared callback URL for each provider:
`https://blreebdgdgulnrmdaxlb.supabase.co/auth/v1/callback`

Supabase provider settings: https://supabase.com/dashboard/project/blreebdgdgulnrmdaxlb/auth/providers

## Google
Create a Web OAuth client in Google Cloud / Google Auth Platform. Set the application name to Fuckin Awesome, homepage https://fuckinawesome.com, support email support@fuckinawesome.com, privacy URL https://fuckinawesome.com/privacy. Authorize the callback above. Add the client ID and secret to Supabase Google settings. Publish the consent app for public users; test-mode apps are restricted to test accounts.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-google

## Microsoft
Register a web application in Microsoft Entra ID. Support personal Microsoft accounts and organizational accounts for a public community. Authorize the callback above. Add its application client ID and secret VALUE to Supabase Azure settings. Use the common tenant for the chosen account types. Request the email scope (already implemented). Configure the recommended xms_edov verified-email claim. Record the secret expiration and rotate it before expiry.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-azure

## Apple
Requires an Apple Developer setup with a primary App ID enabled for Sign in with Apple, a related Services ID for the website, and a Sign in with Apple key. Register fuckinawesome.com and the callback above. Add the Services ID and generated client secret to Supabase Apple settings. Apple web OAuth secrets require rotation; follow Apple's/Supabase's current instructions and track the expiry. Do not put the private key or generated secret in this repository.

Official instructions: https://supabase.com/docs/guides/auth/social-login/auth-apple

## Final verification after credentials are configured
Sign in with a real test account for each provider on production. Verify redirect back, profile creation, voting, saving, and sign-out. Test cancellation and an existing email account. Apple private relay may use a different email, so do not assume it shares an existing account. These end-to-end provider checks are pending until developer account configuration is completed.

## Expanded provider support (October 6, 2026)
Client supports Google, Apple, Facebook, Microsoft (azure), Discord, GitHub, Spotify, LinkedIn OIDC, X OAuth 2.0 (x), and Twitch. Only enabled providers appear. Primary consumer providers appear first; other providers are in an expandable menu. Facebook and Microsoft explicitly request email. Instagram is not offered as a generic identity provider.
Live dashboard audit: all listed social providers are disabled; email confirmation is enabled. Provider applications and credentials are still required. Do not represent this integration as active social authentication until each provider is configured and its real redirect tested.

### Account matching
Supabase automatically links identities with the same verified email into a single auth user. Existing profile, discoveries, votes, saves, and voter credit stay keyed to the same user ID. No application-side merging or email lookup is needed. Never merge by display name or unverified email. Different emails, Apple relay addresses, or identities already belonging to separate users need a separate verified ownership workflow; do not rewrite ownership rows as a shortcut. Manual linking remains disabled and is outside this same-email request.
Verification after activation: sign in through Google/Facebook using an existing email-account address; confirm the auth user UUID, owned discovery IDs and credited total are unchanged. Also test a new user, cancellation, denied email permission, and a different-email account.

### Additional provider setup
Use the shared callback above for every provider. Official setup instructions:
- Facebook: https://supabase.com/docs/guides/auth/social-login/auth-facebook
- Discord: https://supabase.com/docs/guides/auth/social-login/auth-discord
- GitHub: https://supabase.com/docs/guides/auth/social-login/auth-github
- Spotify: https://supabase.com/docs/guides/auth/social-login/auth-spotify
- LinkedIn: https://supabase.com/docs/guides/auth/social-login/auth-linkedin (OIDC)
- X: https://supabase.com/docs/guides/auth/social-login/auth-twitter (OAuth 2.0 provider x)
- Twitch: https://supabase.com/docs/guides/auth/social-login/auth-twitch
Provider secrets stay only in Supabase provider settings, never in this repository. Public access may depend on each provider's app publication, review, account enrollment, or credential expiry requirements.
