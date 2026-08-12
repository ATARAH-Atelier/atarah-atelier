interface ConfirmDialogProps {
  confirmLabel?: string
  description: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  tone?: 'danger' | 'default'
}

import { Button } from './Button'

export function ConfirmDialog({
  confirmLabel = 'Confirmar',
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
  tone = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-atarah-charcoal-900/45 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-atarah-gold-300 bg-white p-6 shadow-2xl"
      >
        <h3 className="font-display text-3xl font-bold text-atarah-wine-900">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-atarah-charcoal-600">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
