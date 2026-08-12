import { ArrowRight, Menu, ShoppingBag, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '../../assets/atarah-logo.png'
import { useCart } from '../../features/cart/hooks/useCart'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { resolvePostLoginPath } from '../../services/auth.service'

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#contacto', label: 'Contacto' },
]

export function PublicHeader() {
  const { totalItems } = useCart()
  const { isAuthenticated, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const accountPath = resolvePostLoginPath(profile)

  return (
    <header className="sticky top-0 z-40 border-b border-atarah-gold-300/60 bg-atarah-cream-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:py-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Atarah Atelier" className="h-11 w-11 rounded-full object-cover shadow-sm sm:h-14 sm:w-14" />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-display text-xl font-bold tracking-[0.14em] text-atarah-wine-900 sm:text-2xl">ATARAH</p>
            <p className="text-[10px] font-medium tracking-[0.32em] text-atarah-gold-700 sm:text-xs">ATELIER</p>
          </div>
        </Link>

        {/* Navegación escritorio */}
        <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="transition hover:text-atarah-wine-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Iconos y botones */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Botón de cuenta (escritorio, solo icono) */}
          <Link
            to={isAuthenticated ? accountPath : '/acceso'}
            className="hidden items-center justify-center rounded-full border border-atarah-gold-300 bg-white p-3 text-atarah-wine-900 shadow-sm transition hover:bg-atarah-cream-100 lg:inline-flex"
            aria-label={isAuthenticated ? 'Ir a mi cuenta' : 'Ir al acceso'}
          >
            <UserRound className="size-5" aria-hidden="true" />
          </Link>

          {/* Carrito */}
          <Link
            to="/carrito"
            className="relative inline-flex items-center gap-2 rounded-full border border-atarah-gold-300 bg-white px-3 py-2.5 text-atarah-wine-900 shadow-sm transition hover:bg-atarah-cream-100 sm:px-4 sm:py-3"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />            <span className="hidden text-sm font-semibold sm:inline">Carrito</span>
            {totalItems ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-atarah-wine-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            ) : null}
          </Link>

          {/* Menú hamburguesa */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-atarah-gold-300 bg-white p-2.5 text-atarah-wine-900 shadow-sm lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setIsOpen((current) => !current)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          {/* Botón Acceder / Mi cuenta (escritorio) */}
          <Link
            to={isAuthenticated ? accountPath : '/acceso'}
            className="hidden items-center gap-2 rounded-full bg-atarah-wine-900 px-5 py-3 text-sm font-semibold !text-white shadow-sm transition hover:bg-atarah-wine-700 lg:inline-flex"
          >
            <span className="!text-white">{isAuthenticated ? 'Mi cuenta' : 'Acceder'}</span>
            <ArrowRight className="size-4 !text-white" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Menú móvil */}
      {isOpen && (
        <div className="border-t border-atarah-gold-300/60 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {/* Solo "Inicio" usa NavLink porque es una ruta real; los demás son anclas y no deben activarse */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-atarah-wine-900 !text-white shadow-sm'
                    : 'text-atarah-charcoal-700 hover:bg-atarah-cream-100',
                )
              }
              onClick={() => setIsOpen(false)}
            >
              Inicio
            </NavLink>
            <a
              href="/#como-funciona"
              className="rounded-2xl px-4 py-3 text-sm font-medium text-atarah-charcoal-700 transition hover:bg-atarah-cream-100"
              onClick={() => setIsOpen(false)}
            >
              Cómo funciona
            </a>
            <a
              href="/#contacto"
              className="rounded-2xl px-4 py-3 text-sm font-medium text-atarah-charcoal-700 transition hover:bg-atarah-cream-100"
              onClick={() => setIsOpen(false)}
            >
              Contacto
            </a>
            <Link
              to={isAuthenticated ? accountPath : '/acceso'}
              className="rounded-2xl bg-atarah-wine-900 px-4 py-3 text-center text-sm font-semibold !text-white shadow-sm"
              onClick={() => setIsOpen(false)}
            >
              {isAuthenticated ? 'Ir a mi cuenta' : 'Acceder'}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
