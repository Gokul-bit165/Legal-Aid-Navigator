import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FormProvider } from './contexts/FormContext';
import { LoginPage } from './pages/LoginPage';
import { LocationDetailsPage } from './pages/LocationDetailsPage';
import { LegalIssueDetailsPage } from './pages/LegalIssueDetailsPage';
import { EligibilityDetailsPage } from './pages/EligibilityDetailsPage';
import { ContactDetailsPage } from './pages/ContactDetailsPage';
import { AppointmentPreferencesPage } from './pages/AppointmentPreferencesPage';
import { ConsentConfirmationPage } from './pages/ConsentConfirmationPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AgentResponsePage } from './pages/AgentResponsePage';
import { AppointmentStatusPage } from './pages/AppointmentStatusPage';
import { PersonalInfoPage } from './pages/PersonalInfoPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminApplicationDetailPage } from './pages/admin/AdminApplicationDetailPage';
import {
  AdminUsersPage, AdminAppointmentsPage, AdminAuthoritiesPage, AdminReportsPage, AdminSettingsPage,
} from './pages/admin/AdminSecondaryPages';
import './index.css';

// Protected route guard
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ivory-200">
        <p className="text-bark-500 text-lg">Loading…</p>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin-only route guard: signed-out users go to login, applicants go back to their form
const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/app/location" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <FormProvider>
        <BrowserRouter>
          <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
          <Routes>
            {/* Root → Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Multi-step form – all protected */}
            <Route path="/app/location" element={<RequireAuth><LocationDetailsPage /></RequireAuth>} />
            <Route path="/app/legal-issue" element={<RequireAuth><LegalIssueDetailsPage /></RequireAuth>} />
            <Route path="/app/eligibility" element={<RequireAuth><EligibilityDetailsPage /></RequireAuth>} />
            <Route path="/app/contact" element={<RequireAuth><ContactDetailsPage /></RequireAuth>} />
            <Route path="/app/appointment" element={<RequireAuth><AppointmentPreferencesPage /></RequireAuth>} />
            <Route path="/app/consent" element={<RequireAuth><ConsentConfirmationPage /></RequireAuth>} />

            <Route path="/agent-response" element={<RequireAuth><AgentResponsePage /></RequireAuth>} />

            {/* Appointment Status – protected */}
            <Route path="/appointment-status" element={<RequireAuth><AppointmentStatusPage /></RequireAuth>} />

            {/* Personal Info – protected */}
            <Route path="/app/personal-info" element={<RequireAuth><PersonalInfoPage /></RequireAuth>} />

            {/* Admin portal – administrators only */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminApplicationsPage />} />
              <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="appointments" element={<AdminAppointmentsPage />} />
              <Route path="authorities" element={<AdminAuthoritiesPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </FormProvider>
    </AuthProvider>
  );
};

export default App;
