import { Outlet } from 'react-router-dom'

export default function MarketingLayout() {
  return (
    <div className="marketing-sky min-h-screen text-ink">
      <Outlet />
    </div>
  )
}
