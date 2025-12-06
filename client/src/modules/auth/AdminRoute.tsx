import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  const isAdmin = (user?.roles || []).includes('ADMIN');
  if (!isAdmin) return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <Outlet />;
};
