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
