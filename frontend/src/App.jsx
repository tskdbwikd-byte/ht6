import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import MarketingLayout from './layouts/MarketingLayout'
import Blocked from './pages/Blocked'
import Blocklist from './pages/Blocklist'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Protection from './pages/Protection'

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="protection" element={<Protection />} />
        <Route path="blocklist" element={<Blocklist />} />
        <Route path="blocked" element={<Blocked />} />
      </Route>

      <Route path="/protection" element={<Navigate to="/dashboard/protection" replace />} />
      <Route path="/blocklist" element={<Navigate to="/dashboard/blocklist" replace />} />
      <Route path="/blocked" element={<Navigate to="/dashboard/blocked" replace />} />
    </Routes>
  )
}

export default App
