import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import KidsLayout from './layouts/KidsLayout'
import MarketingLayout from './layouts/MarketingLayout'
import BlockHistory from './pages/BlockHistory'
import Dashboard from './pages/Dashboard'
import Filters from './pages/Filters'
import Home from './pages/Home'
import KidsHome from './pages/KidsHome'
import NetworkLog from './pages/NetworkLog'
import Status from './pages/Status'

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="/kids" element={<KidsLayout />}>
        <Route index element={<KidsHome />} />
      </Route>

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="status" element={<Status />} />
        <Route path="filters" element={<Filters />} />
        <Route path="block-history" element={<BlockHistory />} />
        <Route path="network-log" element={<NetworkLog />} />
      </Route>

      <Route path="/status" element={<Navigate to="/dashboard/status" replace />} />
      <Route path="/filters" element={<Navigate to="/dashboard/filters" replace />} />
      <Route path="/block-history" element={<Navigate to="/dashboard/block-history" replace />} />
      <Route path="/network-log" element={<Navigate to="/dashboard/network-log" replace />} />
    </Routes>
  )
}

export default App
