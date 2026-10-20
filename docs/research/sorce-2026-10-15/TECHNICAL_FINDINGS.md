# Sorce public web implementation findings

Capture date: October 15, 2026. Target: `https://www.sorce.jobs/`. This is the public marketing website; no authenticated job-seeker session or mobile binary was inspected.

## Acquisition and provenance

REA MCP tools were absent. A read-only `rea doctor --client codex --json` reported missing registration/skill identity; Node 24.21.0 was compatible. The official `rea-agents@6.5.0` CLI was obtained through npm. The investigation skill was read from the official repository at commit `cf0a38ad9774ee9acff3164052688f7a58a1c72c`, skill version 42. No MCP configuration or native analysis engine was installed.

Automatic approval review rejected the proposed separate headless Chrome process with loopback debugging port 9223; the returned reason was `blocked by policy`. No process handle was returned. The supported in-app browser then supplied the page observations and tab-scoped CDP capability. This was a different supported acquisition path, not a claim that REA's CDP browser tools succeeded.

`Debugger.scriptParsed` identified the first-party loaded scripts. `Debugger.getScriptSource` retrieved the 25 external `/_next/` scripts; inline page scripts, browser host scripts, third-party scripts, source maps, and scripts only reached on other routes were not included in the REA input. Original URL, capture-local script ID, CDP hash, byte count, and independently calculated SHA-256 are in [captured-scripts.json](evidence/captured-scripts.json). [The script archive](evidence/captured-homepage-scripts.zip) preserves the exact analysis inputs as inert research artifacts.

A normal homepage reload was observed through `Network` events. The saved network projection deliberately retains URL, method, type, status, MIME type, initiator type, request ID, and failure text, not headers, cookies, request bodies, or response bodies. `Debugger` and `Network` were disabled after capture. These are native browser observations, not REA Evidence records. No execution-coverage capture was performed: a parsed script does not establish that each module or function ran.

## REA result and coverage

Command, run from the temporary research directory:

```powershell
npx --yes rea-agents@6.5.0 analyze-javascript-application captured-homepage --max-semantic-nodes 40000 --max-semantic-nodes-per-file 8000 --analysis-timeout-ms 60000 --json > homepage-rea.json
```

Actual REA Evidence ID:

`ev_757134b24bd5bb9cf4fead305eee8ab42de4068e13bd87175fe7bdd85327c77d`

| Metric | Result |
| --- | --- |
| Selected and parsed JavaScript files | 25 of 25 captured files |
| UTF-8 source bytes read | 1,023,950 |
| Parse failures / invalid UTF-8 files | 0 / 0 |
| REA statistics modules / findings | 292 / 772; these are tool counts, not product features |
| Application graph | Partial; no truncation reported at that graph level |
| Semantic graph | Partial and truncated; 8,000 nodes per file and 40,000 total node ceilings |
| Static relationship kinds | 716 imports, 367 containment, 20 persistence, 8 calls, 3 exposure, 1 load |

The [compact projection](evidence/rea-analysis-summary.json) preserves statistics, graph coverage, limits, and endpoint/storage/chunk observations. The [complete unchanged REA output](evidence/homepage-rea.json.gz) is gzip-compressed for portability; decompress it to inspect all nodes, source ranges, unknowns, and the tool's own evidence metadata. The compact projection is a derived convenience file, not a separately issued REA record. The capture and archive SHA-256 values are in [manifest.json](evidence/manifest.json).

All files parsed successfully does not mean all code relationships were recovered. Dynamic expressions, missing bundles, resource ceilings, browser-only imports, and absent server/mobile artifacts constrain the result. Static analysis never executed the source.

## Script and module relationships

| Captured artifact | Static finding | Interpretation boundary |
| --- | --- | --- |
| `page-584b2873d760ef34.js` | `webpackChunk_N_E` chunk 405; four recovered bundled modules including `HomeHeroExperiment` (63470), `HomeInteractive` (62488), and a video component (18870) | Marketing bootstrap/components. Their presence does not show which component rendered in the current page. |
| `layout-1a140042fadad6a2.js` | Chunk 3185; seven recovered bundled modules. Module 15108 exports `FirebaseProvider`; 17293 initializes Firebase; 40331 attaches download-click tracking; 81193 handles analytics deduplication. | Shared website code. Not proof of mobile auth, database selection, or a job-seeker backend. |
| Shared dependency chunks | Framework, Firebase-related, analytics, and UI code coexist with page components | A loaded vendor library does not establish that every optional service or API is used. |

For example, the entry chunk retains older hero-copy variants, while the captured DOM displays the newer homepage. A literal string in a bundle cannot determine the current UI. Module 63470 is `jag_node_2aa5f44b81c60805b7e5d525634aa5caf157ab7d94b5c57a091cf2f5b75b0057` in the full REA result; its source range is line 1, columns 689–2622 of the captured entry file.

## Endpoint candidates and observed requests

REA produced nine endpoint-kind graph nodes. Manual source-context checks prevent treating all nine as backend APIs:

| Candidate | Source observation | Disposition |
| --- | --- | --- |
| `/__cookies__` | `fetch` and Firebase-related persistence code in `0d36cfa1-229c8f7b412d3ed5.js` | Static candidate only; not observed in the reload request window. No probing performed. |
| `/_next/image` | Framework image-loader configuration in `6157-80ffe98dd051ba11.js` | Image-service route candidate, not application submission. |
| `utm_source` | `new URLSearchParams(...).get("utm_source")` in `4196-937ffd378891ec7e.js` | Query-parameter read misclassified by a broad `.get()` heuristic; not an endpoint. |
| `[]`, `[...]`, `[[...]]` | `children.get(...)` in framework routing code | Data-structure lookups; not network endpoints. |
| `ph_debug`, `set-cookie`, empty string | Generic accessors or incomplete/dynamic context | Insufficient evidence for API routes. |

The saved [network window](evidence/homepage-network.json) has 81 request events, 81 response events, and two `loadingFailed` events; event pagination reported no evicted entries. Some requests have both a response and a later abort, so these counts are not independent successful/failed request totals.

Observed hosts include the Sorce origin, Google Fonts, Vercel blob storage, PostHog, and OpenAI analytics destinations. The shared layout also contains `window.oaiq` measurement code. The capture records metadata, not payloads; it cannot establish what personal data, if any, a service received. Browser-generated telemetry requests are distinct from an investigator submitting application forms.

No URL containing `/api/` was observed in this one public homepage window. No job-feed, screening-answer, or application-submission endpoint was established. There was no endpoint enumeration, authenticated request replay, or access-control testing. Sorce's separately linked employer developer documentation must not be mistaken for the job-seeker application backend.

## Storage names

REA recovered static local-storage key literals `ph_debug`, `test`, and `lastSeenSurveyDate` in an analytics-related chunk, alongside dynamic local/session storage and IndexedDB calls. Inspection of layout module 81193 identified `sorce:oaiq:last_download_button_click`, used in session-storage code for analytics deduplication.

Runtime `DOMStorage.getDOMStorageItems` was unsupported through the scoped browser capability. [The recorded limitation](evidence/homepage-storage-keys.json) is not evidence of empty storage. No storage values were collected. These names are static candidates, not verified populated keys, tokens, or application state.

## Technical conclusions for NextStep

The useful reconstruction is the public interaction model and its product requirements. This evidence does not recover Sorce's native app implementation, matching/ranking internals, job ingestion pipeline, ATS adapters, AI prompts, queues, receipt verification, or credit accounting. Firebase/Next.js/analytics code on a shared marketing page does not justify changing NextStep's stack.

Keep an evidence boundary in the implementation plan: a proposed NextStep queue, state machine, answer bank, and submission adapter are designs derived from the user need and current code gaps. They are not recovered proprietary algorithms.
