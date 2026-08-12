import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminHeader } from '../components/admin/AdminHeader'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { MobileSidebar } from '../components/admin/MobileSidebar'
const titleMap: Record<string, string> = {
  '/admin': 'Resumen',
  '/admin/clientes': 'Clientes',
  '/admin/deudores': 'Deudores',
  '/admin/vendedores': 'Vendedores',
  '/admin/configuracion': 'Configuraci?n',
  '/admin/pedidos': 'Pedidos',
  '/admin/pedidos/nuevo': 'Registrar pedido',
  '/admin/productos': 'Productos',
  '/admin/reportes': 'Reportes',
}
export function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const location = useLocation()
  const title = titleMap[location.pathname] ?? 'Administración'
  return (
    <div className="min-h-screen bg-atarah-cream-50 text-atarah-charcoal-900">
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-atarah-gold-300/60 bg-white lg:block">
          <AdminSidebar />
        </aside>
        <div className="min-w-0 flex-1">
          <AdminHeader
            title={title}
            onOpenMenu={() => setIsMobileSidebarOpen(true)}
          />
          <main className="px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
