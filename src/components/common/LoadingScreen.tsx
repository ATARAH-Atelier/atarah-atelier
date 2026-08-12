import logo from '../../assets/atarah-logo.png'
import { Spinner } from '../ui/Spinner'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({
  message = 'Cargando panel administrativo...',
}: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-atarah-cream-50 px-6 text-center text-atarah-charcoal-900">
      <img
        src={logo}
        alt="Atarah Atelier"
        className="h-24 w-24 rounded-full object-cover shadow-lg shadow-atarah-wine-900/10"
      />
      <div className="space-y-2">
        <p className="font-display text-3xl font-bold text-atarah-wine-900">
          Atarah Atelier
        </p>
        <p className="text-sm text-atarah-charcoal-600">{message}</p>
      </div>
      <Spinner className="size-6 text-atarah-wine-900" />
    </div>
  )
}
