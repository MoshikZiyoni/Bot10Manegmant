import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import LogoutButton from '../auth/Logout';

const NavBar = () => {
  const { user } = useAuth0();
  
  return (
    <header className="app-header">
      <h1>Call Management System</h1>
      <nav>
        <ul className="nav-links">
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/calls">Call History</Link></li>
          <li><Link to="/calls/new">New Call</Link></li>
        </ul>
      </nav>
      <div className="user-nav">
        {user && (
          <div className="user-info">
            {/* <img src={user.picture} alt={user.name} className="user-avatar" /> */}
            <span>{user.name}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;