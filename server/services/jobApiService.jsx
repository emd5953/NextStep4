const axios = require('axios');

/**
 * Service for integrating with external job APIs
 */
class JobApiService {
  constructor() {
    this.jsearchApiKey = process.env.JSEARCH_API_KEY;
    this.jsearchBaseUrl = 'https://jsearch.p.rapidapi.com';
    // Simple in-memory cache with TTL
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    // Request timeout for faster failures
    this.requestTimeout = 8000; // 8 seconds
  }

  /**
   * Search jobs using JSearch API with caching
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {string} params.location - Location filter
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.num_pages - Number of pages (default: 1)
   * @returns {Promise<Array>} Array of job listings
   */
  async searchJobs(params = {}) {
    try {
      const {
        query = 'software developer',
        location = 'United States',
        page = 1,
        num_pages = 1,
        employment_types = 'FULLTIME',
        job_requirements = null,
        remote_jobs_only = false
      } = params;

      // Create cache key
      const cacheKey = JSON.stringify({ query, location, page, num_pages, employment_types, remote_jobs_only });
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('Returning cached JSearch results');
        return cached.data;
      }

      console.log('Fetching fresh JSearch results...');
      const response = await axios.get(`${this.jsearchBaseUrl}/search`, {
        headers: {
          'X-RapidAPI-Key': this.jsearchApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        params: {
          query,
          page,
          num_pages,
          country: 'US',
          location,
          employment_types,
          job_requirements,
          remote_jobs_only
        },
        timeout: this.requestTimeout
      });

      const transformedJobs = this.transformJSearchJobs(response.data.data || []);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: transformedJobs,
        timestamp: Date.now()
      });

      // Clean old cache entries periodically
      this.cleanCache();

      return transformedJobs;
    } catch (error) {
      console.error('Error fetching jobs from JSearch API:', error.message);
      
      // Return cached data if available, even if expired
      const cacheKey = JSON.stringify(params);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Returning stale cached data due to API error');
        return cached.data;
      }
      
      // Return empty array instead of throwing to prevent blocking internal jobs
      console.log('No cached data available, returning empty array');
      return [];
    }
  }

  /**
   * Transform JSearch API response to match your job schema
   * @param {Array} jobs - Raw jobs from JSearch API
   * @returns {Array} Transformed jobs
   */
  transformJSearchJobs(jobs) {
    return jobs.map(job => ({
      // Use external ID to avoid conflicts with your internal jobs
      _id: `ext_${job.job_id}`,
      title: job.job_title,
      companyName: job.employer_name,
      companyWebsite: job.employer_website,
      salaryRange: this.formatSalary(job),
      benefits: job.job_benefits || [],
      locations: [job.job_city, job.job_state, job.job_country].filter(Boolean),
      schedule: job.job_employment_type || 'Full-time',
      jobDescription: job.job_description,
      skills: job.job_required_skills || [],
      // Additional fields from JSearch
      jobUrl: job.job_apply_link,
      jobSource: job.job_publisher,
      postedDate: job.job_posted_at_datetime_utc,
      expirationDate: job.job_offer_expiration_datetime_utc,
      isRemote: job.job_is_remote,
      salaryMin: job.job_min_salary,
      salaryMax: job.job_max_salary,
      salaryCurrency: job.job_salary_currency,
      // Mark as external job
      isExternal: true,
      externalSource: 'jsearch'
    }));
  }

  /**
   * Format salary information
   * @param {Object} job - Job object from JSearch
   * @returns {string} Formatted salary range
   */
  formatSalary(job) {
    if (job.job_min_salary && job.job_max_salary) {
      const currency = job.job_salary_currency || 'USD';
      const period = job.job_salary_period || 'YEAR';
      const min = this.formatNumber(job.job_min_salary);
      const max = this.formatNumber(job.job_max_salary);
      return `${currency} ${min} - ${max} per ${period.toLowerCase()}`;
    }
    return job.job_salary || 'Salary not specified';
  }

  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Get job details by external ID with caching
   * @param {string} jobId - External job ID
   * @returns {Promise<Object>} Job details
   */
  async getJobDetails(jobId) {
    try {
      const cacheKey = `job_details_${jobId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(`${this.jsearchBaseUrl}/job-details`, {
        headers: {
          'X-RapidAPI-Key': this.jsearchApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        params: {
          job_id: jobId.replace('ext_', '') // Remove our prefix
        },
        timeout: this.requestTimeout
      });

      const jobs = this.transformJSearchJobs([response.data.data]);
      const jobDetails = jobs[0];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: jobDetails,
        timestamp: Date.now()
      });

      return jobDetails;
    } catch (error) {
      console.error('Error fetching job details:', error);
      throw new Error('Failed to fetch job details');
    }
  }
}

module.exports = new JobApiService();