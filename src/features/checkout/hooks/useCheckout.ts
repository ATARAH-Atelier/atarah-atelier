import { useEffect, useState } from 'react'

import { checkoutSchema, defaultCheckoutValues } from '../schemas/checkout.schema'
import type { CheckoutFormValues } from '../../../types/checkout'

const checkoutDraftKey = 'atarah-checkout-draft'

function getSavedCheckoutValues(): CheckoutFormValues {
  try {
    const savedValues = window.sessionStorage.getItem(checkoutDraftKey)

    if (!savedValues) {
      return defaultCheckoutValues
    }

    const parsedValues = JSON.parse(savedValues)

    if (!parsedValues || typeof parsedValues !== 'object' || Array.isArray(parsedValues)) {
      return defaultCheckoutValues
    }

    return { ...defaultCheckoutValues, ...(parsedValues as Partial<CheckoutFormValues>) }
  } catch {
    return defaultCheckoutValues
  }
}

export function useCheckout() {
  const [values, setValues] = useState<CheckoutFormValues>(getSavedCheckoutValues)
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({})

  useEffect(() => {
    window.sessionStorage.setItem(checkoutDraftKey, JSON.stringify(values))
  }, [values])

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

  function clearDraft() {
    window.sessionStorage.removeItem(checkoutDraftKey)
  }

  return { clearDraft, errors, setValues, updateValue, validate, values }
}
