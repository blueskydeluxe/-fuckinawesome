# Purpose and discovery guides

The content registry in `lib/learn-pages.mjs` supplies nine pages, including the replacement About page. `/guides` is their index. Pages have individual metadata, canonicals, WebPage structured data, related links, navigation and sitemap entries. Homepage footer links sit outside discovery cards.

Illustrations use approved public discovery records and the existing protected cover route, with supported thumbnail widths. Vote examples use actual stored counts and the production meter component; their caption identifies the cached snapshot. Internet interest uses the same component and evidence lookup as the feed. No generated artwork, fabricated discoveries or invented votes were added. Failed public-feed lookups omit the illustration; unapproved records cannot supply covers.

## AI content policy

AI-generated discovery submissions are prohibited, including submitted text, images, video and music. Identified generated content is rejected or hidden. The submission UI requires a declaration, checked again by its submit handler before an upload. Moderator approval explicitly includes authenticity in the existing confirmed-review checklist. This is a declared policy and human review process, not a new automatic authenticity detector or a database-level provenance guarantee. Existing unsafe-image screening does not establish authenticity.

AI is limited to helping search for interest and demand signals, surfacing potential discoveries, and moderating unsafe content. Attention signals are not measured purchases or a demand forecast. Any discovery research workflow must follow this policy and must not generate discovery descriptions or media for submission. Existing schedules were not recreated or changed. This release does not claim to audit or certify every older discovery.

The published policy describes discovery submissions; it does not represent an audit of the tools used to build the website or write these explanatory pages.

## Validation

Existing 156 tests passed. Route/link/policy integrity checks passed. Desktop and 390px mobile previews verified the actual grid, card and meter examples. Webpack compilation passed; local prerendering of the existing sitemap failed because its public database fetch was unavailable. Verify the deployment build and live routes after pushing.
