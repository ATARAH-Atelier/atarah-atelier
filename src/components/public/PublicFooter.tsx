import { Link } from 'react-router-dom'

import logo from '../../assets/atarah-logo.png'

export function PublicFooter() {
  return (
    <footer id="contacto" className="border-t border-atarah-gold-300/60 bg-atarah-cream-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_auto_auto] lg:px-8">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Atarah Atelier" className="h-14 w-14 rounded-full object-cover" />
          <div>
            <p className="font-display text-2xl font-bold text-atarah-wine-900">Atarah Atelier</p>
            <p className="text-sm text-atarah-charcoal-600">Uniformes medicos confeccionados bajo pedido.</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-atarah-gold-700">Navegacion</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-atarah-charcoal-600">
            <Link to="/">Inicio</Link>
            <Link to="/catalogo">Catalogo</Link>
            <Link to="/carrito">Carrito</Link>
            <Link to="/acceso">Acceso</Link>
          </div>
        </div>
        <div className="text-sm text-atarah-charcoal-600">
          <p>Copyright {new Date().getFullYear()} Atarah Atelier</p>
          <Link to="/admin/login" className="mt-3 inline-flex text-atarah-wine-900 transition hover:text-atarah-wine-700">
            Acceso administrativo
          </Link>
        </div>
      </div>
    </footer>
  )
}
