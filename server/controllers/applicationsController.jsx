const { unwrap } = require('../services/supabaseService.js');
const { toJob } = require('../services/jobRepository.js');
async function snapshot(req) {
  const id = req.body.job_id || req.body._id;
  if (typeof id !== 'string' || !id || id.length > 1000) throw Object.assign(new Error('A valid job ID is required.'), { status: 400 });
  // Only save jobs actually fetched from the provider or entered in the database.
  const job = unwrap(await req.db.from('jobs').select('*').eq('id', id).maybeSingle());
  if (!job) throw Object.assign(new Error('This job is no longer available. Refresh the listings.'), { status: 404 });
  return toJob(job);
}
function toApplication(row) {
  return { _id: row.id, job_id: row.job_id, user_id: row.user_id, date_applied: row.created_at,
    status: row.status, notes: row.notes, jobDetails: row.job_snapshot,
    companyDetails: { name: row.job_snapshot.companyName || '' }, swipeMode: 1, swipeAction: 'Saved' };
}
const controller = {
  async autoApply(req, res, next) {
    try {
      const job = await snapshot(req);
      const row = unwrap(await req.db.from('applications').insert({
        user_id: req.user.id, job_id: job._id, job_snapshot: job, status: 'Saved'
      }).select().single());
      res.json({ success: true, submitted: false, message: 'Saved to My Jobs. Open the employer link to complete your application.', application: toApplication(row) });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'This job is already in My Jobs.' });
      next(e);
    }
  },
  async trackApplication(req, res, next) {
    if (req.body.swipeMode === 2) return controller.rejectJob(req, res, next);
    if (req.body.swipeMode !== 1) return res.status(400).json({ error: 'Invalid swipe mode.' });
    return controller.autoApply(req, res, next);
  },
  async getUserApplications(req, res, next) {
    try {
      const rows = unwrap(await req.db.from('applications').select('*').eq('user_id', req.user.id).neq('status', 'Withdrawn').order('created_at', { ascending: false }));
      res.json(rows.map(toApplication));
    } catch (e) { next(e); }
  },
  async withdrawApplication(req, res, next) {
    try {
      const rows = unwrap(await req.db.from('applications').update({ status: 'Withdrawn', updated_at: new Date().toISOString() }).eq('id', req.params.applicationId).eq('user_id', req.user.id).select('id'));
      if (!rows.length) return res.status(404).json({ error: 'Saved job not found.' });
      res.json({ message: 'Removed from your active saved jobs. This does not contact the employer.' });
    } catch (e) { next(e); }
  },
  async updateNotes(req, res, next) {
    try {
      if (typeof req.body.notes !== 'string' || req.body.notes.length > 5000) return res.status(400).json({ error: 'Notes must be under 5,000 characters.' });
      const rows = unwrap(await req.db.from('applications').update({ notes: req.body.notes, updated_at: new Date().toISOString() }).eq('id', req.params.applicationId).eq('user_id', req.user.id).select('id'));
      if (!rows.length) return res.status(404).json({ error: 'Saved job not found.' });
      res.json({ success: true });
    } catch (e) { next(e); }
  },
  async rejectJob(req, res, next) {
    try {
      const job = await snapshot(req);
      unwrap(await req.db.from('rejected_jobs').upsert({ user_id: req.user.id, job_id: job._id, job_snapshot: job }, { onConflict: 'user_id,job_id', ignoreDuplicates: true }));
      res.json({ success: true, message: 'Job skipped.' });
    } catch (e) { next(e); }
  },
  async getRejectedJobs(req, res, next) {
    try {
      const rows = unwrap(await req.db.from('rejected_jobs').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }));
      res.json(rows.map(row => ({ ...row.job_snapshot, _id: row.id, job_id: row.job_id, date_rejected: row.created_at })));
    } catch (e) { next(e); }
  }
};
controller.getAllApplications = controller.getUserApplications;
module.exports = controller;
