import React, { useContext, useState, useRef } from "react";
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
  onReject,
  isExternal = false,
  jobUrl = null,
  jobSource = null
}) => {
  const navigate = useNavigate();
  const { employerFlag } = useContext(TokenContext);
  
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX - startX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    
    if (currentX > threshold) {
      // Swipe right - Apply
      onApplyClick(job_id, { title, companyName, jobUrl, isExternal });
    } else if (currentX < -threshold) {
      // Swipe left - Reject
      onReject(job_id);
    }
    
    setCurrentX(0);
    setIsDragging(false);
  };

  const handleMouseDown = (e) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setCurrentX(e.clientX - startX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    
    if (currentX > threshold) {
      onApplyClick(job_id, { title, companyName, jobUrl, isExternal });
    } else if (currentX < -threshold) {
      onReject(job_id);
    }
    
    setCurrentX(0);
    setIsDragging(false);
  };

  const handleCardClick = () => {
    if (Math.abs(currentX) < 5) {
      if (isExternal && jobUrl) {
        window.open(jobUrl, '_blank');
      } else if (companyWebsite) {
        window.open(companyWebsite, '_blank');
      }
    }
  };

  const truncatedDescription = jobDescription 
    ? jobDescription.substring(0, 150) + (jobDescription.length > 150 ? "..." : "")
    : "Join our team and work on exciting projects.";

  const rotation = currentX * 0.1;
  const opacity = 1 - Math.abs(currentX) / 300;

  return (
    <div 
      ref={cardRef}
      className={`job-card-compact ${isExternal ? 'external-job' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: `translateX(${currentX}px) rotate(${rotation}deg)`,
        opacity: opacity,
        transition: isDragging ? 'none' : 'transform 0.3s, opacity 0.3s'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCardClick}
    >
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
          {currentX > 50 && (
            <div className="swipe-indicator swipe-right">✓ APPLY</div>
          )}
          {currentX < -50 && (
            <div className="swipe-indicator swipe-left">✗ REJECT</div>
          )}
          
          <div className="job-header-compact">
            <h3 className="job-title-compact">{title}</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;