import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthProvider.jsx';

export function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="container">
        <div className="card">Cargando...</div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return children;
}
