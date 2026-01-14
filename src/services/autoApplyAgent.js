// Auto-apply agent service
import axios from 'axios';
import { API_SERVER } from '../config';

export const autoApplyAgent = async (jobData, token) => {
  try {
    const { job_id, title, companyName, jobUrl, isExternal } = jobData;
    
    // Call backend to handle application
    const response = await axios.post(
      `${API_SERVER}/auto-apply`,
      {
        job_id,
        title,
        companyName,
        jobUrl,
        isExternal
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Auto-apply error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to apply'
    };
  }
};

export const rejectJob = async (job_id, token) => {
  try {
    const response = await axios.post(
      `${API_SERVER}/reject-job`,
      { job_id },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Reject job error:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to reject'
    };
  }
};
