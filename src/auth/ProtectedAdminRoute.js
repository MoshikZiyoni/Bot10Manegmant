import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ShieldAlert } from "lucide-react";

const ProtectedAdminRoute = ({ children }) => {
    const { isAuthenticated, isLoading, user } = useAuth0();
    const ADMIN_EMAIL = "moshiktm1994@gmail.com";

    if (isLoading) {
        return <div className="loading">Verifying admin privileges...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (user?.email !== ADMIN_EMAIL) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: '#f9fafb',
                padding: '2rem'
            }}>
                <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '2rem', color: '#1f2937', marginBottom: '0.5rem' }}>Access Denied</h1>
                <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '400px', marginBottom: '2rem' }}>
                    You do not have permission to view this page. This area is restricted to administrators only.
                </p>
                <a href="/" style={{
                    color: 'white',
                    backgroundColor: '#2563eb',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600'
                }}>
                    Return to Dashboard
                </a>
            </div>
        );
    }

    return children;
};

export default ProtectedAdminRoute;
