import { X } from 'lucide-react'
import { useEffect } from 'react'

import { AdminSidebar } from './AdminSidebar'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Cerrar menú"
        className="absolute inset-0 bg-atarah-charcoal-900/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-atarah-cream-50 shadow-2xl">
        <div className="flex justify-end px-4 py-4">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="rounded-full p-2 text-atarah-charcoal-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-atarah-gold-300/40"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminSidebar afterNavigation={onClose} />
        </div>
      </div>
    </div>
  )
}
