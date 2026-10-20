const { generateEmbeddings } = require('../middleware/genAI.jsx');
const { embeddingModel } = require('../services/geminiService.js');
const { getAdminClient, unwrap } = require('../services/supabaseService.js');
const { toJob, cacheJobs } = require('../services/jobRepository.js');
const jobApiService = require('../services/jobApiService.jsx');

async function listJobs(req, personalized = false) {
  const query = String(req.query.q || '').trim().slice(0, 500);
  let profile;
  if (personalized && req.user) profile = unwrap(await req.db.from('profiles').select('*').eq('id', req.user.id).maybeSingle());
  let localQuery = req.db.from('jobs').select('*').order('updated_at', { ascending: false }).limit(60);
  if (query) localQuery = localQuery.textSearch('search_text', query, { type: 'websearch', config: 'english' });
  // DB failures must not masquerade as an empty, successful feed.
  let rows = unwrap(await localQuery);
  let external = [];
  if (req.query.includeExternal !== 'false' && process.env.JSEARCH_API_KEY) {
    try {
      external = await jobApiService.searchJobs({
        query: query || profile?.skills?.slice(0, 3).join(' ') || 'software developer',
        location: profile?.location || 'United States', num_pages: 1
      });
    } catch (error) {
      // Persisted listings remain usable during provider outages. An empty database
      // must surface the provider failure rather than pretend there are no matches.
      if (!error.isJobProviderError || !rows.length) throw error;
    }
    await cacheJobs(external); // Persist before presenting saveable cards.
    if (external.length) {
      const cached = unwrap(await req.db.from('jobs').select('*').in('id', external.map(j => j._id)));
      rows = [...new Map([...rows, ...cached].map(j => [j.id, j])).values()];
    }
  }
  if (req.user) {
    const [saved, skipped] = await Promise.all([
      req.db.from('applications').select('job_id').eq('user_id', req.user.id),
      req.db.from('rejected_jobs').select('job_id').eq('user_id', req.user.id)
    ]);
    const hidden = new Set([...unwrap(saved), ...unwrap(skipped)].map(x => x.job_id));
    rows = rows.filter(j => !hidden.has(j.id));
  }
  const searchText = query || (personalized ? [...(profile?.skills || []), profile?.location].filter(Boolean).join(' ') : '');
  if (searchText && rows.length) {
    try {
      const embedding = await generateEmbeddings(searchText);
      // Small bounded batch keeps the Gemini free quota from being consumed by a single page.
      for (const job of rows.slice(0, 5)) {
        if (job.embedding_model === embeddingModel && job.embedding) continue;
        const vector = await generateEmbeddings(job.search_text.slice(0, 2000) || job.title);
        unwrap(await getAdminClient().from('jobs').update({ embedding: vector, embedding_model: embeddingModel }).eq('id', job.id));
      }
      const matches = unwrap(await req.db.rpc('match_jobs', { query_embedding: embedding, model: embeddingModel, match_count: 100 }));
      const scores = new Map(matches.map(j => [j.id, j.score]));
      rows = rows.map(j => ({ ...j, score: scores.get(j.id) })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } catch { /* The feed stays usable when AI quota is exhausted. */ }
  }
  return rows.slice(0, personalized ? 20 : 60).map(toJob);
}
const controller = {
  async getAllJobs(req, res, next) { try { res.json(await listJobs(req)); } catch (e) { next(e); } },
  async getHomepageJobsUsingSemanticSearch(req, res, next) { try { res.json(await listJobs(req, true)); } catch (e) { next(e); } },
  async getJobById(req, res, next) {
    try {
      const row = unwrap(await req.db.from('jobs').select('*').eq('id', req.params.jobId).maybeSingle());
      if (!row) return res.status(404).json({ error: 'Job not found.' });
      res.json(toJob(row));
    } catch (e) { next(e); }
  }
};
controller.getNewJobs = controller.getHomepageJobsUsingSemanticSearch;
module.exports = controller;
