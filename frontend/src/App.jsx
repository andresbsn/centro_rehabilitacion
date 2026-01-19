import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import { PatientDetailPage } from './pages/PatientDetailPage.jsx';
import ConfigPage from './pages/ConfigPage.jsx';
import { MassTurnsPage } from './pages/MassTurnsPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import ReportesPage from './pages/ReportesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AuditoriaPage from './pages/AuditoriaPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="pacientes" element={<PatientsPage />} />
        <Route path="pacientes/:id" element={<PatientDetailPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="configuracion" element={<ConfigPage />} />
        <Route path="turnos/masivo" element={<MassTurnsPage />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
