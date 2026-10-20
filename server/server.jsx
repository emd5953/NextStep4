require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { publicConfig, getAdminClient, unwrap } = require('./services/supabaseService.js');
const { verifyToken, optionalAuth } = require('./middleware/auth.jsx');
const auth = require('./controllers/authController.jsx');
const jobs = require('./controllers/jobsController.jsx');
const applications = require('./controllers/applicationsController.jsx');
const { profileController: profiles, upload } = require('./controllers/profileController.jsx');
const rag = require('./controllers/ragChatController.jsx');
const analyzePDF = require('./middleware/AnalyzePdf.jsx');
const { rateLimitMiddleware } = require('./middleware/rateLimiter.jsx');

const app = express();
app.use(cors({ origin: [...new Set([process.env.CLIENT_URL || 'http://localhost:3000',
  'https://nextstep4.com', 'https://www.nextstep4.com', 'https://next-step4.vercel.app'])], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('./middleware/performanceMonitor.jsx'));
const api = express.Router();
api.get('/health', async (req, res) => {
  try {
    unwrap(await getAdminClient().from('profiles').select('id').limit(1));
    res.json({ status: 'healthy', database: 'supabase', timestamp: new Date().toISOString() });
  } catch { res.status(503).json({ status: 'setup_required', database: 'supabase', message: 'Configure Supabase credentials and apply the SQL migration.' }); }
});
api.get('/auth/config', (req, res, next) => {
  try { res.json(publicConfig()); } catch (e) { next(e); }
});
api.post('/signin', auth.signin);
api.post('/signup', auth.signup);
api.post('/resend-verification', auth.resendVerification);
api.post('/auth/google', auth.googleAuth);
api.use('/jobs', rateLimitMiddleware);
api.get('/jobs', optionalAuth, jobs.getAllJobs);
api.get('/jobs/:jobId', optionalAuth, jobs.getJobById);
api.get('/newJobs', verifyToken, jobs.getNewJobs);
api.get('/retrieveJobsForHomepage', optionalAuth, jobs.getHomepageJobsUsingSemanticSearch);
api.get('/profile', verifyToken, profiles.getProfile);
api.get('/userProfile/:userId', verifyToken, profiles.getUserProfile);
api.post('/updateprofile', verifyToken, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'resume', maxCount: 1 }]), profiles.updateProfile);
api.post('/analyze-resume', verifyToken, upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Upload a PDF resume.' });
    res.json(await analyzePDF(req.file.buffer.toString('base64')));
  } catch (e) { next(e); }
});
api.post('/jobsTracker', verifyToken, applications.trackApplication);
api.get('/applications', verifyToken, applications.getUserApplications);
api.get('/getallappl', verifyToken, applications.getUserApplications);
api.delete('/applications/:applicationId', verifyToken, applications.withdrawApplication);
api.patch('/applications/:applicationId', verifyToken, applications.updateNotes);
api.post('/auto-apply', verifyToken, applications.autoApply);
api.post('/reject-job', verifyToken, applications.rejectJob);
api.get('/rejected-jobs', verifyToken, applications.getRejectedJobs);
api.use('/chat', optionalAuth, require('./routes/chatRoutes.jsx'));
api.use('/rag-chat', optionalAuth, require('./routes/ragChatRoutes.jsx'));
api.use('/stats', require('./routes/apiStatsRoutes.jsx'));
app.use('/api', api);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 500;
  // Provider errors can contain request credentials. Only log an error code.
  console.error('API request failed:', error.code || status);
  if (error.isJobProviderError) return res.status(503).json({ error: error.message, code: error.code });
  res.status(status).json({ error: status < 500 ? error.message : status === 503 ? 'Service setup is incomplete. See server/docs/SUPABASE_SETUP.md.' : 'The request could not be completed. Please try again.' });
});
if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log('NextStep API listening on port ' + port + ' (Supabase)');
    rag.initializeRAGServices().catch(() => console.warn('RAG is waiting for Supabase setup and document ingestion.'));
  });
}
module.exports = app;
