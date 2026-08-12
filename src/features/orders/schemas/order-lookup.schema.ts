import { z } from 'zod'

import { normalizePhone } from '../../../lib/public-utils'

export const orderLookupSchema = z.object({
  order_number: z.string().trim().min(3, 'Ingresa tu número de pedido.'),
  phone: z.string().trim().min(1, 'Ingresa tu teléfono.'),
}).superRefine((values, context) => {
  const normalizedPhone = normalizePhone(values.phone)

  if (normalizedPhone.length !== 11) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa un teléfono válido.',
      path: ['phone'],
    })
  }
})
