import React, { useState } from 'react';
import { Search, Clock, Phone, TrendingUp, TrendingDown, Calendar, ArrowRightLeft } from 'lucide-react';

const UsageReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [identifier, setIdentifier] = useState(''); // Phone number
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [multiplier, setMultiplier] = useState(1.5);
    const baseURL = process.env.REACT_APP_API_URL || '';

    // Quick presets
    const setThisMonth = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        setStartDate(firstDay);
        setEndDate(today);
    };

    const setLast30Days = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
        setStartDate(thirtyDaysAgo);
        setEndDate(today);
    };

    const handleCheckUsage = async (e) => {
        if (e) e.preventDefault();
        if (!identifier || !startDate || !endDate) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${baseURL}/api/usage-report/?start_date=${startDate}&end_date=${endDate}&identifier=${encodeURIComponent(identifier)}`
            );
            const data = await response.json();
            if (response.ok) {
                setReport(data);
            } else {
                alert(data.error || 'נכשל בטעינת הנתונים');
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            maxWidth: '900px',
            margin: '2rem auto',
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.06)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            direction: 'rtl',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #f1f5f9'
        },
        title: {
            fontSize: '1.8rem',
            fontWeight: '800',
            margin: 0,
            background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        presetBar: {
            display: 'flex',
            gap: '10px',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
        },
        presetBtn: {
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontSize: '0.88rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            marginBottom: '2rem',
        },
        inputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        label: {
            fontSize: '0.9rem',
            fontWeight: '700',
            color: '#334155',
        },
        inputWrapper: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        },
        inputIcon: {
            position: 'absolute',
            right: '14px',
            color: '#9ca3af',
            pointerEvents: 'none',
        },
        input: {
            width: '100%',
            padding: '14px 16px',
            paddingRight: '44px',
            fontSize: '1rem',
            color: '#1f2937',
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            outline: 'none',
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
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            outline: 'none',
            boxSizing: 'border-box',
        },
        select: {
            width: '100%',
            padding: '14px 16px',
            fontSize: '1rem',
            color: '#1f2937',
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            outline: 'none',
            boxSizing: 'border-box',
        },
        button: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '16px',
            backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontSize: '1.05rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
        },
        comparisonSection: {
            marginTop: '2rem',
            backgroundColor: '#f8fafc',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid #e2e8f0',
        },
        comparisonHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
        },
        identifierBadge: {
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        deltaBadge: (isPositive) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '700',
            backgroundColor: isPositive ? '#dcfce7' : '#fee2e2',
            color: isPositive ? '#166534' : '#991b1b',
        }),
        gridTwo: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem',
        },
        periodCard: (isCurrent) => ({
            backgroundColor: isCurrent ? '#ffffff' : '#f1f5f9',
            padding: '1.5rem',
            borderRadius: '16px',
            border: isCurrent ? '2px solid #3b82f6' : '1px solid #cbd5e1',
            boxShadow: isCurrent ? '0 10px 25px rgba(59, 130, 246, 0.1)' : 'none',
        }),
        cardTitle: {
            fontSize: '1rem',
            fontWeight: '700',
            color: '#475569',
            marginBottom: '0.25rem',
        },
        cardSub: {
            fontSize: '0.82rem',
            color: '#64748b',
            marginBottom: '1.25rem',
        },
        metricRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px dashed #e2e8f0',
        },
        metricLabel: {
            fontSize: '0.9rem',
            color: '#64748b',
            fontWeight: '500',
        },
        metricValue: {
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#0f172a',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Clock size={32} color="#2563eb" />
                <h2 style={styles.title}>מחשבון שימושים והשוואה חודשית</h2>
            </div>

            {/* Presets */}
            <div style={styles.presetBar}>
                <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: '600', alignSelf: 'center' }}>בחירה מהירה:</span>
                <button type="button" style={styles.presetBtn} onClick={setThisMonth}>
                    <Calendar size={14} /> החודש הנוכחי
                </button>
                <button type="button" style={styles.presetBtn} onClick={setLast30Days}>
                    <Calendar size={14} /> 30 ימים אחרונים
                </button>
            </div>

            <form onSubmit={handleCheckUsage} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>מספר טלפון / זיהוי משתמש</label>
                    <div style={styles.inputWrapper}>
                        <Phone size={20} style={styles.inputIcon} />
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="לדוגמה: +972501234567"
                            style={styles.input}
                            required
                        />
                    </div>
                </div>

                <div style={styles.dateGrid}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>תאריך התחלה</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={styles.dateInput}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>תאריך סיום</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={styles.dateInput}
                            required
                        />
                    </div>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>מקדם מחיר לפי דקה (Rate Multiplier)</label>
                    <select
                        value={multiplier}
                        onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                        style={styles.select}
                    >
                        <option value={1.5}>1.5 ש"ח לדקה (סטנדרט)</option>
                        <option value={1.3}>1.3 ש"ח לדקה (מוזל)</option>
                        <option value={1.0}>1.0 ש"ח לדקה (בסיס)</option>
                        <option value={0.85}>0.85 ש"ח לדקה (VIP)</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={styles.button}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {loading ? 'מחשב נתונים...' : <><Search size={20} /> חושב שימוש והשוואה חודשית</>}
                </button>
            </form>

            {report && (
                <div style={styles.comparisonSection}>
                    <div style={styles.comparisonHeader}>
                        <div style={styles.identifierBadge}>
                            <ArrowRightLeft size={20} color="#2563eb" />
                            דו"ח השוואתי עבור: {report.identifier}
                        </div>
                        {report.comparison && (
                            <div style={styles.deltaBadge(report.comparison.minutes_change_pct >= 0)}>
                                {report.comparison.minutes_change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {report.comparison.minutes_change_pct >= 0 ? '+' : ''}{report.comparison.minutes_change_pct}% בדקות שימוש
                            </div>
                        )}
                    </div>

                    <div style={styles.gridTwo}>
                        {/* Current Period Card */}
                        <div style={styles.periodCard(true)}>
                            <div style={styles.cardTitle}>📅 התקופה הנבחרת (נוכחי)</div>
                            <div style={styles.cardSub}>{report.period.start} עד {report.period.end}</div>

                            <div style={styles.metricRow}>
                                <span style={styles.metricLabel}>סה"כ דקות לחיוב</span>
                                <span style={{ ...styles.metricValue, color: '#2563eb' }}>{report.usage.total_minutes} דק'</span>
                            </div>

                            <div style={styles.metricRow}>
                                <span style={styles.metricLabel}>כמות שיחות</span>
                                <span style={styles.metricValue}>{report.usage.call_count}</span>
                            </div>

                            <div style={{ ...styles.metricRow, borderBottom: 'none' }}>
                                <span style={styles.metricLabel}>סה"כ לתשלום</span>
                                <span style={{ ...styles.metricValue, color: '#16a34a' }}>
                                    {(report.usage.total_minutes * multiplier).toFixed(2)} ש"ח
                                </span>
                            </div>
                        </div>

                        {/* Previous Period Card */}
                        <div style={styles.periodCard(false)}>
                            <div style={styles.cardTitle}>⏪ התקופה הקודמת المקבילה</div>
                            <div style={styles.cardSub}>{report.previous_period.start} עד {report.previous_period.end}</div>

                            <div style={styles.metricRow}>
                                <span style={styles.metricLabel}>סה"כ דקות לחיוב</span>
                                <span style={{ ...styles.metricValue, color: '#64748b' }}>{report.previous_period.total_minutes} דק'</span>
                            </div>

                            <div style={styles.metricRow}>
                                <span style={styles.metricLabel}>כמות שיחות</span>
                                <span style={styles.metricValue}>{report.previous_period.call_count}</span>
                            </div>

                            <div style={{ ...styles.metricRow, borderBottom: 'none' }}>
                                <span style={styles.metricLabel}>סה"כ לתשלום</span>
                                <span style={{ ...styles.metricValue, color: '#475569' }}>
                                    {(report.previous_period.total_minutes * multiplier).toFixed(2)} ש"ח
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    {report.comparison && (
                        <div style={{
                            textAlign: 'center',
                            fontSize: '0.92rem',
                            color: '#475569',
                            backgroundColor: '#ffffff',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0'
                        }}>
                            💡 <b>סיכום שינוי:</b> בתקופה הנוכחית נעשו {report.comparison.minutes_diff >= 0 ? `יותר ${report.comparison.minutes_diff}` : `פחות ${Math.abs(report.comparison.minutes_diff)}`} דקות ({report.comparison.calls_diff >= 0 ? `+${report.comparison.calls_diff}` : report.comparison.calls_diff} שיחות) בהשוואה לתקופה הקודמת.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UsageReport;