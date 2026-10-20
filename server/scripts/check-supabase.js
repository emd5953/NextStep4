const { publicConfig, createUserClient, getAdminClient, unwrap } = require('../services/supabaseService.js');
async function main() {
  publicConfig();
  const db = getAdminClient();
  for (const table of ['profiles', 'resumes', 'jobs', 'applications', 'rejected_jobs', 'rag_documents', 'rag_feedback']) {
    unwrap(await db.from(table).select('*', { head: true }).limit(1));
    console.log('Table ready: ' + table);
  }
  for (const name of ['resumes', 'avatars']) {
    const bucket = unwrap(await db.storage.getBucket(name));
    if (bucket.public) throw new Error('Storage bucket must be private: ' + name);
    console.log('Private bucket ready: ' + name);
  }
  const anonymous = createUserClient();
  unwrap(await anonymous.from('jobs').select('id').limit(1));
  const privateRead = await anonymous.from('profiles').select('id').limit(1);
  if (!privateRead.error && privateRead.data?.length) throw new Error('Anonymous profile access must be denied.');
  unwrap(await anonymous.rpc('match_jobs', { query_embedding: Array(1536).fill(0.1), model: 'setup-check', match_count: 1 }));
  console.log('Supabase connection, private storage, anonymous isolation, and vector RPC checks passed.');
}
main().catch(error => { console.error(error.status === 503 ? error.message : 'Supabase check failed. Verify project credentials and apply the SQL migration. Code: ' + (error.code || 'SETUP')); process.exitCode = 1; });
