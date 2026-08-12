import { Alert } from '../../../components/public/Alert'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import type { CheckoutFormValues } from '../../../types/checkout'

interface CheckoutFormFieldsProps {
  errors: Partial<Record<keyof CheckoutFormValues, string>>
  values: CheckoutFormValues
  onChange: <Key extends keyof CheckoutFormValues>(key: Key, value: CheckoutFormValues[Key]) => void
}

interface CustomerInformationSectionProps extends CheckoutFormFieldsProps {
  lockIdentityFields?: boolean
}

export function CustomerInformationSection({
  errors,
  values,
  onChange,
  lockIdentityFields = false,
}: CustomerInformationSectionProps) {
  return (
    <div className="space-y-4">
      {lockIdentityFields ? (
        <Alert tone="info">
          Los datos de perfil se muestran solo para consulta en checkout. Si necesitas cambiarlos, actualízalos desde tu cuenta.
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          id="full_name"
          label="Nombre completo"
          value={values.full_name}
          error={errors.full_name}
          onChange={(event) => onChange('full_name', event.target.value)}
          disabled={lockIdentityFields}
          helperText={lockIdentityFields ? 'Dato tomado de tu perfil.' : undefined}
        />
        <Input
          id="phone"
          label="Teléfono"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => onChange('phone', event.target.value)}
          disabled={lockIdentityFields}
          helperText={lockIdentityFields ? 'Dato tomado de tu perfil.' : undefined}
        />
        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          value={values.email}
          error={errors.email}
          onChange={(event) => onChange('email', event.target.value)}
          disabled={lockIdentityFields}
          helperText={lockIdentityFields ? 'Dato tomado de tu perfil.' : undefined}
          className="md:col-span-2"
        />
      </div>
    </div>
  )
}

export function DeliveryInformationSection({ errors, values, onChange }: CheckoutFormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Select id="delivery_method" label="Método de entrega" value={values.delivery_method} onChange={(event) => onChange('delivery_method', event.target.value as CheckoutFormValues['delivery_method'])}>
        <option value="retiro">Retiro</option>
        <option value="delivery">Delivery</option>
        <option value="envio_nacional">Envío nacional</option>
      </Select>
      <Input id="city" label="Ciudad" value={values.city} error={errors.city} onChange={(event) => onChange('city', event.target.value)} />
      <Input id="state" label="Estado o provincia" value={values.state} error={errors.state} onChange={(event) => onChange('state', event.target.value)} />
      <div className="md:col-span-2">
        <Textarea id="address" label="Dirección" value={values.address} error={errors.address} onChange={(event) => onChange('address', event.target.value)} />
      </div>
    </div>
  )
}

export function OrderNotesSection({ errors, values, onChange }: CheckoutFormFieldsProps) {
  return (
    <div className="space-y-4">
      <Alert>La fecha requerida está sujeta a confirmación. Nuestro equipo validará disponibilidad, tiempo de confección y modalidad de entrega.</Alert>
      <Textarea id="notes" label="Observaciones generales" value={values.notes} error={errors.notes} onChange={(event) => onChange('notes', event.target.value)} />
      <label className="flex items-start gap-3 rounded-2xl border border-atarah-gold-300 bg-white p-4 text-sm text-atarah-charcoal-700">
        <input type="checkbox" checked={values.acceptsMadeToOrder} onChange={(event) => onChange('acceptsMadeToOrder', event.target.checked)} className="mt-1" />
        <span>Entiendo que Atarah Atelier trabaja con confección bajo pedido y que el total y tiempos serán confirmados antes de pago y entrega.</span>
      </label>
      {errors.acceptsMadeToOrder ? <p className="text-sm text-rose-700">{errors.acceptsMadeToOrder}</p> : null}
    </div>
  )
}