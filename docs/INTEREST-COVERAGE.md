# Internet interest signals

The original index was a two-entry editorial file. The first automatic revision then depended on one frequently rate-limited news index and only kept recent coverage. That was insufficient: a failed lookup could leave even a heavily covered launch without a rating.

The viewer now combines three evidence signals, retaining the compact display and details behind its question mark:
- Recent independent coverage: rolling 14 days, five stages at 1 / 2 / 3 / 6 / 12 publisher groups.
- Established coverage: rolling 90 days, stages 1 / 2 / 3 at 1 / 3 / 6 groups; capped at 3 so old coverage alone cannot claim current heat.
- Subject-specific Wikipedia readership: completed daily user-classified page-view counts. The latest available week's daily mean maps to stages at 10 / 50 / 200 / 1000 / 5000 views. At least three days and a sample ending within three days are required. The highest supported stage is shown, without adding incomparable counts together.

GDELT metadata remains an optional news source with a seven-second deadline, a 100-article limit, a six-second local request-spacing guard, error backoff and 15-minute caches. Failed checks with no usable evidence retry after one minute. Wikimedia lookup and daily statistics run concurrently, use fixed trusted hosts and four-second deadlines per request, and cache for six hours. Readership data updates daily, not instantaneously. The card polls once per visible minute; opening a card drives refresh rather than a new standalone background job.

Article matching must identify the discovery's product or subject, not just its brand. Numeric aliases such as Type 1 / Type 01 are normalized without confusing Type 00. Ambiguous model-generation results are rejected unless a reviewed mapping specifies the exact article. Wikipedia page views are aggregate requests, not unique people, sales or a whole-internet popularity measurement. Publisher-family grouping and scoring thresholds are a disclosed product rubric, not a scientific calibration.

Sources are deduplicated and first-party or known press-release wires are excluded. Reviewed launch evidence includes Jaguar Type 01, Porsche Mission S, Tesla Roadster, Dyson CameraJet and iPhone Duo. This is not a guaranteed exhaustive media index; unsuccessful coverage checks never imply zero public interest. Recent successful cached data is retained during total outages for up to one day; cold instances can still retrieve the independent readership source or use reviewed evidence. There is no durable automatic snapshot store yet.

No paid data service, secret search credential, new database permission or new scheduled job was added. No fabricated community votes or activity counts feed this meter.
