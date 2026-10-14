# Sorce.jobs Reverse Engineering Scope

## Objective

Use [REA](https://github.com/morluto/rea) to document Sorce.jobs' publicly observable product flows and web implementation as a reference for NextStep. Keep observed behavior, static findings, and hypotheses separate. Do not treat Sorce's marketing claims as independently verified product outcomes.

## Investigation boundaries

The investigation covers the public Sorce.jobs site and the job seeker product surfaces linked from it. Prioritize:

1. **Marketing site:** navigation, landing page, calls to action, feature explanations, public resources, and download links.
2. **Onboarding and profile setup:** account entry points, resume intake, profile fields, permissions, and stated user choices.
3. **Job discovery:** job feed, search and filters, job cards and details, swipe/skip/apply actions, and limits or feedback shown to users.
4. **Application automation:** what the product says it will submit, what it asks the user to review, screening question handling, and submission status.
5. **Progress and account management:** application tracking, notifications, profile editing, subscription or usage limits, and account controls.
6. **Web implementation:** routes, loaded JavaScript assets, script and chunk relationships, observable endpoints and storage key names, and runtime execution only where capture evidence supports it.

The first pass is unauthenticated and read-only. Do not submit applications, upload a real resume, provide personal data, accept legal terms, or make purchases as part of this scope. Record any flow that requires those actions as an unresolved boundary and use a synthetic account or test data only if the user later authorizes an appropriate controlled replay.

## Evidence workflow

Use the `reverse-engineer-anything` skill and the connected REA tools:

1. Identify the target browser page with `list_browser_targets` and inspect it using `inspect_web_page` and `capture_web_screenshot`.
2. Analyze loaded web scripts with `analyze_web_bundle` (include script sources when needed), then follow specific route, endpoint, or module questions with REA's analysis views and trace tools.
3. Use passive runtime captures for evidence about what was loaded or executed. Treat page declarations, route candidates, endpoint strings, and static relationships as candidates until corroborated.
4. For user-visible interactions, capture each page/state as evidence. Use controlled replay only for a specific, authorized, low-impact action; stop before external submissions or legal/financial commitments.
5. Keep an evidence ledger with evidence ID, capture date, evidence type, claim, coverage, and limitations. Distinguish **observed**, **derived**, **inferred**, and **unknown** conclusions.

### Browser setup needed for runtime evidence

REA's browser tools require a literal loopback Chrome DevTools Protocol endpoint and a selected target ID. The existing Chrome listener on `127.0.0.1:9222` returned HTTP 404 for `/json/list` and `/json/version`, so it is not currently usable as a CDP endpoint. The next runtime pass should use a separate Chrome process with a fresh temporary profile and a free loopback port (planned: `9223`), navigate it to Sorce.jobs, then select its target with REA. Keep this profile isolated from the user's regular browser profile.

## Findings already collected

### Public product description

The [Sorce homepage](https://www.sorce.jobs/) describes a swipe-based job search product. It says users swipe right to request an AI-assisted application and swipe left to skip; it describes reading a resume and reusing the information to fill forms, upload documents, and answer screening questions. The page also advertises 40 free swipes per day and directs visitors to download the mobile app.

These are **site claims**, observed in the public page text. The actual job feed, swipe behavior, profile flow, application automation, and usage enforcement have not been observed.

### Static web artifact

The homepage HTML referenced Next.js static assets under `/_next/static/`. The downloaded homepage entry chunk was parsed by REA as inert JavaScript; REA identified a Webpack `webpackChunk_N_E` module. This supports the inference that the marketing page is served as a Next.js/Webpack bundle. Static parsing did not execute the page or establish runtime behavior.

| Evidence | Scope | Notes |
| --- | --- | --- |
| `ev_3d03b26993e49b3eaad0624cbfed579e03ea51bea6041322b342986e619260d8` | Downloaded homepage HTML and 26 linked script assets | REA analyzed 26 JavaScript files; graph and semantic coverage were partial due worker/result budget limits. |
| `ev_3febfc39bd66cd3eaae8487921647130d21d01072ef71855132b21b1974d4c24` | Focused analysis of the homepage entry chunk and HTML | REA parsed the entry chunk; the associated module view identified a Webpack module in chunk `405`. |
| `ev_818444defa914a969bb75c7c79a1d47e0460591b33204039368d832748f402b7` | Summary view for the focused artifact | 1 JavaScript file parsed, no parse failures; static semantic coverage remains incomplete. |

Downloaded artifacts were kept under `/tmp/sorce-jobs-web` and `/tmp/sorce-homepage-entry`; they are analysis inputs, not source code from Sorce's repository. They do not include a complete site bundle or prove all page resources were captured.

## Open questions

- What pages and interaction states are available without signing in?
- Does the mobile app listing provide additional public detail about onboarding, permissions, plans, or supported job sources?
- What does the job discovery card show, and what exactly happens after a swipe?
- Does Sorce preview or confirm AI-generated answers before submitting an application?
- What public route and backend endpoint candidates appear in the loaded bundle, and which are actually requested at runtime?
- Which behaviors belong to the website versus the mobile app?
- What usage limits, subscription prompts, privacy controls, and application status states are visible?

## Completion criteria

The public-surface pass is complete when the homepage and linked public pages have been inventoried, their principal user journeys are documented with screenshots or page evidence, the relevant web bundle has been analyzed with stated coverage limits, and unresolved authenticated or mobile-only behavior is listed explicitly. Do not claim to have reverse engineered the full product based on the marketing site alone.
