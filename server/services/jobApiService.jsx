const axios = require('axios');

function providerError(code, message) {
  return Object.assign(new Error(message), { code, status: 503, isJobProviderError: true });
}

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}

/** Server-only OpenWeb Ninja job feeds. Credentials never reach the browser. */
class JobApiService {
  constructor() {
    this.jsearchApiKey = (process.env.JSEARCH_API_KEY || '').trim();
    this.provider = process.env.JSEARCH_PROVIDER || (this.jsearchApiKey.startsWith('ak_') ? 'openwebninja' : 'rapidapi');
    this.source = process.env.JOB_API_SOURCE || 'jsearch';
    this.idPrefix = this.source === 'linkedin' ? 'ext_linkedin_' : 'ext_';
    this.jsearchBaseUrl = this.source === 'linkedin' ? 'https://api.openwebninja.com/realtime-linkedin-data'
      : this.provider === 'openwebninja' ? 'https://api.openwebninja.com/jsearch' : 'https://jsearch.p.rapidapi.com';
    this.cache = new Map();
    this.inFlight = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
    this.staleTimeout = 24 * 60 * 60 * 1000;
    this.requestTimeout = 20000;
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
    this.cooldownUntil = 0;
    this.lastError = null;
  }

  getHeaders() {
    if (!this.jsearchApiKey) throw providerError('JSEARCH_NOT_CONFIGURED', 'Live job search is not enabled yet.');
    if (!['openwebninja', 'rapidapi'].includes(this.provider)) throw providerError('JSEARCH_CONFIG_INVALID', 'Live job search is not enabled yet.');
    if (!['jsearch', 'linkedin'].includes(this.source) || (this.source === 'linkedin' && this.provider !== 'openwebninja')) {
      throw providerError('JSEARCH_CONFIG_INVALID', 'Live job search is not enabled yet.');
    }
    return this.provider === 'openwebninja'
      ? { 'x-api-key': this.jsearchApiKey }
      : { 'X-RapidAPI-Key': this.jsearchApiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' };
  }

  normalizeError(error) {
    if (error.isJobProviderError) return error;
    const status = error.response?.status;
    const payload = error.response?.data;
    const detail = String(payload?.error?.message || payload?.error || payload?.message || '');
    if (status === 403 && /not subscribed|subscription/i.test(detail)) {
      return providerError('JSEARCH_SUBSCRIPTION_REQUIRED', 'Live job search is not enabled yet. Please try again later.');
    }
    if (status === 401 || status === 403) return providerError('JSEARCH_AUTH_FAILED', 'Live job search is temporarily unavailable. Please try again later.');
    if (status === 429) return providerError('JSEARCH_RATE_LIMITED', 'Live job search has reached its request limit. Please try again later.');
    return providerError('JSEARCH_UNAVAILABLE', 'Live job search is temporarily unavailable. Please try again later.');
  }

  async request(endpoint, params, mapData) {
    const cacheKey = JSON.stringify([endpoint, params]);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.cacheHitCount++;
      return cached.data;
    }
    if (this.inFlight.has(cacheKey)) {
      this.cacheHitCount++;
      return this.inFlight.get(cacheKey);
    }
    if (Date.now() < this.cooldownUntil) {
      if (cached && Date.now() - cached.timestamp < this.staleTimeout) return cached.data;
      throw this.lastError;
    }
    const pending = (async () => {
      try {
        const headers = this.getHeaders();
        this.apiCallCount++;
        const response = await axios.get(this.jsearchBaseUrl + endpoint, {
          headers, params, timeout: this.requestTimeout, maxRedirects: 0
        });
        if (response.data?.status === 'ERROR') throw { response };
        const data = mapData(response.data?.data);
        this.cache.set(cacheKey, { timestamp: Date.now(), data });
        this.lastError = null;
        this.cleanCache();
        return data;
      } catch (error) {
        const safeError = this.normalizeError(error);
        this.lastError = safeError;
        // Avoid repeated rejected calls on every page load. No automatic retries.
        this.cooldownUntil = Date.now() + 60000;
        console.warn('Job feed request failed:', this.source, safeError.code);
        if (cached && Date.now() - cached.timestamp < this.staleTimeout) return cached.data;
        throw safeError;
      }
    })();
    this.inFlight.set(cacheKey, pending);
    try { return await pending; } finally { this.inFlight.delete(cacheKey); }
  }

  async searchJobs(params = {}) {
    const query = String(params.query ?? 'software developer').trim().replace(/\s+/g, ' ');
    if (query.length < 2) return [];
    const location = String(params.location ?? 'United States').trim();
    if (this.source === 'linkedin') {
      return this.request('/search', {
        query, location, num_pages: 1, page: 1,
        employment_types: params.employment_types || 'FULLTIME',
        remote_jobs_only: params.remote_jobs_only === true
      }, data => this.mapSearchResults(data));
    }
    const requestParams = {
      // JSearch expects location in the query, rather than a separate location parameter.
      query: location && !/\bin\s+\S/i.test(query) && !query.toLowerCase().includes(location.toLowerCase()) ? `${query} in ${location}` : query,
      num_pages: 1,
      country: String(params.country || 'us').toLowerCase(),
      employment_types: params.employment_types || 'FULLTIME'
    };
    if (params.job_requirements) requestParams.job_requirements = params.job_requirements;
    if (this.provider === 'openwebninja') {
      requestParams.work_from_home = params.remote_jobs_only === true;
      if (params.cursor) requestParams.cursor = params.cursor;
    } else {
      requestParams.page = Math.max(1, Number(params.page) || 1);
      requestParams.remote_jobs_only = params.remote_jobs_only === true;
    }
    return this.request(this.provider === 'openwebninja' ? '/search-v2' : '/search', requestParams, data => this.mapSearchResults(data));
  }

  mapSearchResults(data) {
    const jobs = Array.isArray(data) ? data : data?.jobs;
    if (!Array.isArray(jobs)) throw providerError('JSEARCH_INVALID_RESPONSE', 'Live job search returned an unexpected response. Please try again later.');
    return this.transformJSearchJobs(jobs);
  }

  transformJSearchJobs(jobs) {
    return jobs.filter(job => job && typeof job.job_id === 'string' && job.job_title).map(job => ({
      _id: this.idPrefix + job.job_id,
      title: job.job_title,
      companyName: job.employer_name || '',
      companyWebsite: safeUrl(job.employer_website) || safeUrl(job.employer_linkedin_url),
      salaryRange: this.formatSalary(job),
      benefits: job.job_benefits || [],
      locations: [job.job_city, job.job_state, job.job_country].filter(Boolean).length
        ? [job.job_city, job.job_state, job.job_country].filter(Boolean) : [job.job_location].filter(Boolean),
      schedule: job.job_employment_type || 'Not specified',
      jobDescription: job.job_description || '',
      skills: job.job_required_skills || job.required_technologies || [],
      jobUrl: safeUrl(job.job_apply_link),
      jobSource: job.job_publisher,
      postedDate: job.job_posted_at_datetime_utc,
      expirationDate: job.job_offer_expiration_datetime_utc,
      isRemote: job.job_is_remote,
      salaryMin: job.job_min_salary,
      salaryMax: job.job_max_salary,
      salaryCurrency: job.job_salary_currency,
      isExternal: true,
      externalSource: this.source
    }));
  }

  formatSalary(job) {
    if (job.job_min_salary && job.job_max_salary) {
      const currency = job.job_salary_currency || 'USD';
      const period = job.job_salary_period || 'YEAR';
      return `${currency} ${this.formatNumber(job.job_min_salary)} - ${this.formatNumber(job.job_max_salary)} per ${period.toLowerCase()}`;
    }
    return job.job_salary_string || job.job_salary || 'Salary not specified';
  }

  formatNumber(num) { return new Intl.NumberFormat().format(num); }
  cleanCache() {
    for (const [key, value] of this.cache) {
      if (Date.now() - value.timestamp > this.staleTimeout) this.cache.delete(key);
    }
    while (this.cache.size > 100) this.cache.delete(this.cache.keys().next().value);
  }
  clearCache() { this.cache.clear(); }
  getCacheStats() {
    return {
      provider: this.provider, source: this.source, apiCalls: this.apiCallCount, cacheHits: this.cacheHitCount, cacheSize: this.cache.size,
      hitRate: this.apiCallCount + this.cacheHitCount > 0
        ? ((this.cacheHitCount / (this.apiCallCount + this.cacheHitCount)) * 100).toFixed(1) + '%' : '0%',
      cacheTimeout: `${this.cacheTimeout / 60000} minutes`, lastError: this.lastError?.code || null
    };
  }

  async getJobDetails(jobId) {
    const id = String(jobId);
    return this.request('/job-details', { job_id: id.startsWith(this.idPrefix) ? id.slice(this.idPrefix.length) : id }, data => {
      const jobs = this.transformJSearchJobs(Array.isArray(data) ? data : [data]);
      if (!jobs.length) throw providerError('JSEARCH_JOB_NOT_FOUND', 'This job listing is no longer available.');
      return jobs[0];
    });
  }
}

module.exports = new JobApiService();
