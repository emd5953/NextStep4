// File: /src/pages/YourJobs.js
import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import { API_SERVER } from '../config';

import '../styles/YourJobs.css';
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';

const YourJobs = () => {
  const { token, setToken } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [rejectedJobs, setRejectedJobs] = useState([]);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [activeTab, setActiveTab] = useState('applied');

  const formatDate = (dateString) => {
    return moment(dateString).format("MMM D, YYYY");
  };

  useEffect(() => {
    const fetchMyApplications = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_SERVER}/applications`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyApplications(response.data);
          
        } catch (error) {
          console.error('Applications error:', error);
          if (error.response && error.response.status === 401) {
            setToken(null);
            setError("Your session has expired. Please sign in again.");
          }
        }
      }
    };

    const fetchRejectedJobs = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_SERVER}/rejected-jobs`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRejectedJobs(response.data);
        } catch (error) {
          console.error('Rejected jobs error:', error);
        }
      }
    };

    fetchMyApplications();
    fetchRejectedJobs();
  }, [token, setToken]);
  //const [jobs, setJobs] = useState(initialJobs);
  const [editedNote, setEditedNote] = useState("");
  const saveInitiated = useRef(false);

  const handleEdit = (id) => {
    const job = myApplications.find(job => job.jobDetails._id === id);
    setEditedNote(job.notes);
    setMyApplications(myApplications.map(job => job.jobDetails._id === id ? { ...job, isEditing: true } : job));
  };

  const handleCancel = (id) => {
    setMyApplications(myApplications.map(job => job.jobDetails._id === id ? { ...job, isEditing: false } : job));
    setEditedNote("");
  };

  const handleSave = async (id) => {
    const row = myApplications.find(job => job.jobDetails._id === id);
    if (!row) return;
    try {
      await axios.patch(API_SERVER + '/applications/' + row._id, { notes: editedNote }, { headers: { Authorization: 'Bearer ' + token } });
      setMyApplications(items => items.map(job => job._id === row._id ? { ...job, notes: editedNote, isEditing: false } : job));
      setEditedNote('');
    } catch (err) { setError(err.response?.data?.error || 'Could not save notes.'); }
  };

  const handleWithdraw = async (applicationId, jobTitle) => {
    if (!window.confirm(`Remove this saved job from your active list: "${jobTitle}"? This does not withdraw any application with the employer.`)) {
      return;
    }

    setWithdrawingId(applicationId);
    try {
      await axios.delete(`${API_SERVER}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMyApplications(myApplications.filter(app => app._id !== applicationId));
      setMessage("Removed from your active saved jobs");
    } catch (error) {
      console.error('Error withdrawing application:', error);
      setError(error.response?.data?.error || "Failed to withdraw application. Please try again.");
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="your-jobs-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <h1>My Jobs</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'applied' ? 'active' : ''}`}
          onClick={() => setActiveTab('applied')}
        >
          Saved ({myApplications.length})
        </button>
        <button 
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected ({rejectedJobs.length})
        </button>
      </div>

      {activeTab === 'applied' && (
        <>
          <p>Saved jobs appear below. Open a job link to apply on the employer’s website; saving here does not submit an application.</p>
          <table className="jobs-table">
        <thead>
          <tr>
            <th>Job Title</th>
            <th>Company</th>
            <th>Date Saved</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {myApplications.map(job => (
            <tr key={job.jobDetails._id}>
              <td>{/^https?:\/\//i.test(job.jobDetails.jobUrl || "") ? <a href={job.jobDetails.jobUrl} target="_blank" rel="noopener noreferrer">{job.jobDetails.title} ↗</a> : job.jobDetails.title}</td>
              <td>{job.companyDetails.name}</td>
              <td>{formatDate(job.date_applied)}</td>
              <td>{job.status}</td>
              <td>
                {job.isEditing ? (
                  <div className="notes-edit">
                    <input
                      type="text"
                      value={editedNote}
                      onChange={(e) => setEditedNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveInitiated.current = true;
                          handleSave(job.jobDetails._id);
                        }
                      }}
                      onBlur={() => {
                        if (saveInitiated.current) {
                          saveInitiated.current = false;
                        } else {
                          handleCancel(job.jobDetails._id);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="notes-display">
                    <span>{job.notes}</span>
                    <button onClick={() => handleEdit(job.jobDetails._id)}>Edit</button>
                  </div>
                )}
              </td>
              <td>
                <button 
                  className="withdraw-btn"
                  onClick={() => handleWithdraw(job._id, job.jobDetails.title)}
                  disabled={withdrawingId === job._id}
                >
                  {withdrawingId === job._id ? 'Removing...' : 'Remove'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </>
      )}

      {activeTab === 'rejected' && (
        <>
          <p>Jobs you've rejected:</p>
          <table className="jobs-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Date Rejected</th>
                <th>Salary</th>
              </tr>
            </thead>
            <tbody>
              {rejectedJobs.map(job => (
                <tr key={job._id}>
                  <td>{job.title}</td>
                  <td>{job.companyName}</td>
                  <td>{formatDate(job.date_rejected)}</td>
                  <td>{job.salaryRange || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default YourJobs;
