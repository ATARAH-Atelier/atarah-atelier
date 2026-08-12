import { Input } from '../../../components/ui/Input'

export function OrderLookupForm({ errors, orderNumber, phone, onChangeOrderNumber, onChangePhone }: { errors: { order_number?: string; phone?: string }; orderNumber: string; phone: string; onChangeOrderNumber: (value: string) => void; onChangePhone: (value: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input id="order-number" label="Número de pedido" value={orderNumber} error={errors.order_number} onChange={(event) => onChangeOrderNumber(event.target.value)} />
      <Input id="order-phone" label="Teléfono" value={phone} error={errors.phone} onChange={(event) => onChangePhone(event.target.value)} />
    </div>
  )
}
