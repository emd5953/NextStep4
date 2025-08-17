import React, { useEffect } from 'react';
import '../styles/NotificationBanner.css';

const NotificationBanner = ({ message, type = 'error', onDismiss, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={`notification-banner ${type}`} onClick={onDismiss}>
      <div className="notification-banner-content" onClick={onDismiss}>
        <span className="notification-banner-message">{message}</span>
        <button className="notification-banner-dismiss" onClick={onDismiss}>×</button>
      </div>
    </div>
  );
};

export default NotificationBanner; 