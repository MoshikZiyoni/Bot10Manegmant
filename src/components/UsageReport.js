import React, { useState } from 'react';
import { 
  Search, Clock, Phone, TrendingUp, TrendingDown, Calendar, ArrowRightLeft, 
  Download, Sliders 
} from 'lucide-react';
import axios from 'axios';

const UsageReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [identifier, setIdentifier] = useState(''); // Phone number
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [multiplier, setMultiplier] = useState(1.5);
    const baseURL = process.env.REACT_APP_API_URL || '';

    // Helper to format Date object to YYYY-MM-DD in local time
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Quick presets
    const setThisMonth = () => {
        const now = new Date();
        const firstDay = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const today = formatDate(now);
        setStartDate(firstDay);
        setEndDate(today);
    };

    const setLastMonth = () => {
        const now = new Date();
        const firstDayLastMonth = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastDayLastMonth = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
        setStartDate(firstDayLastMonth);
        setEndDate(lastDayLastMonth);
    };

    const setLast30Days = () => {
        const now = new Date();
        const today = formatDate(now);
        const thirtyDaysAgo = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
        setStartDate(thirtyDaysAgo);
        setEndDate(today);
    };

    const setLast90Days = () => {
        const now = new Date();
        const today = formatDate(now);
        const ninetyDaysAgo = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90));
        setStartDate(ninetyDaysAgo);
        setEndDate(today);
    };

    const handleCheckUsage = async (e) => {
        if (e) e.preventDefault();
        if (!identifier || !startDate || !endDate) return;

        setLoading(true);
        try {
            const apiKey = process.env.REACT_APP_BACKEND_API_KEY;
            const response = await axios.get(
                `${baseURL}/api/usage-report/?start_date=${startDate}&end_date=${endDate}&identifier=${encodeURIComponent(identifier)}`,
                {
                    headers: apiKey ? { 'X-API-Key': apiKey } : {}
                }
            );
            setReport(response.data);
        } catch (error) {
            console.error("Error:", error);
            const msg = error.response?.data?.error || error.message || 'Failed to load usage report';
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!report) return;
        
        const headers = ["Period", "Start Date", "End Date", "Call Count", "Billable Minutes", `Billable Price (x${multiplier})`].join(",");
        const row1 = [
            "Selected Period",
            report.period.start,
            report.period.end,
            report.usage.call_count,
            report.usage.total_minutes,
            (report.usage.total_minutes * multiplier).toFixed(2)
        ].join(",");

        const row2 = report.previous_period ? [
            "Previous Period 1",
            report.previous_period.start,
            report.previous_period.end,
            report.previous_period.call_count,
            report.previous_period.total_minutes,
            (report.previous_period.total_minutes * multiplier).toFixed(2)
        ].join(",") : "";

        const row3 = report.previous_period_2 ? [
            "Previous Period 2",
            report.previous_period_2.start,
            report.previous_period_2.end,
            report.previous_period_2.call_count,
            report.previous_period_2.total_minutes,
            (report.previous_period_2.total_minutes * multiplier).toFixed(2)
        ].join(",") : "";

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, row1, row2, row3].filter(Boolean).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `usage_report_${report.identifier}_${report.period.start}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const styles = {
        container: {
            maxWidth: '1050px',
            margin: '2rem auto',
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.06)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            direction: 'ltr',
            border: '1px solid #e2e8f0',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '1rem',
        },
        title: {
            fontSize: '1.9rem',
            fontWeight: '800',
            margin: 0,
            background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        presetBar: {
            display: 'flex',
            gap: '10px',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
        },
        presetBtn: {
            padding: '10px 18px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
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
            fontSize: '0.92rem',
            fontWeight: '700',
            color: '#1e293b',
        },
        inputWrapper: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        },
        inputIcon: {
            position: 'absolute',
            left: '16px',
            color: '#94a3b8',
            pointerEvents: 'none',
        },
        input: {
            width: '100%',
            padding: '14px 18px',
            paddingLeft: '48px',
            fontSize: '1.05rem',
            color: '#0f172a',
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '14px',
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
            padding: '14px 18px',
            fontSize: '1rem',
            color: '#0f172a',
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '14px',
            outline: 'none',
            boxSizing: 'border-box',
        },
        rateBox: {
            backgroundColor: '#f1f5f9',
            borderRadius: '18px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
        },
        slider: {
            width: '100%',
            cursor: 'pointer',
            accentColor: '#2563eb',
            marginTop: '8px',
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
            borderRadius: '16px',
            fontSize: '1.1rem',
            fontWeight: '800',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
        },
        reportCard: {
            marginTop: '2rem',
            backgroundColor: '#f8fafc',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid #e2e8f0',
        },
        threeGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
        },
        periodCard: (isMain) => ({
            backgroundColor: isMain ? '#ffffff' : '#f8fafc',
            borderRadius: '18px',
            padding: '1.5rem',
            border: isMain ? '2.5px solid #2563eb' : '1px solid #cbd5e1',
            boxShadow: isMain ? '0 12px 30px rgba(37, 99, 235, 0.12)' : 'none',
            position: 'relative',
        }),
        insightsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
        },
        insightCard: {
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>
                    <Clock size={34} color="#2563eb" />
                    Usage Calculator & Multi-Month Analytics
                </h2>
                {report && (
                    <button type="button" style={{ ...styles.presetBtn, backgroundColor: '#10b981', color: '#fff', border: 'none' }} onClick={exportToCSV}>
                        <Download size={18} /> Export Report to CSV
                    </button>
                )}
            </div>

            {/* Presets Bar */}
            <div style={styles.presetBar}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>Quick Date Presets:</span>
                <button type="button" style={styles.presetBtn} onClick={setThisMonth}>
                    <Calendar size={16} /> Current Month
                </button>
                <button type="button" style={styles.presetBtn} onClick={setLastMonth}>
                    <Calendar size={16} /> Last Month
                </button>
                <button type="button" style={styles.presetBtn} onClick={setLast30Days}>
                    <Calendar size={16} /> Last 30 Days
                </button>
                <button type="button" style={styles.presetBtn} onClick={setLast90Days}>
                    <Calendar size={16} /> Last 90 Days
                </button>
            </div>

            <form onSubmit={handleCheckUsage} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Customer Phone Number / User Identifier</label>
                    <div style={styles.inputWrapper}>
                        <Phone size={22} style={styles.inputIcon} />
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Example: +972501234567"
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

                {/* Interactive Rate Slider Box */}
                <div style={styles.rateBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={18} color="#2563eb" />
                            Interactive Rate Multiplier:
                        </label>
                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2563eb' }}>
                            x{multiplier} NIS / Minute
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={multiplier}
                        onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                        style={styles.slider}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={styles.button}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {loading ? 'Calculating Usage Analytics...' : <><Search size={22} /> Generate Usage & Comparison Report</>}
                </button>
            </form>

            {report && (
                <div style={styles.reportCard}>
                    {/* Header Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ArrowRightLeft size={22} color="#2563eb" />
                            Historical Usage Analytics for: {report.identifier}
                        </div>
                        {report.comparison && (
                            <div style={{
                                padding: '6px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '800',
                                backgroundColor: report.comparison.minutes_change_pct >= 0 ? '#dcfce7' : '#fee2e2',
                                color: report.comparison.minutes_change_pct >= 0 ? '#166534' : '#991b1b',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                {report.comparison.minutes_change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {report.comparison.minutes_change_pct >= 0 ? '+' : ''}{report.comparison.minutes_change_pct}% Minutes Usage
                            </div>
                        )}
                    </div>

                    {/* 3 Multi-Period Cards */}
                    <div style={styles.threeGrid}>
                        {/* Current Period */}
                        <div style={styles.periodCard(true)}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>
                                📅 Selected Period (Current)
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                                {report.period.start} to {report.period.end}
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>
                                {report.usage.total_minutes} mins
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                                {report.usage.call_count} Calls
                            </div>
                            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', fontSize: '1.15rem', fontWeight: '800', color: '#16a34a' }}>
                                {(report.usage.total_minutes * multiplier).toFixed(2)} NIS
                            </div>
                        </div>

                        {/* Previous Period 1 */}
                        {report.previous_period && (
                            <div style={styles.periodCard(false)}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    ⏮️ Last Month (Period 1)
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                                    {report.previous_period.start} to {report.previous_period.end}
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#334155' }}>
                                    {report.previous_period.total_minutes} mins
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                                    {report.previous_period.call_count} Calls
                                </div>
                                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', fontSize: '1.15rem', fontWeight: '800', color: '#475569' }}>
                                    {(report.previous_period.total_minutes * multiplier).toFixed(2)} NIS
                                </div>
                            </div>
                        )}

                        {/* Previous Period 2 */}
                        {report.previous_period_2 && (
                            <div style={styles.periodCard(false)}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    ⏪ 2 Months Ago (Period 2)
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                                    {report.previous_period_2.start} to {report.previous_period_2.end}
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#475569' }}>
                                    {report.previous_period_2.total_minutes} mins
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                                    {report.previous_period_2.call_count} Calls
                                </div>
                                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', fontSize: '1.15rem', fontWeight: '800', color: '#64748b' }}>
                                    {(report.previous_period_2.total_minutes * multiplier).toFixed(2)} NIS
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Insights & Cost Projections */}
                    {report.insights && (
                        <div style={styles.insightsGrid}>
                            <div style={styles.insightCard}>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>Avg. Daily Minutes</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2563eb', margin: '4px 0' }}>
                                    {report.insights.avg_daily_minutes} mins
                                </div>
                            </div>

                            <div style={styles.insightCard}>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>30-Day Monthly Forecast</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6', margin: '4px 0' }}>
                                    {report.insights.projected_30_day_minutes} mins
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                                    ~{(report.insights.projected_30_day_minutes * multiplier).toFixed(2)} NIS Est.
                                </div>
                            </div>

                            <div style={styles.insightCard}>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>Avg. Call Duration</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>
                                    {report.insights.avg_call_duration_sec} secs
                                </div>
                            </div>

                            <div style={styles.insightCard}>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>Number Answer Rate</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', margin: '4px 0' }}>
                                    {report.insights.answer_rate}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UsageReport;