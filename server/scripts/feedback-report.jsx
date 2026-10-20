const { getAdminClient } = require('../services/supabaseService.js');
const FeedbackAnalyzer = require('../services/feedbackAnalyzer.jsx');
new FeedbackAnalyzer(getAdminClient()).generateReport(Number(process.argv[2]) || 7)
  .then(report => console.log(report))
  .catch(() => { console.error('Could not read feedback from Supabase.'); process.exitCode = 1; });
