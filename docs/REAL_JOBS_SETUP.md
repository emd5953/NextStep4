# Real Jobs Integration Setup Guide

Your NextStep application now supports real job data from external APIs! Here's how to set it up:

## Option 1: JSearch API (Recommended)

### Step 1: Get API Key
1. Go to [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
2. Sign up for a free account
3. Subscribe to JSearch API (free tier: 150 requests/month)
4. Copy your API key

### Step 2: Configure Environment
Add your API key to `server/.env`:
```env
JSEARCH_API_KEY=your_actual_api_key_here
```

### Step 3: Test Integration
1. Start your server: `npm run dev`
2. Go to Browse Jobs page
3. Search for jobs - you'll now see both internal and external jobs!

## Features Added

### Visual Indicators
- External jobs have a blue left border
- "EXT" badge shows the job source
- "Apply on Site" button redirects to original posting
- Job source attribution (e.g., "via Indeed")

### Search Integration
- External jobs are automatically included in search results
- Location parsing from search queries
- Fallback to internal jobs if API fails

### Job Data Mapping
External jobs include:
- Job title, company, description
- Salary information (when available)
- Location and schedule details
- Skills and requirements
- Direct application links

## Alternative APIs

### Option 2: Active Jobs DB API
- **Cost**: Paid plans starting ~$50/month
- **Benefits**: 100k+ career sites, hourly refresh
- **Setup**: Similar to JSearch, different endpoint

### Option 3: LinkedIn Job Search API
- **Cost**: Paid plans
- **Benefits**: High-quality tech jobs, recruiter info
- **Setup**: Requires LinkedIn partnership

### Option 4: Free Alternatives

#### GitHub Jobs (Deprecated)
- No longer available as of May 2021

#### Adzuna API
- Free tier: 1000 calls/month
- Covers multiple countries
- Good for international jobs

#### Reed API (UK Jobs)
- Free tier available
- UK-focused job board
- Good for European market

## Customization Options

### Disable External Jobs
Add `?includeExternal=false` to API calls to show only internal jobs.

### Filter by Source
Modify `jobApiService.jsx` to filter by specific job boards:
```javascript
// Only get jobs from LinkedIn and Indeed
const filteredJobs = externalJobs.filter(job => 
  ['LinkedIn', 'Indeed'].includes(job.jobSource)
);
```

### Adjust Search Parameters
In `jobApiService.jsx`, modify search parameters:
```javascript
const searchParams = {
  query: queryText,
  location: 'Remote', // Force remote jobs
  employment_types: 'FULLTIME,PARTTIME', // Multiple types
  remote_jobs_only: true // Remote only
};
```

## Cost Considerations

### JSearch API Pricing
- **Free**: 150 requests/month
- **Basic**: $10/month - 1,500 requests
- **Pro**: $50/month - 10,000 requests
- **Enterprise**: Custom pricing

### Usage Optimization
1. **Cache Results**: Store popular searches in your database
2. **Smart Fetching**: Only fetch external jobs for specific searches
3. **User Preferences**: Let users choose internal vs external jobs
4. **Rate Limiting**: Implement request throttling

## Monitoring & Analytics

### Track API Usage
```javascript
// Add to jobApiService.jsx
console.log(`API calls made: ${apiCallCount}/${monthlyLimit}`);
```

### Monitor Performance
- Track response times
- Monitor API success rates
- Log failed requests for debugging

## Troubleshooting

### Common Issues
1. **API Key Invalid**: Check RapidAPI subscription status
2. **Rate Limit Exceeded**: Implement caching or upgrade plan
3. **No External Jobs**: Check API key in server/.env
4. **Slow Loading**: Add loading states and error handling

### Debug Mode
Enable debug logging in `jobApiService.jsx`:
```javascript
console.log('Fetching external jobs:', searchParams);
console.log('External jobs found:', externalJobs.length);
```

## Next Steps

1. **Get API Key**: Sign up for JSearch API
2. **Test Integration**: Search for jobs and verify external results
3. **Monitor Usage**: Track API calls and costs
4. **Optimize**: Implement caching and smart fetching
5. **Scale**: Consider upgrading API plan as usage grows

Your job board now has access to millions of real job postings! 🎉