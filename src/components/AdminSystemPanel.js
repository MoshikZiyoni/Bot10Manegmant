import React, { useState, useEffect } from 'react';
import { Power, AlertOctagon, Activity } from 'lucide-react';
import { callsApi } from './APIcalls';

const SystemControlPanel = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        const data = await callsApi.getSystemStatus();
        setStatus(data);
    };

    const handleToggleSystem = async () => {
        const newStatus = status.status === 'operational' ? 'paused' : 'operational';
        const confirmMsg = newStatus === 'paused'
            ? "WARNING: This will reject ALL new incoming calls. Are you sure?"
            : "System will resume accepting calls. Confirm?";

        if (window.confirm(confirmMsg)) {
            setLoading(true);
            try {
                await callsApi.toggleSystemStatus(newStatus);
                setStatus(prev => ({ ...prev, status: newStatus }));
            } finally {
                setLoading(false);
            }
        }
    };

    const styles = {
        container: { padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' },
        statusCard: {
            padding: '2rem', borderRadius: '16px',
            background: status?.status === 'operational' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        },
        metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' },
        metricBox: {
            padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb',
            textAlign: 'center'
        },
        metricVal: { fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: '8px 0' },
        metricLabel: { color: '#6b7280', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' },
        toggleBtn: {
            padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: 'white', color: status?.status === 'operational' ? '#dc2626' : '#16a34a',
            fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }
    };

    if (!status) return <div>Loading system status...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.statusCard}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>
                        SYSTEM IS {status.status.toUpperCase()}
                    </h2>
                    <p style={{ opacity: 0.9, marginTop: '8px' }}>
                        {status.status === 'operational' ? "All systems normal. Accepting calls." : "System paused. New calls are being rejected."}
                    </p>
                </div>
                <button
                    onClick={handleToggleSystem}
                    disabled={loading}
                    style={styles.toggleBtn}
                >
                    <Power size={20} />
                    {status.status === 'operational' ? "EMERGENCY STOP" : "RESUME SYSTEM"}
                </button>
            </div>

            <div style={styles.metricsGrid}>
                <div style={styles.metricBox}>
                    <Activity size={24} color="#3b82f6" style={{ margin: '0 auto' }} />
                    <div style={styles.metricVal}>{status.active_lines}</div>
                    <div style={styles.metricLabel}>Active Lines</div>
                </div>
                <div style={styles.metricBox}>
                    <AlertOctagon size={24} color="#f59e0b" style={{ margin: '0 auto' }} />
                    <div style={styles.metricVal}>{status.error_rate}</div>
                    <div style={styles.metricLabel}>Error Rate</div>
                </div>
                <div style={styles.metricBox}>
                    <Activity size={24} color="#8b5cf6" style={{ margin: '0 auto' }} />
                    <div style={styles.metricVal}>{status.latency}</div>
                    <div style={styles.metricLabel}>Avg Latency</div>
                </div>
            </div>
        </div>
    );
};

export default SystemControlPanel;
