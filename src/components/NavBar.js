import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import LogoutButton from '../auth/Logout';
import updatedLogo from '../updated_logo.png';
import UserQuota from './UserQuota';

const NavBar = () => {
  const { user } = useAuth0();
  const [showQuota, setShowQuota] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Add state for mobile menu

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
        <span className="hamburger"></span>
        <span className="hamburger"></span>
        <span className="hamburger"></span>
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
            <LogoutButton />
          </div>
        )}
      </div>
      {showQuota && <UserQuota onClose={() => setShowQuota(false)} />}
    </header>
  );
};

export default NavBar;