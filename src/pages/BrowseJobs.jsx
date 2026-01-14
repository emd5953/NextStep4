// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import '../styles/BrowseJobs.css';
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';
import { API_SERVER } from '../config';
import { cacheService } from '../utils/cache';

const APPLY = 1;

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { token, name, email } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      // Check cache first
      const cacheKey = 'browse-jobs-all';
      const cached = cacheService.get(cacheKey);
      
      if (cached && cached.length > 0) {
        console.log("✅ Using cached browse jobs");
        setJobs(cached);
        setIsInitialLoading(false);
        return;
      }

      try {
        setError(null);
        const response = await axios.get(`${API_SERVER}/jobs`, 
          token ? {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
          } : { timeout: 15000 }
        );
        setJobs(response.data);
        
        // Only cache if we got results
        if (response.data.length > 0) {
          cacheService.set(cacheKey, response.data, 10);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        if (error.code === 'ECONNABORTED') {
          setError('Loading is taking longer than expected. The server might be starting up.');
        } else {
          setError('Failed to load jobs. Please refresh the page.');
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchJobs();
  }, [token]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchQuery(searchInput);
    setError(null);
    
    // Check cache for search
    const cacheKey = `browse-jobs-search-${searchInput}`;
    const cached = cacheService.get(cacheKey);
    
    if (cached) {
      console.log("✅ Using cached search results");
      setJobs(cached);
      setIsSearching(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_SERVER}/jobs?q=` + searchInput, 
        token ? {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        } : { timeout: 15000 }
      );
      setJobs(response.data);
      
      // Cache search results for 5 minutes
      cacheService.set(cacheKey, response.data, 5);
      
      if (response.data.length === 0) {
        setError('No jobs found matching your search. Try different keywords or check back later.');
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Search is taking longer than expected. Please try a more specific search term.');
      } else {
        setError('Failed to search jobs. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = async (jobId, jobData) => {
    if (!token) {
      setError("Please sign in to apply for jobs. If you don't have an account, you can create one.");
      return;
    }
    try {
      await axios.post(`${API_SERVER}/auto-apply`, { 
        job_id: jobId,
        title: jobData.title,
        companyName: jobData.companyName,
        jobUrl: jobData.jobUrl,
        isExternal: jobData.isExternal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("Auto-applied successfully!");
      
      // Remove job from list
      setJobs(jobs.filter(job => job._id !== jobId));
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setError(error.response.data.error);
      } else {
        setError('Failed to apply. Please try again.');
      }
    }
  };

  const handleReject = async (jobId) => {
    if (!token) {
      setError("Please sign in to manage jobs.");
      return;
    }
    try {
      await axios.post(`${API_SERVER}/reject-job`, { 
        job_id: jobId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove job from list
      setJobs(jobs.filter(job => job._id !== jobId));
    } catch (error) {
      setError('Failed to reject job.');
    }
  };

  return (
    <div className="browse-jobs-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      {isSearching && <div className="search-overlay" />}
      <h1>Browse Jobs</h1>

      <form className="job-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tell me in your own words... e.g. 'Any high paying job'"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="job-search-input"
        />
        <button type="submit" className="job-search-button" disabled={isSearching}>
          {isSearching ? 'Wait...' : 'Search'}
        </button>
      </form>

      <div className="job-count-label">
        {jobs.length > 0 ? (
          <p>Found {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</p>
        ) : (
          <p>No jobs found</p>
        )}
      </div>

      <div className="jobs-list">
        {isInitialLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading jobs...</p>
            <small>Getting jobs from internal database and external sources</small>
          </div>
        ) : isSearching ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Searching jobs from multiple sources...</p>
            <small>This may take a few seconds for external job sources</small>
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job) => (
            <JobCard
              key={job._id}
              job_id={job._id}
              title={job.title}
              companyName={job.companyName}
              companyWebsite={job.companyWebsite}
              salaryRange={job.salaryRange}
              benefits={job.benefits}
              locations={job.locations}
              schedule={job.schedule}
              jobDescription={job.jobDescription}
              skills={job.skills}
              onApplyClick={handleApply}
              isExternal={job.isExternal}
              jobUrl={job.jobUrl}
              jobSource={job.jobSource}
              isDemo={job.isDemo}
            />
          ))
        ) : (
          <div className="no-jobs-container">
            <p>No jobs available at the moment.</p>
            <small>Try searching for specific roles or check back later.</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;