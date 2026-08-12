import { cn } from '../../lib/utils'

export function CheckoutProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = ['Carrito', 'Datos', 'Confirmación']

  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3
        return (
          <div key={step} className={cn('rounded-full px-4 py-2 text-sm font-semibold', stepNumber <= currentStep ? 'bg-atarah-wine-900 text-white' : 'bg-white text-atarah-charcoal-600 border border-atarah-gold-300')}>
            {stepNumber}. {step}
          </div>
        )
      })}
    </div>
  )
}
