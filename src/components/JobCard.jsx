import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/JobCard.css";
import { TokenContext } from "./TokenContext";

const JobCard = ({
  job_id,
  title,
  companyName,
  companyWebsite,
  salaryRange,
  locations,
  schedule,
  jobDescription,
  skills,
  onApplyClick,
  isExternal = false,
  jobUrl = null,
  jobSource = null,
  isDemo = false
}) => {
  const navigate = useNavigate();

  const handleApply = () => {
    if (isDemo) return; // No apply for demo cards
    if (isExternal && jobUrl) {
      window.open(jobUrl, '_blank');
    } else {
      onApplyClick(job_id);
    }
  };

  const handleDetails = () => {
    if (isDemo) return; // No details for demo cards
    if (isExternal) {
      window.open(jobUrl, '_blank');
    } else {
      navigate(`/jobs/${job_id}/jobs`);
    }
  };

  const truncatedDescription = jobDescription 
    ? jobDescription.substring(0, 150) + (jobDescription.length > 150 ? "..." : "")
    : "Join our team and work on exciting projects.";

  return (
    <div className={`job-card-compact ${isExternal ? 'external-job' : ''} ${isDemo ? 'demo-card' : ''}`}>
      <div className="job-card-main">
        <div className="job-card-left">
          <div className="company-logo">
            <span>{companyName?.[0] || "C"}</span>
          </div>
          {isExternal && (
            <div className="external-badge" title={`Source: ${jobSource}`}>
              EXT
            </div>
          )}
        </div>
        
        <div className="job-card-content">
          <div className="job-header-compact">
            <h3 className="job-title-compact">{title}</h3>
            <button onClick={handleApply} className="apply-button-compact">
              {isExternal ? 'Apply on Site' : 'Apply'}
            </button>
          </div>
          
          <a
            href={companyWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="company-name-compact"
          >
            {companyName}
          </a>
          
          <div className="job-meta">
            <span className="job-location-compact">{locations.join(", ")}</span>
            <span className="meta-separator">•</span>
            <span className="job-schedule-compact">{schedule}</span>
            {isExternal && jobSource && (
              <>
                <span className="meta-separator">•</span>
                <span className="job-source">via {jobSource}</span>
              </>
            )}
          </div>
          
          <p className="job-description-compact">{truncatedDescription}</p>
          
          <div className="job-footer-compact">
            <div className="job-details-row">
              <span className="salary-compact">{salaryRange}</span>
            </div>
            
            {skills && skills.length > 0 && (
              <div className="skills-compact">
                {skills.slice(0, 5).map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                  </span>
                ))}
                {skills.length > 5 && (
                  <span className="skill-tag more">+{skills.length - 5}</span>
                )}
              </div>
            )}
            
            <button onClick={handleDetails} className="details-link">
              {isExternal ? 'View on Site →' : 'View Details →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;