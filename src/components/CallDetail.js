import { useState, useEffect, useRef, useMemo } from 'react';
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
  CheckCircle,   // Import CheckCircle for 'כן'
  Volume2,
  ExternalLink,
  Play,
  ArrowDown
} from 'lucide-react';
import axios from 'axios';
import '../CallDetail.css';

function CallDetail() {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const baseURL = process.env.REACT_APP_API_URL || '';

  // Audio Playback & Auto-Scroll States
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTurnIndex, setActiveTurnIndex] = useState(-1);

  const audioRef = useRef(null);
  const timelineRef = useRef(null);
  const turnRefs = useRef({});

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

  useEffect(() => {
    if (id) {
      try {
        const stored = localStorage.getItem('callList_viewedIds');
        const viewedIds = stored ? JSON.parse(stored) : [];
        const strId = String(id);
        if (!viewedIds.map(String).includes(strId)) {
          viewedIds.push(strId);
          localStorage.setItem('callList_viewedIds', JSON.stringify(viewedIds));
        }
      } catch (e) {
        console.error('Error saving viewed call ID:', e);
      }
    }
  }, [id]);

  // Memoized & normalized conversation turns with robust offset calculation
  const turns = useMemo(() => {
    if (!call?.conversation || !Array.isArray(call.conversation)) return [];
    let firstBaseSec = null;

    // Filter out turns with empty text
    const validTurns = call.conversation.filter(
      t => t && typeof t.text === 'string' && t.text.trim().length > 0
    );

    return validTurns.map((turn) => {
      let offset = null;
      if (typeof turn.offset_sec === 'number') {
        offset = turn.offset_sec;
      } else if (turn.offset_sec !== undefined && turn.offset_sec !== null && turn.offset_sec !== '') {
        const parsed = parseFloat(turn.offset_sec);
        if (!isNaN(parsed)) offset = parsed;
      }

      const strTs = String(turn.timestamp_sec || '').trim();
      if (offset === null) {
        if (strTs && !isNaN(strTs)) {
          offset = parseFloat(strTs);
        } else if (strTs.includes(':')) {
          const parts = strTs.split(':').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            offset = parts[0] * 60 + parts[1];
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const tot = parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (firstBaseSec === null) firstBaseSec = tot;
            let diff = tot - firstBaseSec;
            if (diff < 0) diff += 86400;
            offset = diff;
          }
        }
      }
      if (offset === null || isNaN(offset)) offset = 0;

      const mins = Math.floor(offset / 60);
      const secs = Math.floor(offset % 60);
      const displayOffset = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      return {
        ...turn,
        offset_sec: offset,
        display_offset: turn.display_offset || displayOffset
      };
    });
  }, [call?.conversation]);

  // Auto-scroll to active turn when it changes and autoScroll is enabled
  useEffect(() => {
    if (!autoScroll || activeTurnIndex < 0) return;
    const el = turnRefs.current[activeTurnIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTurnIndex, autoScroll]);

  // Jump to specific timestamp and start playback
  const handleSeekToTurn = (offset, index) => {
    if (!audioRef.current) return;
    const safeOffset = Math.max(0, offset || 0);
    audioRef.current.currentTime = safeOffset;
    audioRef.current.play().catch(e => console.warn('Audio play error:', e));
    setActiveTurnIndex(index);
    if (autoScroll && turnRefs.current[index]) {
      turnRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Handler for audio timeupdate
  const handleTimeUpdate = (e) => {
    const time = e.target.currentTime;

    let curIdx = -1;
    for (let i = 0; i < turns.length; i++) {
      if (time >= turns[i].offset_sec) {
        curIdx = i;
      } else {
        break;
      }
    }

    if (curIdx !== activeTurnIndex) {
      setActiveTurnIndex(curIdx);
    }
  };

  if (loading) {
    return <div className="loading">Loading call details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!call) {
    return <div className="not-found">Call not found</div>;
  }



  // Function to determine which icon to show
  const renderSummaryIcon = (summaryText) => {
    if (typeof summaryText !== 'string' || summaryText.trim() === '') {
      return null;
    }

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
            <span className="meta-value">{call.billable_minutes} min</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Call SID:</span>
            <span className="meta-value">{call.call_sid || 'N/A'}</span>
          </div>
        </div>
      </div>

      {(() => {
        const r2AudioUrl = call.recording_url || (call.call_sid ? `https://pub-41c4983bb0df4ea290ddc778bb8d8081.r2.dev/recording_${String(call.call_sid).replace(/[:/\\]/g, '_')}.mp3` : null);
        return (
          <div className="call-summary-container" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={20} color="#1c7d95" />
              Record
            </h3>
            <div className="call-summary-content">
              {r2AudioUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <audio
                    ref={audioRef}
                    controls
                    src={r2AudioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      setActiveTurnIndex(-1);
                    }}
                    style={{ width: '100%', height: '44px', borderRadius: '8px' }}
                  />
                  <div className="record-link-wrapper">
                    <strong>Direct Link:</strong>{' '}
                    <a href={r2AudioUrl} target="_blank" rel="noopener noreferrer" className="record-link-btn">
                      <ExternalLink size={14} /> Click here
                    </a>
                  </div>
                </div>
              ) : (
                <p className="no-summary">No recording URL available for this call.</p>
              )}
            </div>
          </div>
        );
      })()}

      <div className="call-summary-container">
        <h3>Summary</h3>
        <div className="call-summary-content">
          {call.summary ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <p dir="rtl" style={{ margin: 0, flexGrow: 1, textAlign: 'right' }}>{call.summary}</p>
              {renderSummaryIcon(call.summary)}
            </div>
          ) : (
            <p className="no-summary">No summary available for this call.</p>
          )}
        </div>
      </div>

      <div className="conversation-container">
        <div className="conversation-header-row">
          <div className="conversation-title-wrap">
            <h3 style={{ margin: 0 }}>Conversation</h3>
            <span className="conversation-count-badge">
              {turns.length} {turns.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div className="conversation-controls">
            <button
              type="button"
              className={`auto-scroll-btn ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(prev => !prev)}
              title={autoScroll ? 'הגלילה האוטומטית מופעלת - לחץ לביטול' : 'הגלילה האוטומטית מבוטלת - לחץ להפעלה'}
            >
              <ArrowDown size={15} className={`scroll-icon ${autoScroll ? 'animate-bounce-subtle' : ''}`} />
              <span>גלילה אוטומטית: <strong>{autoScroll ? 'פעיל' : 'מבוטל'}</strong></span>
              <span className={`toggle-pill ${autoScroll ? 'on' : 'off'}`}>
                <span className="toggle-dot" />
              </span>
            </button>
          </div>
        </div>

        {turns && turns.length > 0 ? (
          <div className="conversation-timeline" ref={timelineRef}>
            {turns.map((turn, index) => (
              <div
                key={index}
                ref={el => turnRefs.current[index] = el}
                className={`conversation-turn ${turn.is_ai ? 'ai-turn' : 'user-turn'} clickable ${activeTurnIndex === index ? 'is-active' : ''}`}
                onClick={() => handleSeekToTurn(turn.offset_sec, index)}
                title={`לחץ לקפיצה בהקלטה ל-${turn.display_offset}`}
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
                  <div className="turn-footer">
                    <button
                      type="button"
                      className="turn-play-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeekToTurn(turn.offset_sec, index);
                      }}
                      title="השמע נקודה זו בהקלטה"
                    >
                      {activeTurnIndex === index && isPlaying ? (
                        <span className="playing-bars">
                          <span className="bar bar1"></span>
                          <span className="bar bar2"></span>
                          <span className="bar bar3"></span>
                        </span>
                      ) : (
                        <Play size={11} fill="currentColor" />
                      )}
                      <span>{turn.display_offset}</span>
                    </button>
                    {turn.timestamp_sec && turn.timestamp_sec !== turn.display_offset && (
                      <span className="turn-wall-clock" title="שעת שיחה">
                        ({turn.timestamp_sec})
                      </span>
                    )}
                  </div>
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