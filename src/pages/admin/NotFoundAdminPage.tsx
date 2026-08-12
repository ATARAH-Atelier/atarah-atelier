import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/common/EmptyState'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export function NotFoundAdminPage() {
  useDocumentTitle('Página no encontrada | Atarah Atelier')

  return (
    <EmptyState
      title="La sección no existe"
      description="Revisa la navegación del panel o vuelve al resumen administrativo."
      action={
        <Link
          to="/admin"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-atarah-wine-900 px-4 text-sm font-semibold text-white transition hover:bg-atarah-wine-800"
        >
          Ir al resumen
        </Link>
      }
    />
  )
}
