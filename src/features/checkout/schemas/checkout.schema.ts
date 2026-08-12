import { z } from 'zod'

import { normalizePhone } from '../../../lib/public-utils'
import type { CheckoutFormValues } from '../../../types/checkout'

const phonePrefixes = ['0412', '0414', '0416', '0424', '0426', '0422']

export const checkoutSchema = z.object({
  acceptsMadeToOrder: z.boolean(),
  address: z.string().trim().min(6, 'Ingresa una dirección válida.').max(250, 'La dirección es demasiado larga.'),
  city: z.string().trim().min(2, 'Ingresa la ciudad.').max(120, 'La ciudad es demasiado larga.'),
  delivery_method: z.enum(['retiro', 'delivery', 'envio_nacional']),
  discount_code: z.string().trim().max(60, 'El código es demasiado largo.'),
  email: z.union([z.literal(''), z.string().email('Ingresa un correo válido.')]),
  full_name: z.string().trim().min(3, 'Ingresa el nombre completo.').max(150, 'El nombre es demasiado largo.'),
  notes: z.string().max(1000, 'Las observaciones son demasiado largas.'),
  phone: z.string().trim().min(1, 'Ingresa un teléfono.'),
  preferred_contact_method: z.enum(['whatsapp', 'call', 'email']),
  requested_date: z.string(),
  state: z.string().trim().max(120, 'El estado o provincia es demasiado largo.'),
}).superRefine((values, context) => {
  const normalizedPhone = normalizePhone(values.phone)

  if (!values.acceptsMadeToOrder) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes aceptar la modalidad de confección bajo pedido.',
      path: ['acceptsMadeToOrder'],
    })
  }

  if (normalizedPhone.length !== 11 || !phonePrefixes.some((prefix) => normalizedPhone.startsWith(prefix))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa un teléfono venezolano válido.',
      path: ['phone'],
    })
  }

  if (values.preferred_contact_method === 'email' && !values.email) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa un correo para usarlo como medio de contacto.',
      path: ['email'],
    })
  }
})

export const defaultCheckoutValues: CheckoutFormValues = {
  acceptsMadeToOrder: false,
  address: '',
  city: '',
  delivery_method: 'retiro',
  discount_code: '',
  email: '',
  full_name: '',
  notes: '',
  phone: '',
  preferred_contact_method: 'whatsapp',
  requested_date: '',
  state: '',
}
