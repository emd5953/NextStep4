# NextStep Server

NextStep uses Supabase PostgreSQL, Auth, private Storage, and pgvector. Gemini supplies resume analysis, chat, and embeddings. MongoDB and ChromaDB are no longer required.

## Setup

Follow [Supabase setup](docs/SUPABASE_SETUP.md). Keep the project in a Free organization.

1. Install dependencies with `npm install` from the repository root.
2. Add the Supabase project URL, publishable key, and server secret key to `server/.env`. Preserve the existing Gemini key.
3. Run [the SQL migration](../supabase/migrations/202610150001_nextstep.sql) in the project's SQL editor.
4. Set Auth's Site URL to `http://localhost:3000` and allow `http://localhost:3000/login` and `http://localhost:3000/reset-password`.
5. From `server/`, run `npm run check:supabase`.
6. Run `npm run dev` from the repository root. Frontend: port 3000; API: port 4000.

Accounts from the old MongoDB database do not exist in this fresh project. Create a new account. The browser manages Supabase sessions and token refresh; the API verifies tokens with Supabase Auth and performs private queries under the user's row-level security policies.

## Gemini free-tier setup

The existing `GEMINI_API_KEY` stays in `server/.env`. Use a Google AI Studio project showing **Free tier**, with billing disabled. Defaults are `gemini-3.5-flash-lite` and `gemini-embedding-2`. Jobs/profiles use 1536-dimensional vectors; documentation uses 768.

Run `npm run check:gemini` for a live synthetic check, or `npm run test:gemini` for offline regression tests. Quota errors do not trigger a paid fallback. Search still returns available jobs if AI ranking is unavailable.

## Storage and saved jobs

The live jobs feed uses OpenWeb Ninja's Real-Time LinkedIn Data subscription. Set `JSEARCH_PROVIDER=openwebninja`, `JOB_API_SOURCE=linkedin`, and the existing `JSEARCH_API_KEY` in `server/.env`. Run `npm run check:jobs` for a live check. Searches fetch one page, share a 30-minute cache, and persist listings in Supabase. JSearch remains available as a separate optional subscription; see the setup guide for switching sources.

Resume PDFs are versioned in the private `resumes` bucket. Photos use the private `avatars` bucket. The API returns signed URLs that expire after one hour.

Saving a job records an immutable listing snapshot, **not an employer submission**. Open the employer link from My Jobs to apply. Notes persist in Postgres. Removing a saved job archives its tracker entry and does not contact the employer. Actual browser/application automation remains future work.

## Documentation chat

Run `npm run ingest:docs` from `server/` to embed the curated public help files in `server/help/`. This uses the Gemini quota and stores vectors in Supabase. Ingestion is explicit; server startup does not consume embedding quota. No Docker service is needed.

## Checks

- `npm run test:supabase`: API tests plus an actual local Postgres/pgvector migration and RLS test using PGlite. No cloud credentials required.
- `npm run test:gemini`: mocked Gemini regression checks.
- `npm run check:supabase`: read-only checks against the configured cloud project.
- `npm run check:jobs`: one live search against the selected jobs subscription.
- `npm run build` from repository root: frontend build.

Legacy MongoDB migration/backup scripts and older architecture documents are retained as historical references. They are not part of the current setup and must not be used against the Supabase project.
