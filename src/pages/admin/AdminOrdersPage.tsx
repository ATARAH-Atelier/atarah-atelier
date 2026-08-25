import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleDollarSign,
  Eye,
  Pencil,
  History,
  ListOrdered,
  PackageOpen,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  translateOrderStatus,
} from '../../lib/utils'
import {
  createOrderPayment,
  getAdminOrderDetail,
  getAdminOrders,
  updateAdminOrder,
  updateAdminOrderItems,
  updateOrderPayment,
} from '../../services/orders.service'
import { getPublicProducts } from '../../services/public-products.service'
import type { PublicProduct } from '../../types/catalog'
import type { OrderPayment, OrderStatus } from '../../types/database'

/* ========== CONSTANTES ========== */
const orderStatuses: Array<{ label: string; value: 'all' | OrderStatus }> = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Esperando pago', value: 'waiting_for_payment' },
  { label: 'En confección', value: 'in_production' },
  { label: 'Listo', value: 'ready' },
  { label: 'Entregado', value: 'delivered' },
  { label: 'Cancelado', value: 'cancelled' },
]

const paymentMethods = [
  { label: 'Seleccionar método', value: '' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Transferencia', value: 'transfer' },
  { label: 'Pago móvil', value: 'mobile_payment' },
  { label: 'Zelle', value: 'zelle' },
]

const editableStatuses = orderStatuses.filter((s) => s.value !== 'all') as Array<{
  label: string
  value: OrderStatus
}>

type DetailTab = 'overview' | 'items' | 'payments' | 'timeline'

type OrderEditForm = {
  customer_address: string
  customer_city: string
  customer_email: string
  customer_full_name: string
  customer_phone: string
  customer_state: string
  delivery_method: string
  notes: string
  preferred_contact_method: string
}

type OrderItemEditForm = {
  id: string
  notes: string
  product_id: string
  quantity: string
  selected_bottom_size_id: string
  selected_color_id: string
  selected_top_size_id: string
}

const emptyOrderEditForm: OrderEditForm = {
  customer_address: '',
  customer_city: '',
  customer_email: '',
  customer_full_name: '',
  customer_phone: '',
  customer_state: '',
  delivery_method: '',
  notes: '',
  preferred_contact_method: '',
}

const emptyOrderItemsDraft: OrderItemEditForm[] = []

/* ========== TRADUCTORES ========== */
function translatePaymentMethod(value: string | null) {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    mobile_payment: 'Pago móvil',
    transfer: 'Transferencia',
    zelle: 'Zelle',
  }
  return value ? map[value] ?? value : 'No definido'
}

/* ========== COMPONENTE ========== */
export function AdminOrdersPage() {
  const { isSeller, profile } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [deletingItemIndex, setDeletingItemIndex] = useState<number | null>(null)

  // Estados para edición
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending')
  const [registeredPaidAmount, setRegisteredPaidAmount] = useState(0)
  const [orderDraft, setOrderDraft] = useState<OrderEditForm>(emptyOrderEditForm)
  const [orderItemsDraft, setOrderItemsDraft] = useState<OrderItemEditForm[]>(emptyOrderItemsDraft)

  // Pago
  const [paymentAmount, setPaymentAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)

  const queryClient = useQueryClient()
  useDocumentTitle('Pedidos | Atarah Atelier')

  const sellerProfileId = isSeller ? (profile?.id ?? null) : null
  const orderScope = sellerProfileId ? { sellerProfileId } : undefined

  const ordersQuery = useQuery({
    queryFn: () => getAdminOrders(orderScope),
    queryKey: ['admin-orders', orderScope?.sellerProfileId ?? 'all'],
  })

  const selectedOrderQuery = useQuery({
    enabled: Boolean(selectedOrderId),
    queryFn: () => getAdminOrderDetail(selectedOrderId as string, orderScope),
    queryKey: ['admin-order-detail', selectedOrderId, orderScope?.sellerProfileId ?? 'all'],
  })

  const orderProductsQuery = useQuery({
    queryFn: () => getPublicProducts({ sort: 'recommended' }),
    queryKey: ['admin-order-item-products'],
  })

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & import('../../types/database').UpdateAdminOrderInput) =>
      updateAdminOrder(id, payload, orderScope),
    onSuccess: async (updatedOrder) => {
      toast.success('Pedido actualizado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-recent-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', updatedOrder.id] })
      queryClient.setQueryData(
        ['admin-order-detail', updatedOrder.id, orderScope?.sellerProfileId ?? 'all'],
        updatedOrder,
      )
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.')
    },
  })

  const updateOrderItemsMutation = useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: OrderItemEditForm[] }) =>
      updateAdminOrderItems(
        orderId,
        {
          items: items.map((item) => ({
            id: item.id,
            notes: item.notes.trim() || null,
            product_id: item.product_id,
            quantity: Number(item.quantity),
            selected_bottom_size_id: item.selected_bottom_size_id || null,
            selected_color_id: item.selected_color_id || null,
            selected_top_size_id: item.selected_top_size_id || null,
          })),
        },
        orderScope,
      ),
    onSuccess: async (updatedOrder) => {
      toast.success('Items del pedido actualizados.')
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', updatedOrder.id] })
      queryClient.setQueryData(
        ['admin-order-detail', updatedOrder.id, orderScope?.sellerProfileId ?? 'all'],
        updatedOrder,
      )
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudieron actualizar los items del pedido.')
    },
  })

  const createPaymentMutation = useMutation({
    mutationFn: ({
      orderId,
      amount,
      notes,
      paidAt,
      method,
    }: {
      orderId: string
      amount: number
      notes: string | null
      paidAt: string | null
      method: string | null
    }) =>
      createOrderPayment(
        orderId,
        { amount, notes, paid_at: paidAt, payment_method: method },
        orderScope,
      ),
    onSuccess: async (updatedOrder) => {
      toast.success('Pago registrado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', updatedOrder.id] })
      queryClient.setQueryData(
        ['admin-order-detail', updatedOrder.id, orderScope?.sellerProfileId ?? 'all'],
        updatedOrder,
      )
      resetPaymentForm()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el pago.')
    },
  })

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      orderId,
      paymentId,
      amount,
      notes,
      paidAt,
      method,
    }: {
      orderId: string
      paymentId: string
      amount: number
      notes: string | null
      paidAt: string | null
      method: string | null
    }) =>
      updateOrderPayment(
        orderId,
        paymentId,
        { amount, notes, paid_at: paidAt, payment_method: method },
        orderScope,
      ),
    onSuccess: async (updatedOrder) => {
      toast.success('Pago corregido.')
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-order-detail', updatedOrder.id] })
      queryClient.setQueryData(
        ['admin-order-detail', updatedOrder.id, orderScope?.sellerProfileId ?? 'all'],
        updatedOrder,
      )
      resetPaymentForm()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo corregir el pago.')
    },
  })

  useEffect(() => {
    if (!selectedOrderQuery.data) {
      setOrderDraft(emptyOrderEditForm)
      setOrderItemsDraft(emptyOrderItemsDraft)
      return
    }

    setNextStatus(selectedOrderQuery.data.status)
    setRegisteredPaidAmount(selectedOrderQuery.data.deposit)
    setOrderDraft({
      customer_address: selectedOrderQuery.data.customer_address ?? '',
      customer_city: selectedOrderQuery.data.customer_city ?? '',
      customer_email: selectedOrderQuery.data.customer_email ?? '',
      customer_full_name: selectedOrderQuery.data.customer_name ?? '',
      customer_phone: selectedOrderQuery.data.customer_phone ?? '',
      customer_state: selectedOrderQuery.data.customer_state ?? '',
      delivery_method: selectedOrderQuery.data.delivery_method ?? '',
      notes: selectedOrderQuery.data.notes ?? '',
      preferred_contact_method: selectedOrderQuery.data.preferred_contact_method ?? '',
    })
  }, [selectedOrderQuery.data])

  useEffect(() => {
    if (!selectedOrderQuery.data) {
      setOrderItemsDraft(emptyOrderItemsDraft)
      return
    }

    if (!orderProductsQuery.data) {
      return
    }

    setOrderItemsDraft(
      selectedOrderQuery.data.items.map((item) => {
        const product =
          orderProductsQuery.data.find((candidate) => candidate.id === item.product_id) ??
          orderProductsQuery.data.find((candidate) => candidate.name === item.product_name)

        const selectedTopSize =
          product?.sizes_top.find((size) => size.size === item.blouse_size) ?? null
        const selectedBottomSize =
          product?.sizes_bottom.find((size) => size.size === item.pants_size) ?? null
        const selectedColor =
          product?.colors.find((color) => color.color_name === item.color_name) ?? null

        return {
          id: item.id,
          notes: item.notes ?? '',
          product_id: product?.id ?? item.product_id ?? '',
          quantity: String(Math.max(1, item.quantity)),
          selected_bottom_size_id: selectedBottomSize?.id ?? '',
          selected_color_id: selectedColor?.id ?? '',
          selected_top_size_id: selectedTopSize?.id ?? '',
        }
      }),
    )
  }, [orderProductsQuery.data, selectedOrderQuery.data])

  function resetPaymentForm() {
    setEditingPaymentId(null)
    setPaymentAmount('0')
    setPaymentMethod('')
    setPaymentNotes('')
    setPaymentDate('')
  }

  function updateOrderDraftField<Key extends keyof OrderEditForm>(key: Key, value: OrderEditForm[Key]) {
    setOrderDraft((current) => ({ ...current, [key]: value }))
  }

  function getProductById(productId: string) {
    return orderProductsQuery.data?.find((product) => product.id === productId) ?? null
  }

  function updateOrderItemDraft(index: number, patch: Partial<OrderItemEditForm>) {
    setOrderItemsDraft((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }
        return { ...item, ...patch }
      }),
    )
  }

  function handleChangeOrderItemProduct(index: number, product: PublicProduct | null) {
    if (!product) return
    updateOrderItemDraft(index, {
      product_id: product.id,
      selected_bottom_size_id: '',
      selected_color_id: '',
      selected_top_size_id: '',
    })
  }

  function handleAddOrderItem() {
    const newItem: OrderItemEditForm = {
      id: '', // nuevo item
      notes: '',
      product_id: '',
      quantity: '1',
      selected_bottom_size_id: '',
      selected_color_id: '',
      selected_top_size_id: '',
    }

    setOrderItemsDraft((current) => [...current, newItem])
    // abrir el modal de edición para el nuevo item
    setEditingItemIndex(orderItemsDraft.length)
  }

  function handleRemoveOrderItem(index: number) {
    setDeletingItemIndex(index)
  }

  function confirmRemoveOrderItem() {
    if (deletingItemIndex === null) return
    setOrderItemsDraft((current) => current.filter((_, itemIndex) => itemIndex !== deletingItemIndex))
    setDeletingItemIndex(null)
    setEditingItemIndex(null)
    toast.success('Item eliminado del pedido.')
  }

  function getDraftUnitPrice(item: OrderItemEditForm) {
    const product = getProductById(item.product_id)
    if (!product) return 0

    const topSize = product.sizes_top.find((size) => size.id === item.selected_top_size_id)
    const bottomSize = product.sizes_bottom.find((size) => size.id === item.selected_bottom_size_id)
    const color = product.colors.find((entry) => entry.id === item.selected_color_id)

    return (
      product.base_price +
      (topSize?.price_adjustment ?? 0) +
      (bottomSize?.price_adjustment ?? 0) +
      (color?.price_adjustment ?? 0)
    )
  }

  function getDraftLineTotal(item: OrderItemEditForm) {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))
    return getDraftUnitPrice(item) * quantity
  }

  async function handleSaveOrderItems() {
    if (!selectedOrderId) return

    if (orderItemsDraft.length === 0) {
      toast.error('El pedido debe conservar al menos un item.')
      return
    }

    for (const item of orderItemsDraft) {
      const product = getProductById(item.product_id)
      const quantity = Math.floor(Number(item.quantity) || 0)

      if (!product) {
        toast.error('Uno de los items no tiene un producto válido.')
        return
      }

      if (!Number.isFinite(quantity) || quantity < 1) {
        toast.error(`La cantidad de ${product.name} debe ser al menos 1.`)
        return
      }

      if (product.sizes_top.length > 0 && !item.selected_top_size_id) {
        toast.error(`Selecciona la talla de blusa para ${product.name}.`)
        return
      }

      if (product.sizes_bottom.length > 0 && !item.selected_bottom_size_id) {
        toast.error(`Selecciona la talla de pantalón para ${product.name}.`)
        return
      }

      if (product.colors.length > 0 && !item.selected_color_id) {
        toast.error(`Selecciona el color para ${product.name}.`)
        return
      }
    }

    await updateOrderItemsMutation.mutateAsync({
      items: orderItemsDraft,
      orderId: selectedOrderId,
    })
  }

  function toDateTimeLocalValue(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60_000)
    return localDate.toISOString().slice(0, 16)
  }

  function startEditingPayment(payment: OrderPayment) {
    setEditingPaymentId(payment.id)
    setPaymentAmount(payment.amount.toFixed(2))
    setPaymentMethod(payment.payment_method ?? '')
    setPaymentNotes(payment.notes ?? '')
    setPaymentDate(toDateTimeLocalValue(payment.paid_at))
  }

  const editingPayment = selectedOrderQuery.data?.payments.find((payment) => payment.id === editingPaymentId) ?? null
  const effectiveAvailableBalance = editingPayment
    ? selectedOrderQuery.data
      ? selectedOrderQuery.data.balance + editingPayment.amount
      : 0
    : selectedOrderQuery.data?.balance ?? 0

  const filteredOrders =
    ordersQuery.data?.filter((order) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        (order.customer_name ?? '').toLowerCase().includes(q) ||
        (order.seller_name ?? '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    }) ?? []

  const openOrder = (id: string) => {
    setSelectedOrderId(id)
    setActiveTab('overview')
  }

  const closeOrderModal = () => {
    if (
      updateOrderMutation.isPending ||
      updateOrderItemsMutation.isPending ||
      createPaymentMutation.isPending ||
      updatePaymentMutation.isPending
    ) return
    setSelectedOrderId(null)
    setEditingItemIndex(null)
    setDeletingItemIndex(null)
    resetPaymentForm()
  }

  const handleSaveOrder = async () => {
    if (!selectedOrderId) return
    await updateOrderMutation.mutateAsync({
      customer_address: orderDraft.customer_address.trim() || null,
      customer_city: orderDraft.customer_city.trim() || null,
      customer_email: orderDraft.customer_email.trim() || null,
      customer_full_name: orderDraft.customer_full_name.trim() || null,
      customer_phone: orderDraft.customer_phone.trim() || null,
      customer_state: orderDraft.customer_state.trim() || null,
      delivery_method: orderDraft.delivery_method || null,
      id: selectedOrderId,
      notes: orderDraft.notes.trim() || null,
      paid_amount: registeredPaidAmount,
      preferred_contact_method: orderDraft.preferred_contact_method || null,
      status: nextStatus,
    })
  }

  const handleSubmitPayment = async () => {
    if (!selectedOrderId || !selectedOrderQuery.data) return
    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto mayor a 0.')
      return
    }

    if (amount > effectiveAvailableBalance) {
      toast.error(`El monto no puede superar ${formatCurrency(effectiveAvailableBalance)}.`)
      return
    }

    const payload = {
      orderId: selectedOrderId,
      amount,
      method: paymentMethod || null,
      notes: paymentNotes.trim() || null,
      paidAt: paymentDate || null,
    }

    if (editingPaymentId) {
      await updatePaymentMutation.mutateAsync({
        ...payload,
        paymentId: editingPaymentId,
      })
      return
    }

    if (selectedOrderQuery.data.balance <= 0) {
      toast.error('Este pedido ya está pagado por completo.')
      return
    }

    await createPaymentMutation.mutateAsync(payload)
  }

  const totalActive = filteredOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length
  const totalPendingPayment = filteredOrders.filter((o) => o.status !== 'cancelled' && o.balance > 0).length

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Pedidos"
            description="Gestiona órdenes, abonos y estados de cada cliente."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/pedidos/nuevo">
              <Button leftIcon={<Plus className="size-4" />}>Nuevo pedido</Button>
            </Link>
          </div>
        </div>

        {!ordersQuery.isLoading && ordersQuery.data && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-atarah-cream-100 p-2 text-atarah-wine-900">
                <ShoppingBag className="size-5" />
              </div>
              <div>
                <p className="text-xs text-atarah-charcoal-600">Total</p>
                <p className="text-xl font-bold">{filteredOrders.length}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                <PackageOpen className="size-5" />
              </div>
              <div>
                <p className="text-xs text-atarah-charcoal-600">Activos</p>
                <p className="text-xl font-bold">{totalActive}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
                <CircleDollarSign className="size-5" />
              </div>
              <div>
                <p className="text-xs text-atarah-charcoal-600">Con saldo</p>
                <p className="text-xl font-bold">{totalPendingPayment}</p>
              </div>
            </Card>
          </div>
        )}

        <Card className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-atarah-charcoal-400" />
              <Input
                id="search"
                placeholder="Buscar por número, cliente o vendedor"
                className="pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
                className="h-12 w-full rounded-2xl border border-atarah-gold-300 bg-white px-4 text-sm text-atarah-charcoal-900 outline-none focus-visible:ring-4 focus-visible:ring-atarah-gold-300/40 sm:min-w-[200px]"
              >
                {orderStatuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {(search || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(''); setStatusFilter('all') }}
                  leftIcon={<X className="size-4" />}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {ordersQuery.isError ? (
          <Card className="border-rose-200 bg-rose-50 p-5 text-rose-800">
            <p>{ordersQuery.error.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => ordersQuery.refetch()}>
              Reintentar
            </Button>
          </Card>
        ) : ordersQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 2xl:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-white" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No se encontraron pedidos"
            description={ordersQuery.data?.length === 0 ? 'Aún no hay pedidos registrados.' : 'Ajusta los filtros para ver más resultados.'}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-3xl border border-atarah-gold-200 bg-white shadow-sm 2xl:block">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="border-b border-atarah-gold-200 text-left text-xs uppercase tracking-wider text-atarah-charcoal-500">
                    <th className="py-4 pl-6">Número</th>
                    <th className="py-4">Cliente</th>
                    <th className="py-4">Vendedor</th>
                    <th className="py-4">Fecha</th>
                    <th className="py-4">Total</th>
                    <th className="py-4">Pagado</th>
                    <th className="py-4">Saldo</th>
                    <th className="py-4">Estado</th>
                    <th className="py-4 pr-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atarah-gold-100">
                  {filteredOrders.map((order) => {
                    const paymentPercent = order.total > 0 ? (order.deposit / order.total) * 100 : 0
                    return (
                      <tr key={order.id} className="group transition-colors hover:bg-atarah-cream-50/60">
                        <td className="py-4 pl-6 font-semibold text-atarah-charcoal-900">{order.order_number}</td>
                        <td className="py-4 text-sm">{order.customer_name || '—'}</td>
                        <td className="py-4 text-sm">{order.seller_name || 'Canal público'}</td>
                        <td className="py-4 text-sm">{formatDate(order.created_at)}</td>
                        <td className="py-4 text-sm font-medium">{formatCurrency(order.total)}</td>
                        <td className="py-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span>{formatCurrency(order.deposit)}</span>
                            <div className="h-1 w-16 rounded-full bg-gray-200">
                              <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${paymentPercent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm">
                          <span className={order.balance > 0 ? 'font-medium text-rose-600' : ''}>{formatCurrency(order.balance)}</span>
                        </td>
                        <td className="py-4"><StatusBadge status={order.status} /></td>
                        <td className="py-4 pr-6 text-right">
                          <Button variant="ghost" size="sm" leftIcon={<Eye className="size-4" />} onClick={() => openOrder(order.id)}>Ver</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 xl:hidden">
              {filteredOrders.map((order) => {
                const paymentPercent = order.total > 0 ? (order.deposit / order.total) * 100 : 0
                return (
                  <Card key={order.id} variant="muted" className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-atarah-charcoal-600">{order.customer_name || '—'}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Vendedor: {order.seller_name || 'Público'}</p>
                      <p>Fecha: {formatDate(order.created_at)}</p>
                      <p>Total: {formatCurrency(order.total)}</p>
                      <p>Pagado: {formatCurrency(order.deposit)} ({Math.round(paymentPercent)}%)</p>
                      <p className={order.balance > 0 ? 'text-rose-600 font-medium' : ''}>Saldo: {formatCurrency(order.balance)}</p>
                    </div>
                    <Button variant="outline" size="sm" leftIcon={<Eye className="size-4" />} onClick={() => openOrder(order.id)}>Gestionar</Button>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-atarah-charcoal-900/40 backdrop-blur-sm sm:items-stretch">
          <div className="flex h-[92vh] w-full flex-col overflow-y-auto rounded-t-[1.75rem] border border-atarah-gold-200 bg-atarah-cream-50 shadow-2xl sm:h-full sm:max-w-3xl sm:rounded-none sm:border-l sm:border-t-0">
            <div className="sticky top-0 z-10 border-b border-atarah-gold-200 bg-atarah-cream-50/95 p-4 backdrop-blur sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-atarah-charcoal-600">Gestión del pedido</p>
                  <h2 className="font-display text-3xl font-bold text-atarah-wine-900">
                    {selectedOrderQuery.data?.order_number ?? 'Cargando...'}
                  </h2>
                </div>
                <Button variant="ghost" size="sm" onClick={closeOrderModal}>
                  <X className="size-5" />
                </Button>
              </div>

              <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-atarah-cream-200 p-1">
                {[
                  { tab: 'overview' as DetailTab, icon: SlidersHorizontal, label: 'Resumen' },
                  { tab: 'items' as DetailTab, icon: ListOrdered, label: 'Items' },
                  { tab: 'payments' as DetailTab, icon: CircleDollarSign, label: 'Pagos' },
                  { tab: 'timeline' as DetailTab, icon: History, label: 'Historial' },
                ].map(({ tab, icon: Icon, label }) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      setEditingItemIndex(null)
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-atarah-wine-900 shadow-sm'
                        : 'text-atarah-charcoal-600 hover:text-atarah-charcoal-900'
                    }`}
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-5 p-4 sm:p-5">
              {selectedOrderQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              ) : selectedOrderQuery.isError ? (
                <Card className="border-rose-200 bg-rose-50 p-5 text-rose-800">
                  {selectedOrderQuery.error.message}
                </Card>
              ) : selectedOrderQuery.data ? (
                <>
                  {activeTab === 'overview' && (
                    <div className="space-y-5">
                      <Card className="p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">Cliente y pedido</h3>
                            <p className="text-sm text-atarah-charcoal-600">Puedes corregir estos datos si hubo un error al registrar la orden.</p>
                          </div>
                          <StatusBadge status={selectedOrderQuery.data.status} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input id="order-customer-name" label="Nombre" value={orderDraft.customer_full_name} onChange={(e) => updateOrderDraftField('customer_full_name', e.target.value)} />
                          <Input id="order-customer-phone" label="Teléfono" value={orderDraft.customer_phone} onChange={(e) => updateOrderDraftField('customer_phone', e.target.value)} />
                          <Input id="order-customer-email" label="Correo" value={orderDraft.customer_email} onChange={(e) => updateOrderDraftField('customer_email', e.target.value)} />
                          <Select id="order-delivery-method" label="Entrega" value={orderDraft.delivery_method} onChange={(e) => updateOrderDraftField('delivery_method', e.target.value)}>
                            <option value="">No definido</option>
                            <option value="retiro">Retiro en persona</option>
                            <option value="delivery">Delivery</option>
                            <option value="envio_nacional">Envío nacional</option>
                          </Select>
                          <Input id="order-customer-city" label="Ciudad" value={orderDraft.customer_city} onChange={(e) => updateOrderDraftField('customer_city', e.target.value)} />
                          <Input id="order-customer-state" label="Estado" value={orderDraft.customer_state} onChange={(e) => updateOrderDraftField('customer_state', e.target.value)} />
                          <Select id="order-contact-method" label="Contacto preferido" value={orderDraft.preferred_contact_method} onChange={(e) => updateOrderDraftField('preferred_contact_method', e.target.value)}>
                            <option value="">No definido</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="call">Llamada</option>
                            <option value="email">Correo</option>
                          </Select>
                          <div className="flex items-end text-sm text-atarah-charcoal-600">
                            <div>
                              <p><span className="text-atarah-charcoal-500">Vendedor:</span> {selectedOrderQuery.data.seller_name || 'Público'}</p>
                              <p className="mt-1"><span className="text-atarah-charcoal-500">Creado:</span> {formatDateTime(selectedOrderQuery.data.created_at)}</p>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Textarea id="order-customer-address" label="Dirección" value={orderDraft.customer_address} onChange={(e) => updateOrderDraftField('customer_address', e.target.value)} />
                          </div>
                          <div className="md:col-span-2">
                            <Textarea id="order-notes" label="Notas del pedido" value={orderDraft.notes} onChange={(e) => updateOrderDraftField('notes', e.target.value)} />
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 space-y-4">
                        <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                          <div className="bg-atarah-cream-50 rounded-2xl p-3">
                            <p className="text-xs text-atarah-charcoal-500">Total</p>
                            <p className="font-bold">{formatCurrency(selectedOrderQuery.data.total)}</p>
                          </div>
                          <div className="bg-atarah-cream-50 rounded-2xl p-3">
                            <p className="text-xs text-atarah-charcoal-500">Pagado</p>
                            <p className="font-bold">{formatCurrency(selectedOrderQuery.data.deposit)}</p>
                          </div>
                          <div className="bg-atarah-cream-50 rounded-2xl p-3">
                            <p className="text-xs text-atarah-charcoal-500">Saldo</p>
                            <p className={`font-bold ${selectedOrderQuery.data.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(selectedOrderQuery.data.balance)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <Select
                            id="order-status"
                            label="Cambiar estado"
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                          >
                            {editableStatuses.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </Select>
                          <Button
                            loading={updateOrderMutation.isPending}
                            onClick={handleSaveOrder}
                            className="w-full sm:w-auto"
                          >
                            Guardar cambios del pedido
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className="space-y-5">
                      <Card className="p-5 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-display text-2xl font-bold text-atarah-wine-900">Productos</h3>
                            <p className="text-sm text-atarah-charcoal-600">
                              Gestiona los productos del pedido.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              leftIcon={<Plus className="size-4" />}
                              onClick={handleAddOrderItem}
                            >
                              Agregar item
                            </Button>
                            <Button
                              loading={updateOrderItemsMutation.isPending}
                              disabled={
                                orderProductsQuery.isLoading ||
                                orderProductsQuery.isError ||
                                orderItemsDraft.length === 0
                              }
                              onClick={handleSaveOrderItems}
                            >
                              Guardar items
                            </Button>
                          </div>
                        </div>

                        {orderProductsQuery.isLoading ? (
                          <p className="text-sm text-atarah-charcoal-600">Cargando catálogo para editar items...</p>
                        ) : orderProductsQuery.isError ? (
                          <Card className="border-rose-200 bg-rose-50 p-4 text-rose-800">
                            {orderProductsQuery.error.message}
                          </Card>
                        ) : orderItemsDraft.length === 0 ? (
                          <Card className="border-amber-200 bg-amber-50 p-4 text-amber-900">
                            El pedido no puede quedar vacío. Agrega al menos un item.
                          </Card>
                        ) : (
                          <div className="space-y-3">
                            {orderItemsDraft.map((item, idx) => {
                              const product = getProductById(item.product_id)
                              const unitPrice = getDraftUnitPrice(item)
                              const lineTotal = getDraftLineTotal(item)

                              return (
                                <div
                                  key={`${item.id || 'new'}-${idx}`}
                                  className="group rounded-2xl border border-atarah-gold-200 bg-white p-4 transition-shadow hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="flex size-6 items-center justify-center rounded-full bg-atarah-wine-100 text-xs font-bold text-atarah-wine-700">
                                          {idx + 1}
                                        </span>
                                        <p className="font-semibold text-atarah-charcoal-900">
                                          {product?.name ?? 'Producto no seleccionado'}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pl-8 text-sm text-atarah-charcoal-600">
                                        {product?.sizes_top.length ? (
                                          <span className="rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium">
                                            Blusa: {product.sizes_top.find((s) => s.id === item.selected_top_size_id)?.size ?? 'Sin seleccionar'}
                                          </span>
                                        ) : null}
                                        {product?.sizes_bottom.length ? (
                                          <span className="rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium">
                                            Pantalón: {product.sizes_bottom.find((s) => s.id === item.selected_bottom_size_id)?.size ?? 'Sin seleccionar'}
                                          </span>
                                        ) : null}
                                        {product?.colors.length ? (
                                          <span className="rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium">
                                            Color: {product.colors.find((c) => c.id === item.selected_color_id)?.color_name ?? 'Sin seleccionar'}
                                          </span>
                                        ) : null}
                                        <span className="rounded-full bg-atarah-cream-100 px-2.5 py-1 text-xs font-medium">
                                          Cantidad: {item.quantity}
                                        </span>
                                      </div>
                                      {item.notes ? (
                                        <p className="pl-8 text-sm italic text-atarah-charcoal-500">
                                          “{item.notes}”
                                        </p>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingItemIndex(idx)}
                                        className="rounded-full p-2 text-atarah-charcoal-600 transition-colors hover:bg-atarah-cream-100 hover:text-atarah-wine-700"
                                        aria-label="Editar item"
                                      >
                                        <Pencil className="size-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOrderItem(idx)}
                                        className="rounded-full p-2 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                        aria-label="Eliminar item"
                                      >
                                        <Trash2 className="size-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between border-t border-atarah-gold-100 pt-2 text-sm">
                                    <span className="text-atarah-charcoal-500">
                                      Unitario: {formatCurrency(unitPrice)}
                                    </span>
                                    <span className="font-semibold text-atarah-wine-900">
                                      Total: {formatCurrency(lineTotal)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Card>
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-5">
                      <Card className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-display text-2xl font-bold text-atarah-wine-900">{editingPayment ? 'Corregir pago' : 'Registrar pago'}</h3>
                          {editingPayment ? (
                            <Button variant="ghost" size="sm" onClick={resetPaymentForm}>
                              Cancelar edición
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            id="payment-amount"
                            label="Monto"
                            type="number"
                            min="0"
                            max={effectiveAvailableBalance}
                            step="0.01"
                            helperText={editingPayment ? `Monto máximo corregible: ${formatCurrency(effectiveAvailableBalance)}` : `Saldo disponible: ${formatCurrency(selectedOrderQuery.data.balance)}`}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                          <Select
                            id="payment-method"
                            label="Método"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          >
                            {paymentMethods.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </Select>
                          <Input
                            id="payment-date"
                            label="Fecha y hora"
                            type="datetime-local"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                          />
                          <div>
                            <label className="text-sm font-semibold">Saldo después del pago</label>
                            <p className="mt-2 font-medium">
                              {formatCurrency(Math.max(0, effectiveAvailableBalance - (Number(paymentAmount) || 0)))}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <Textarea
                              id="payment-notes"
                              label="Notas"
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            loading={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                            onClick={handleSubmitPayment}
                            disabled={!editingPayment && selectedOrderQuery.data.balance <= 0}
                          >
                            {editingPayment
                              ? 'Guardar corrección'
                              : selectedOrderQuery.data.balance <= 0
                                ? 'Pedido pagado'
                                : 'Registrar pago'}
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-5 space-y-4">
                        <h3 className="font-display text-2xl font-bold text-atarah-wine-900">Historial de pagos</h3>
                        {selectedOrderQuery.data.payments.length === 0 ? (
                          <p className="text-sm text-atarah-charcoal-600">Sin pagos registrados.</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedOrderQuery.data.payments.map((p) => (
                              <div key={p.id} className="rounded-2xl border border-atarah-gold-200 bg-white p-4">
                                <div className="flex justify-between gap-3">
                                  <div>
                                    <p className="font-semibold">{formatCurrency(p.amount)}</p>
                                    <p className="text-sm text-atarah-charcoal-600">
                                      {translatePaymentMethod(p.payment_method)} • {formatDateTime(p.paid_at)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <p className="text-sm text-atarah-charcoal-600">
                                      {p.recorded_by_name || 'Staff'}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={<Pencil className="size-4" />}
                                      onClick={() => startEditingPayment(p)}
                                    >
                                      Editar
                                    </Button>
                                  </div>
                                </div>
                                {p.notes ? <p className="mt-2 text-sm">{p.notes}</p> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <Card className="p-5 space-y-4">
                      <h3 className="font-display text-2xl font-bold text-atarah-wine-900">Línea de tiempo</h3>
                      <div className="space-y-4">
                        {selectedOrderQuery.data.timeline.map((entry, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <span className="mt-1 size-3 rounded-full bg-atarah-wine-900" />
                              {idx < selectedOrderQuery.data.timeline.length - 1 && (
                                <span className="h-full w-px bg-atarah-gold-300" />
                              )}
                            </div>
                            <div className="pb-4">
                              <p className="font-semibold">{translateOrderStatus(entry.status)}</p>
                              <p className="text-sm text-atarah-charcoal-600">{formatDateTime(entry.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de item */}
      {editingItemIndex !== null && orderItemsDraft[editingItemIndex] ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-atarah-charcoal-900/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg space-y-5 border-0 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-atarah-wine-900">
                  {orderItemsDraft[editingItemIndex].id ? 'Editar item' : 'Agregar item'}
                </h3>
                <p className="text-sm text-atarah-charcoal-600">
                  Ajusta el producto, tallas, color y cantidad.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingItemIndex(null)}>
                <X className="size-5" />
              </Button>
            </div>

            {(() => {
              const idx = editingItemIndex
              const item = orderItemsDraft[idx]
              const product = getProductById(item.product_id)

              return (
                <div className="space-y-4">
                  <Select
                    id={`modal-product-${item.id || 'new'}-${idx}`}
                    label="Producto"
                    value={item.product_id}
                    onChange={(event) => {
                      const nextProduct = orderProductsQuery.data?.find((c) => c.id === event.target.value) ?? null
                      handleChangeOrderItemProduct(idx, nextProduct)
                    }}
                  >
                    <option value="">Seleccionar producto</option>
                    {(orderProductsQuery.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>

                  <Input
                    id={`modal-quantity-${item.id || 'new'}-${idx}`}
                    label="Cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateOrderItemDraft(idx, { quantity: e.target.value })}
                  />

                  {product?.sizes_top.length ? (
                    <Select
                      id={`modal-top-size-${item.id || 'new'}-${idx}`}
                      label="Talla de blusa"
                      value={item.selected_top_size_id}
                      onChange={(e) => updateOrderItemDraft(idx, { selected_top_size_id: e.target.value })}
                    >
                      <option value="">Seleccionar talla</option>
                      {product.sizes_top.map((size) => (
                        <option key={size.id} value={size.id}>{size.size}</option>
                      ))}
                    </Select>
                  ) : null}

                  {product?.sizes_bottom.length ? (
                    <Select
                      id={`modal-bottom-size-${item.id || 'new'}-${idx}`}
                      label="Talla de pantalón"
                      value={item.selected_bottom_size_id}
                      onChange={(e) => updateOrderItemDraft(idx, { selected_bottom_size_id: e.target.value })}
                    >
                      <option value="">Seleccionar talla</option>
                      {product.sizes_bottom.map((size) => (
                        <option key={size.id} value={size.id}>{size.size}</option>
                      ))}
                    </Select>
                  ) : null}

                  {product?.colors.length ? (
                    <Select
                      id={`modal-color-${item.id || 'new'}-${idx}`}
                      label="Color"
                      value={item.selected_color_id}
                      onChange={(e) => updateOrderItemDraft(idx, { selected_color_id: e.target.value })}
                    >
                      <option value="">Seleccionar color</option>
                      {product.colors.map((color) => (
                        <option key={color.id} value={color.id}>{color.color_name}</option>
                      ))}
                    </Select>
                  ) : null}

                  <Textarea
                    id={`modal-notes-${item.id || 'new'}-${idx}`}
                    label="Notas del item"
                    value={item.notes}
                    onChange={(e) => updateOrderItemDraft(idx, { notes: e.target.value })}
                  />

                  <div className="flex justify-end gap-2 border-t border-atarah-gold-200 pt-4">
                    <Button variant="outline" onClick={() => setEditingItemIndex(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setEditingItemIndex(null)}>
                      Listo
                    </Button>
                  </div>
                </div>
              )
            })()}
          </Card>
        </div>
      ) : null}

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        isOpen={deletingItemIndex !== null}
        title="Eliminar item"
        description="¿Seguro que deseas eliminar este producto del pedido? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setDeletingItemIndex(null)}
        onConfirm={confirmRemoveOrderItem}
      />
    </>
  )
}



