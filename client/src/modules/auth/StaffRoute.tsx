import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const StaffRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  const roles = (user?.roles || []) as string[];
  const isStaff = roles.some(r => ['ADMIN','OPERATOR','MANAGER','EXEC','ANALYST'].includes(r));
  if (!isStaff) return <Navigate to={location.state?.from?.pathname || '/catalog'} replace />;
  return <Outlet />;
};
