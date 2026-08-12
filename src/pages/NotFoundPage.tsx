import { Link } from 'react-router-dom'

import { EmptyState } from '../components/common/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página no encontrada | Atarah Atelier')

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <EmptyState
        title="Página no encontrada"
        description="La dirección que intentaste abrir no está disponible."
        action={
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-atarah-wine-900 px-4 text-sm font-semibold text-white transition hover:bg-atarah-wine-800"
          >
            Volver al inicio
          </Link>
        }
      />
    </div>
  )
}
