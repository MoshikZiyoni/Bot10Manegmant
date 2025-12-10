import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  ArrowLeft,
  User,
  BotMessageSquare,
  XCircle,       // Import XCircle for 'לא'
  CheckCircle    // Import CheckCircle for 'כן'
} from 'lucide-react';
import axios from 'axios';
import '../CallDetail.css';

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
  }, [baseURL, id]);

  if (loading) {
    return <div className="loading">Loading call details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!call) {
    return <div className="not-found">Call not found</div>;
  }

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };


  // Function to determine which icon to show
  const renderSummaryIcon = (summaryText) => {
    // 1. Check if summaryText is NOT a string, or if it's an empty string.
    if (typeof summaryText !== 'string' || summaryText.trim() === '') {
      return null; // If not a string or empty, stop here.
    }

    // 2. Now it's safe to use .toLowerCase()
    const lowerCaseSummary = summaryText.toLowerCase();
    const hasNo = lowerCaseSummary.includes("לא");
    const hasYes = lowerCaseSummary.includes("כן");

    return (
      <div className="summary-icons">
        {hasNo && (
          <XCircle size={20} color="#dc3545" style={{ marginLeft: '8px' }} />
        )}
        {hasYes && (
          <CheckCircle size={20} color="#28a745" style={{ marginLeft: '8px' }} />
        )}
      </div>
    );
  };

  // Function to highlight specific text
  const highlightText = (text) => {
    if (!text) return text;
    const parts = text.split(/(נבדוק את זה)/g);
    return parts.map((part, index) =>
      part === "נבדוק את זה" ?
        <span key={index} style={{ color: 'red', fontWeight: 'bold' }}>{part}</span> :
        part
    );
  };

  return (
    <div className="call-detail-container">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}> {/* Flex container for text and icon */}
              <p dir="rtl" style={{ margin: 0, flexGrow: 1, textAlign: 'right' }}>{call.summary}</p>
              {renderSummaryIcon(call.summary)}
            </div>
          ) : (
            <p className="no-summary">No summary available for this call.</p>
          )}
        </div>
      </div>

      <div className="conversation-container">
        <h3>Conversation</h3>
        {console.log(call.conversation)}
        {call.conversation && call.conversation.length > 0 ? (
          <div className="conversation-timeline">
            {call.conversation.map((turn, index) => (


              <div
                key={index}
                className={`conversation-turn ${turn.is_ai ? 'ai-turn' : 'user-turn'}`}
              >
                <div className="turn-avatar">
                  {turn.is_ai ? (
                    <BotMessageSquare size={24} color="#007bff" />
                  ) : (
                    <User size={24} color="#6c757d" />
                  )}
                  <strong>{turn.is_ai ? 'AI' : 'User'}</strong>
                </div>
                <div className="turn-content-bubble">
                  <p dir="rtl">{highlightText(turn.text)}</p>
                  {typeof turn.timestamp_sec !== 'undefined' && (
                    <div className="turn-timestamp" style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '6px', textAlign: 'right' }}>
                      {(turn.timestamp_sec)}
                    </div>
                  )}
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