import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import LogoutButton from '../auth/Logout';
import updatedLogo from '../updated_logo.png';
import UserQuota from './UserQuota';
import { Menu, X, Bell } from 'lucide-react';
import AlertsManagementModal from './AlertsManagementModal';

const NavBar = () => {
  const { user } = useAuth0();
  const [showQuota, setShowQuota] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Add state for mobile menu
  const [alertCount, setAlertCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const fetchAlertCount = async () => {
    try {
      const res = await fetch(`${baseURL}/api/calls/alert-count/`); // New endpoint
      if (res.ok) {
        const data = await res.json();
        setAlertCount(data.count);
      }
    } catch (e) {
      console.error("Failed to fetch alert count", e);
    }
  };

  // Fetch count on mount and every 5 minutes
  useEffect(() => {
    if (user) {
      fetchAlertCount();
      const interval = setInterval(fetchAlertCount, 300000);
      return () => clearInterval(interval);
    }
  }, [user]);
  return (
    <header className="app-header">
      <div className="header-left">
        <img src={updatedLogo} alt="Bot 10 Logo" className="logo-image" />
        <h1 className="header-title">Call Management System</h1>
      </div>
      {/* Hamburger icon for mobile */}
      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <nav className={menuOpen ? 'nav-open' : ''}>
        <ul className="nav-links">
          <li>
            <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          </li>
          <li>
            <Link to="/calls" onClick={() => setMenuOpen(false)}>Call History</Link>
          </li>
          <li>
            <Link to="/calls/new" onClick={() => setMenuOpen(false)}>New Call</Link>
          </li>
        </ul>
      </nav>

      <div className="user-nav">

        {user && (
          <div className="user-info">
            <span
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setShowQuota(true)}
            >
              {user.name}
            </span>
            <button
              onClick={() => setShowAlerts(true)}
              className="relative text-white hover:text-yellow-200 transition-colors p-1"
            >
              <Bell size={24} />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#002b5c]">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
            <LogoutButton />
          </div>
        )}
      </div>
      {showQuota && <UserQuota onClose={() => setShowQuota(false)} />}
      {showAlerts && (
        <AlertsManagementModal
          onClose={() => setShowAlerts(false)}
          onUpdate={fetchAlertCount}
        />
      )}
    </header>
  );
};

export default NavBar;