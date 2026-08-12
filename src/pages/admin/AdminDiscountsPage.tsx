import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgePercent, Pencil, Plus, Power } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency } from '../../lib/utils'
import { createDiscountCode, getAdminDiscountCodes, setDiscountCodeActive, updateDiscountCode } from '../../services/discounts.service'
import type { DiscountCode, DiscountCodeInput } from '../../types/database'

type DiscountFormState = {
  code: string
  description: string
  ends_at: string
  is_active: boolean
  min_order_amount: string
  starts_at: string
  type: 'fixed' | 'percentage'
  usage_limit: string
  value: string
}

const emptyForm: DiscountFormState = {
  code: '',
  description: '',
  ends_at: '',
  is_active: true,
  min_order_amount: '0',
  starts_at: '',
  type: 'percentage',
  usage_limit: '',
  value: '0',
}

function toDatetimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function toInputState(discount: DiscountCode): DiscountFormState {
  return {
    code: discount.code,
    description: discount.description ?? '',
    ends_at: toDatetimeLocal(discount.ends_at),
    is_active: discount.is_active,
    min_order_amount: discount.min_order_amount.toString(),
    starts_at: toDatetimeLocal(discount.starts_at),
    type: discount.type,
    usage_limit: discount.usage_limit?.toString() ?? '',
    value: discount.value.toString(),
  }
}

export function AdminDiscountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null)
  const [discountToToggle, setDiscountToToggle] = useState<DiscountCode | null>(null)
  const [form, setForm] = useState<DiscountFormState>(emptyForm)
  const queryClient = useQueryClient()

  useDocumentTitle('Descuentos | Atarah Atelier')

  const discountsQuery = useQuery({
    queryFn: getAdminDiscountCodes,
    queryKey: ['admin-discount-codes'],
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: DiscountCodeInput) => {
      if (editingDiscount) {
        return updateDiscountCode(editingDiscount.id, payload)
      }

      return createDiscountCode(payload)
    },
    onSuccess: async () => {
      toast.success(editingDiscount ? 'Descuento actualizado.' : 'Descuento creado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] })
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el descuento.')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setDiscountCodeActive(id, isActive),
    onSuccess: async (_, variables) => {
      toast.success(variables.isActive ? 'Descuento activado.' : 'Descuento desactivado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-discount-codes'] })
      setDiscountToToggle(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el descuento.')
    },
  })

  const summary = useMemo(() => {
    const discounts = discountsQuery.data ?? []
    return {
      active: discounts.filter((discount) => discount.is_active).length,
      total: discounts.length,
    }
  }, [discountsQuery.data])

  function closeModal() {
    setIsModalOpen(false)
    setEditingDiscount(null)
    setForm(emptyForm)
  }

  function openCreateModal() {
    setEditingDiscount(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEditModal(discount: DiscountCode) {
    setEditingDiscount(discount)
    setForm(toInputState(discount))
    setIsModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.code.trim()) {
      toast.error('Ingresa el código de descuento.')
      return
    }

    const value = Number(form.value)
    const minOrderAmount = Number(form.min_order_amount)
    const usageLimit = form.usage_limit.trim() ? Number(form.usage_limit) : null

    if (!Number.isFinite(value) || value <= 0) {
      toast.error('El valor del descuento debe ser mayor a 0.')
      return
    }

    if (form.type === 'percentage' && value > 100) {
      toast.error('Un descuento porcentual no puede superar 100%.')
      return
    }

    await saveMutation.mutateAsync({
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      ends_at: form.ends_at || null,
      is_active: form.is_active,
      min_order_amount: Number.isFinite(minOrderAmount) ? Math.max(0, minOrderAmount) : 0,
      starts_at: form.starts_at || null,
      type: form.type,
      usage_limit: usageLimit !== null && Number.isFinite(usageLimit) ? Math.max(1, usageLimit) : null,
      value,
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Descuentos"
        description="Crea códigos promocionales para aplicarlos en pedidos y mostrar cuánto se descontó realmente."
        action={<Button leftIcon={<Plus className="size-4" />} onClick={openCreateModal}>Nuevo descuento</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-atarah-charcoal-500">Códigos registrados</p>
          <p className="mt-2 font-display text-4xl font-bold text-atarah-wine-900">{summary.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-atarah-charcoal-500">Códigos activos</p>
          <p className="mt-2 font-display text-4xl font-bold text-emerald-700">{summary.active}</p>
        </Card>
      </div>

      {discountsQuery.isError ? (
        <Card className="border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="font-medium">No se pudieron cargar los descuentos</p>
          <p className="mt-2 text-sm">{discountsQuery.error.message}</p>
        </Card>
      ) : discountsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-3xl bg-white" />)}
        </div>
      ) : (discountsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState icon={BadgePercent} title="Aún no hay descuentos" description="Crea el primer código promocional para aplicarlo en pedidos." action={<Button onClick={openCreateModal}>Crear descuento</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(discountsQuery.data ?? []).map((discount) => (
            <Card key={discount.id} className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-atarah-charcoal-900">{discount.code}</p>
                  <p className="mt-1 text-sm text-atarah-charcoal-500">{discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${discount.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-atarah-cream-100 text-atarah-charcoal-600'}`}>
                  {discount.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {discount.description ? <p className="text-sm text-atarah-charcoal-600">{discount.description}</p> : null}
              <div className="space-y-1 text-sm text-atarah-charcoal-600">
                <p>Mínimo: {formatCurrency(discount.min_order_amount)}</p>
                <p>Límite de uso: {discount.usage_limit ?? 'Sin límite'}</p>
                <p>Usos registrados: {discount.uses_count ?? 0}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" leftIcon={<Pencil className="size-4" />} onClick={() => openEditModal(discount)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Power className="size-4" />} onClick={() => setDiscountToToggle(discount)}>
                  {discount.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-atarah-charcoal-900/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-atarah-wine-900">{editingDiscount ? 'Editar descuento' : 'Nuevo descuento'}</h2>
                <p className="mt-1 text-sm text-atarah-charcoal-600">Configura el código, vigencia y condiciones mínimas para aplicar el descuento.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeModal}>Cerrar</Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input id="discount-code" label="Código" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
                <Select id="discount-type" label="Tipo" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as DiscountFormState['type'] }))}>
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </Select>
                <Input id="discount-value" label={form.type === 'percentage' ? 'Valor (%)' : 'Valor (USD)'} type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
                <Input id="discount-min" label="Subtotal mínimo (USD)" type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(event) => setForm((current) => ({ ...current, min_order_amount: event.target.value }))} />
                <Input id="discount-limit" label="Límite de uso" type="number" min="1" step="1" value={form.usage_limit} onChange={(event) => setForm((current) => ({ ...current, usage_limit: event.target.value }))} />
                <label className="flex items-center gap-3 rounded-2xl border border-atarah-gold-300 bg-atarah-cream-50 px-4 py-3 text-sm font-medium text-atarah-charcoal-700">
                  <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                  Código activo
                </label>
                <Input id="discount-starts" label="Inicia" type="datetime-local" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} />
                <Input id="discount-ends" label="Finaliza" type="datetime-local" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} />
                <div className="md:col-span-2">
                  <Textarea id="discount-description" label="Descripción" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" loading={saveMutation.isPending}>{editingDiscount ? 'Guardar cambios' : 'Crear descuento'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(discountToToggle)}
        title={discountToToggle?.is_active ? 'Desactivar descuento' : 'Activar descuento'}
        description={discountToToggle?.is_active ? 'El código dejará de poder aplicarse a nuevos pedidos.' : 'El código volverá a estar disponible para pedidos nuevos.'}
        confirmLabel={discountToToggle?.is_active ? 'Desactivar' : 'Activar'}
        tone={discountToToggle?.is_active ? 'danger' : 'default'}
        onCancel={() => setDiscountToToggle(null)}
        onConfirm={() => {
          if (!discountToToggle) return
          toggleMutation.mutate({ id: discountToToggle.id, isActive: !discountToToggle.is_active })
        }}
      />
    </div>
  )
}
