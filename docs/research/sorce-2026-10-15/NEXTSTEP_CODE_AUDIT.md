# NextStep code audit for the Sorce research pass

Date: 2026-10-15  
Inspected commit: `23b9154df032e994685ac8f85ffef2bedd632873`  
Method: read-only static inspection of the React UI, Express routes, controllers, and services. The checkout was clean when inspection began. No application flow was executed, database queried, external account accessed, resume uploaded, or application submitted.

This document describes what the inspected code implements. A connected integration is not proof that its credentials, dependencies, data, or deployed runtime work. Recommendations below are proposed NextStep designs, not findings about Sorce's private implementation. Source links are relative to this document and use GitHub line anchors; line numbers refer to the inspected commit.

## Main conclusion

NextStep already has profile editing, resume analysis integration, external job sourcing, semantic matching, swipe gestures, and a tracker UI. Its advertised auto-apply path currently records an application in MongoDB without submitting anything to an employer. The highest-priority opportunity is to establish a truthful application lifecycle and durable tracking before adding more automated submission behavior.

## Current behavior

### Account entry and profile

Email/password signup/signin and Google authentication are routed. Successful sign-in navigates directly to the homepage. The route list has a separate profile page but no guided onboarding route. See [Login handlers](../../../src/pages/Login.jsx#L48-L104), [client routes](../../../src/App.jsx#L158-L170), and [server auth routes](../../../server/server.jsx#L133-L146).

Selecting a resume calls `/analyze-resume`. Its backend uploads the document to OpenAI and requests skills, experiences, and a suggested job title. The UI consumes only the returned skills, asks the user to review them, and lets the user save the profile. Profile saving accepts contact fields, location, skills, photo, and resume, and attempts to generate a skills/location embedding. This is real integration code, whose live service operation was not tested. See [resume selection and review](../../../src/pages/Profile.jsx#L85-L107), [profile submission](../../../src/pages/Profile.jsx#L143-L164), [resume analysis route](../../../server/server.jsx#L265-L289), [extraction request](../../../server/middleware/AnalyzePdf.jsx#L28-L49), and [profile persistence](../../../server/controllers/profileController.jsx#L64-L128).

The profile controller does not accept structured experience, education, work authorization, salary preferences, remote preferences, reusable screening answers, or document versions. The extracted experiences and suggested title are therefore not incorporated into the editable application profile by this flow.

### Discovery and matching

The job service calls JSearch and normalizes its listings, including the external application URL, source, dates, location, remote status, and salary fields. Browse Jobs combines external results with internal MongoDB jobs and attempts semantic search before a direct-search fallback. The homepage queries using the first three profile skills plus location, ranks at most 30 candidates using embedding similarity, and returns 20. See [JSearch request](../../../server/services/jobApiService.jsx#L61-L90), [normalized job fields](../../../server/services/jobApiService.jsx#L113-L138), [combined search](../../../server/controllers/jobsController.jsx#L24-L80), [homepage query](../../../server/controllers/jobsController.jsx#L286-L311), and [ranking](../../../server/controllers/jobsController.jsx#L397-L483).

The Browse Jobs UI exposes a text search input rather than a structured preference/filter panel. See [search form](../../../src/pages/BrowseJobs.jsx#L163-L174). Existing normalized fields offer a starting point for such filters, but their presence is not proof that the UI supports them.

Any empty combined result is represented as an “API Rate Limit Reached” demo card, even when there is no evidence that the cause was a rate limit. The homepage does likewise. The JSearch service catches upstream failures and returns an empty array, so the homepage's exception-based internal fallback does not activate for most failures swallowed by that service. See [Browse empty-state handling](../../../server/controllers/jobsController.jsx#L82-L97), [homepage fallback and empty state](../../../server/controllers/jobsController.jsx#L314-L375), and [service failure handling](../../../server/services/jobApiService.jsx#L91-L104).

### Apply means different things on different surfaces

| Surface/action | End-to-end code behavior | Evidence |
| --- | --- | --- |
| Homepage right swipe | Calls `/auto-apply`; the server inserts a local row with `status: "Auto-Applied"`; the UI shows “Auto-applied successfully!” | [Swipe request and success](../../../src/components/Swipe.jsx#L86-L103); [complete handler](../../../server/controllers/applicationsController.jsx#L280-L323) |
| Browse external “Apply on Site” | Opens `jobUrl` in another browser tab. It bypasses the application endpoint and does not establish that an employer received an application. | [JobCard handler](../../../src/components/JobCard.jsx#L24-L30); [button label](../../../src/components/JobCard.jsx#L63-L65) |
| Browse internal “Apply” | `JobCard` calls `onApplyClick(job_id)`, but the assigned callback expects `(jobId, jobData)` and reads `jobData.title`. This path fails before posting because the second argument is absent. | [caller](../../../src/components/JobCard.jsx#L24-L30); [callback](../../../src/pages/BrowseJobs.jsx#L109-L124); [callback assignment](../../../src/pages/BrowseJobs.jsx#L199-L215) |
| Internal job details “Apply” | Calls `/jobsTracker`, which inserts a local `Pending` row. The UI displays “Application successful!” | [details action](../../../src/pages/Details.jsx#L27-L39); [tracking handler](../../../server/controllers/applicationsController.jsx#L27-L73) |

The complete `/auto-apply` handler loads the user, checks for an existing record, inserts an application, and returns success. It does not use the accepted `jobUrl`, `title`, or `companyName` after destructuring them. It does not use the resume, fill employer forms, upload employer documents, generate screening answers, or obtain submission confirmation. No application worker, retry sequence, or confirmation-verification step is part of this handler. The separate `autoApplyAgent` service is an HTTP wrapper around the same endpoint, not a submission executor. See [complete server handler](../../../server/controllers/applicationsController.jsx#L280-L323) and [client service](../../../src/services/autoApplyAgent.js#L5-L35).

The homepage also sends `companyWebsite` as `jobUrl`, while Browse Jobs' callback sends `jobData.jobUrl`. An eventual submission runner must receive the actual application URL consistently. See [homepage payload](../../../src/components/Swipe.jsx#L94-L99), [Browse payload](../../../src/pages/BrowseJobs.jsx#L115-L120), and [JSearch application link mapping](../../../server/services/jobApiService.jsx#L127).

### Swipe persistence and recovery

Left swipe writes a record to `rejectedJobs`; up swipe only removes a card from current React state. Right/left swipe starts an asynchronous action without awaiting it and removes the card immediately, with no rollback if the request fails. See [request handling](../../../src/components/Swipe.jsx#L86-L122), [gesture completion](../../../src/components/Swipe.jsx#L210-L248), and [rejection persistence](../../../server/controllers/applicationsController.jsx#L325-L338).

Both main discovery handlers filter using `applications` only. They do not consult `rejectedJobs`, so a persisted rejection does not reliably exclude a listing from future discovery. See [Browse filtering](../../../server/controllers/jobsController.jsx#L109-L120) and [homepage filtering](../../../server/controllers/jobsController.jsx#L378-L388). This is a code-level consequence, not a claim based on a replayed session.

### Tracker, statuses, and withdrawal

`/applications` looks up local `Jobs` and `companies` records and unwinds both without preserving missing matches. External jobs use string IDs, and the auto-apply row saves no title/company/URL snapshot. External application records with no corresponding local job/company therefore disappear from the returned tracker list. See [tracker joins](../../../server/controllers/applicationsController.jsx#L97-L121), [external ID mapping](../../../server/services/jobApiService.jsx#L113-L127), and [application record fields](../../../server/controllers/applicationsController.jsx#L299-L312).

My Jobs displays the stored status. The inspected route set contains no application-state update endpoint. The notes “save” function updates React state only, so the notes are not persisted by this path. “Withdraw” deletes the local application record after checking ownership; it does not contact an external employer. See [status display](../../../src/pages/YourJobs.jsx#L136-L141), [notes save](../../../src/pages/YourJobs.jsx#L74-L76), [withdraw UI](../../../src/pages/YourJobs.jsx#L79-L91), [withdraw handler](../../../server/controllers/applicationsController.jsx#L249-L273), and [application-related route set](../../../server/server.jsx#L208-L335).

### Notifications and usage controls

The product notification component inspected is a dismissible client banner with a default three-second timeout. The application routes/controllers/services and UI contain no implemented application-event delivery, notification preferences, user credit ledger, subscription enforcement, or daily swipe enforcement. This finding concerns the inspected repository, not any separately deployed service. Provider/API quota messages must not be confused with user account limits. See [notification component](../../../src/components/NotificationBanner.jsx#L4-L11), [application/account route set](../../../server/server.jsx#L208-L339), and [API availability demo card](../../../server/controllers/jobsController.jsx#L82-L97).

## Prioritized recommended design and acceptance criteria

These are proposals informed by the code gaps and the research scope. They are not implemented by this research deliverable, and no external execution is authorized by this document.

### 1. Establish a truthful application lifecycle

Separate interest/request, queued, needs review, submitting, confirmed submitted, and failed. Reuse the authenticated action endpoint and tracker shell. Until an actual runner exists, describe a local record as saved/requested, and describe an external link as opening the employer site.

Acceptance criteria:

- Every apply surface has an explicit, consistent meaning and uses the same application contract where appropriate.
- A local database insert or opening an external URL cannot produce a “submitted” result.
- Submission success requires a stored confirmation signal, timestamp, source, and associated attempt.
- Errors and unanswered questions produce visible failed/needs-review states rather than success.
- Repeated requests cannot create duplicate submissions; retry eligibility and attempt history are explicit.
- An initial adapter is verified with controlled synthetic data and a test destination before any separately authorized live rollout.

### 2. Build a reviewed application profile and answer bank

Extend the existing upload, extract, review, and save loop to structured employment/education, job preferences, document versions, and user-approved reusable answers.

Acceptance criteria:

- Extracted skills, experiences, and other supported fields can be inspected, corrected, and persisted rather than silently discarded.
- Fields distinguish user-approved facts, extracted suggestions, and missing information.
- Every application records the specific approved profile/resume version used.
- Missing or uncertain screening answers pause the request for user input; the system does not invent qualifications.
- Users can review what will be submitted and change reusable answers for future requests.

### 3. Make tracking independent of current job availability

Store a durable job/application snapshot containing source ID, title, employer, application URL, selected resume version, state transitions, timestamps, and confirmation evidence. Preserve history if the source listing or local company disappears.

Acceptance criteria:

- External and internal application requests remain visible without successful joins to a live job/company record.
- Notes survive refresh and a new session.
- Status history explains the latest state and records who or what changed it.
- “Remove from tracker” and “withdraw from employer” have distinct behavior and copy; employer withdrawal is claimed only when supported and confirmed.
- Existing local-only records are labeled accurately rather than retroactively treated as confirmed submissions.

### 4. Make swipe actions reliable and reversible

Unify action wiring across Browse Jobs, details, and swipe. Persist the intended skip/reject semantics, preserve the actual application URL, and make failures recoverable.

Acceptance criteria:

- Internal Browse Apply receives its required job data and completes the intended request.
- Every application request uses the normalized application URL, not the employer homepage.
- Cards are removed after acknowledgment, or restored with a clear retry action when an optimistic request fails.
- Persisted rejected jobs are consistently excluded from subsequent discovery according to a documented policy.
- Skip is explicitly temporary or persistent; undo is offered where it can actually reverse the decision.
- Concurrent/repeated gestures do not enqueue duplicate submissions or corrupt the visible feed.

### 5. Expose useful preferences, real limits, and actionable notifications

Use the existing normalized fields to support title, location, remote, salary, and employment preferences, and explain why jobs match. Represent upstream empty/error states accurately. Notify users when application state requires attention or changes meaningfully. If monetized limits are introduced, define their economics before copying any advertised competitor quota.

Acceptance criteria:

- Supported filters affect both request construction and displayed results, with explicit treatment of missing job data.
- Empty results, missing configuration, upstream errors, and confirmed provider rate limits produce distinct states.
- Application notifications correspond to persisted transitions and have user-controlled delivery preferences.
- Any user quota is enforced on the server and clearly states which action consumes a unit and when it resets.
- Failed attempts and retries follow an explicit credit policy; counters stay consistent across tabs/devices.

## Suggested sequence

First correct misleading success copy and broken apply wiring. Next establish the durable application/profile contracts and tracker. Then implement one controlled submission adapter with synthetic-data validation and confirmation evidence before expanding coverage. Discovery preferences and a polished swipe interaction are useful, but they cannot substitute for correct application state.
