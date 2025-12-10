import React, { useState } from 'react';
import { Calendar, Search, Clock, Phone } from 'lucide-react';

const UsageReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [identifier, setIdentifier] = useState(''); // The user's number to check
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const baseURL = process.env.REACT_APP_API_URL || '';

    const handleCheckUsage = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(
                `${baseURL}/api/usage-report/?start_date=${startDate}&end_date=${endDate}&identifier=${identifier}`
            );
            const data = await response.json();
            if (response.ok) {
                setReport(data);
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            maxWidth: '700px',
            margin: '3rem auto',
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '2.5rem',
            color: '#1a1a1a',
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            margin: 0,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        icon: {
            color: '#3b82f6',
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            marginBottom: '2.5rem',
        },
        inputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        label: {
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#4b5563',
            marginLeft: '4px',
        },
        inputWrapper: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        },
        inputIcon: {
            position: 'absolute',
            left: '14px',
            color: '#9ca3af',
            pointerEvents: 'none',
        },
        input: {
            width: '100%',
            padding: '14px 16px',
            paddingLeft: '44px',
            fontSize: '1rem',
            color: '#1f2937',
            backgroundColor: '#f9fafb',
            border: '2px solid #f3f4f6',
            borderRadius: '12px',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
        },
        dateGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
        },
        dateInput: {
            width: '100%',
            padding: '14px 16px',
            fontSize: '1rem',
            color: '#1f2937',
            backgroundColor: '#f9fafb',
            border: '2px solid #f3f4f6',
            borderRadius: '12px',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
        },
        button: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '16px',
            backgroundColor: isHovered ? '#2563eb' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: loading ? 0.7 : 1,
            marginTop: '1rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        },
        resultsCard: {
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.5s ease-out',
        },
        resultsTitle: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#334155',
            marginBottom: '1.5rem',
            textAlign: 'center',
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
        },
        statBox: {
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
            border: '1px solid #f1f5f9',
            textAlign: 'center',
        },
        statLabel: {
            fontSize: '0.85rem',
            color: '#64748b',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600',
        },
        statValue: (color) => ({
            fontSize: '2rem',
            fontWeight: '700',
            color: color,
            margin: 0,
        }),
        period: {
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#94a3b8',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Clock size={32} style={styles.icon} />
                <h2 style={styles.title}>Usage Calculator</h2>
            </div>

            <form onSubmit={handleCheckUsage} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>User Phone Number / ID</label>
                    <div style={styles.inputWrapper}>
                        <Phone size={20} style={styles.inputIcon} />
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="+97250..."
                            style={styles.input}
                            required
                        />
                    </div>
                </div>

                <div style={styles.dateGrid}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={styles.dateInput}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={styles.dateInput}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={styles.button}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {loading ? 'Calculating...' : <><Search size={20} /> Calculate Usage</>}
                </button>
            </form>

            {report && (
                <div style={styles.resultsCard}>
                    <h3 style={styles.resultsTitle}>Results for {report.identifier}</h3>
                    <div style={styles.statsGrid}>
                        <div style={styles.statBox}>
                            <p style={styles.statLabel}>Total Minutes</p>
                            <p style={styles.statValue('#2563eb')}>{report.usage.total_minutes}</p>
                        </div>
                        <div style={styles.statBox}>
                            <p style={styles.statLabel}>Total Calls</p>
                            <p style={styles.statValue('#9333ea')}>{report.usage.call_count}</p>
                        </div>
                    </div>
                    <div style={styles.period}>
                        Period: {report.period.start} to {report.period.end}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsageReport;