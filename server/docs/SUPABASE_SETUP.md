# Supabase Free setup for NextStep

## Connected development project

The local application is connected to [NextStep in the NextStep Free organization](https://supabase.com/dashboard/project/rketbbzldqcrljfuczqo). Project reference: `rketbbzldqcrljfuczqo`; region: Canada (Central). The schema, private storage buckets, and localhost authentication redirects are configured. Credentials live only in the ignored `server/.env` file.

The live smoke check passed for sign-in, profile isolation, private PDF upload/download, saved-job snapshots and notes, archiving, and session refresh. Its synthetic accounts, files, and jobs were removed. Six curated help chunks are indexed for Gemini-powered help search. This is a fresh database; accounts and records from the old MongoDB cluster were not restored.

## Live job feed

The supplied OpenWeb Ninja key is saved in the ignored `server/.env`, with `JSEARCH_PROVIDER=openwebninja` and `JOB_API_SOURCE=linkedin`. The enabled subscription is **Real-Time LinkedIn Data**, whose search endpoint is `https://api.openwebninja.com/realtime-linkedin-data/search`. It uses the server-only `x-api-key` header and returns jobs in the `data` array. Keywords and location are sent as separate parameters. The live provider check returned ten listings successfully; setup verification confirmed fifteen unique listings persisted in Supabase and rendered on the Jobs page in Chrome.

The integration fetches one page (ten jobs) per search. Repeated and concurrent searches share a 30-minute cache, and retrieved listings are persisted in Supabase before being displayed. LinkedIn IDs are prefixed separately to avoid collisions with other feeds. Run `npm run check:jobs` from `server/` for an explicit one-request provider check; the older `check:jsearch` command is an alias for the selected feed.

JSearch is a different subscription and remains disabled on this key. To use it later, enable JSearch in the provider account and set `JOB_API_SOURCE=jsearch`; this uses `/jsearch/search-v2` with `data.jobs`. JSearch through RapidAPI remains supported with `JSEARCH_PROVIDER=rapidapi` and a RapidAPI key. Keys are provider-specific. Provider failures are reported with safe error codes, and existing stored listings remain available during an outage. No upstream request headers or credentials are logged.

References: [Real-Time LinkedIn Data](https://www.openwebninja.com/api/real-time-linkedin-data), [JSearch](https://www.openwebninja.com/api/jsearch).

## Create the project

Use a dedicated **NextStep** organization on the **Free ($0/month)** plan. Create a NextStep project near your users. Save the database password in your password manager; the application uses HTTPS API keys and does not need that password.

Enable the Data API. Turn off automatic grants to newly created tables and enable automatic row-level security. The migration explicitly grants only the required access.

## Configure the local application

In Project Settings → API Keys, copy the existing **publishable key** and **secret key**. Legacy projects can use the anon and service_role equivalents. Add these to the Git-ignored `server/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
CLIENT_URL=http://localhost:3000
```

Preserve `GEMINI_API_KEY` and any JSearch configuration already in this file. Never put the secret key in a frontend variable or commit it. The frontend obtains only the URL and publishable key through `/api/auth/config`.

## Apply the database schema

Open the project's SQL editor and execute the entire file:

`supabase/migrations/202610150001_nextstep.sql`

It creates seven tables, owner access policies, an Auth signup trigger, private resume/avatar buckets, and pgvector search functions. It can be run again safely in the dedicated NextStep project. This is a fresh database; it does not attempt to recover the dead MongoDB cluster.

## Configure sign-in

In Authentication → URL Configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/login` and `http://localhost:3000/reset-password`

Keep email/password sign-in and email confirmation enabled. Supabase's built-in development email sender has delivery restrictions and low rate limits; use an allowed organization email for development. For public signups, configure your own SMTP provider. Do not disable confirmation to work around delivery failures.

Google sign-in is optional. Enable the Google provider in Supabase and add your own Google OAuth client ID/secret and authorized callback URL before using that button. Then set `SUPABASE_GOOGLE_ENABLED=true` in `server/.env` to show the Google button. Email sign-in does not need Google configuration.

## Verify

From `server/`:

```sh
npm run check:supabase
npm run test:supabase
npm run test:gemini
```

For an explicit live integration check, run `node scripts/smoke-supabase.js`. It creates synthetic test users and records, tests ownership isolation, and removes those exact fixtures afterward. It does not send signup emails.

Then run `npm run dev` at the repository root. Visit `http://localhost:3000`. Health: `http://localhost:4000/api/health`.

Create a new NextStep account, confirm it, update the profile, upload a synthetic PDF, browse jobs, save a job, and confirm it remains in My Jobs after refreshing. A brand-new database has no job listings until the selected feed fetches them. OpenWeb Ninja is separately configured and billed; Supabase does not provide a jobs feed.

For help chat, `npm run ingest:docs` embeds the small curated help directory. Keep resume contents and private account information out of public documentation.

## Free-plan limits

At setup time, Supabase Free includes 500 MB of database storage and 1 GB of file storage, can pause after one week of inactivity, and does not include automatic backups. Monitor usage in the dashboard. Avoid collecting an unlimited jobs archive or repeatedly uploading large resumes. No upgrade or paid subscription is required for this setup.

Sources: [Supabase pricing](https://supabase.com/pricing), [API keys](https://supabase.com/docs/guides/api/api-keys), [Auth email restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
