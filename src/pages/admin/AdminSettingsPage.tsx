import {
  Building2,
  CakeSlice,
  CircleDollarSign,
  Globe,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDateTime, getInitials } from '../../lib/utils'

export function AdminSettingsPage() {
  const { profile, session, signOut } = useAuth()
  useDocumentTitle('Configuracion | Atarah Atelier')

  const displayName = profile?.full_name ?? 'Administrador'
  const initials = getInitials(displayName)

  return (
    <div className="space-y-8">
      <PageHeader title="Configuracion" description="Administra tu cuenta y consulta la informacion general del negocio." />

      <Card className="overflow-hidden border-none bg-white shadow-lg shadow-atarah-gold-200/20">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-atarah-wine-800 to-atarah-wine-900 text-xl font-bold text-white shadow-inner">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-atarah-gold-700">Administrador</p>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">{displayName}</h2>
              <p className="text-sm text-atarah-charcoal-600">{session?.user.email}</p>
            </div>
          </div>
          <Button variant="danger" size="sm" leftIcon={<LogOut className="size-4" />} onClick={() => void signOut()}>
            Cerrar sesion
          </Button>
        </div>

        <div className="grid gap-4 border-t border-atarah-gold-100 bg-atarah-cream-50/50 p-6 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
            <ShieldCheck className="size-5 text-atarah-wine-700" />
            <div>
              <p className="text-xs text-atarah-charcoal-500">Rol</p>
              <p className="font-medium capitalize">{profile?.role ?? 'Sin rol'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
            <UserRound className="size-5 text-atarah-wine-700" />
            <div>
              <p className="text-xs text-atarah-charcoal-500">Miembro desde</p>
              <p className="font-medium">{formatDateTime(profile?.created_at)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-5 border-none bg-white shadow-md shadow-atarah-gold-200/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
              <Building2 className="size-5 text-atarah-wine-700" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">Negocio</h2>
              <p className="text-sm text-atarah-charcoal-600">Datos generales de Atarah Atelier</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-atarah-cream-100/80 p-4">
              <Globe className="size-5 text-atarah-wine-700" />
              <div>
                <p className="text-sm font-semibold text-atarah-charcoal-900">Atarah Atelier</p>
                <p className="text-xs text-atarah-charcoal-600">Confeccion bajo pedido</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-atarah-cream-100/80 p-4">
              <CircleDollarSign className="size-5 text-atarah-wine-700" />
              <div>
                <p className="text-sm font-semibold text-atarah-charcoal-900">Moneda</p>
                <p className="text-xs text-atarah-charcoal-600">USD (Dolar estadounidense)</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center space-y-3 border-none bg-gradient-to-br from-atarah-wine-50 to-atarah-cream-100 p-6 shadow-md">
          <CakeSlice className="size-8 text-atarah-gold-600" />
          <div>
            <h3 className="font-display text-xl font-bold text-atarah-wine-900">Gestion centralizada</h3>
            <p className="text-sm text-atarah-charcoal-600">El panel te permite gestionar pedidos, reportes, clientes y vendedores desde un solo lugar.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
