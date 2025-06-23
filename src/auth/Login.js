import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function Login() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Call Management System</h2>
        <p>Please sign in to access the call management dashboard</p>
        <button 
          className="btn-login" 
          onClick={() => loginWithRedirect()}
        >
          Log In
        </button>
      </div>
    </div>
  );
}

export default Login;