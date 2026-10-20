// Explicit cloud integration check. Creates only synthetic, temporary records
// and removes those exact records in finally. Never run automatically at startup.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { getAdminClient, createUserClient, unwrap } = require('../services/supabaseService.js');
const app = require('../server.jsx');

async function main() {
  const admin = getAdminClient();
  const runId = randomUUID();
  const jobId = 'nextstep_smoke_' + runId;
  const created = [];
  let resumePath;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  async function api(path, session, options = {}) {
    const response = await fetch(base + path, {
      ...options, headers: { ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}), ...options.headers }
    });
    return { status: response.status, data: await response.json() };
  }
  try {
    for (const label of ['a', 'b']) {
      const password = randomUUID() + randomUUID();
      const email = 'nextstep-smoke-' + label + '-' + runId + '@example.invalid';
      const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Synthetic smoke test' } });
      if (result.error) throw new Error('Synthetic account setup failed: ' + result.error.code);
      created.push({ id: result.data.user.id });
      const client = createUserClient();
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error) throw new Error('Synthetic sign-in failed: ' + login.error.code);
      Object.assign(created[created.length - 1], { client, session: login.data.session });
    }
    const [alice, bob] = created;
    assert.equal((await api('/profile', alice.session)).status, 200);
    const privateRows = unwrap(await bob.client.from('profiles').select('id').eq('id', alice.id));
    assert.equal(privateRows.length, 0);
    assert.equal((await api('/userProfile/' + alice.id, bob.session)).status, 403);
    console.log('Verified: sign-in, profile creation, and account isolation.');

    const form = new FormData();
    form.set('full_name', 'Synthetic smoke test updated');
    form.set('resume', new Blob(['%PDF-1.4\n% Synthetic storage test\n%%EOF'], { type: 'application/pdf' }), 'synthetic.pdf');
    assert.equal((await api('/updateprofile', alice.session, { method: 'POST', body: form })).status, 200);
    const profile = await api('/profile', alice.session);
    assert.equal(profile.data.full_name, 'Synthetic smoke test updated');
    assert.match(profile.data.resumeFile.url, /^https:/);
    const resume = unwrap(await alice.client.from('resumes').select('storage_path').eq('user_id', alice.id).single());
    resumePath = resume.storage_path;
    assert.equal((await fetch(profile.data.resumeFile.url)).status, 200);
    assert.ok((await bob.client.storage.from('resumes').createSignedUrl(resumePath, 60)).error);
    console.log('Verified: profile update, private resume upload, signed download, and cross-account denial.');

    unwrap(await admin.from('jobs').insert({ id: jobId, title: 'Synthetic test listing', company_name: 'Test fixture', data: {}, search_text: 'test', job_url: 'https://example.invalid/apply' }));
    const saved = await api('/auto-apply', alice.session, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: jobId }) });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.submitted, false);
    const applicationId = saved.data.application._id;
    assert.equal((await api('/applications', bob.session)).data.length, 0);
    const notes = await api('/applications/' + applicationId, alice.session, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'Synthetic note' }) });
    assert.equal(notes.status, 200);
    assert.equal((await api('/applications', alice.session)).data[0].notes, 'Synthetic note');
    assert.equal((await api('/applications/' + applicationId, bob.session, { method: 'DELETE' })).status, 404);
    assert.equal((await api('/applications/' + applicationId, alice.session, { method: 'DELETE' })).status, 200);
    assert.equal((await api('/applications', alice.session)).data.length, 0);
    console.log('Verified: saved snapshot, persistent notes, ownership checks, and archive action.');

    const refreshed = await alice.client.auth.refreshSession();
    assert.equal(refreshed.error, null);
    assert.equal((await api('/profile', refreshed.data.session)).status, 200);
    console.log('Verified: refreshed Supabase session works with the NextStep API.');
  } finally {
    // Restrict cleanup to IDs created by this invocation, even after a partial failure.
    const cleanupErrors = [];
    for (const user of created) {
      try {
        const records = unwrap(await admin.from('resumes').select('storage_path').eq('user_id', user.id));
        if (records.length) unwrap(await admin.storage.from('resumes').remove(records.map(r => r.storage_path)));
        const deleted = await admin.auth.admin.deleteUser(user.id);
        if (deleted.error) throw deleted.error;
      } catch (error) { cleanupErrors.push(error); }
    }
    try { unwrap(await admin.from('jobs').delete().eq('id', jobId)); }
    catch (error) { cleanupErrors.push(error); }
    finally { await new Promise(resolve => server.close(resolve)); }
    if (cleanupErrors.length) throw new Error('Synthetic fixture cleanup failed; inspect the test records.');
    console.log('Verified: synthetic accounts, files, and job records removed.');
  }
}
main().catch(error => { console.error('Supabase smoke check failed:', error.code || error.message); process.exitCode = 1; });
