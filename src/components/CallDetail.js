import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, Clock, Calendar, ArrowLeft } from 'lucide-react';
import axios from 'axios';

function CallDetail() {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseURL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/calls/${id}/`);
        setCall(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching call details:', error);
        setError('Failed to load call details. Please try again later.');
        setLoading(false);
      }
    };

    fetchCallDetails();
  }, [id]);

  if (loading) {
    return <div className="loading">Loading call details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!call) {
    return <div className="not-found">Call not found</div>;
  }

  // Format duration in minutes and seconds
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="call-detail">
      <div className="page-header">
        <Link to="/calls" className="back-link">
          <ArrowLeft size={16} />
          Back to Calls
        </Link>
        <h2>Call Details</h2>
      </div>

      <div className="call-info-card">
        <div className="call-header">
          <div className="call-direction">
            {call.direction === 'in' ? (
              <>
                <PhoneIncoming size={24} className="icon-incoming" />
                <span>Incoming Call</span>
              </>
            ) : (
              <>
                <PhoneOutgoing size={24} className="icon-outgoing" />
                <span>Outgoing Call</span>
              </>
            )}
          </div>
          <div className={`call-status status-${call.status}`}>
            {call.status.replace('_', ' ')}
          </div>
        </div>

        <div className="call-meta">
          <div className="meta-item">
            <span className="meta-label">Phone Number:</span>
            <span className="meta-value">{call.phone_number}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Caller ID:</span>
            <span className="meta-value">{call.caller_id || 'Unknown'}</span>
          </div>
          <div className="meta-item">
            <Calendar size={16} />
            <span className="meta-label">Date:</span>
            <span className="meta-value">{call.formatted_created_at}</span>
          </div>
          <div className="meta-item">
            <Clock size={16} />
            <span className="meta-label">Duration:</span>
            <span className="meta-value">{formatDuration(call.total_duration)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Call SID:</span>
            <span className="meta-value">{call.call_sid || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="call-summary-container">
        <h3>Summary</h3>
        <div className="call-summary-content">
          {call.summary ? (
            <p>{call.summary}</p>
          ) : (
            <p className="no-summary">No summary available for this call.</p>
          )}
        </div>
      </div>

      <div className="conversation-container">
        <h3>Conversation</h3>

        {call.conversation && call.conversation.length > 0 ? (
          <div className="conversation-timeline">
            {call.conversation.map((turn, index) => (
              <div
                key={index}
                className={`conversation-turn ${turn.is_ai ? 'ai-turn' : 'user-turn'}`}
              >
                <div className="turn-avatar">
                  <strong>{turn.is_ai ? 'AI:' : 'User:'}</strong>
                </div>
                <div className="turn-content">
                  <p>{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-conversation">No conversation data available for this call.</p>
        )}
      </div>
    </div>
  );
}

export default CallDetail;