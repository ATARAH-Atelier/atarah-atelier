import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Edit3,
  LogOut,
  MapPin,
  Package,
  Percent,
  Phone,
  ReceiptText,
  Ruler,
  Save,
  ShoppingBag,
  Sparkles,
  Palette,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert } from '../../components/public/Alert'
import { EmptyState } from '../../components/common/EmptyState'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatCurrency, formatDate, getInitials, getGreeting } from '../../lib/utils'
import { getCustomerAccount, updateCustomerProfile } from '../../services/account.service'

type ProfileFormValues = {
  address: string
  city: string
  full_name: string
  phone: string
  state: string
}

const emptyProfileForm: ProfileFormValues = {
  address: '',
  city: '',
  full_name: '',
  phone: '',
  state: '',
}

const PHONE_PREFIXES = ['0412', '0414', '0416', '0424', '0426'] as const

export function CustomerAccountPage() {
  const { profile, refreshProfile, signOut, user } = useAuth()
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState<ProfileFormValues>(emptyProfileForm)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'completed'>('all')

  const [phonePrefix, setPhonePrefix] = useState<string>(PHONE_PREFIXES[0])
  const [phoneNumber, setPhoneNumber] = useState('')

  useDocumentTitle('Mi cuenta | Atarah Atelier')

  const accountQuery = useQuery({
    enabled: Boolean(user?.id),
    queryFn: () => getCustomerAccount(user?.id ?? ''),
    queryKey: ['customer-account', user?.id],
  })

  useEffect(() => {
    if (!user?.id) return
    const customer = accountQuery.data?.customer
    setProfileForm({
      address: customer?.address ?? '',
      city: customer?.city ?? '',
      full_name: customer?.full_name ?? profile?.full_name ?? '',
      phone: customer?.phone ?? '',
      state: customer?.state ?? '',
    })
  }, [accountQuery.data?.customer, profile?.full_name, user?.id])

  useEffect(() => {
    const phone = profileForm.phone
    if (phone && phone.length >= 11) {
      const prefix = phone.slice(0, 4)
      const number = phone.slice(4)
      if (PHONE_PREFIXES.includes(prefix as typeof PHONE_PREFIXES[number])) {
        setPhonePrefix(prefix)
        setPhoneNumber(number)
      }
    }
  }, [profileForm.phone])

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Debes iniciar sesión para guardar tu información.')
      if (!profileForm.full_name.trim()) throw new Error('Ingresa tu nombre completo.')
      if (!profileForm.phone.trim() || profileForm.phone.length < 11) throw new Error('Ingresa un teléfono válido.')
      if (!profileForm.city.trim()) throw new Error('Ingresa tu ciudad.')
      if (!profileForm.state.trim()) throw new Error('Ingresa tu estado.')
      if (!profileForm.address.trim()) throw new Error('Ingresa tu dirección.')
      return updateCustomerProfile(user.id, {
        address: profileForm.address,
        city: profileForm.city,
        email: user.email ?? null,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        state: profileForm.state,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer-account', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-account-prefill', user?.id] }),
        refreshProfile(),
      ])
      toast.success('Tu información fue actualizada.')
      setIsEditingProfile(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar tu información.')
    },
  })

  const orders = accountQuery.data?.orders ?? []
  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0)
  const totalPending = orders.reduce((sum, o) => sum + o.balance, 0)
  const customer = accountQuery.data?.customer ?? null
  const displayName = profile?.full_name ?? customer?.full_name ?? 'Cliente Atarah'
  const initials = getInitials(displayName)
  const hasSavedAddress = Boolean(customer?.city && customer?.state && customer?.address)

  const profileFields = ['full_name', 'phone', 'city', 'state', 'address'] as const
  const filledFields = profileFields.filter((f) => profileForm[f]?.trim().length > 0).length
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100)

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'active') return activeOrders
    if (orderFilter === 'completed') return orders.filter((o) => o.status === 'delivered')
    return orders
  }, [orders, activeOrders, orderFilter])

  function updateProfileField<Key extends keyof ProfileFormValues>(key: Key, value: ProfileFormValues[Key]) {
    setProfileForm((prev) => ({ ...prev, [key]: value }))
  }

  const handlePhoneChange = (prefix: string, number: string) => {
    const fullPhone = prefix + number
    setPhonePrefix(prefix)
    setPhoneNumber(number)
    updateProfileField('phone', fullPhone)
  }

  const handleNumberInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 7)
    handlePhoneChange(phonePrefix, cleaned)
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fcf8f2_0%,#f5ede3_40%,#fcf8f2_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:px-8 lg:py-12">
        {/* Hero section */}
        <section className="relative overflow-hidden rounded-2xl border border-atarah-gold-300/60 bg-white shadow-xl shadow-atarah-gold-200/20 sm:rounded-3xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-atarah-wine-50/40 via-transparent to-transparent" />
          <div className="relative grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Columna de bienvenida */}
            <div className="px-5 py-7 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-atarah-cream-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-atarah-wine-900 border border-atarah-gold-300/50 sm:px-4 sm:text-xs">
                <Sparkles className="size-4 shrink-0 self-center" />
                Espacio personal
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold leading-tight text-atarah-wine-900 sm:mt-6 sm:text-4xl lg:text-5xl">
                {getGreeting()}, <span className="text-atarah-gold-700">{displayName.split(' ')[0]}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-atarah-charcoal-600 sm:mt-4 sm:text-base">
                Gestiona tu perfil, revisa tus pedidos y continúa descubriendo nuestra colección de uniformes.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 sm:mt-8">
                <Link to="/catalogo" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full shadow-lg shadow-atarah-wine-900/20 sm:w-auto" leftIcon={<ShoppingBag className="size-4" />}>
                    Seguir comprando
                  </Button>
                </Link>
              </div>
            </div>

            {/* Columna de perfil rápido */}
            <div className="flex flex-col justify-between border-t border-atarah-gold-300/60 bg-gradient-to-br from-atarah-wine-950 to-atarah-wine-900 px-5 py-7 text-white sm:px-10 sm:py-8 lg:border-l lg:border-t-0 lg:px-8">
              <div>
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-atarah-gold-300/60 bg-white/10 text-xl font-bold text-atarah-gold-300 shadow-lg shadow-black/10 sm:h-20 sm:w-20 sm:text-2xl">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-atarah-gold-300/80 sm:text-xs">Bienvenido</p>
                    <p className="truncate text-lg font-semibold sm:text-xl">{displayName}</p>
                    <p className="truncate text-sm text-white/60">{user?.email}</p>
                  </div>
                </div>

                {/* Barra de progreso del perfil */}
                <div className="mt-5 space-y-2 sm:mt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Perfil completado</span>
                    <span className="font-semibold text-atarah-gold-300">{profileCompletion}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-atarah-gold-400 to-atarah-gold-300 transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  {profileCompletion < 100 && (
                    <p className="text-xs text-white/50">Completa tu perfil para una mejor experiencia</p>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5 text-sm sm:mt-6 sm:gap-3">
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-white/40" />
                      <p className="text-white/50">Teléfono</p>
                    </div>
                    <p className="mt-1 truncate font-medium">{customer?.phone || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-white/40" />
                      <p className="text-white/50">Ubicación</p>
                    </div>
                    <p className="mt-1 truncate font-medium">
                      {[customer?.city, customer?.state].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-6 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => void signOut()}
                leftIcon={<LogOut className="size-4" />}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </section>

        {/* Estadísticas tipo dashboard */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-4">
          {[
            { label: 'Pedidos', value: orders.length, icon: Package, color: 'bg-atarah-cream-100 text-atarah-wine-900' },
            { label: 'Activos', value: activeOrders.length, icon: ReceiptText, color: 'bg-amber-50 text-amber-700' },
            { label: 'Gastado', value: formatCurrency(totalSpent), icon: CreditCard, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Pendiente', value: formatCurrency(totalPending), icon: Percent, color: 'bg-rose-50 text-rose-700' },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="relative overflow-hidden border-0 bg-white p-3.5 shadow-md shadow-atarah-gold-200/20 transition hover:-translate-y-1 hover:shadow-lg sm:p-5"
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20" style={{ backgroundColor: 'currentcolor' }} />
              <div className="relative flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-atarah-charcoal-500 sm:text-sm">{stat.label}</p>
                  <p className="mt-1 truncate text-xl font-bold text-atarah-wine-900 sm:text-3xl">{stat.value}</p>
                </div>
                <div className={`shrink-0 rounded-2xl p-2 sm:p-3 ${stat.color}`}>
                  <stat.icon className="size-4 shrink-0 self-center sm:size-5" />
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* Contenido principal: perfil + pedidos */}
        <section className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Bloque de perfil editable */}
          <div className="space-y-5 sm:space-y-6">
            <Card className="border-0 bg-white p-4 shadow-md shadow-atarah-gold-200/20 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-atarah-wine-900 sm:text-2xl">Datos de envío</h2>
                  <p className="mt-1 text-sm text-atarah-charcoal-600">
                    Esta dirección se precargará al hacer un pedido.
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isEditingProfile ? (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit3 className="size-4" />}
                      onClick={() => setIsEditingProfile(true)}
                      className="flex-1 border-atarah-gold-400/60 sm:flex-none"
                    >
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 border-gray-300 sm:flex-none"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        loading={saveProfileMutation.isPending}
                        onClick={() => void saveProfileMutation.mutateAsync()}
                        leftIcon={<Save className="size-4" />}
                        className="flex-1 sm:flex-none"
                      >
                        Guardar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {hasSavedAddress && !isEditingProfile ? (
                <div className="mt-4">
                  <Alert tone="success">
                    <CheckCircle2 className="size-4" />
                    Dirección guardada correctamente. Se usará en tus próximos pedidos.
                  </Alert>
                </div>
              ) : !hasSavedAddress && !isEditingProfile ? (
                <div className="mt-4">
                  <Alert>
                    Completa tu dirección para agilizar el proceso de compra.
                  </Alert>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    id="full-name"
                    label="Nombre completo"
                    value={profileForm.full_name}
                    onChange={(e) => updateProfileField('full_name', e.target.value)}
                    disabled={!isEditingProfile}
                    className="rounded-xl border-atarah-gold-300/60"
                  />
                </div>

                {/* Campo de teléfono con selector de prefijo */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">
                    Teléfono
                  </label>
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 sm:grid-cols-[88px_minmax(0,1fr)]">
                    <Select
                      value={phonePrefix}
                      onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                      className="w-full"
                      disabled={!isEditingProfile}
                      aria-label="Código de operadora"
                    >
                      {PHONE_PREFIXES.map((prefix) => (
                        <option key={prefix} value={prefix}>
                          {prefix}
                        </option>
                      ))}
                    </Select>
                    <div className="relative min-w-0">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-400" />
                      <Input
                        id="phone-number"
                        type="text"
                        inputMode="numeric"
                        placeholder="0000000"
                        maxLength={7}
                        className="h-12 w-full rounded-xl border-atarah-gold-300/60 pl-10"
                        value={phoneNumber}
                        onChange={(e) => handleNumberInput(e.target.value)}
                        disabled={!isEditingProfile}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-atarah-charcoal-500">
                    Ejemplo: {phonePrefix}1234567
                  </p>
                </div>

                <Input
                  id="city"
                  label="Ciudad"
                  value={profileForm.city}
                  onChange={(e) => updateProfileField('city', e.target.value)}
                  disabled={!isEditingProfile}
                  className="rounded-xl border-atarah-gold-300/60"
                />
                <Input
                  id="state"
                  label="Estado"
                  value={profileForm.state}
                  onChange={(e) => updateProfileField('state', e.target.value)}
                  disabled={!isEditingProfile}
                  className="rounded-xl border-atarah-gold-300/60"
                />
                <div className="sm:col-span-2">
                  <Textarea
                    id="address"
                    label="Dirección completa"
                    value={profileForm.address}
                    onChange={(e) => updateProfileField('address', e.target.value)}
                    disabled={!isEditingProfile}
                    helperText="Calle, número, piso, referencia."
                    className="rounded-xl border-atarah-gold-300/60"
                  />
                </div>
              </div>
            </Card>

            {/* Accesos rápidos */}
            <Card className="border-0 bg-white p-4 shadow-md shadow-atarah-gold-200/20 sm:p-6">
              <h2 className="font-display text-lg font-bold text-atarah-wine-900 sm:text-xl">Accesos rápidos</h2>
              <div className="mt-4 grid gap-2">
                <Link
                  to="/catalogo"
                  className="flex items-center gap-3 rounded-2xl border border-atarah-gold-300/40 px-4 py-3 transition hover:bg-atarah-cream-100 hover:border-atarah-gold-400 sm:px-5"
                >
                  <ShoppingBag className="size-5 shrink-0 text-atarah-wine-900" />
                  <span className="font-medium text-atarah-charcoal-900">Explorar catálogo</span>
                  <ArrowRight className="ml-auto size-4 shrink-0 text-atarah-gold-500" />
                </Link>
                <Link
                  to="/carrito"
                  className="flex items-center gap-3 rounded-2xl border border-atarah-gold-300/40 px-4 py-3 transition hover:bg-atarah-cream-100 hover:border-atarah-gold-400 sm:px-5"
                >
                  <ShoppingBag className="size-5 shrink-0 text-atarah-wine-900" />
                  <span className="font-medium text-atarah-charcoal-900">Ir al carrito</span>
                  <ArrowRight className="ml-auto size-4 shrink-0 text-atarah-gold-500" />
                </Link>
              </div>
            </Card>
          </div>

          {/* Historial de pedidos */}
          <Card className="flex flex-col border-0 bg-white p-4 shadow-md shadow-atarah-gold-200/20 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-atarah-gold-700 sm:text-sm">Historial</p>
                <h2 className="font-display text-2xl font-bold text-atarah-wine-900 sm:text-3xl">Tus pedidos</h2>
              </div>
              <Link to="/catalogo" className="sm:shrink-0">
                <Button size="sm" variant="outline" className="w-full border-atarah-gold-400/60 sm:w-auto" leftIcon={<ShoppingBag className="size-4" />}>
                  Nuevo pedido
                </Button>
              </Link>
            </div>

            {/* Filtro rápido de pedidos */}
            {orders.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'active', label: 'Activos' },
                  { key: 'completed', label: 'Entregados' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setOrderFilter(filter.key as typeof orderFilter)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      orderFilter === filter.key
                        ? 'bg-atarah-wine-100 text-atarah-wine-900 ring-1 ring-atarah-wine-300'
                        : 'bg-gray-100 text-atarah-charcoal-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}

            {/* Contenido de pedidos — sin scroll interno en mobile, solo en desktop */}
            <div className="mt-4 flex-1">
              {accountQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-atarah-cream-100" />
                  ))}
                </div>
              ) : accountQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
                  {accountQuery.error.message}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title={orders.length === 0 ? 'Aún no has realizado pedidos' : 'No hay pedidos en esta categoría'}
                    description={
                      orders.length === 0
                        ? 'Cuando completes tu primer pedido, aquí podrás ver su estado y seguimiento.'
                        : 'Prueba cambiando el filtro para ver otros pedidos.'
                    }
                    action={
                      orders.length === 0 ? (
                        <Link to="/catalogo">
                          <Button>Explorar catálogo</Button>
                        </Link>
                      ) : null
                    }
                  />
                </div>
              ) : (
                <div className="space-y-4 lg:max-h-[580px] lg:overflow-y-auto lg:pr-2 lg:scrollbar-thin lg:scrollbar-thumb-atarah-gold-200">
                  {filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="group rounded-2xl border border-atarah-gold-300/40 bg-white p-4 shadow-sm transition hover:border-atarah-gold-400 hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-atarah-charcoal-900">{order.order_number}</p>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-sm text-atarah-charcoal-500">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="rounded-xl bg-atarah-cream-50 px-2 py-2 text-center sm:px-3">
                          <p className="text-[10px] uppercase text-atarah-charcoal-500 sm:text-xs">Total</p>
                          <p className="text-sm font-semibold text-atarah-charcoal-900 sm:text-base">{formatCurrency(order.total)}</p>
                        </div>
                        <div className="rounded-xl bg-atarah-cream-50 px-2 py-2 text-center sm:px-3">
                          <p className="text-[10px] uppercase text-atarah-charcoal-500 sm:text-xs">Pagado</p>
                          <p className="text-sm font-semibold text-atarah-charcoal-900 sm:text-base">{formatCurrency(order.deposit)}</p>
                        </div>
                        <div className="rounded-xl bg-atarah-cream-50 px-2 py-2 text-center sm:px-3">
                          <p className="text-[10px] uppercase text-atarah-charcoal-500 sm:text-xs">Saldo</p>
                          <p className="text-sm font-semibold text-atarah-charcoal-900 sm:text-base">{formatCurrency(order.balance)}</p>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-atarah-charcoal-600 sm:text-sm">
                            Productos comprados
                          </h3>
                          <div className="space-y-3">
                            {order.items.map((item, index) => (
                              <div
                                key={`${order.id}-${item.product_name}-${index}`}
                                className="flex flex-col gap-2 rounded-2xl border border-atarah-gold-200 bg-atarah-cream-50 p-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-4"
                              >
                                <div className="space-y-1">
                                  <p className="font-semibold text-atarah-charcoal-900">{item.product_name}</p>
                                  <div className="flex flex-wrap gap-2 text-xs text-atarah-charcoal-600">
                                    {item.blouse_size && (
                                      <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                        <Ruler className="size-3" /> Blusa: {item.blouse_size}
                                      </span>
                                    )}
                                    {item.pants_size && (
                                      <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                        <Ruler className="size-3" /> Pantalon: {item.pants_size}
                                      </span>
                                    )}
                                    {item.color_name && (
                                      <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                        <Palette className="size-3" /> {item.color_name}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                                      <Package className="size-3" /> {item.quantity} uds.
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm font-bold text-atarah-wine-900 sm:text-right">{formatCurrency(item.line_total)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/pedido/${order.order_number}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-atarah-wine-900 transition group-hover:gap-2"
                        >
                          Ver seguimiento
                          <ArrowRight className="size-4 shrink-0 self-center" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}