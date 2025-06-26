import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../UserQuota.css';

const UserQuota = ({ onClose }) => {
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState(null);
  const baseURL = process.env.REACT_APP_API_URL || '';
  const callerId = "+97237208114"; // Hardcoded caller ID

  useEffect(() => {
    console.log("Fetching quota for:", callerId);
    axios.get(`${baseURL}/api/quota/${callerId}/`)
      .then(res => {
        console.log("Quota response:", res.data);
        setQuota(res.data);
      })
      .catch(err => {
        console.error("Error fetching quota:", err);
        setError(err.response?.data?.detail || err.message);
      });
  }, []);

  // Helper function to round numbers to 2 decimal places
  const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Calculate usage percentage
  const getUsagePercentage = () => {
    if (!quota || quota.quota_minutes === 0) return 0;
    return Math.min((quota.used_minutes / quota.quota_minutes) * 100, 100);
  };

  return (
    <div className="quota-modal-overlay">
      <div className="quota-modal">
        <button className="quota-close-btn" onClick={onClose}>&times;</button>
        <h2 className="quota-title">Your Quota</h2>
        {error && <p className="quota-error-message">{error}</p>}
        {quota ? (
          <div className="quota-details">
            <p className="quota-item"><b>Caller ID:</b> {quota.caller_id}</p>
            <p className="quota-item"><b>Quota Minutes:</b> <span className="quota-value">{roundToTwo(quota.quota_minutes)}</span></p>
            <p className="quota-item"><b>Used Minutes:</b> <span className="quota-value">{roundToTwo(quota.used_minutes)}</span></p>
            <p className="quota-item"><b>Remaining Minutes:</b> <span className="quota-value quota-remaining">{roundToTwo(quota.remaining_minutes)}</span></p>
            <p className="quota-item"><b>Expired:</b> <span className={`quota-status ${quota.expired ? 'expired' : 'active'}`}>{quota.expired ? 'Yes' : 'No'}</span></p>
            <p className="quota-item"><b>Start Date:</b> {quota.start_date}</p>
            
            {/* Usage Graph */}
            <div className="quota-usage-graph">
              <h3>Monthly Usage</h3>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${getUsagePercentage()}%` }}
                >
                  <span className="progress-text">
                    {roundToTwo(getUsagePercentage())}%
                  </span>
                </div>
              </div>
              <div className="usage-details">
                <span className="usage-text">
                  {roundToTwo(quota.used_minutes)} / {roundToTwo(quota.quota_minutes)} minutes
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="quota-loading">Loading quota details...</p>
        )}
      </div>
    </div>
  );
};

export default UserQuota;