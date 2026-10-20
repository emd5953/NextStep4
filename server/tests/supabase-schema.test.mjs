import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

test('Supabase migration, RLS, private storage, uniqueness, and vector search', async t => {
  const db = new PGlite({ extensions: { vector } });
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  try {
    // Supabase-managed infrastructure, reproduced locally for SQL integration tests.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'),1)-1] $$;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      grant select, insert, update, delete on storage.objects to authenticated;
    `);
    const sql = await readFile(new URL('../../supabase/migrations/202610150001_nextstep.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql); // Dashboard retries must not destroy existing data.
    await db.query('insert into auth.users(id, raw_user_meta_data) values ($1, $2), ($3, $4)', [alice, { full_name: 'Alice' }, bob, { full_name: 'Bob' }]);
    await db.exec("insert into public.jobs(id,title,company_name,data) values ('ext_test','Developer','Test Co','{}');");
    async function asUser(user, action) {
      await db.exec('set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
      try { await action(); } finally { await db.exec('reset role'); }
    }
    await t.test('signup trigger creates profiles and owners cannot read or modify other profiles', async () => {
      await asUser(alice, async () => {
        assert.equal((await db.query('select full_name from profiles')).rows[0].full_name, 'Alice');
        assert.equal((await db.query('select * from profiles')).rows.length, 1);
        assert.equal((await db.query("update profiles set full_name = 'wrong' where id = $1 returning id", [bob])).rows.length, 0);
        await assert.rejects(db.query('insert into profiles(id) values ($1)', [bob]), /row-level security/);
      });
    });
    await t.test('anonymous users can browse jobs but cannot access profiles', async () => {
      await db.exec('set role anon');
      try {
        assert.equal((await db.query('select * from jobs')).rows.length, 1);
        await assert.rejects(db.query('select * from profiles'), /permission denied/);
        await assert.rejects(db.query("insert into jobs(id,title) values('bad','bad')"), /permission denied/);
      } finally { await db.exec('reset role'); }
    });
    await t.test('resume objects stay private and user paths are enforced', async () => {
      assert.deepEqual((await db.query('select public from storage.buckets')).rows.map(r => r.public), [false, false]);
      await asUser(alice, async () => {
        await db.query("insert into storage.objects(bucket_id,name) values('resumes',$1)", [alice + '/test.pdf']);
        await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('resumes',$1)", [bob + '/test.pdf']), /row-level security/);
      });
      await asUser(bob, async () => assert.equal((await db.query('select * from storage.objects')).rows.length, 0));
    });
    await t.test('saved jobs are unique, private, truthful, and preserve their original snapshot', async () => {
      await asUser(alice, async () => {
        await db.query('insert into applications(user_id,job_id,job_snapshot) values($1,$2,$3)', [alice, 'ext_test', { title: 'Original title' }]);
        await assert.rejects(db.query('insert into applications(user_id,job_id,job_snapshot) values($1,$2,$3)', [alice, 'ext_test', {}]), /duplicate key/);
        assert.equal((await db.query('select status from applications')).rows[0].status, 'Saved');
        await assert.rejects(db.query("update applications set status = 'Auto-Applied'"), /check constraint/);
        await assert.rejects(db.query("update applications set job_snapshot = '{}'"), /permission denied/);
        await db.query("update applications set notes = 'Follow up', status = 'Withdrawn'");
      });
      await db.query("update jobs set title = 'Changed provider title'");
      await asUser(alice, async () => assert.equal((await db.query('select job_snapshot from applications')).rows[0].job_snapshot.title, 'Original title'));
      await asUser(bob, async () => {
        assert.equal((await db.query('select * from applications')).rows.length, 0);
        assert.equal((await db.query("update applications set notes = 'wrong' returning id")).rows.length, 0);
      });
    });
    await t.test('vector search excludes incompatible embedding models', async () => {
      const embedding = JSON.stringify(Array(1536).fill(0.1));
      await db.query('update jobs set embedding=$1, embedding_model=$2', [embedding, 'gemini-embedding-2']);
      const good = await db.query('select * from match_jobs($1,$2,10)', [embedding, 'gemini-embedding-2']);
      assert.equal(good.rows.length, 1);
      assert.ok(good.rows[0].score > 0.99);
      assert.equal((await db.query('select * from match_jobs($1,$2,10)', [embedding, 'old-provider'])).rows.length, 0);
      const ragEmbedding = JSON.stringify(Array(768).fill(0.1));
      await db.query('insert into rag_documents(collection,id,content,embedding,embedding_model) values($1,$2,$3,$4,$5)', ['help','doc','Help text',ragEmbedding,'gemini-embedding-2']);
      assert.equal((await db.query('select * from match_documents($1,$2,$3,5)', [ragEmbedding,'gemini-embedding-2','help'])).rows[0].content, 'Help text');
      assert.equal((await db.query('select * from match_documents($1,$2,$3,5)', [ragEmbedding,'legacy','help'])).rows.length, 0);
    });
  } finally { await db.close(); }
});
