import type { ReactNode } from 'react'

interface FormSectionProps {
  actions?: ReactNode
  children: ReactNode
  description?: string
  title: string
}

export function FormSection({
  actions,
  children,
  description,
  title,
}: FormSectionProps) {
  return (
    <section className="rounded-3xl border border-atarah-gold-300/70 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-atarah-wine-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-atarah-charcoal-600">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
