import { ShieldCheck } from 'lucide-react'

export function TrustNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-atarah-gold-300 bg-atarah-cream-100 px-4 py-4 text-sm text-atarah-charcoal-700">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-atarah-wine-900" aria-hidden="true" />
      <p>Cada uniforme se confecciona bajo pedido. El tiempo mostrado es estimado y será confirmado por Atarah Atelier.</p>
    </div>
  )
}
