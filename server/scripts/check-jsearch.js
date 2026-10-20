require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const service = require('../services/jobApiService.jsx');

service.searchJobs({ query: 'software developer', location: 'United States' }).then(jobs => {
  console.log(`Job feed (${service.provider}/${service.source}) returned ${jobs.length} real listings.`);
  for (const job of jobs.slice(0, 3)) console.log(`${job.title} — ${job.companyName}`);
}).catch(error => {
  console.error('Job feed check failed:', error.code || 'UNKNOWN');
  if (error.code === 'JSEARCH_SUBSCRIPTION_REQUIRED') {
    console.error(`The key owner must enable the ${service.source === 'linkedin' ? 'Real-Time LinkedIn Data' : 'JSearch'} Free subscription in OpenWeb Ninja. No paid upgrade is required.`);
  } else {
    console.error(error.isJobProviderError ? error.message : 'The connection could not be verified.');
  }
  process.exitCode = 1;
});
