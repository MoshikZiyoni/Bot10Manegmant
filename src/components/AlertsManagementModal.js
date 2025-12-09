import React, { useEffect, useState } from 'react';
import { X, Check, ExternalLink, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const baseURL = process.env.REACT_APP_API_URL || '';

// --- STYLES ---
const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 30, 66, 0.54)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Ensure it's on top
        animation: 'fadeIn 0.2s ease-out',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        width: '95%',
        maxWidth: '1000px',
        height: '85vh',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        animation: 'slideUp 0.3s ease-out',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
        padding: '24px 32px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to right, #ffffff, #f9fafb)',
    },
    headerTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    badge: {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        fontSize: '0.875rem',
        fontWeight: '600',
        padding: '4px 12px',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        padding: '8px',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#6B7280',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '0',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },
    thead: {
        backgroundColor: '#F9FAFB',
        position: 'sticky',
        top: 0,
        zIndex: 10,
    },
    th: {
        padding: '16px 24px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#6B7280',
        borderBottom: '1px solid #E5E7EB',
    },
    tr: {
        borderBottom: '1px solid #F3F4F6',
        transition: 'background-color 0.15s ease',
    },
    td: {
        padding: '20px 24px',
        fontSize: '0.95rem',
        color: '#374151',
        verticalAlign: 'middle',
    },
    callerInfo: {
        display: 'flex',
        flexDirection: 'column',
    },
    phoneNumber: {
        fontWeight: '600',
        color: '#111827',
        marginBottom: '4px',
    },
    callerId: {
        fontSize: '0.8rem',
        color: '#9CA3AF',
    },
    summaryText: {
        maxWidth: '300px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: '#4B5563',
        fontStyle: 'italic',
    },
    actionsGroup: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '500',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9CA3AF',
        padding: '40px',
    },
};

// --- KEYFRAMES INJECTION ---
const GlobalStyles = () => (
    <style>
        {`
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .hover-row:hover {
            background-color: #F8FAFC !important;
        }
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f1f1; 
        }
        ::-webkit-scrollbar-thumb {
            background: #d1d5db; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; 
        }
        `}
    </style>
);

// --- COMPONENT ---

const Button = ({ children, variant = 'default', onClick, href, style = {} }) => {
    const [hover, setHover] = useState(false);

    const baseStyle = {
        ...styles.actionBtn,
        ...style,
    };

    let variantStyle = {};
    if (variant === 'view') {
        variantStyle = {
            backgroundColor: hover ? '#E0F2FE' : '#F0F9FF',
            color: '#0284C7',
        };
    } else if (variant === 'handled') {
        variantStyle = {
            backgroundColor: hover ? '#DCFCE7' : '#DCFCE7', // Keep it subtle
            color: '#15803D',
            boxShadow: hover ? '0 2px 5px rgba(21, 128, 61, 0.2)' : 'none',
        };
    } else if (variant === 'dismiss') {
        variantStyle = {
            backgroundColor: hover ? '#FEE2E2' : '#F3F4F6',
            color: hover ? '#B91C1C' : '#4B5563',
        };
    }

    const finalStyle = { ...baseStyle, ...variantStyle };

    if (href) {
        return (
            <Link
                to={href}
                style={finalStyle}
                onClick={onClick}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            style={finalStyle}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {children}
        </button>
    );
};

const CloseButton = ({ onClick }) => {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            style={{
                ...styles.closeButton,
                backgroundColor: hover ? '#F3F4F6' : 'transparent',
                color: hover ? '#111827' : '#6B7280',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <X size={24} />
        </button>
    );
};

const AlertsManagementModal = ({ onClose, onUpdate }) => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingAlerts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${baseURL}/api/calls/?review_status=pending&limit=100`);
            const data = await response.json();
            setCalls(data.results || []);
        } catch (error) {
            console.error("Error fetching alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingAlerts();
    }, []);

    const handleStatusUpdate = async (callId, newStatus) => {
        try {
            const response = await fetch(`${baseURL}/api/calls/${callId}/review-status/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setCalls(prev => prev.filter(c => c.id !== callId));
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <GlobalStyles />
            <div style={styles.modalContainer} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTitle}>
                        <div style={{ padding: '8px', background: '#FEF3C7', borderRadius: '10px', display: 'flex' }}>
                            <AlertTriangle size={24} color="#D97706" />
                        </div>
                        Alert Management
                        {calls.length > 0 && (
                            <span style={styles.badge}>
                                {calls.length} Pending
                            </span>
                        )}
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* Content */}
                <div style={styles.content}>
                    {loading ? (
                        <div style={styles.emptyState}>
                            <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '16px', color: '#3B82F6' }} />
                            <p>Loading pending alerts...</p>
                        </div>
                    ) : calls.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{
                                width: '80px', height: '80px',
                                background: '#ECFDF5', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '24px'
                            }}>
                                <Check size={40} color="#059669" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>All caught up!</h3>
                            <p style={{ color: '#6B7280' }}>There are no pending alerts requiring your attention.</p>
                        </div>
                    ) : (
                        <table style={styles.table}>
                            <thead style={styles.thead}>
                                <tr>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Caller Info</th>
                                    <th style={styles.th}>Summary</th>
                                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calls.map((call) => (
                                    <tr key={call.id} style={styles.tr} className="hover-row">
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: '500', color: '#4B5563' }}>
                                                {new Date(call.formatted_created_at).toLocaleDateString()}
                                            </span>
                                            <br />
                                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                                {new Date(call.formatted_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.callerInfo}>
                                                <span style={styles.phoneNumber}>{call.phone_number}</span>
                                                <span style={styles.callerId}>{call.caller_id || 'Unknown Caller'}</span>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.summaryText}>
                                                {call.conclusion
                                                    ? (typeof call.conclusion === 'string' && call.conclusion.length > 50 ? call.conclusion.substring(0, 50) + '...' : call.conclusion)
                                                    : 'No summary available...'}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.actionsGroup}>
                                                <Button
                                                    href={`/calls/${call.id}`}
                                                    variant="view"
                                                    onClick={onClose}
                                                >
                                                    <ExternalLink size={16} />
                                                    View
                                                </Button>

                                                <Button
                                                    onClick={() => handleStatusUpdate(call.id, 'handled')}
                                                    variant="handled"
                                                >
                                                    <Check size={16} />
                                                    Handled
                                                </Button>

                                                <Button
                                                    onClick={() => handleStatusUpdate(call.id, 'dismissed')}
                                                    variant="dismiss"
                                                >
                                                    <XCircle size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertsManagementModal;