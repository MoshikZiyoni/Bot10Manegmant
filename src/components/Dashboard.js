import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, Clock, BarChart2, Loader2, 
  TrendingUp, TrendingDown, Calendar, RefreshCw, Activity, ArrowUpRight, Zap, ShieldCheck 
} from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const apiKey = process.env.REACT_APP_BACKEND_API_KEY;
      const headers = apiKey ? { 'X-API-Key': apiKey } : {};

      const [statsResponse, recentCallsResponse] = await Promise.all([
        axios.get(`${baseURL}/api/calls/stats/`, { headers }),
        axios.get(`${baseURL}/api/calls/?limit=6`, { headers })
      ]);

      const data = statsResponse.data;
      const processedStats = {
        totalCalls: data.totalCalls || 0,
        incomingCalls: data.incomingCalls || 0,
        outgoingCalls: data.outgoingCalls || 0,
        completedCalls: data.completedCalls || 0,
        failedCalls: data.failedCalls || 0,
        inProgressCalls: data.inProgressCalls || 0,
        busyCalls: data.busyCalls || 0,
        canceledCalls: data.canceledCalls || 0,
        averageDuration: data.averageDuration || 0,
        totalDuration: data.totalDuration || 0,
        totalBillableMinutes: data.totalBillableMinutes || 0,
        monthOverMonth: data.monthOverMonth || null,
        monthlyTrend: data.monthlyTrend || []
      };

      setStats(processedStats);
      setRecentCalls(recentCallsResponse.data.results || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!stats) {
        setStats({
          totalCalls: 0, incomingCalls: 0, outgoingCalls: 0, completedCalls: 0, failedCalls: 0,
          inProgressCalls: 0, busyCalls: 0, canceledCalls: 0, averageDuration: 0, totalDuration: 0, 
          totalBillableMinutes: 0, monthOverMonth: null, monthlyTrend: []
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const styles = {
    page: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f1f5f9',
      color: '#1e293b',
      minHeight: '100vh',
      padding: isMobile ? '1rem' : '2.5rem',
      direction: 'ltr',
    },
    heroCard: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '24px',
      padding: isMobile ? '1.5rem' : '2rem 2.5rem',
      color: '#ffffff',
      marginBottom: '2rem',
      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    },
    heroTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '800',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      letterSpacing: '-0.5px',
    },
    heroSub: {
      fontSize: '0.95rem',
      color: '#94a3b8',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    refreshBtn: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '14px',
      padding: '10px 18px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.2s ease',
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem',
    },
    kpiCard: (borderColor) => ({
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      padding: '1.5rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #e2e8f0',
      borderTop: `4px solid ${borderColor}`,
      position: 'relative',
      transition: 'transform 0.2s ease, boxShadow 0.2s ease',
    }),
    kpiHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    },
    kpiIconBox: (color) => ({
      width: '46px',
      height: '46px',
      borderRadius: '14px',
      backgroundColor: `${color}15`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    kpiLabel: {
      fontSize: '0.88rem',
      color: '#64748b',
      fontWeight: '600',
    },
    kpiValue: {
      fontSize: '1.85rem',
      fontWeight: '800',
      color: '#0f172a',
      margin: '4px 0',
      letterSpacing: '-0.5px',
    },
    kpiDelta: (isPositive) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.8rem',
      fontWeight: '700',
      color: isPositive ? '#166534' : '#991b1b',
      backgroundColor: isPositive ? '#dcfce7' : '#fee2e2',
      padding: '3px 10px',
      borderRadius: '20px',
    }),
    chartGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
      gap: '1.5rem',
      marginBottom: '2rem',
    },
    cardWrapper: {
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '1.75rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #e2e8f0',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
    },
    cardTitle: {
      fontSize: '1.15rem',
      fontWeight: '700',
      color: '#0f172a',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    momWidget: {
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      padding: '1.75rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem',
    },
    momGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '1.25rem',
      marginTop: '1.25rem',
    },
    momBox: (isCurrent) => ({
      backgroundColor: isCurrent ? '#f0fdf4' : '#f8fafc',
      borderRadius: '16px',
      padding: '1.25rem',
      border: isCurrent ? '1.5px solid #86efac' : '1px solid #e2e8f0',
    }),
    table: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '0 8px',
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '0.85rem',
      fontWeight: '700',
      color: '#64748b',
      textTransform: 'uppercase',
    },
    tr: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      transition: 'all 0.2s ease',
    },
    td: {
      padding: '14px 16px',
      fontSize: '0.92rem',
      color: '#334155',
      fontWeight: '500',
      borderTop: '1px solid #f1f5f9',
      borderBottom: '1px solid #f1f5f9',
    },
    statusBadge: (status) => {
      let bg = '#f1f5f9', color = '#475569';
      if (status === 'completed') { bg = '#dcfce7'; color = '#15803d'; }
      else if (status === 'failed') { bg = '#fee2e2'; color = '#b91c1c'; }
      else if (status === 'in_progress') { bg = '#e0f2fe'; color = '#0369a1'; }
      else if (status === 'busy' || status === 'canceled') { bg = '#fef3c7'; color = '#b45309'; }
      return {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '700',
        backgroundColor: bg,
        color: color,
        textTransform: 'capitalize',
      };
    },
  };

  const barChartData = stats ? [
    { name: 'Completed', calls: stats.completedCalls, fill: '#10b981' },
    { name: 'In Progress', calls: stats.inProgressCalls, fill: '#3b82f6' },
    { name: 'Failed', calls: stats.failedCalls, fill: '#f43f5e' },
    { name: 'Busy', calls: stats.busyCalls, fill: '#8b5cf6' },
    { name: 'Canceled', calls: stats.canceledCalls, fill: '#f59e0b' },
  ] : [];

  const pieChartData = stats ? [
    { name: 'Incoming', value: stats.incomingCalls },
    { name: 'Outgoing', value: stats.outgoingCalls },
  ] : [];

  const PIE_COLORS = ['#3b82f6', '#f59e0b'];

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6', marginBottom: '1rem' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#475569' }}>Loading Dashboard Data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Hero Greeting Banner */}
      <div style={styles.heroCard}>
        <div>
          <h1 style={styles.title}>
            <Activity size={32} color="#3b82f6" />
            Call Management Dashboard
          </h1>
          <div style={styles.heroSub}>
            <Calendar size={16} />
            <span>Live Overview • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <button 
          style={styles.refreshBtn}
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard('#3b82f6')}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total System Calls</span>
            <div style={styles.kpiIconBox('#3b82f6')}><Phone size={22} /></div>
          </div>
          <div style={styles.kpiValue}>{stats.totalCalls}</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Incoming: {stats.incomingCalls} | Outgoing: {stats.outgoingCalls}</div>
        </div>

        <div style={styles.kpiCard('#10b981')}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Monthly Answer Rate</span>
            <div style={styles.kpiIconBox('#10b981')}><ShieldCheck size={22} /></div>
          </div>
          <div style={styles.kpiValue}>
            {stats.monthOverMonth ? `${stats.monthOverMonth.currentMonthAnswerRate}%` : 'N/A'}
          </div>
          {stats.monthOverMonth && (
            <div style={styles.kpiDelta(stats.monthOverMonth.answerRateChange >= 0)}>
              {stats.monthOverMonth.answerRateChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {stats.monthOverMonth.answerRateChange >= 0 ? '+' : ''}{stats.monthOverMonth.answerRateChange}% vs prior month
            </div>
          )}
        </div>

        <div style={styles.kpiCard('#8b5cf6')}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Avg. Call Duration</span>
            <div style={styles.kpiIconBox('#8b5cf6')}><Clock size={22} /></div>
          </div>
          <div style={styles.kpiValue}>{(stats.averageDuration / 60).toFixed(1)} min</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Average per call</div>
        </div>

        <div style={styles.kpiCard('#f59e0b')}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Billable Minutes</span>
            <div style={styles.kpiIconBox('#f59e0b')}><BarChart2 size={22} /></div>
          </div>
          <div style={styles.kpiValue}>{stats.totalBillableMinutes} min</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Rounded per call</div>
        </div>
      </div>

      {/* 6-Month Historical Trend Section */}
      {stats.monthlyTrend && stats.monthlyTrend.length > 0 && (
        <div style={styles.cardWrapper}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>
              <TrendingUp size={22} color="#3b82f6" />
              Call Volume & Answer Rate - Last 6 Months
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Historical Performance</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={stats.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="monthName" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }} />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="totalCalls" name="Total Calls" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
              <Area type="monotone" dataKey="answerRate" name="Answer Rate (%)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Answer Rate Month-over-Month Widget */}
      {stats.monthOverMonth && (
        <div style={{ ...styles.momWidget, marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={styles.cardTitle}>
              <Zap size={22} color="#10b981" />
              Monthly Answer Rate Comparison (MoM)
            </h3>
            <span style={styles.kpiDelta(stats.monthOverMonth.answerRateChange >= 0)}>
              {stats.monthOverMonth.answerRateChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {stats.monthOverMonth.answerRateChange >= 0 ? '+' : ''}{stats.monthOverMonth.answerRateChange}% vs last month
            </span>
          </div>

          <div style={styles.momGrid}>
            <div style={styles.momBox(true)}>
              <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '700' }}>🏆 Current Month</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#15803d', margin: '4px 0' }}>
                {stats.monthOverMonth.currentMonthAnswerRate}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                Answered {stats.monthOverMonth.currentMonthCompleted} of {stats.monthOverMonth.currentMonthTotal} calls
              </div>
            </div>

            <div style={styles.momBox(false)}>
              <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '700' }}>⏮️ Previous Month</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#334155', margin: '4px 0' }}>
                {stats.monthOverMonth.previousMonthAnswerRate}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Answered {stats.monthOverMonth.previousMonthCompleted} of {stats.monthOverMonth.previousMonthTotal} calls
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div style={{ ...styles.chartGrid, marginTop: '1.5rem' }}>
        <div style={styles.cardWrapper}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>
              <BarChart2 size={20} color="#3b82f6" />
              Call Status Overview
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill: '#475569' }} />
              <YAxis tick={{ fill: '#475569' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="calls" barSize={36} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.cardWrapper}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>
              <PhoneIncoming size={20} color="#f59e0b" />
              Call Direction (Incoming / Outgoing)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Calls Section */}
      <div style={{ ...styles.cardWrapper, marginTop: '1.5rem' }}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>
            <Clock size={20} color="#3b82f6" />
            Recent System Calls
          </h3>
          <Link to="/calls" style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All Calls <ArrowUpRight size={18} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Phone Number</th>
                <th style={styles.th}>Direction</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Duration</th>
                <th style={styles.th}>Date & Time</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(call => (
                <tr key={call.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '700', color: '#0f172a' }}>{call.phone_number}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {call.direction === 'in' ? 
                        <PhoneIncoming size={16} color="#10b981" /> : 
                        <PhoneOutgoing size={16} color="#3b82f6" />
                      }
                      <span>{call.direction === 'in' ? 'Incoming' : 'Outgoing'}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(call.status)}>{call.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={styles.td}>{call.billable_minutes} min</td>
                  <td style={styles.td}>{call.formatted_created_at}</td>
                  <td style={styles.td}>
                    <Link to={`/calls/${call.id}`} style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
