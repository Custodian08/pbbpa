import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'antd/dist/reset.css';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { AuthProvider } from './modules/auth/AuthContext';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { AdminRoute } from './modules/auth/AdminRoute';
import { AppLayout } from './modules/layout/AppLayout';
import { LoginPage } from './pages/Login';
import { PremisesPage } from './pages/Premises';
import { TenantsPage } from './pages/Tenants';
import { LeasesPage } from './pages/Leases';
import { InvoicesPage } from './pages/Invoices';
import { PaymentsPage } from './pages/Payments';
import { AdminUsersPage } from './pages/AdminUsers';
import { AdminAuditPage } from './pages/AdminAudit';
import { AdminSettingsPage } from './pages/AdminSettings';
import { LeaseDetailsPage } from './pages/LeaseDetails';
import { DashboardPage } from './pages/Dashboard';
import { ReservationsPage } from './pages/Reservations';
import { CatalogPage } from './pages/Catalog';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ConfigProvider locale={ruRU} theme={{ cssVar: {} }}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}> 
                  <Route element={<AppLayout />}> 
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/premises" element={<PremisesPage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/tenants" element={<TenantsPage />} />
                    <Route path="/leases" element={<LeasesPage />} />
                    <Route path="/leases/:id" element={<LeaseDetailsPage />} />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/reservations" element={<ReservationsPage />} />
                    <Route element={<AdminRoute />}> 
                      <Route path="/admin/users" element={<AdminUsersPage />} />
                      <Route path="/admin/audit" element={<AdminAuditPage />} />
                      <Route path="/admin/settings" element={<AdminSettingsPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/premises" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
