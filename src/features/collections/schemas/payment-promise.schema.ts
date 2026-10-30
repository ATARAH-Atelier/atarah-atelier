import { z } from 'zod'

export const paymentPromiseSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a cero.'),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres.'),
  promisedDate: z.string().min(1, 'Selecciona la fecha prometida.'),
})

export function validatePaymentPromiseDate(promisedDate: string) {
  const today = new Date().toISOString().slice(0, 10)
  return promisedDate >= today
}
