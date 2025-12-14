import React, { useState } from 'react';
import { Activity, Users, ShieldAlert, LayoutDashboard } from 'lucide-react';
import LiveCallMonitor from './LiveCallMonitor';
import UserCreditManager from './AdminUserList'; // Pending creation
import SystemControlPanel from './AdminSystemPanel'; // Pending creation
import UsageReport from './UsageReport';
import SystemPrompts from './PromptEditor';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('live');

    const styles = {
        container: {
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: "'Inter', sans-serif",
        },
        header: {
            marginBottom: '2rem',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '1rem',
        },
        title: {
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        tabs: {
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            borderBottom: '1px solid #e5e7eb',
        },
        tab: (isActive) => ({
            padding: '12px 24px',
            cursor: 'pointer',
            borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
            color: isActive ? '#2563eb' : '#6b7280',
            fontWeight: isActive ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            marginBottom: '-1px',
        }),
        content: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            minHeight: '400px',
            // boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', // Optional
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'live':
                return <LiveCallMonitor />;
            case 'users':
                return <UserCreditManager />;
            case 'system':
                return <SystemControlPanel />;
            case 'usage':
                return <UsageReport />;
            case 'system_prompt':
                return <SystemPrompts />;
            default:
                return <LiveCallMonitor />;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>
                    <LayoutDashboard size={32} color="#4f46e5" />
                    Admin Control Center
                </h1>
                <p style={{ color: '#6b7280', marginTop: '8px' }}>
                    Monitor active calls, manage user credits, and control system status.
                </p>
            </div>

            <div style={styles.tabs}>
                <button
                    style={styles.tab(activeTab === 'live')}
                    onClick={() => setActiveTab('live')}
                >
                    <Activity size={18} />
                    Live Monitor
                </button>
                <button
                    style={styles.tab(activeTab === 'users')}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} />
                    User Manager
                </button>
                <button
                    style={styles.tab(activeTab === 'system')}
                    onClick={() => setActiveTab('system')}
                >
                    <ShieldAlert size={18} />
                    System Health
                </button>
                <button
                    style={styles.tab(activeTab === 'usage')}
                    onClick={() => setActiveTab('usage')}
                >
                    Usage Report
                </button>
                <button
                    style={styles.tab(activeTab === 'system_prompt')}
                    onClick={() => setActiveTab('system_prompt')}
                >
                    System Prompt
                </button>
            </div>

            <div style={styles.content}>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboard;
