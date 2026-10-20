# Internet interest coverage

The former static reviewed-interest-v1 index contained two discoveries. All other cards showed Interest unknown, irrespective of external attention.

The viewer now calls /api/interest/[id]. Public discovery visibility is checked before returning cached evidence. No service key, browser identity or private search text is sent to the provider. Search terms come from the public discovery title or a specific reviewed query.

GDELT DOC article metadata is the optional automatic provider. Fixed-origin requests have a seven-second deadline, a 100-article bound, request deduplication, a six-second local spacing guard and a one-minute backoff after failure. Successful upstream responses and card assessments are cached for 15 minutes. A visible viewer polls every minute and refreshes when the document becomes visible. This is on-demand refresh, not a background monitoring job or instantaneous coverage guarantee. GDELT indexing and availability introduce further delays. Server-instance guards are not a distributed rate limiter; provider 429 responses are expected to degrade gracefully.

Only matching titles for the specific product or subject count. First-party domains, known press-release wires, duplicate URLs and identical titles are excluded. Known publisher ownership families are combined. The 14-day window uses provider first-seen time, not a claimed publication date; reviewed sources use their publication date. 1 / 2 / 3 / 6 / 12 publisher groups map to the five existing stages. This is coverage breadth, not measured public demand, sentiment or acceleration. The rules are a transparent product rubric, not a validated scientific index.

Verified independent source links for Porsche Mission S, Tesla Roadster, Dyson CameraJet and iPhone Duo provide dated evidence even during provider outages. Porsche has three publisher groups, including Ars Technica, MotorTrend and Future publications. Source links, dates and publisher labels are retained in lib/interest-coverage.json. Previously reviewed assessments remain a labeled fallback for discoveries without current coverage data. No brand receives an automatic score bonus.

An outage cannot overwrite a recent successful assessment with zero. The latest successful check time is retained with a delayed indicator for up to one day. Cold instances can fall back to verified dated evidence and legacy editorial assessments. There is no durable automatic snapshot store yet, so automatic-only evidence may be unavailable after a cold start during a provider outage. Missing matches and failed checks are different states. No claim that the index covers the whole internet.

Evidence ages out as the rolling window advances; fresh independent coverage can raise a score, expiry can lower it. No provider access, subscriptions or paid services were purchased. Google News RSS was rejected because its feed prohibits this commercial use.
