# NextStep quick start

The current backend uses Supabase and Gemini. Follow [Supabase setup](SUPABASE_SETUP.md) first.

1. Configure `server/.env` without overwriting existing keys.
2. Apply `supabase/migrations/202610150001_nextstep.sql` to the new project.
3. From `server/`, run `npm run check:supabase`.
4. Run `npm run dev` from the repository root.
5. Open `http://localhost:3000` and create a new account.

For documentation chat, run `npm run ingest:docs` from `server/`. This embeds the curated public help directory with Gemini and stores it in Supabase pgvector. MongoDB, ChromaDB, and Docker are no longer required.
