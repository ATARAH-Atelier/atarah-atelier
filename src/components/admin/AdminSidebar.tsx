import {
  BarChart3,
  CircleDollarSign,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import logo from '../../assets/atarah-logo.png'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

interface AdminSidebarProps {
  afterNavigation?: () => void
  bottomSlot?: ReactNode
}

export function AdminSidebar({ afterNavigation, bottomSlot }: AdminSidebarProps) {
  const { isAdmin, signOut } = useAuth()
  const location = useLocation()

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Resumen', to: '/admin' },
    { icon: Receipt, label: 'Registrar pedido', to: '/admin/pedidos/nuevo' },
    { icon: ShoppingBag, label: 'Pedidos', to: '/admin/pedidos' },
    ...(isAdmin
      ? [
          { icon: Package, label: 'Productos', to: '/admin/productos' },
          { icon: FolderTree, label: 'Categorías', to: '/admin/categorias' },
          { icon: Tags, label: 'Descuentos', to: '/admin/descuentos' },
          { icon: CircleDollarSign, label: 'Deudores', to: '/admin/deudores' },
          { icon: BarChart3, label: 'Reportes', to: '/admin/reportes' },
          { icon: Users, label: 'Clientes', to: '/admin/clientes' },
          { icon: ShieldCheck, label: 'Vendedores', to: '/admin/vendedores' },
          { icon: Settings, label: 'Configuración', to: '/admin/configuracion' },
        ]
      : []),
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-atarah-gold-300/60 px-6 py-6">
        <NavLink to="/admin" className="flex items-center gap-4" onClick={afterNavigation}>
          <img src={logo} alt="Atarah Atelier" className="h-14 w-14 rounded-full object-cover shadow-sm" />
          <div>
            <p className="font-display text-2xl font-bold tracking-[0.12em] text-atarah-wine-900">ATARAH</p>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-atarah-gold-700">Administración</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6" aria-label="Navegación administrativa">
        {navigationItems.map(({ icon: Icon, label, to }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              end
              onClick={afterNavigation}
              className={() =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive ? 'bg-atarah-wine-900 text-white shadow-sm' : 'text-atarah-charcoal-700 hover:bg-atarah-cream-100',
                )
              }
            >
              <Icon className={cn('size-5', isActive ? 'text-white' : undefined)} aria-hidden="true" />
              <span className={cn(isActive ? 'text-white' : undefined)}>{label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-atarah-gold-300/60 px-4 py-5">
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-atarah-charcoal-700 transition hover:bg-atarah-cream-100">
          <ExternalLink className="size-5" aria-hidden="true" />
          <span>Volver al sitio</span>
        </Link>

        <Button variant="ghost" className="w-full justify-start px-4" leftIcon={<LogOut className="size-5" aria-hidden="true" />} onClick={() => { void signOut() }}>
          Cerrar sesión
        </Button>
        {bottomSlot}
      </div>
    </div>
  )
}