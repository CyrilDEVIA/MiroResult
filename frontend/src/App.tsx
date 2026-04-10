import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import SimulationsPage from '@/features/simulations/SimulationsPage'
import ReportPage from '@/features/reports/ReportPage'
import RapportPage from '@/features/simulations/RapportPage'
import SettingsPage from '@/features/admin/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/simulations" element={<SimulationsPage />} />
          <Route path="/simulations/:id/report" element={<ReportPage />} />
          <Route path="/simulations/:id/rapport" element={<RapportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
