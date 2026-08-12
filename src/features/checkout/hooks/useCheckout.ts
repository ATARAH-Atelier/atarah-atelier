import { useState } from 'react'

import { checkoutSchema, defaultCheckoutValues } from '../schemas/checkout.schema'
import type { CheckoutFormValues } from '../../../types/checkout'

export function useCheckout() {
  const [values, setValues] = useState<CheckoutFormValues>(defaultCheckoutValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({})

  function updateValue<Key extends keyof CheckoutFormValues>(key: Key, value: CheckoutFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function validate() {
    const result = checkoutSchema.safeParse(values)

    if (result.success) {
      setErrors({})
      return result.data as CheckoutFormValues
    }

    const nextErrors: Partial<Record<keyof CheckoutFormValues, string>> = {}

    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CheckoutFormValues
      if (!nextErrors[key]) {
        nextErrors[key] = issue.message
      }
    }

    setErrors(nextErrors)
    return null
  }

  return { errors, setValues, updateValue, validate, values }
}
