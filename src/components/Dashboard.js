import React, { useState, useEffect } from 'react';
// The user's code uses Link, but in this environment, a standard <a> tag is used for navigation.
// import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, BarChart2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    // --- Brand Colors ---
    const brandColors = {
        yellow: '#f9bb2b',
        darkBlue: '#07455c',
        neutral: '#fefef9',
        accentBlue: '#1c7d95',
    };
    // --- STYLES OBJECT ---
    const styles = {
        page: { fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", backgroundColor: brandColors.neutral, color: brandColors.darkBlue, minHeight: '100vh', padding: '2rem' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
        title: { fontSize: '2.5rem', fontWeight: '600', color: brandColors.darkBlue, margin: 0 },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
        statCard: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', gap: '1.5rem' },
        statIcon: { color: 'white', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        statContent: { display: 'flex', flexDirection: 'column' },
        statTitle: { margin: 0, fontSize: '1rem', color: brandColors.accentBlue, fontWeight: '500' },
        statValue: { margin: '4px 0 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: brandColors.darkBlue },
        chartsContainer: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2.5rem' },
        chartWrapper: { backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
        chartTitle: { fontSize: '1.25rem', fontWeight: '500', color: brandColors.darkBlue, margin: '0 0 1.5rem 0' },
        recentCallsContainer: { backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
        recentCallsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
        viewAllLink: { textDecoration: 'none', color: brandColors.accentBlue, fontWeight: 'bold' },
        table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' },
        tableTh: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: brandColors.accentBlue, textTransform: 'uppercase', borderBottom: `2px solid #e0e0e0` },
        tableRow: { backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', transition: 'transform 0.2s' },
        tableTd: { padding: '15px', border: 'none', borderBottom: '1px solid #f0f0f0' },
        iconTd: { display: 'flex', alignItems: 'center', gap: '10px' },
        statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'capitalize' },
        viewLink: { textDecoration: 'none', color: brandColors.accentBlue, fontWeight: 'bold' },
        loader: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: brandColors.accentBlue, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' },
        spinner: { animation: 'spin 1s linear infinite' },
    };
    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const [statsResponse, recentCallsResponse] = await Promise.all([
                    axios.get(`${baseURL}/api/calls/stats/`),
                    axios.get(`${baseURL}/api/calls/?limit=5`)
                ]);

                const data = statsResponse.data;
                const processedStats = {
                    totalCalls: data.totalCalls || 0,
                    incomingCalls: data.incomingCalls || 0,
                    outgoingCalls: data.outgoingCalls || 0,
                    completedCalls: data.completedCalls || 0,
                    failedCalls: data.failedCalls || 0,
                    inProgressCalls: data.inProgressCalls || 0,
                    averageDuration: data.averageDuration || 0,
                    totalDuration: data.totalDuration || 0
                };
                
                setStats(processedStats);
                setRecentCalls(recentCallsResponse.data.results || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                // Set empty stats on error to prevent crashes
                setStats({ totalCalls: 0, incomingCalls: 0, outgoingCalls: 0, completedCalls: 0, failedCalls: 0, inProgressCalls: 0, averageDuration: 0, totalDuration: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const barChartData = stats ? [
        { name: 'Completed', calls: stats.completedCalls, fill: '#27ae60' },
        { name: 'In Progress', calls: stats.inProgressCalls, fill: '#2980b9' },
        { name: 'Failed', calls: stats.failedCalls, fill: '#c0392b' },
    ] : [];

    const pieChartData = stats ? [
        { name: 'Incoming', value: stats.incomingCalls },
        { name: 'Outgoing', value: stats.outgoingCalls },
    ] : [];

    const PIE_COLORS = [brandColors.accentBlue, brandColors.yellow];

    const StatCard = ({ icon, title, value, color }) => (
        <div style={{...styles.statCard, borderLeft: `5px solid ${color}`}}>
            <div style={{...styles.statIcon, backgroundColor: color}}>
                {icon}
            </div>
            <div style={styles.statContent}>
                <h3 style={styles.statTitle}>{title}</h3>
                <p style={styles.statValue}>{value}</p>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{...styles.page, ...styles.loader}}>
                 <Loader2 size={32} style={styles.spinner}/> Loading dashboard data...
            </div>
        );
    }
    
    
    
    const getStatusStyle = (status) => {
        const base = styles.statusBadge;
        switch(status) {
            case 'completed': return {...base, color: '#27ae60', backgroundColor: '#eafaf1'};
            case 'failed': return {...base, color: '#c0392b', backgroundColor: '#f9ebea'};
            case 'in_progress': return {...base, color: '#2980b9', backgroundColor: '#eaf2f8'};
            case 'canceled': return {...base, color: '#f39c12', backgroundColor: '#fef5e7'};
            case 'busy': return {...base, color: '#8e44ad', backgroundColor: '#f4ecf7'};
            default: return {...base, color: '#7f8c8d', backgroundColor: '#f4f6f7'};
        }
    };

    return (
        <div style={styles.page}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .recent-calls-table tbody tr:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.08); }`}</style>
            <header style={styles.header}>
                <h1 style={styles.title}>Dashboard</h1>
            </header>

            <div style={styles.statsGrid}>
                <StatCard icon={<Phone size={24}/>} title="Total Calls" value={stats.totalCalls} color={brandColors.darkBlue} />
                <StatCard icon={<PhoneIncoming size={24}/>} title="Incoming Calls" value={stats.incomingCalls} color={brandColors.accentBlue} />
                <StatCard icon={<PhoneOutgoing size={24}/>} title="Outgoing Calls" value={stats.outgoingCalls} color={brandColors.yellow} />
                <StatCard icon={<Clock size={24}/>} title="Avg. Duration" value={`${(stats.averageDuration / 60).toFixed(1)} min`} color="#3498db" />
                <StatCard icon={<BarChart2 size={24}/>} title="Total Duration" value={`${(stats.totalDuration / 3600).toFixed(1)} hr`} color="#27ae60" />
            </div>

            <div style={styles.chartsContainer}>
                 <div style={styles.chartWrapper}>
                    <h3 style={styles.chartTitle}>Call Status Overview</h3>
                     <ResponsiveContainer width="100%" height={300}>
                         <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                             <XAxis dataKey="name" tick={{fill: brandColors.darkBlue}}/>
                             <YAxis tick={{fill: brandColors.darkBlue}}/>
                             <Tooltip contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: brandColors.accentBlue}}/>
                             <Bar dataKey="calls" barSize={40} radius={[4, 4, 0, 0]}/>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
                 <div style={styles.chartWrapper}>
                    <h3 style={styles.chartTitle}>Call Direction</h3>
                    <ResponsiveContainer width="100%" height={300}>
                         <PieChart>
                             <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                 {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                             </Pie>
                             <Tooltip />
                             <Legend />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>
            </div>

            <div style={styles.recentCallsContainer}>
                <div style={styles.recentCallsHeader}>
                    <h3 style={styles.chartTitle}>Recent Calls</h3>
                    <Link to="/calls" style={styles.viewAllLink}>View All &rarr;</Link>
                </div>
                <table style={styles.table} className="recent-calls-table">
                    <thead><tr>
                        <th style={styles.tableTh}>Phone Number</th><th style={styles.tableTh}>Direction</th>
                        <th style={styles.tableTh}>Status</th><th style={styles.tableTh}>Duration</th>
                        <th style={styles.tableTh}>Date</th><th style={styles.tableTh}>Actions</th>
                    </tr></thead>
                    <tbody>
                        {recentCalls.map(call => (
                             <tr key={call.id} style={styles.tableRow}>
                                <td style={styles.tableTd}>{call.phone_number}</td>
                                <td style={styles.tableTd}><div style={styles.iconTd}>
                                    {call.direction === 'in' ? <PhoneIncoming size={18} color="#27ae60"/> : <PhoneOutgoing size={18} color="#2980b9"/>}
                                    {call.direction === 'in' ? 'Incoming' : 'Outgoing'}
                                </div></td>
                                <td style={styles.tableTd}><span style={getStatusStyle(call.status)}>{call.status.replace(/_/g, ' ')}</span></td>
                                <td style={styles.tableTd}>{(call.total_duration / 60).toFixed(1)} min</td>
                                <td style={styles.tableTd}>{call.formatted_created_at}</td>
                                <td style={styles.tableTd}><Link to={`/calls/${call.id}`} style={styles.viewLink}>View</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Dashboard;
