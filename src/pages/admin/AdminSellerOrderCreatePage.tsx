import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  User,
  Package,
  Truck,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Search,
  Store,
} from 'lucide-react'
import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { createCheckoutToken } from '../../services/checkout.service'
import { normalizePhone } from '../../lib/public-utils'
import { createStaffOrder } from '../../services/orders.service'
import { getAdminCustomers } from '../../services/customers.service'
import { validateDiscountCode } from '../../services/discounts.service'
import { getPublicProducts } from '../../services/public-products.service'
import { formatCurrency, formatDate } from '../../lib/utils'
import type { AppliedDiscount, SellerOrderDraftItem } from '../../types/database'

const DELIVERY_METHODS = [
  { value: 'retiro', label: 'Retiro en persona', icon: Store },
  { value: 'delivery', label: 'Delivery local', icon: Truck },
  { value: 'envio_nacional', label: 'Envío nacional', icon: Package },
] as const

const PAYMENT_METHODS = [
  { value: '', label: 'Seleccionar método' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'mobile_payment', label: 'Pago móvil' },
  { value: 'zelle', label: 'Zelle' },
]

type FormSection = 'customer' | 'products' | 'delivery'

const PHONE_PREFIXES = ['0412', '0414', '0416', '0424', '0426'] as const

export function AdminSellerOrderCreatePage() {
  useDocumentTitle('Registrar pedido | Atarah Atelier')

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const productsQuery = useQuery({
    queryFn: () => getPublicProducts({ sort: 'recommended' }),
    queryKey: ['staff-products-for-order'],
  })
  const customersQuery = useQuery({
    queryFn: getAdminCustomers,
    queryKey: ['staff-customers-for-order'],
  })

  // Estados del producto actual
  const [productId, setProductId] = useState('')
  const [topSizeId, setTopSizeId] = useState('')
  const [bottomSizeId, setBottomSizeId] = useState('')
  const [colorId, setColorId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [itemNotes, setItemNotes] = useState('')
  const [items, setItems] = useState<SellerOrderDraftItem[]>([])

  // Estados del cliente
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [phonePrefix, setPhonePrefix] = useState<string>(PHONE_PREFIXES[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [address, setAddress] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'retiro' | 'delivery' | 'envio_nacional'>('retiro')
  const [orderNotes, setOrderNotes] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [manualDiscountAmount, setManualDiscountAmount] = useState('0')
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null)
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('0')
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('')
  const [initialPaymentNotes, setInitialPaymentNotes] = useState('')
  const [paidAt, setPaidAt] = useState('')

  // UI local
  const [activeSection, setActiveSection] = useState<FormSection>('customer')
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})
  const lastAddedRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (lastAddedRef.current) {
      lastAddedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [items.length])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase()

    if (query.length < 2) {
      return []
    }

    return (customersQuery.data ?? [])
      .filter((customer) => {
        const phoneValue = normalizePhone(customer.phone ?? '')
        return [
          customer.full_name,
          customer.email ?? '',
          customer.city ?? '',
          customer.state ?? '',
          customer.address ?? '',
          phoneValue,
        ].some((value) => value.toLowerCase().includes(query))
      })
      .slice(0, 6)
  }, [customerSearch, customersQuery.data])

  const selectedExistingCustomer = useMemo(
    () => (customersQuery.data ?? []).find((customer) => customer.id === selectedCustomerId) ?? null,
    [customersQuery.data, selectedCustomerId],
  )

  const selectedProduct = useMemo(
    () => productsQuery.data?.find((p) => p.id === productId) ?? null,
    [productId, productsQuery.data],
  )
  const selectedTopSize = selectedProduct?.sizes_top.find((s) => s.id === topSizeId) ?? null
  const selectedBottomSize = selectedProduct?.sizes_bottom.find((s) => s.id === bottomSizeId) ?? null
  const selectedColor = selectedProduct?.colors.find((c) => c.id === colorId) ?? null

  const currentUnitPrice = (selectedProduct?.base_price ?? 0) + (selectedTopSize?.price_adjustment ?? 0) + (selectedBottomSize?.price_adjustment ?? 0) + (selectedColor?.price_adjustment ?? 0)

  useEffect(() => {
    const normalizedPhone = normalizePhone(phone)

    if (normalizedPhone.length >= 4) {
      const prefix = normalizedPhone.slice(0, 4)
      const number = normalizedPhone.slice(4, 11)

      if (PHONE_PREFIXES.includes(prefix as (typeof PHONE_PREFIXES)[number])) {
        setPhonePrefix(prefix)
        setPhoneNumber(number)
        return
      }
    }

    if (!normalizedPhone) {
      setPhonePrefix(PHONE_PREFIXES[0])
      setPhoneNumber('')
    }
  }, [phone])

  const totalDraft = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const codeDiscountAmount = appliedDiscount?.discount_amount ?? 0
  const manualDiscountValue = Math.max(0, Number(manualDiscountAmount) || 0)
  const discountAmount = Math.min(totalDraft, codeDiscountAmount + manualDiscountValue)
  const finalTotal = Math.max(0, totalDraft - discountAmount)
  const initialPaymentValue = Math.max(0, Number(initialPaymentAmount) || 0)
  const remainingBalance = Math.max(0, finalTotal - initialPaymentValue)
  const customerSectionComplete = Boolean(fullName.trim() && normalizePhone(phone).length === 11 && city.trim() && address.trim())
  const productsSectionComplete = items.length > 0

  const createOrderMutation = useMutation({
    mutationFn: createStaffOrder,
    onSuccess: async (order) => {
      resetOrderForm()
      toast.success(`✅ Pedido #${order.order_number} registrado con éxito`, {
        description: 'Redirigiendo al listado de pedidos...',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      setTimeout(() => navigate('/admin/pedidos', { replace: true }), 800)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el pedido')
    },
  })

  function resetCurrentItem() {
    setProductId('')
    setTopSizeId('')
    setBottomSizeId('')
    setColorId('')
    setQuantity('1')
    setItemNotes('')
  }

  function resetOrderForm() {
    setActiveSection('customer')
    setAddress('')
    setAppliedDiscount(null)
    setCity('')
    setColorId('')
    setCustomerSearch('')
    setDeliveryMethod('retiro')
    setDiscountCode('')
    setEmail('')
    setFullName('')
    setInitialPaymentAmount('0')
    setInitialPaymentMethod('')
    setInitialPaymentNotes('')
    setItems([])
    setItemNotes('')
    setManualDiscountAmount('0')
    setOrderNotes('')
    setPaidAt('')
    setPhone('')
    setPhoneNumber('')
    setPhonePrefix(PHONE_PREFIXES[0])
    setProductId('')
    setQuantity('1')
    setRemovingIndex(null)
    setSelectedCustomerId(null)
    setState('')
    setTopSizeId('')
    setBottomSizeId('')
    setValidationErrors({})
  }

  function applyCustomerSelection(customer: Awaited<ReturnType<typeof getAdminCustomers>>[number]) {
    const normalizedPhone = normalizePhone(customer.phone ?? '')

    setSelectedCustomerId(customer.id)
    setCustomerSearch(customer.full_name)
    setFullName(customer.full_name)
    setEmail(customer.email ?? '')
    setCity(customer.city ?? '')
    setState(customer.state ?? '')
    setAddress(customer.address ?? '')
    setPhone(normalizedPhone)
    setPhonePrefix(normalizedPhone.length >= 4 ? normalizedPhone.slice(0, 4) : PHONE_PREFIXES[0])
    setPhoneNumber(normalizedPhone.length >= 4 ? normalizedPhone.slice(4, 11) : '')
    setValidationErrors((current) => ({
      ...current,
      address: false,
      city: false,
      fullName: false,
      phone: false,
    }))
    toast.success('Cliente cargado en el formulario.')
  }

  function handleAddItem() {
    if (!selectedProduct) {
      toast.warning('Selecciona un producto primero')
      return
    }
    if (selectedProduct.sizes_top.length > 0 && !selectedTopSize) {
      toast.warning('Este producto requiere seleccionar una talla de blusa')
      return
    }
    if (selectedProduct.sizes_bottom.length > 0 && !selectedBottomSize) {
      toast.warning('Este producto requiere seleccionar una talla de pantalón')
      return
    }
    if (selectedProduct.colors.length > 0 && !selectedColor) {
      toast.warning('Este producto requiere seleccionar un color')
      return
    }

    const parsedQty = Number(quantity)
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      toast.warning('La cantidad debe ser al menos 1')
      return
    }

    const newItem: SellerOrderDraftItem = {
      notes: itemNotes.trim() || null,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: parsedQty,
      selected_bottom_size_id: selectedBottomSize?.id ?? null,
      selected_bottom_size_name: selectedBottomSize?.size ?? null,
      selected_color_id: selectedColor?.id ?? null,
      selected_color_name: selectedColor?.color_name ?? null,
      selected_top_size_id: selectedTopSize?.id ?? null,
      selected_top_size_name: selectedTopSize?.size ?? null,
      unit_price: currentUnitPrice,
    }

    setItems((prev) => [...prev, newItem])
    toast.success(`${selectedProduct.name} agregado al pedido`, {
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      duration: 2000,
    })
    resetCurrentItem()
  }

  function handleRemoveItem(index: number) {
    setRemovingIndex(index)
    setTimeout(() => {
      setItems((prev) => prev.filter((_, i) => i !== index))
      setRemovingIndex(null)
      toast('Producto eliminado del pedido')
    }, 200)
  }

  function openProductsStep() {
    const errors: Record<string, boolean> = {}
    if (!fullName.trim()) errors.fullName = true
    if (normalizePhone(phone).length !== 11) errors.phone = true
    if (!city.trim()) errors.city = true
    if (!address.trim()) errors.address = true

    setValidationErrors((current) => ({ ...current, ...errors }))

    if (Object.keys(errors).length > 0) {
      toast.error('Completa los datos obligatorios del cliente antes de continuar.')
      setActiveSection('customer')
      return
    }

    setActiveSection('products')
  }

  function openDeliveryStep() {
    if (!customerSectionComplete) {
      toast.error('Completa primero los datos del cliente.')
      setActiveSection('customer')
      return
    }

    if (!productsSectionComplete) {
      toast.error('Agrega al menos un producto antes de continuar.')
      setActiveSection('products')
      return
    }

    setActiveSection('delivery')
  }

  function handleSectionChange(section: FormSection) {
    if (section === 'customer') {
      setActiveSection('customer')
      return
    }

    if (section === 'products') {
      openProductsStep()
      return
    }

    openDeliveryStep()
  }

  async function handleCreateOrder() {
    const errors: Record<string, boolean> = {}
    if (!fullName.trim()) errors.fullName = true
    if (normalizePhone(phone).length !== 11) errors.phone = true
    if (!city.trim()) errors.city = true
    if (!address.trim()) errors.address = true
    if (items.length === 0) errors.items = true

    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast.error('Completa los campos obligatorios antes de registrar el pedido')
      setActiveSection('customer')
      return
    }

    await createOrderMutation.mutateAsync({
      checkout_token: createCheckoutToken(),
      customer: {
        address: address.trim(),
        city: city.trim(),
        email: email.trim() || null,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        state: state.trim() || null,
      },
      delivery_method: deliveryMethod,
      initial_payment_amount: initialPaymentValue,
      initial_payment_method: initialPaymentMethod || null,
      initial_payment_notes: initialPaymentNotes.trim() || null,
      discount_code: appliedDiscount?.code ?? null,
      manual_discount_amount: manualDiscountValue,
      items,
      notes: orderNotes.trim() || null,
      paid_at: paidAt || null,
      preferred_contact_method: 'whatsapp',
      requested_date: null,
    })
  }

  useEffect(() => {
    if (!appliedDiscount) {
      return
    }

    if (appliedDiscount.subtotal !== totalDraft) {
      setAppliedDiscount(null)
    }
  }, [appliedDiscount, totalDraft])

  async function handleApplyDiscount() {
    if (!discountCode.trim()) {
      setAppliedDiscount(null)
      toast.error('Ingresa un código de descuento.')
      return
    }

    if (totalDraft <= 0) {
      toast.error('Agrega productos antes de validar un descuento.')
      return
    }

    try {
      const result = await validateDiscountCode(discountCode, totalDraft)
      setDiscountCode(result.discount.code)
      setAppliedDiscount(result.applied)
      toast.success('Código ' + result.discount.code + ' aplicado.')
    } catch (error) {
      setAppliedDiscount(null)
      toast.error(error instanceof Error ? error.message : 'No fue posible validar el descuento.')
    }
  }

  const selectedDelivery = DELIVERY_METHODS.find((d) => d.value === deliveryMethod)

  return (
    <div className="min-h-screen space-y-6 pb-12">
      <PageHeader
        title="Nuevo pedido"
        description="Registra un pedido interno con informacion del cliente, productos y pago inicial."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="size-4" />}
              onClick={resetOrderForm}
            >
              Limpiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetOrderForm()
                navigate('/admin/pedidos')
              }}
            >
              Cancelar
            </Button>
          </div>
        }
      />

      {/* Barra de progreso visual */}
      <div className="grid gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-atarah-gold-200/60 md:grid-cols-3">
        {(['customer', 'products', 'delivery'] as FormSection[]).map((section, index) => {
          const isActive = activeSection === section
          const isComplete =
            (section === 'customer' && customerSectionComplete) ||
            (section === 'products' && productsSectionComplete) ||
            (section === 'delivery' && false)
          const isLocked =
            (section === 'products' && !customerSectionComplete) ||
            (section === 'delivery' && (!customerSectionComplete || !productsSectionComplete))
          const Icon = section === 'customer' ? User : section === 'products' ? ShoppingBag : CreditCard
          const label = section === 'customer' ? 'Cliente' : section === 'products' ? 'Productos' : 'Entrega y pago'
          const helper = section === 'customer' ? 'Paso 1' : section === 'products' ? 'Paso 2' : 'Paso 3'

          return (
            <button
              key={section}
              type="button"
              onClick={() => handleSectionChange(section)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-atarah-wine-700 bg-atarah-wine-900 text-white shadow-lg shadow-atarah-wine-900/15 ring-2 ring-atarah-gold-300/60'
                  : isComplete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    : isLocked
                      ? 'border-gray-200 bg-gray-50 text-gray-400'
                      : 'border-atarah-gold-200 bg-atarah-cream-50 text-atarah-charcoal-700 hover:border-atarah-gold-400 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-2xl ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : isComplete
                        ? 'bg-white text-emerald-700'
                        : isLocked
                          ? 'bg-white text-gray-400'
                          : 'bg-white text-atarah-wine-700'
                  }`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isActive ? 'text-atarah-gold-200' : isComplete ? 'text-emerald-700' : 'text-atarah-charcoal-500'}`}>
                      {helper}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{label}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {isComplete ? (
                    <CheckCircle2 className={`size-4 ${isActive ? 'text-atarah-gold-200' : 'text-emerald-600'}`} />
                  ) : (
                    <span className={`text-xs font-bold ${isActive ? 'text-atarah-gold-200' : 'text-atarah-charcoal-400'}`}>0{index + 1}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Columna principal */}
        <div className="space-y-6">
          {/* SECCIÓN CLIENTE */}
          {activeSection === 'customer' && (
            <Card className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
                  <User className="size-5 text-atarah-wine-700" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                    Datos del cliente
                  </h2>
                  <p className="text-sm text-atarah-charcoal-500">
                    Los campos con <span className="text-rose-500">*</span> son obligatorios
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-atarah-gold-200 bg-atarah-cream-50/70 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-atarah-charcoal-500">
                      Cliente existente
                    </p>
                    <p className="mt-1 text-sm text-atarah-charcoal-600">
                      Busca por nombre, telefono, correo, ciudad o direccion para reutilizar la ficha correcta.
                    </p>
                  </div>
                  {selectedExistingCustomer ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomerId(null)
                        setCustomerSearch('')
                      }}
                    >
                      Quitar seleccion
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-400" />
                    <Input
                      id="existing-customer-search"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-11"
                      placeholder="Buscar cliente existente"
                    />
                  </div>
                </div>
                {customersQuery.isError ? (
                  <p className="mt-3 text-sm text-rose-600">No fue posible consultar la base de clientes.</p>
                ) : customerSearch.trim().length >= 2 ? (
                  filteredCustomers.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => applyCustomerSelection(customer)}
                          className={`rounded-2xl border p-4 text-left transition-all ${selectedCustomerId === customer.id ? 'border-atarah-wine-500 bg-white shadow-sm ring-2 ring-atarah-gold-200/60' : 'border-atarah-gold-200 bg-white/90 hover:border-atarah-gold-400 hover:bg-white'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-atarah-charcoal-900">{customer.full_name}</p>
                              <p className="mt-1 text-xs text-atarah-charcoal-500">
                                {customer.city || 'Sin ciudad'}{customer.state ? ', ' + customer.state : ''}
                              </p>
                            </div>
                            <span className="rounded-full bg-atarah-cream-100 px-2.5 py-1 text-[11px] font-semibold text-atarah-wine-700">
                              {customer.orders_count} pedidos
                            </span>
                          </div>
                          <div className="mt-3 space-y-1 text-sm text-atarah-charcoal-600">
                            <p>{customer.phone || 'Sin telefono'}</p>
                            <p>{customer.email || 'Sin correo'}</p>
                            <p className="line-clamp-2">{customer.address || 'Sin direccion registrada'}</p>
                          </div>
                          <p className="mt-3 text-xs text-atarah-charcoal-400">
                            Registro: {formatDate(customer.created_at)}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-atarah-charcoal-500">No encontramos clientes con esa busqueda.</p>
                  )
                ) : (
                  <p className="mt-3 text-sm text-atarah-charcoal-500">Escribe al menos 2 caracteres para buscar.</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input
                    id="fullName"
                    label="Nombre completo *"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      setValidationErrors((prev) => ({ ...prev, fullName: false }))
                    }}
                    placeholder="Ej. María García"
                    error={validationErrors.fullName ? 'Requerido' : undefined}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">
                    Teléfono <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                    <Select
                      value={phonePrefix}
                      onChange={(e) => {
                        const nextPrefix = e.target.value
                        setPhonePrefix(nextPrefix)
                        setPhone(`${nextPrefix}${phoneNumber}`)
                        setValidationErrors((prev) => ({ ...prev, phone: false }))
                      }}
                      aria-label="Código de operadora"
                    >
                      {PHONE_PREFIXES.map((prefix) => (
                        <option key={prefix} value={prefix}>
                          {prefix}
                        </option>
                      ))}
                    </Select>
                    <Input
                      id="phone"
                      inputMode="numeric"
                      maxLength={7}
                      placeholder="0000000"
                      value={phoneNumber}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 7)
                        setPhoneNumber(cleaned)
                        setPhone(`${phonePrefix}${cleaned}`)
                        setValidationErrors((prev) => ({ ...prev, phone: false }))
                      }}
                      error={validationErrors.phone ? 'Ingresa un teléfono válido.' : undefined}
                    />
                  </div>
                  {!validationErrors.phone ? (
                    <p className="mt-1 text-xs text-atarah-charcoal-500">
                      Ejemplo: {phonePrefix}1234567
                    </p>
                  ) : null}
                </div>
                <Input
                  id="email"
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
                <Input
                  id="city"
                  label="Ciudad *"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value)
                    setValidationErrors((prev) => ({ ...prev, city: false }))
                  }}
                  placeholder="Ej. Caracas"
                  error={validationErrors.city ? 'Requerido' : undefined}
                />
                <Input
                  id="state"
                  label="Estado / Provincia"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Ej. Miranda"
                />
                <div className="md:col-span-2">
                  <Textarea
                    id="address"
                    label="Dirección completa *"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      setValidationErrors((prev) => ({ ...prev, address: false }))
                    }}
                    placeholder="Calle, número, urbanización, punto de referencia..."
                    error={validationErrors.address ? 'Requerido' : undefined}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  rightIcon={<ArrowRight className="size-4" />}
                  onClick={openProductsStep}
                >
                  Siguiente: Agregar productos
                </Button>
              </div>
            </Card>
          )}

          {/* SECCIÓN PRODUCTOS */}
          {activeSection === 'products' && (
            <Card className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
                    <ShoppingBag className="size-5 text-atarah-wine-700" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                      Productos del pedido
                    </h2>
                    {items.length > 0 && (
                      <p className="text-sm text-atarah-charcoal-500">
                        {items.length} {items.length === 1 ? 'producto agregado' : 'productos agregados'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-atarah-wine-50 px-4 py-2">
                  <p className="text-sm font-semibold text-atarah-wine-700">
                    Total estimado: {formatCurrency(totalDraft)}
                  </p>
                </div>
              </div>

              {/* Selector de producto */}
              <div className="rounded-3xl border-2 border-dashed border-atarah-gold-200 bg-atarah-cream-50/30 p-4">
                <Select
                  id="product"
                  label="Producto"
                  value={productId}
                  onChange={(e) => {
                    const nextProductId = e.target.value
                    setProductId(nextProductId)
                    setTopSizeId('')
                    setBottomSizeId('')
                    setColorId('')
                  }}
                >
                  <option value="">Seleccionar producto</option>
                  {(productsQuery.data ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Base {formatCurrency(product.base_price)}
                    </option>
                  ))}
                </Select>

                {selectedProduct ? (
                  <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-atarah-charcoal-600 ring-1 ring-atarah-gold-200/70">
                    <p className="font-semibold text-atarah-charcoal-900">{selectedProduct.name}</p>
                    <p className="mt-1">Precio base: {formatCurrency(selectedProduct.base_price)}</p>
                    <p className="mt-1">
                      {selectedProduct.sizes_top.length ? `${selectedProduct.sizes_top.length} tallas de blusa` : 'Sin tallas de blusa'} • {' '}
                      {selectedProduct.sizes_bottom.length ? `${selectedProduct.sizes_bottom.length} tallas de pantalón` : 'Sin tallas de pantalón'}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Detalles del producto seleccionado */}
              {selectedProduct && (
                <div className="grid gap-4 rounded-2xl bg-gray-50/60 p-4 md:grid-cols-2">
                  <Select
                    id="top-size"
                    label="Talla de blusa"
                    value={topSizeId}
                    onChange={(e) => setTopSizeId(e.target.value)}
                    disabled={!selectedProduct.sizes_top.length}
                  >
                    <option value="">
                      {selectedProduct.sizes_top.length ? 'Seleccionar talla de blusa' : 'Sin tallas de blusa'}
                    </option>
                    {selectedProduct.sizes_top.map((s) => (
                      <option key={s.id ?? s.size} value={s.id}>
                        {s.size} {s.price_adjustment ? `(${formatCurrency(s.price_adjustment)})` : ''}
                      </option>
                    ))}
                  </Select>
                  <Select
                    id="bottom-size"
                    label="Talla de pantalón"
                    value={bottomSizeId}
                    onChange={(e) => setBottomSizeId(e.target.value)}
                    disabled={!selectedProduct.sizes_bottom.length}
                  >
                    <option value="">
                      {selectedProduct.sizes_bottom.length ? 'Seleccionar talla de pantalón' : 'Sin tallas de pantalón'}
                    </option>
                    {selectedProduct.sizes_bottom.map((s) => (
                      <option key={s.id ?? s.size} value={s.id}>
                        {s.size} {s.price_adjustment ? `(${formatCurrency(s.price_adjustment)})` : ''}
                      </option>
                    ))}
                  </Select>
                  <Select
                    id="color"
                    label="Color"
                    value={colorId}
                    onChange={(e) => setColorId(e.target.value)}
                    disabled={!selectedProduct.colors.length}
                  >
                    <option value="">
                      {selectedProduct.colors.length ? 'Seleccionar color' : 'Sin colores disponibles'}
                    </option>
                    {selectedProduct.colors.map((c) => (
                      <option key={c.id ?? c.color_name} value={c.id}>
                        {c.color_name} {c.price_adjustment ? `(${formatCurrency(c.price_adjustment)})` : ''}
                      </option>
                    ))}
                  </Select>
                  <Input
                    id="quantity"
                    label="Cantidad"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <div className="flex items-end">
                    <div className="w-full rounded-2xl bg-white px-3 py-2 text-sm">
                      <span className="text-atarah-charcoal-500">Precio unitario:</span>{' '}
                      <span className="font-bold text-atarah-wine-700">{formatCurrency(currentUnitPrice)}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Textarea
                      id="itemNotes"
                      label="Observaciones del producto"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="Ej. Envolver para regalo, medida especial..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      leftIcon={<Plus className="size-4" />}
                      onClick={handleAddItem}
                      className="w-full"
                      variant="secondary"
                    >
                      Agregar {selectedProduct.name} al pedido
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de items */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-atarah-charcoal-500">
                    Resumen de productos agregados
                  </h3>
                  {items.map((item, index) => (
                    <div
                      key={`${item.product_id}-${index}`}
                      ref={index === items.length - 1 ? lastAddedRef : null}
                      className={`rounded-2xl border bg-white p-4 transition-all duration-200 ${
                        removingIndex === index
                          ? 'scale-95 opacity-0'
                          : 'border-atarah-gold-200/60 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-atarah-wine-100 text-xs font-bold text-atarah-wine-700">
                              {index + 1}
                            </span>
                            <p className="font-semibold text-atarah-charcoal-900">{item.product_name}</p>
                          </div>
                          <p className="mt-1 pl-8 text-sm text-atarah-charcoal-600">
                            {item.selected_top_size_name ? `Blusa: ${item.selected_top_size_name}` : 'Sin talla de blusa'} &bull;{' '}
                            {item.selected_bottom_size_name ? `Pantalón: ${item.selected_bottom_size_name}` : 'Sin talla de pantalón'} &bull;{' '}
                            {item.selected_color_name ?? 'Color estándar'} &bull; {item.quantity}{' '}
                            {item.quantity === 1 ? 'unidad' : 'unidades'}
                          </p>
                          {item.notes && (
                            <p className="mt-2 pl-8 text-xs italic text-atarah-charcoal-500">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-atarah-wine-900">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-rose-600 transition-colors hover:text-rose-800"
                          >
                            <Trash2 className="size-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-atarah-cream-30 p-8 text-center">
                  <Package className="size-10 text-atarah-gold-400" />
                  <p className="font-medium text-atarah-charcoal-600">Aún no hay productos en el pedido</p>
                  <p className="text-sm text-atarah-charcoal-400">
                    Selecciona un producto de la lista y define talla de blusa, talla de pantalón, color y cantidad.
                  </p>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={() => handleSectionChange('customer')}>
                  ← Cliente
                </Button>
                <Button
                  rightIcon={<ArrowRight className="size-4" />}
                  onClick={() => {
                    if (items.length === 0) {
                      toast.warning('Agrega al menos un producto al pedido')
                      return
                    }
                    openDeliveryStep()
                  }}
                >
                  Siguiente: Entrega y pago
                </Button>
              </div>
            </Card>
          )}

          {/* SECCIÓN ENTREGA Y PAGO */}
          {activeSection === 'delivery' && (
            <Card className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-wine-100">
                  <Truck className="size-5 text-atarah-wine-700" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-atarah-wine-900">
                    Método de entrega y pago inicial
                  </h2>
                  <p className="text-sm text-atarah-charcoal-500">
                    Define cómo recibirá el cliente y el abono registrado
                  </p>
                </div>
              </div>

              {/* Selector visual de método de entrega */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">
                  Método de entrega
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {DELIVERY_METHODS.map((method) => {
                    const Icon = method.icon
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setDeliveryMethod(method.value as typeof deliveryMethod)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                          deliveryMethod === method.value
                            ? 'border-atarah-wine-500 bg-atarah-wine-50 shadow-sm ring-1 ring-atarah-wine-200'
                            : 'border-gray-200 bg-white hover:border-atarah-gold-300'
                        }`}
                      >
                        <Icon
                          className={`size-6 ${
                            deliveryMethod === method.value ? 'text-atarah-wine-600' : 'text-gray-400'
                          }`}
                        />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="manualDiscount"
                  label="Descuento manual al cliente"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualDiscountAmount}
                  onChange={(e) => setManualDiscountAmount(e.target.value)}
                  helperText="Monto fijo que se rebajará adicional al subtotal"
                />
                <Input
                  id="initialPayment"
                  label="Monto del pago inicial"
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialPaymentAmount}
                  onChange={(e) => setInitialPaymentAmount(e.target.value)}
                  helperText={`Saldo restante: ${formatCurrency(remainingBalance)}`}
                />
                <Select
                  id="paymentMethod"
                  label="Método de pago"
                  value={initialPaymentMethod}
                  onChange={(e) => setInitialPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </Select>
                <Input
                  id="paidAt"
                  label="Fecha y hora del pago"
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
                <div className="md:col-span-2">
                  <Textarea
                    id="paymentNotes"
                    label="Notas del pago"
                    value={initialPaymentNotes}
                    onChange={(e) => setInitialPaymentNotes(e.target.value)}
                    placeholder="Ej. Transferencia pendiente por confirmar..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    id="orderNotes"
                    label="Notas generales del pedido"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Instrucciones especiales, urgencia, detalles adicionales..."
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <Button variant="outline" onClick={() => handleSectionChange('products')}>
                  ← Productos
                </Button>
                <Button
                  className="lg:hidden"
                  loading={createOrderMutation.isPending}
                  onClick={() => { if (discountCode.trim()) { void handleApplyDiscount() } void handleCreateOrder() }}
                  leftIcon={<CheckCircle2 className="size-5" />}
                >
                  {createOrderMutation.isPending ? 'Registrando...' : 'Registrar pedido'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* SIDEBAR / RESUMEN FIJO */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-6">
            <Card className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-atarah-gold-100">
                  <CreditCard className="size-5 text-atarah-gold-700" />
                </div>
                <h3 className="font-display text-xl font-bold text-atarah-wine-900">Resumen del pedido</h3>
              </div>

              {/* Indicador visual del método de entrega */}
              {selectedDelivery && (
                <div className="flex items-center gap-2 rounded-xl bg-atarah-cream-50 p-3">
                  <selectedDelivery.icon className="size-4 text-atarah-wine-500" />
                  <span className="text-sm font-medium">{selectedDelivery.label}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-atarah-charcoal-500">Productos ({items.length})</span>
                  <span className="font-semibold">{formatCurrency(totalDraft)}</span>
                </div>
                {codeDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-atarah-charcoal-500">Descuento por código</span>
                    <span className="font-semibold text-emerald-600">- {formatCurrency(codeDiscountAmount)}</span>
                  </div>
                )}
                {manualDiscountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-atarah-charcoal-500">Descuento manual</span>
                    <span className="font-semibold text-emerald-600">- {formatCurrency(manualDiscountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-atarah-charcoal-500">Total del pedido</span>
                  <span className="font-semibold">{formatCurrency(finalTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-atarah-charcoal-500">Pago inicial</span>
                  <span className="font-semibold text-emerald-600">
                    - {formatCurrency(initialPaymentValue)}
                  </span>
                </div>
                <hr className="border-atarah-gold-200" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-atarah-wine-900">Saldo pendiente</span>
                  <span className={`font-bold ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                loading={createOrderMutation.isPending}
                onClick={() => { if (discountCode.trim()) { void handleApplyDiscount() } void handleCreateOrder() }}
                leftIcon={<CheckCircle2 className="size-5" />}
              >
                {createOrderMutation.isPending ? 'Registrando...' : 'Registrar pedido'}
              </Button>

              {items.length === 0 && (
                <p className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle className="size-3.5" />
                  Agrega productos para completar el pedido
                </p>
              )}
            </Card>

            {/* Vista previa del cliente */}
            {fullName && (
              <Card className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-atarah-wine-800">
                  <User className="size-4" />
                  Datos del cliente
                </div>
                <p className="text-sm font-medium">{fullName}</p>
                {phone && <p className="text-xs text-atarah-charcoal-500">{phone}</p>}
                {city && (
                  <p className="text-xs text-atarah-charcoal-500">
                    {city}{state ? `, ${state}` : ''}
                  </p>
                )}
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
