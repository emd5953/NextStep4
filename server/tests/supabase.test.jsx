const mockUserClient = jest.fn();
const mockAdminClient = jest.fn();
const mockEmbed = jest.fn();
const mockSearch = jest.fn();
jest.mock('../services/supabaseService.js', () => ({
  ...jest.requireActual('../services/supabaseService.js'),
  createUserClient: (...args) => mockUserClient(...args),
  getAdminClient: (...args) => mockAdminClient(...args)
}));
jest.mock('../middleware/genAI.jsx', () => ({ generateEmbeddings: (...args) => mockEmbed(...args) }));
jest.mock('../services/jobApiService.jsx', () => ({ searchJobs: (...args) => mockSearch(...args) }));
const request = require('supertest');
const app = require('../server.jsx');
const { publicConfig } = require('../services/supabaseService.js');
const alice = '00000000-0000-4000-8000-000000000001';
let queries, resolveQuery, db;
function query(table) {
  const entry = { table, operations: [] };
  queries.push(entry);
  const builder = {};
  for (const method of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'insert', 'update', 'upsert', 'delete', 'single', 'maybeSingle', 'textSearch']) {
    builder[method] = (...args) => { entry.operations.push([method, ...args]); return builder; };
  }
  builder.then = (resolve, reject) => Promise.resolve(resolveQuery(entry)).then(resolve, reject);
  return builder;
}
const op = (q, method) => q.operations.find(o => o[0] === method);
beforeEach(() => {
  queries = [];
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_never_return_me';
  delete process.env.JSEARCH_API_KEY;
  resolveQuery = () => ({ data: [], error: null });
  db = { from: query, rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: alice, email: 'alice@example.test' } }, error: null }) },
    storage: { from: jest.fn(() => ({ createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.test/signed-file' } }), upload: jest.fn(), remove: jest.fn() })) }
  };
  mockUserClient.mockReset().mockReturnValue(db);
  mockAdminClient.mockReset().mockReturnValue(db);
  mockEmbed.mockReset().mockResolvedValue(Array(1536).fill(0.1));
  mockSearch.mockReset().mockResolvedValue([]);
});

test('public config never includes the secret key and rejects privileged keys in the public field', async () => {
  const response = await request(app).get('/api/auth/config');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ url: process.env.SUPABASE_URL, publishableKey: 'sb_publishable_test', googleEnabled: false });
  expect(JSON.stringify(response.body)).not.toContain('sb_secret_');
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_wrong_field';
  expect(() => publicConfig()).toThrow('publishable');
  process.env.SUPABASE_PUBLISHABLE_KEY = 'a.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.b';
  expect(() => publicConfig()).toThrow('publishable');
});
test('private routes require a Supabase-verified session', async () => {
  expect((await request(app).get('/api/profile')).status).toBe(401);
  db.auth.getUser.mockResolvedValue({ error: { message: 'invalid' } });
  expect((await request(app).get('/api/profile').set('Authorization', 'Bearer forged')).status).toBe(401);
  expect(queries).toHaveLength(0);
});
test('profile returns a private signed resume URL and never returns embedding data', async () => {
  resolveQuery = q => ({ data: q.table === 'profiles' ? { id: alice, full_name: 'Alice', skills: [], skills_embedding: [1, 2] } : [{ storage_path: alice + '/resume.pdf', original_name: 'resume.pdf', mime_type: 'application/pdf' }] });
  const response = await request(app).get('/api/profile').set('Authorization', 'Bearer valid');
  expect(response.status).toBe(200);
  expect(response.body.email).toBe('alice@example.test');
  expect(response.body.resumeFile.url).toBe('https://example.test/signed-file');
  expect(response.body.skills_embedding).toBeUndefined();
  expect(queries[0].operations).toContainEqual(['eq', 'id', alice]);
  expect(mockUserClient).toHaveBeenCalledWith('valid');
  expect(mockAdminClient).not.toHaveBeenCalled();
});
test('another user cannot fetch a private applicant profile', async () => {
  const response = await request(app).get('/api/userProfile/someone-else').set('Authorization', 'Bearer valid');
  expect(response.status).toBe(403);
  expect(queries).toHaveLength(0);
});
test('profile updates validate skills before writing and cannot change verified email', async () => {
  resolveQuery = () => ({ data: { id: alice, skills: [] } });
  const invalid = await request(app).post('/api/updateprofile').set('Authorization', 'Bearer valid').field('skills', 'not json');
  expect(invalid.status).toBe(400);
  const email = await request(app).post('/api/updateprofile').set('Authorization', 'Bearer valid').field('email', 'someone@example.test');
  expect(email.status).toBe(400);
  expect(queries.some(q => op(q, 'update'))).toBe(false);
});
test('a profile edit still saves while invalidating its embedding on Gemini quota errors', async () => {
  mockEmbed.mockRejectedValue({ status: 429 });
  resolveQuery = q => ({ data: op(q, 'update') ? { id: alice } : { id: alice, skills: ['Old'], location: 'Boston' } });
  const response = await request(app).post('/api/updateprofile').set('Authorization', 'Bearer valid').field('skills', '["New"]');
  expect(response.status).toBe(200);
  const update = op(queries.find(q => op(q, 'update')), 'update')[1];
  expect(update).toMatchObject({ skills: ['New'], skills_embedding: null, embedding_model: null });
});
test('saved jobs use server-fetched snapshots and never claim an employer submission', async () => {
  resolveQuery = q => {
    if (q.table === 'jobs') return { data: { id: 'ext_job', title: 'Real title', company_name: 'Real employer', data: {} } };
    return { data: { id: 'application', ...op(q, 'insert')[1] } };
  };
  const response = await request(app).post('/api/auto-apply').set('Authorization', 'Bearer valid').send({ job_id: 'ext_job', title: 'Forged title' });
  expect(response.status).toBe(200);
  expect(response.body.submitted).toBe(false);
  expect(response.body.application.status).toBe('Saved');
  expect(response.body.application.jobDetails.title).toBe('Real title');
  expect(op(queries[1], 'insert')[1].user_id).toBe(alice);
});
test('concurrent duplicate saves surface the database unique constraint as 409', async () => {
  resolveQuery = q => q.table === 'jobs' ? { data: { id: 'ext_job', title: 'Developer', data: {} } } : { error: { code: '23505' } };
  expect((await request(app).post('/api/auto-apply').set('Authorization', 'Bearer valid').send({ job_id: 'ext_job' })).status).toBe(409);
});
test('unknown jobs cannot become fabricated application records', async () => {
  resolveQuery = () => ({ data: null });
  expect((await request(app).post('/api/auto-apply').set('Authorization', 'Bearer valid').send({ job_id: 'invented' })).status).toBe(404);
  expect(queries).toHaveLength(1);
});
test('legacy all-applications route is now scoped to the signed-in user', async () => {
  const response = await request(app).get('/api/getallappl').set('Authorization', 'Bearer valid');
  expect(response.status).toBe(200);
  expect(queries[0].operations).toContainEqual(['eq', 'user_id', alice]);
  expect(mockAdminClient).not.toHaveBeenCalled();
});
test('notes and removal only update an owned application, keeping its snapshot', async () => {
  resolveQuery = () => ({ data: [{ id: 'application' }] });
  expect((await request(app).patch('/api/applications/application').set('Authorization', 'Bearer valid').send({ notes: 'Follow up' })).status).toBe(200);
  expect((await request(app).delete('/api/applications/application').set('Authorization', 'Bearer valid')).status).toBe(200);
  for (const q of queries) expect(q.operations).toContainEqual(['eq', 'user_id', alice]);
  expect(op(queries[1], 'update')[1].status).toBe('Withdrawn');
  expect(queries.some(q => op(q, 'delete'))).toBe(false);
});
test('Gemini quota errors keep real listings available without leaking vectors', async () => {
  mockEmbed.mockRejectedValue({ status: 429 });
  resolveQuery = q => ({ data: q.table === 'jobs' ? [{ id: 'ext_job', title: 'Developer', search_text: 'Developer', embedding: '[1,2]', data: {} }] : [] });
  const response = await request(app).get('/api/jobs?q=developer');
  expect(response.status).toBe(200);
  expect(response.body[0].title).toBe('Developer');
  expect(response.body[0].embedding).toBeUndefined();
  expect(response.body[0].score).toBeUndefined();
});
test('database failure is an error, not a fabricated quota job card', async () => {
  resolveQuery = () => ({ error: { code: 'DB_ERROR', message: 'private upstream details' } });
  const response = await request(app).get('/api/jobs');
  expect(response.status).toBe(502);
  expect(JSON.stringify(response.body)).not.toContain('private upstream');
});

test('JSearch subscription failures surface clearly when there are no stored jobs', async () => {
  process.env.JSEARCH_API_KEY = 'test';
  mockSearch.mockRejectedValue(Object.assign(new Error('Live job search is not enabled yet.'), { status: 503, code: 'JSEARCH_SUBSCRIPTION_REQUIRED', isJobProviderError: true }));
  const response = await request(app).get('/api/jobs');
  expect(response.status).toBe(503);
  expect(response.body).toEqual({ error: 'Live job search is not enabled yet.', code: 'JSEARCH_SUBSCRIPTION_REQUIRED' });
});

test('stored jobs remain usable when JSearch is unavailable', async () => {
  process.env.JSEARCH_API_KEY = 'test';
  resolveQuery = () => ({ data: [{ id: 'stored', title: 'Stored job', data: {} }] });
  mockSearch.mockRejectedValue(Object.assign(new Error('unavailable'), { isJobProviderError: true }));
  const response = await request(app).get('/api/jobs');
  expect(response.status).toBe(200);
  expect(response.body[0]).toMatchObject({ _id: 'stored', title: 'Stored job' });
});
test('pgvector retrieval always filters by model and collection', async () => {
  const VectorStore = require('../services/vectorStoreService.jsx');
  const config = require('../config/ragConfig.jsx');
  const store = new VectorStore('help');
  store.embeddingService.embedText = jest.fn().mockResolvedValue(Array(768).fill(0.1));
  db.rpc.mockResolvedValue({ data: [{ id: 'doc', content: 'Help', metadata: {}, score: 0.9, distance: 0.1 }] });
  await store.initialize();
  expect((await store.similaritySearch('help', 3))[0].document).toBe('Help');
  expect(db.rpc).toHaveBeenCalledWith('match_documents', expect.objectContaining({ model: config.embeddingModel, collection_name: 'help', match_count: 3 }));
});
