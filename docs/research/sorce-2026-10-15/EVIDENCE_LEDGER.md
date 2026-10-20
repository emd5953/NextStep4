# Sorce investigation evidence ledger

All captures belong to the October 15, 2026 public read-only pass. The network capture includes its UTC timestamp; individual file capture times and SHA-256 values are in [manifest.json](evidence/manifest.json). Local IDs below are research references. Only E11 identifies an actual REA Evidence record.

| ID | Type and source | Claim supported | Coverage and limitations |
| --- | --- | --- | --- |
| E01 | Observed browser DOM, [homepage links](evidence/homepage-links.json), [DOM](evidence/homepage-dom.txt), [screenshot](evidence/homepage.jpg); [source](https://www.sorce.jobs/) | Current navigation, App Store destinations, eight feature explanations, appearance | Public homepage only; metrics/capabilities remain site claims. Search-indexed older homepage differs. |
| E02 | Observed promotional previews, [application screenshot](evidence/homepage-features.jpg), [review screenshot](evidence/homepage-review.jpg) | Site depicts application progress and pre-submit review | Recorded marketing visuals, not a live mobile application we operated. |
| E03 | Observed public claims, [FAQ](evidence/faq-dom.txt), [tutorial](evidence/tutorial-dom.txt); [FAQ source](https://www.sorce.jobs/articles/sorce-faq), [tutorial source](https://www.sorce.jobs/articles/sorce-tutorial) | Profile/preferences, card fields, swipe meanings, failure/manual fallback and cancellation descriptions | Describes mobile behavior; no verification of defaults, filter correctness, actual submissions, or eligibility. |
| E04 | Observed public claims, [pricing](evidence/pricing-dom.txt), [download](evidence/download-dom.txt); [pricing source](https://www.sorce.jobs/articles/sorce-pricing), [download source](https://www.sorce.jobs/download) | Published free limit, paid-tier description, iOS funnel | No paywall, purchase, cap/reset, entitlement, or credit enforcement observed. |
| E05 | Observed Apple listing and user-opened history dialog, [listing](evidence/app-store-dom.txt), [history](evidence/app-store-history-dom.txt), [history screenshot](evidence/app-store-history.jpg); [source](https://apps.apple.com/us/app/sorce-ai-job-search/id6504584959) | Developer describes review in 4.5.0, pending withdrawal in 4.3.6, follow-up answers in 4.6.2, correction/reapply in 4.6.3/4.6.4; live listing displayed 4.6.4 | Release notes and responses are developer claims. Third-party reviews are not treated as verified product outcomes. Relative release times remain as captured rather than converted into guessed dates. |
| E06 | Observed policy pages, [privacy](evidence/privacy-dom.txt), [terms](evidence/terms-dom.txt); [privacy source](https://www.sorce.jobs/docs/privacy-policy), [terms source](https://www.sorce.jobs/docs/terms-and-conditions) | Declared data categories, account-deletion path, retention, subscriptions and restrictions | Statements do not verify legal applicability, deletion execution, or technical controls. Terms were viewed, not affirmatively accepted. |
| E07 | Observed public pages, [blog](evidence/blog-dom.txt), [case studies](evidence/case-studies-dom.txt), [security](evidence/security-dom.txt) | Resource/social-proof inventory and disclosure-contact page | No outcome claims independently verified; no messages sent and no vulnerability testing performed. |
| E08 | Observed [employer page](evidence/employer-dom.txt) and [links](evidence/employer-links.json); [source](https://www.sorce.jobs/employer) | Employer product, sign-in boundary, separate developer-docs links | Employer authenticated flows/API operations excluded; not evidence of job-seeker backend behavior. |
| E09 | Native scoped CDP, minimized [scriptParsed inventory](evidence/homepage-attach-events.json), [source manifest](evidence/captured-scripts.json), [source archive](evidence/captured-homepage-scripts.zip) | 25 external first-party scripts observed and exported for static analysis | Loaded/parsed does not establish every module executed. Inline, third-party, source-map and other-route scripts excluded from analysis input. Not REA-produced capture. |
| E10 | Native scoped CDP, [network projection](evidence/homepage-network.json) | Request/response metadata during a homepage reload and subsequent observation window | No bodies/headers retained; no `/api/` URLs in this bounded window; no global absence claim. Not a HAR or REA capture. |
| E11 | REA static analysis, [complete output](evidence/homepage-rea.json.gz), [derived projection](evidence/rea-analysis-summary.json) | 25 files parsed, zero parse failures; chunk/module graph, endpoint/storage candidates | Actual ID `ev_757134b24bd5bb9cf4fead305eee8ab42de4068e13bd87175fe7bdd85327c77d`; partial graph and truncated semantic coverage; no source execution. |
| E12 | Derived source-context inspection of E09/E11; [technical findings](TECHNICAL_FINDINGS.md), [storage capture limitation](evidence/homepage-storage-keys.json) | False endpoint candidates identified; marketing/shared-auth roles; static storage-key literals | Manual source interpretation is distinguished from REA's own output. Runtime storage was unsupported and remains unknown. |
| E13 | Static NextStep source audit at `23b9154df032e994685ac8f85ffef2bedd632873`; [audit](NEXTSTEP_CODE_AUDIT.md) | Current implementation, misleading auto-apply status, tracker joins, apply-path differences, and reuse opportunities | No live application/services tested. Recommendations are new NextStep designs. |

## Public journey coverage

| Journey | Actions actually taken | Evidence and stopping boundary |
| --- | --- | --- |
| Landing page to product explanation | Opened homepage, observed normal load, scrolled through promotional sections | E01/E02/E09/E10; no mobile app interaction |
| Landing page to answers | Clicked FAQ; read its public page and followed known tutorial/pricing/download destinations by browser navigation | E03/E04; no forms submitted |
| Landing page to download destination | Read homepage App Store link; navigated to that observed URL; opened and closed Apple's version-history dialog | E05; no app install or purchase |
| Trust/account documentation | Navigated to linked privacy, terms, and security pages | E06/E07; no account changes |
| Resource and employer boundaries | Navigated to linked blog, case-study, and employer pages; recorded outbound links | E07/E08; social/email/waitlist/auth/API actions excluded |

## Unresolved questions for a separately authorized mobile pass

1. Which authentication methods, profile fields, document formats, and permission prompts are actually required?
2. What are the job card, filters, ranking, and swipe/save/skip persistence rules in an authenticated session?
3. Is review default or optional, which answers/documents are editable, and what happens to changes after approval?
4. Which events put an application on hold, and how do retries, pending cancellation, unsupported forms, and uncertain submission outcomes work?
5. What constitutes a submission receipt and how do recruiter responses reach the tracker/inbox?
6. Which actions consume credits, what resets when, and how do failures/refunds and no-credit jobs interact with subscription plans?
7. How are notification permission, preference changes, subscription cancellation, and account deletion executed?

Enrin's earlier evidence IDs and `/tmp/sorce-*` artifacts were not available in this Windows checkout. They remain historical references in the original scope, not independently validated inputs to this report.
