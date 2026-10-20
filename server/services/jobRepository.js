const { getAdminClient, unwrap } = require('./supabaseService.js');
function toJob(row) {
  return { ...row.data, _id: row.id, title: row.title, companyName: row.company_name, jobUrl: row.job_url, ...(Number.isFinite(row.score) ? { score: row.score } : {}) };
}
function toRow(job) {
  const { embedding, embeddingModel, score, ...data } = job;
  return { id: String(job._id), title: job.title || 'Untitled job', company_name: job.companyName || '',
    job_url: /^https?:\/\//i.test(job.jobUrl || '') ? job.jobUrl : null,
    search_text: [job.title, job.companyName, job.jobDescription, ...(job.skills || []), ...(job.locations || [])].filter(Boolean).join(' ').slice(0, 50000),
    data, updated_at: new Date().toISOString() };
}
async function cacheJobs(jobs) {
  if (!jobs.length) return;
  const rows = [...new Map(jobs.filter(j => j._id && !j.isDemo).map(j => [j._id, toRow(j)])).values()];
  if (!rows.length) return;
  const db = getAdminClient();
  const existing = unwrap(await db.from('jobs').select('id,search_text,embedding,embedding_model').in('id', rows.map(r => r.id)));
  const byId = new Map(existing.map(r => [r.id, r]));
  for (const row of rows) {
    const old = byId.get(row.id);
    row.embedding = old?.search_text === row.search_text ? old.embedding : null;
    row.embedding_model = old?.search_text === row.search_text ? old.embedding_model : null;
  }
  unwrap(await db.from('jobs').upsert(rows, { onConflict: 'id' }));
}
module.exports = { toJob, toRow, cacheJobs };
