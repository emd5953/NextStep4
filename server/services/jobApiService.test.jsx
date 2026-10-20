jest.mock('axios', () => ({ get: jest.fn() }));
const axios = require('axios');
const Service = require('./jobApiService.jsx').constructor;
const fixture = { job_id: 'provider-job', job_title: 'Software Engineer', employer_name: 'Example Co', job_apply_link: 'https://example.test/jobs/1', job_location: 'Boston, MA', required_technologies: ['Node.js'], job_salary_string: '$100K a year' };
let service;
beforeEach(() => {
  process.env.JSEARCH_API_KEY = 'ak_test_private';
  delete process.env.JSEARCH_PROVIDER;
  delete process.env.JOB_API_SOURCE;
  axios.get.mockReset().mockResolvedValue({ data: { status: 'OK', data: { jobs: [fixture], cursor: 'next' } } });
  service = new Service();
});

test('direct keys use the official host and header, one page, location in the query, and nested v2 jobs', async () => {
  const jobs = await service.searchJobs({ query: 'developer', location: 'Boston', num_pages: 20, remote_jobs_only: true });
  expect(axios.get).toHaveBeenCalledWith('https://api.openwebninja.com/jsearch/search-v2', expect.objectContaining({
    headers: { 'x-api-key': 'ak_test_private' }, maxRedirects: 0,
    params: { query: 'developer in Boston', num_pages: 1, country: 'us', employment_types: 'FULLTIME', work_from_home: true }
  }));
  expect(jobs[0]).toMatchObject({ _id: 'ext_provider-job', title: 'Software Engineer', locations: ['Boston, MA'], skills: ['Node.js'], salaryRange: '$100K a year', jobUrl: fixture.job_apply_link });
  expect(JSON.stringify(jobs)).not.toContain('ak_test_private');
});

test('explicit query locations are retained', async () => {
  await service.searchJobs({ query: 'developer in Chicago' });
  expect(axios.get.mock.calls[0][1].params.query).toBe('developer in Chicago');
});

test('LinkedIn uses its subscribed endpoint, separate location, and source-specific IDs', async () => {
  process.env.JOB_API_SOURCE = 'linkedin';
  service = new Service();
  axios.get.mockResolvedValue({ data: { status: 'OK', data: [{ ...fixture, employer_website: null, employer_linkedin_url: 'https://www.linkedin.com/company/example' }] } });
  const jobs = await service.searchJobs({ query: 'engineer', location: 'Boston', num_pages: 20 });
  expect(axios.get).toHaveBeenCalledWith('https://api.openwebninja.com/realtime-linkedin-data/search', expect.objectContaining({
    headers: { 'x-api-key': 'ak_test_private' },
    params: { query: 'engineer', location: 'Boston', num_pages: 1, page: 1, employment_types: 'FULLTIME', remote_jobs_only: false }
  }));
  expect(jobs[0]).toMatchObject({ _id: 'ext_linkedin_provider-job', externalSource: 'linkedin', companyWebsite: 'https://www.linkedin.com/company/example', jobUrl: fixture.job_apply_link });
  await service.getJobDetails(jobs[0]._id);
  expect(axios.get.mock.calls[1][0]).toBe('https://api.openwebninja.com/realtime-linkedin-data/job-details');
  expect(axios.get.mock.calls[1][1].params.job_id).toBe('provider-job');
});

test('LinkedIn never sends a RapidAPI credential to the direct provider', async () => {
  process.env.JOB_API_SOURCE = 'linkedin';
  process.env.JSEARCH_PROVIDER = 'rapidapi';
  service = new Service();
  await expect(service.searchJobs()).rejects.toHaveProperty('code', 'JSEARCH_CONFIG_INVALID');
  expect(axios.get).not.toHaveBeenCalled();
});

test('legacy RapidAPI credentials retain their host, headers, and array response', async () => {
  process.env.JSEARCH_API_KEY = 'rapidapi-test';
  service = new Service();
  axios.get.mockResolvedValue({ data: { data: [fixture] } });
  expect(await service.searchJobs()).toHaveLength(1);
  expect(axios.get.mock.calls[0][0]).toBe('https://jsearch.p.rapidapi.com/search');
  expect(axios.get.mock.calls[0][1].headers).toEqual({ 'X-RapidAPI-Key': 'rapidapi-test', 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' });
});

test('equivalent queries and concurrent calls share a request', async () => {
  await Promise.all([service.searchJobs(), service.searchJobs({ query: 'software   developer', location: 'United States' })]);
  await service.searchJobs();
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(service.getCacheStats().cacheHits).toBe(2);
});

test('different experience filters do not share a cached result', async () => {
  await service.searchJobs({ job_requirements: 'no_experience' });
  await service.searchJobs({ job_requirements: 'more_than_3_years_experience' });
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test('subscription errors are actionable, sanitized, and suppress immediate repeated calls', async () => {
  axios.get.mockRejectedValue({ response: { status: 403, data: { error: 'You are not subscribed to this API' } }, config: { headers: { 'x-api-key': 'ak_test_private' } } });
  const error = await service.searchJobs().catch(e => e);
  expect(error).toMatchObject({ code: 'JSEARCH_SUBSCRIPTION_REQUIRED', status: 503 });
  expect(JSON.stringify(error)).not.toContain('ak_test_private');
  await expect(service.searchJobs({ query: 'another role' })).rejects.toHaveProperty('code', 'JSEARCH_SUBSCRIPTION_REQUIRED');
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test.each([[401, 'JSEARCH_AUTH_FAILED'], [429, 'JSEARCH_RATE_LIMITED'], [500, 'JSEARCH_UNAVAILABLE']])('HTTP %i is not reported as empty search results', async (status, code) => {
  axios.get.mockRejectedValue({ response: { status } });
  await expect(service.searchJobs()).rejects.toHaveProperty('code', code);
});

test('a provider outage falls back to the same cached search when it is under one day old', async () => {
  const first = await service.searchJobs();
  for (const entry of service.cache.values()) entry.timestamp -= service.cacheTimeout + 1;
  axios.get.mockRejectedValue({ response: { status: 503 } });
  expect(await service.searchJobs()).toEqual(first);
  expect(axios.get).toHaveBeenCalledTimes(2);
});

test('invalid response shapes fail while a valid empty result stays empty', async () => {
  axios.get.mockResolvedValue({ data: { data: { unexpected: true } } });
  await expect(service.searchJobs()).rejects.toHaveProperty('code', 'JSEARCH_INVALID_RESPONSE');
  service = new Service();
  axios.get.mockResolvedValue({ data: { data: { jobs: [] } } });
  expect(await service.searchJobs()).toEqual([]);
});

test('missing keys do not make requests and unsafe provider links are discarded', async () => {
  process.env.JSEARCH_API_KEY = '';
  service = new Service();
  await expect(service.searchJobs()).rejects.toHaveProperty('code', 'JSEARCH_NOT_CONFIGURED');
  expect(axios.get).not.toHaveBeenCalled();
  expect(service.transformJSearchJobs([{ ...fixture, job_apply_link: 'javascript:alert(1)' }, null, {job_title: 'Missing ID'}])).toMatchObject([{ jobUrl: null }]);
});

test('job details accept the provider array response and preserve IDs containing ext_', async () => {
  axios.get.mockResolvedValue({ data: { data: [fixture] } });
  expect((await service.getJobDetails('ext_id_ext_suffix')).title).toBe('Software Engineer');
  expect(axios.get.mock.calls[0][1].params.job_id).toBe('id_ext_suffix');
});
