import { useMutation, useQuery } from '@tanstack/react-query'
import { MapPin, PencilLine, TicketPercent } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { Alert } from '../../components/public/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { CheckoutOrderSummary } from '../../features/checkout/components/CheckoutOrderSummary'
import {
  CustomerInformationSection,
  DeliveryInformationSection,
  OrderNotesSection,
} from '../../features/checkout/components/CustomerInformationSection'
import { useCheckout } from '../../features/checkout/hooks/useCheckout'
import { useCart } from '../../features/cart/hooks/useCart'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getCustomerAccount } from '../../services/account.service'
import {
  buildGuestOrderInput,
  createCheckoutToken,
  createGuestOrder,
  persistCheckoutSession,
} from '../../services/checkout.service'
import { validateDiscountCode } from '../../services/discounts.service'
import { getPublicProducts } from '../../services/public-products.service'
import type { CartItem } from '../../types/cart'
import type { AppliedDiscount } from '../../types/database'

export function CheckoutPage() {
  const { clearCart, items, replaceCart, total } = useCart()
  const { clearDraft, errors, setValues, updateValue, validate, values } = useCheckout()
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null)

  useDocumentTitle('Finalizar pedido | Atarah Atelier')

  const accountQuery = useQuery({
    enabled: Boolean(user?.id),
    queryFn: () => getCustomerAccount(user?.id ?? ''),
    queryKey: ['checkout-account-prefill', user?.id],
  })

  const productsQuery = useQuery({
    queryFn: () => getPublicProducts({ sort: 'recommended' }),
    queryKey: ['checkout-products-validation'],
  })

  useEffect(() => {
    if (!user?.id) {
      return
    }

    setValues((current) => ({
      ...current,
      email: current.email || user.email || '',
      full_name: current.full_name || profile?.full_name || '',
    }))
  }, [profile?.full_name, setValues, user?.email, user?.id])

  useEffect(() => {
    if (!accountQuery.data?.customer) {
      return
    }

    const customer = accountQuery.data.customer

    setValues((current) => ({
      ...current,
      address: current.address || customer.address || '',
      city: current.city || customer.city || '',
      email: current.email || customer.email || user?.email || '',
      full_name: current.full_name || customer.full_name || profile?.full_name || '',
      phone: current.phone || customer.phone || '',
      state: current.state || customer.state || '',
    }))
  }, [accountQuery.data?.customer, profile?.full_name, setValues, user?.email])

  useEffect(() => {
    if (appliedDiscount && appliedDiscount.subtotal !== total) {
      setAppliedDiscount(null)
    }
  }, [appliedDiscount, total])

  const normalizedCheckoutItems = useMemo(() => {
    if (!productsQuery.data) {
      return items
    }

    return items.map((item) => {
      const product = productsQuery.data.find((entry) => entry.id === item.productId)

      if (!product) {
        return item
      }

      const matchedTopSize =
        product.sizes_top.find((size) => size.id === item.selectedTopSizeId) ??
        product.sizes_top.find((size) => size.size === item.selectedTopSize)

      const matchedBottomSize =
        product.sizes_bottom.find((size) => size.id === item.selectedBottomSizeId) ??
        product.sizes_bottom.find((size) => size.size === item.selectedBottomSize)

      const matchedColor =
        product.colors.find((color) => color.id === item.selectedColorId) ??
        product.colors.find(
          (color) =>
            color.color_name === item.selectedColor ||
            (color.color_hex ?? '').toUpperCase() === (item.selectedColorHex ?? '').toUpperCase(),
        )

      const unitPrice =
        product.base_price +
        (matchedTopSize?.price_adjustment ?? 0) +
        (matchedBottomSize?.price_adjustment ?? 0) +
        (matchedColor?.price_adjustment ?? 0)

      return {
        ...item,
        lineTotal: unitPrice * item.quantity,
        selectedBottomSize: matchedBottomSize?.size ?? item.selectedBottomSize,
        selectedBottomSizeId: matchedBottomSize?.id ?? item.selectedBottomSizeId,
        selectedColor: matchedColor?.color_name ?? item.selectedColor,
        selectedColorHex: matchedColor?.color_hex ?? item.selectedColorHex,
        selectedColorId: matchedColor?.id ?? item.selectedColorId,
        selectedTopSize: matchedTopSize?.size ?? item.selectedTopSize,
        selectedTopSizeId: matchedTopSize?.id ?? item.selectedTopSizeId,
        unitPrice,
      } satisfies CartItem
    })
  }, [items, productsQuery.data])

  const invalidCartItems = useMemo(() => {
    if (!productsQuery.data) {
      return [] as CartItem[]
    }

    return normalizedCheckoutItems.filter((item) => {
      const product = productsQuery.data.find((entry) => entry.id === item.productId)

      if (!product) {
        return true
      }

      const topSizeValid = !item.selectedTopSizeId || product.sizes_top.some((size) => size.id === item.selectedTopSizeId)
      const bottomSizeValid = !item.selectedBottomSizeId || product.sizes_bottom.some((size) => size.id === item.selectedBottomSizeId)
      const colorValid = !item.selectedColorId || product.colors.some((color) => color.id === item.selectedColorId)

      return !topSizeValid || !bottomSizeValid || !colorValid
    })
  }, [normalizedCheckoutItems, productsQuery.data])

  const hasInvalidCartItems = invalidCartItems.length > 0

  function handleRemoveInvalidItems() {
    const invalidIds = new Set(invalidCartItems.map((item) => item.cartItemId))
    replaceCart(normalizedCheckoutItems.filter((item) => !invalidIds.has(item.cartItemId)))
    toast.success('Se eliminaron los productos con tallas o colores desactualizados del carrito.')
  }

  const checkoutMutation = useMutation({
    mutationFn: createGuestOrder,
    onSuccess: (order) => {
      persistCheckoutSession({ appliedDiscount, order, summaryItems: normalizedCheckoutItems })
      clearDraft()
      clearCart()
      navigate(`/pedido/confirmacion/${order.order_number}`, { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear el pedido.')
    },
  })

  const discountMutation = useMutation({
    mutationFn: (code: string) => validateDiscountCode(code, total),
    onSuccess: (result) => {
      updateValue('discount_code', result.discount.code)
      setAppliedDiscount(result.applied)
      toast.success(`Código ${result.discount.code} aplicado.`)
    },
    onError: (error) => {
      setAppliedDiscount(null)
      toast.error(error instanceof Error ? error.message : 'No fue posible validar el descuento.')
    },
  })

  if (!items.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos antes de continuar al checkout."
          action={<Button onClick={() => navigate('/catalogo')}>Ir al catálogo</Button>}
        />
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedValues = validate()

    if (!parsedValues) {
      toast.error('Revisa los campos del formulario antes de continuar.')
      return
    }

    if (hasInvalidCartItems) {
      toast.error('Hay productos en tu carrito con tallas o colores que ya no existen. Elimínalos y vuelve a intentar.')
      return
    }

    replaceCart(normalizedCheckoutItems)

    const checkoutToken = createCheckoutToken()
    const input = buildGuestOrderInput(parsedValues, normalizedCheckoutItems, checkoutToken, user?.id ?? null)
    await checkoutMutation.mutateAsync(input)
  }

  async function handleApplyDiscount() {
    if (!values.discount_code.trim()) {
      setAppliedDiscount(null)
      toast.error('Ingresa un código de descuento.')
      return
    }

    await discountMutation.mutateAsync(values.discount_code)
  }

  const hasSavedAddress = Boolean(
    accountQuery.data?.customer?.city && accountQuery.data?.customer?.state && accountQuery.data?.customer?.address,
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
      <div>
        <h1 className="font-display text-5xl font-bold text-atarah-wine-900">Finalizar pedido</h1>
        <p className="mt-3 text-base text-atarah-charcoal-600">
          Completa tus datos para que Atarah Atelier confirme medidas, disponibilidad, entrega y pago.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {hasInvalidCartItems ? (
            <Alert tone="info">
              Tienes productos en el carrito con tallas o colores desactualizados. Esto suele pasar cuando el catálogo cambió.
              <button type="button" onClick={handleRemoveInvalidItems} className="ml-2 font-semibold underline">
                Eliminar productos inválidos
              </button>
            </Alert>
          ) : null}

          <Card className="space-y-5">
            <p className="font-display text-3xl font-bold text-atarah-wine-900">Datos de contacto</p>
            <CustomerInformationSection errors={errors} values={values} onChange={updateValue} lockIdentityFields={Boolean(user?.id)} />
          </Card>

          <Card className="space-y-5">
            <p className="font-display text-3xl font-bold text-atarah-wine-900">Entrega</p>
            {user && hasSavedAddress ? (
              <Alert tone="success">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Usamos la ubicación guardada en tu cuenta como base.</p>
                    <p className="mt-1">Puedes editar ciudad, estado o dirección aquí si este pedido debe ir a otro lugar.</p>
                  </div>
                </div>
              </Alert>
            ) : user ? (
              <Alert>
                <div className="flex items-start gap-3">
                  <PencilLine className="mt-0.5 size-4" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Aún no tienes una ubicación completa guardada.</p>
                    <p className="mt-1">Puedes escribirla aquí y luego dejarla guardada desde tu cuenta para futuros pedidos.</p>
                  </div>
                </div>
              </Alert>
            ) : null}
            <DeliveryInformationSection errors={errors} values={values} onChange={updateValue} />
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center gap-3">
              <TicketPercent className="size-5 text-atarah-wine-700" />
              <p className="font-display text-3xl font-bold text-atarah-wine-900">Descuento</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                id="discount_code"
                label="Código promocional"
                value={values.discount_code}
                onChange={(event) => updateValue('discount_code', event.target.value.toUpperCase())}
                placeholder="Ej. BIENVENIDA10"
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleApplyDiscount()}
                  loading={discountMutation.isPending}
                  className="w-full md:w-auto"
                >
                  Aplicar código
                </Button>
              </div>
            </div>
            {appliedDiscount ? (
              <Alert tone="success">
                Descuento aplicado: {appliedDiscount.code}. Ahorras {appliedDiscount.discount_amount.toFixed(2)} USD.
              </Alert>
            ) : null}
          </Card>

          <Card className="space-y-5">
            <p className="font-display text-3xl font-bold text-atarah-wine-900">Notas</p>
            <OrderNotesSection errors={errors} values={values} onChange={updateValue} />
          </Card>

          <Button type="submit" disabled={hasInvalidCartItems} loading={checkoutMutation.isPending} className="w-full sm:w-auto">
            Crear pedido
          </Button>
        </form>

        <CheckoutOrderSummary appliedDiscount={appliedDiscount} items={normalizedCheckoutItems} total={normalizedCheckoutItems.reduce((sum, item) => sum + item.lineTotal, 0)} />
      </div>
    </div>
  )
}
