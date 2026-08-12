import { LogOut, Menu } from 'lucide-react'

import { useAuth } from '../../hooks/useAuth'
import { formatLongDate, getInitials } from '../../lib/utils'
import { Button } from '../ui/Button'

interface AdminHeaderProps {
  onOpenMenu: () => void
  title: string
}

export function AdminHeader({ onOpenMenu, title }: AdminHeaderProps) {
  const { profile, session, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-atarah-gold-300/60 bg-atarah-cream-50/90 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menú"
            className="rounded-2xl border border-atarah-gold-300 bg-white p-3 text-atarah-wine-900 shadow-sm transition hover:bg-atarah-cream-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-atarah-gold-300/40 lg:hidden"
            onClick={onOpenMenu}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div>
            <p className="font-display text-3xl font-bold text-atarah-wine-900">
              {title}
            </p>
            <p className="text-sm text-atarah-charcoal-600">
              {formatLongDate(new Date())}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-atarah-gold-300/70 bg-white px-3 py-2 shadow-sm">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-atarah-charcoal-900">
              {profile?.full_name ?? 'Administrador'}
            </p>
            <p className="text-xs text-atarah-charcoal-600">
              {session?.user.email ?? 'Sin correo'}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-full bg-atarah-wine-900 font-semibold text-white">
            {getInitials(profile?.full_name ?? session?.user.email ?? 'AA')}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            leftIcon={<LogOut className="size-4" aria-hidden="true" />}
            onClick={() => {
              void signOut()
            }}
          >
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
