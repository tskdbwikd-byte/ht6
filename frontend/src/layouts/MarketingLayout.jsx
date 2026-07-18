import { Outlet } from 'react-router-dom'
import SideMenu from '../components/SideMenu'

export default function MarketingLayout() {
  return (
    <div className="marketing-sky min-h-screen text-ink">
      <SideMenu />
      <Outlet />
    </div>
  )
}
