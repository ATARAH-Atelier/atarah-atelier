import { Outlet } from 'react-router-dom'
import { PublicFooter } from '../components/public/PublicFooter'
import { PublicHeader } from '../components/public/PublicHeader'
export function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-atarah-cream-50 text-atarah-charcoal-900">
      <PublicHeader />
      <main className="min-h-[calc(100vh-180px)]">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
