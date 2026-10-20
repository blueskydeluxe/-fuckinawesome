# Visitor measurement

Google Analytics property 559524677, web tag G-0CN05S2YRX, measures consenting browsers whether or not they sign in. The account-only Experience pulse is a separate sample. Do not report either sample as every visitor or as a count of identified people. Blockers, declined consent and browser privacy signals reduce coverage.

## Read the reports

Open https://analytics.google.com/analytics/web/#/a412468221p559524677/ . Use Reports > Traffic acquisition and select Session source / medium. Compare Sessions, Engaged sessions and events by source. Use Session campaign to compare individual placements. Use Landing page or Pages and screens to distinguish discovery pages and guides. Realtime is a delivery check, not a growth report.

Existing events: discovery_open, vote_cast, discovery_submit and discovery_share. Shares include share/download actions; they do not establish that another person received the link. Vote count is events, not unique voters. Successful sign-ups and five-vote completion are not separately instrumented. Do not claim a complete signup-to-five-vote funnel from these events.

Baseline observed October 20, 2026: GA Home for October 13-19 showed 1 active user, 9 views and 24 events. Traffic acquisition for September 22-October 19 showed 4 sessions, all Direct. This is a small measured sample that may include owner/test activity; it does not establish that only one person visited the site. Today's data was outside those report date ranges. Normal processing delays also apply.

## Tagged acquisition links

Example: https://fuckinawesome.com/?utm_source=facebook&utm_medium=organic_social&utm_campaign=five_votes_20261020

Prefer the exact public discovery or guide destination instead of the homepage when the placement features that content. Never put account identifiers or personal data in campaign labels.

- Sources: instagram (ig normalizes to instagram), facebook, twitter, x, reddit, google, bing, pinterest, flipboard, newsletter, creator.
- Media: organic, social, organic_social, referral, email.
- Campaigns: carlsbad, camerajet, intro, organic, five_votes, your_call, your_find, discovery, weekly_picks or creator_feature, followed by an underscore and eight date digits.
- Content labels: link_in_bio, reel, story, feed, pin, community_post, newsletter_link, creator_link.

Other query values and fragments are stripped. Public discovery UUID paths and known editorial pages retain their paths. Unknown routes are redacted to the homepage. Additional placement labels require an explicit allowlist update and regression tests. Do not add Product Hunt: the owner excluded that channel.

Before October 20's attribution fix, current five_votes/your_find/your_call campaign names and organic_social were discarded; discovery and guide paths were reported as /. The fix improves future events and cannot reconstruct historical attribution.

## Weekly decision

Compare sources over the same dates using sessions, engagement and voting activity. Keep follower/profile growth in a separate social scorecard. Record consent coverage and owner/testing contamination as limitations; do not subtract an invented owner count. Use a consistent tagged bio link and separate campaign links for each permitted external placement. UTM parameters identify a tagged arrival, not a verified causal effect of a post.

No second analytics provider or paid analytics upgrade is required for this change. Existing opt-in, withdrawal, DNT/GPC controls and advertising-disabled settings remain in force.
