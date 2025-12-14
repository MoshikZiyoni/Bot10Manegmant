import React, { useState, useEffect } from 'react';
import { PhoneOff, RefreshCw, Clock, Hash } from 'lucide-react';
import { callsApi } from './APIcalls';

const LiveCallMonitor = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const data = await callsApi.getActiveCalls();
            setCalls(data);
        } catch (error) {
            console.error("Failed to fetch active calls", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh every 30 seconds
    useEffect(() => {
        fetchCalls();
        const interval = setInterval(fetchCalls, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleTerminate = async (callId) => {
        if (window.confirm(`Are you sure you want to terminate call ${callId}? This action cannot be undone.`)) {
            try {
                await callsApi.terminateCall(callId);
                setCalls(prev => prev.filter(c => c.id !== callId));
                alert("Call terminated successfully.");
            } catch (error) {
                alert("Failed to terminate call.");
            }
        }
    };

    const styles = {
        container: { padding: '1rem' },
        headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
        refreshBtn: {
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db',
            background: 'white', cursor: 'pointer'
        },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
        card: {
            border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem',
            backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'relative', overflow: 'hidden'
        },
        activeIndicator: {
            position: 'absolute', top: '12px', right: '12px',
            backgroundColor: '#22c55e', color: 'white', fontSize: '0.75rem', fontWeight: 'bold',
            padding: '4px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px'
        },
        row: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' },
        label: { color: '#6b7280', fontWeight: '500' },
        val: { color: '#111827', fontWeight: '600' },
        terminateBtn: {
            width: '100%', marginTop: '1rem', padding: '10px',
            backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px',
            fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            transition: 'background-color 0.2s'
        }
    };

    const calculateDuration = (startTime) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerBar}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Active Sessions ({calls.length})</h3>
                <button onClick={fetchCalls} style={styles.refreshBtn}>
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div style={styles.grid}>
                {calls.map(call => (
                    <div key={call.id} style={styles.card}>
                        <div style={styles.activeIndicator}>
                            <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                            LIVE
                        </div>

                        <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>{call.caller_id}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{call.phone_number}</div>
                        </div>

                        <div style={styles.row}>
                            <span style={styles.label}><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Duration</span>
                            <span style={styles.val}>{calculateDuration(call.start_time)}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}><Hash size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Call ID</span>
                            <span style={styles.val}>#{call.id}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>Est. Cost</span>
                            <span style={styles.val}>ש"ח{(parseInt(calculateDuration(call.start_time).split(':')[0]) * 1.5).toFixed(2)}</span>
                        </div>

                        <button
                            style={styles.activeBtn ? {} : styles.terminateBtn}
                            onClick={() => handleTerminate(call.id)}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                        >
                            <PhoneOff size={16} />
                            Terminate Session
                        </button>
                    </div>
                ))}
            </div>
            {calls.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                    No active calls at the moment.
                </div>
            )}
        </div>
    );
};

export default LiveCallMonitor;
