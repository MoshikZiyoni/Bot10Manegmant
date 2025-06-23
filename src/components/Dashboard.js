import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import axios from 'axios';
import { callsApi } from './APIcalls';
function Dashboard() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    completedCalls: 0,
    failedCalls: 0,
    inProgressCalls: 0,
    averageDuration: 0,
    totalDuration: 0
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseURL = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
        try {
          const [statsResponse, recentCallsResponse] = await Promise.all([
            axios.get(`${baseURL}/api/calls/stats/`),
            axios.get(`${baseURL}/api/calls/?limit=5`)
          ]);
          
          const data = statsResponse.data;
          // Ensure we have numeric values with fallbacks
          const processedStats = {
            ...data,
            averageDuration: data.averageDuration || 0,
            totalDuration: data.totalDuration || 0,
          }; console.log(data.totalDuration);
          
          
          setStats(processedStats);
          setRecentCalls(recentCallsResponse.data.results);
          setLoading(false);


        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setLoading(false);
        }
      };

    fetchDashboardData();
  }, []);

  const chartData = [
    { name: 'Incoming', calls: stats.incomingCalls },
    { name: 'Outgoing', calls: stats.outgoingCalls },
    { name: 'Completed', calls: stats.completedCalls },
    { name: 'Failed', calls: stats.failedCalls },
    { name: 'In Progress', calls: stats.inProgressCalls },
  ];

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }
  
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon"><Phone size={24} /></div>
          <div className="stat-content">
            <h3>Total Calls</h3>
            <p className="stat-value">{stats.totalCalls}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon"><PhoneIncoming size={24} /></div>
          <div className="stat-content">
            <h3>Incoming</h3>
            <p className="stat-value">{stats.incomingCalls}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon"><PhoneOutgoing size={24} /></div>
          <div className="stat-content">
            <h3>Outgoing</h3>
            <p className="stat-value">{stats.outgoingCalls}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-content">
            <h3>Avg. Duration</h3>
            <p className="stat-value">{(stats.averageDuration / 60).toFixed(1)} min</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>Total Duration</h3>
            <p className="stat-value">{(stats.totalDuration / 60).toFixed(1)} min</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Call Statistics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="calls" fill="#4299e1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      
      <div className="recent-calls">
        <div className="section-header">
          <h3>Recent Calls</h3>
          <Link to="/calls" className="view-all">View All</Link>
        </div>
        
        <table className="calls-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Direction</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentCalls.map(call => (
              <tr key={call.id}>
                <td>{call.phone_number}</td>
                <td>
                  {call.direction === 'in' ? 
                    <PhoneIncoming size={16} className="icon-incoming" /> : 
                    <PhoneOutgoing size={16} className="icon-outgoing" />}
                  {call.direction === 'in' ? 'Incoming' : 'Outgoing'}
                </td>
                <td>
                  <span className={`status-badge status-${call.status}`}>
                    {call.status.replace('_', ' ')}
                  </span>
                </td>
                {/* <td>{Math.round(call.total_duration / 60)} min</td> */}
                <td>{(call.total_duration / 60).toFixed(1)} min</td>
                <td>{call.formatted_created_at}</td>
                <td>
                  <Link to={`/calls/${call.id}`} className="btn-view">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;