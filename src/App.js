import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CallList from './components/CallList';
import CallDetail from './components/CallDetail';
import NewCall from './components/NewCall';
import Login from './auth/Login';
import ProtectedRoute from './auth/protected-route';
import NavBar from './components/NavBar';
import './App.css';
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from'react';
function App() {
  const { isAuthenticated, isLoading, loginWithRedirect, user, logout } = useAuth0();
  const ALLOWED_EMAILS = (process.env.REACT_APP_ALLOWED_EMAILS || "")
    .split(",")
    .map(email => email.trim())
    .filter(Boolean);
    
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
    // If authenticated but email is not allowed, log out
    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      !ALLOWED_EMAILS.includes(user.email)
    ) {
      logout({ returnTo: window.location.origin });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, user, logout]);

  // Optionally, show a message if not allowed
  if (
    isAuthenticated &&
    user &&
    !ALLOWED_EMAILS.includes(user.email)
  ) {
    alert("Not Authorized -- Your email is not allowed to access this application.")
  }
  return (


      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <NavBar />
                <main className="app-content">
                  <Dashboard />
                </main>
              </ProtectedRoute>
            } />
            
            <Route path="/calls" element={
              <ProtectedRoute>
                <NavBar />
                <main className="app-content">
                  <CallList />
                </main>
              </ProtectedRoute>
            } />
            
            <Route path="/calls/:id" element={
              <ProtectedRoute>
                <NavBar />
                <main className="app-content">
                  <CallDetail />
                </main>
              </ProtectedRoute>
            } />
            
            <Route path="/calls/new" element={
              <ProtectedRoute>
                <NavBar />
                <main className="app-content">
                  <NewCall />
                </main>
              </ProtectedRoute>
            } />
            
            {/* Redirect to login if no match */}
            {/* <Route path="*" element={<Navigate to="/login" />} /> */}
          </Routes>
          
          <footer className="app-footer">
            <p>© 2025 Call Management System</p>
          </footer>
        </div>
      </Router>
  );
}

export default App;