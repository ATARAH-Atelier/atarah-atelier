import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import { QuantitySelector } from '../../../components/public/QuantitySelector'
import { formatCurrency } from '../../../lib/utils'
import type { PublicProductDetail } from '../../../types/catalog'
import type { CartItem } from '../../../types/cart'
import { useCart } from '../../cart/hooks/useCart'

function buildCartItemId(productId: string, topSizeId: string | null, bottomSizeId: string | null, colorId: string | null, notes: string) {
  return `${productId}:${topSizeId ?? 'no-top-size'}:${bottomSizeId ?? 'no-bottom-size'}:${colorId ?? 'no-color'}:${notes.trim().toLowerCase()}`
}

function SizeOption({
  label,
  priceAdjustment,
  checked,
  onClick,
}: {
  label: string
  priceAdjustment: number
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-colors ${
        checked
          ? 'border-atarah-wine-700 bg-atarah-wine-50 text-atarah-wine-900'
          : 'border-atarah-gold-300 text-atarah-charcoal-700 active:bg-atarah-cream-100'
      }`}
    >
      {label}
      {priceAdjustment !== 0 && (
        <span className="mt-0.5 block text-[11px] font-normal text-atarah-charcoal-400">
          {priceAdjustment > 0 ? '+' : ''}
          {formatCurrency(priceAdjustment)}
        </span>
      )}
    </button>
  )
}

function ColorOption({
  hex,
  label,
  priceAdjustment,
  checked,
  onClick,
}: {
  hex: string
  label: string
  priceAdjustment: number
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      aria-label={label}
      className="flex flex-col items-center gap-1.5"
    >
      <span
        className={`relative flex size-9 items-center justify-center rounded-full border-2 transition-transform ${
          checked ? 'scale-110 border-atarah-wine-700' : 'border-transparent ring-1 ring-atarah-gold-300'
        }`}
        style={{ backgroundColor: hex }}
      >
        {checked && <Check className="size-4 text-white drop-shadow" strokeWidth={3} />}
      </span>
      <span className="line-clamp-1 text-center text-[10px] leading-tight text-atarah-charcoal-600">
        {label}
        {priceAdjustment !== 0 && (
          <span className="block text-atarah-charcoal-400">
            {priceAdjustment > 0 ? '+' : ''}
            {formatCurrency(priceAdjustment)}
          </span>
        )}
      </span>
    </button>
  )
}

export function ProductDetailsForm({
  onSelectedColorChange,
  product,
  selectedColorId,
}: {
  onSelectedColorChange: (value: string | null) => void
  product: PublicProductDetail
  selectedColorId: string | null
}) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [selectedTopSizeId, setSelectedTopSizeId] = useState<string | null>(product.sizes_top[0]?.id ?? null)
  const [selectedBottomSizeId, setSelectedBottomSizeId] = useState<string | null>(product.sizes_bottom[0]?.id ?? null)
  const [quantity, setQuantity] = useState(1)
  const [customerNotes, setCustomerNotes] = useState('')

  const selectedTopSize = useMemo(
    () => product.sizes_top.find((size) => size.id === selectedTopSizeId) ?? null,
    [product.sizes_top, selectedTopSizeId],
  )
  const selectedBottomSize = useMemo(
    () => product.sizes_bottom.find((size) => size.id === selectedBottomSizeId) ?? null,
    [product.sizes_bottom, selectedBottomSizeId],
  )
  const selectedColor = useMemo(
    () => product.colors.find((color) => color.id === selectedColorId) ?? null,
    [product.colors, selectedColorId],
  )

  const unitPrice = product.base_price
    + (selectedTopSize?.price_adjustment ?? 0)
    + (selectedBottomSize?.price_adjustment ?? 0)
    + (selectedColor?.price_adjustment ?? 0)
  const lineTotal = unitPrice * quantity

  function buildCartItem() {
    const selectedImageForColor = selectedColor?.color_name
      ? product.images.find((image) => image.color_name === selectedColor.color_name)?.image_url ?? product.main_image
      : product.main_image

    return {
      basePrice: product.base_price,
      bottomSizeAdjustment: selectedBottomSize?.price_adjustment ?? 0,
      cartItemId: buildCartItemId(product.id, selectedTopSize?.id ?? null, selectedBottomSize?.id ?? null, selectedColor?.id ?? null, customerNotes),
      colorAdjustment: selectedColor?.price_adjustment ?? 0,
      customerNotes,
      estimatedDays: product.estimated_days,
      imageUrl: selectedImageForColor,
      lineTotal,
      name: product.name,
      productId: product.id,
      quantity,
      selectedBottomSize: selectedBottomSize?.size ?? null,
      selectedBottomSizeId: selectedBottomSize?.id ?? null,
      selectedColor: selectedColor?.color_name ?? null,
      selectedColorHex: selectedColor?.color_hex ?? null,
      selectedColorId: selectedColor?.id ?? null,
      selectedTopSize: selectedTopSize?.size ?? null,
      selectedTopSizeId: selectedTopSize?.id ?? null,
      slug: product.slug,
      topSizeAdjustment: selectedTopSize?.price_adjustment ?? 0,
      unitPrice,
    } satisfies CartItem
  }

  function validateSelection() {
    if (product.sizes_top.length && !selectedTopSize) {
      toast.error('Selecciona una talla de blusa para continuar.')
      return false
    }

    if (product.sizes_bottom.length && !selectedBottomSize) {
      toast.error('Selecciona una talla de pantalon para continuar.')
      return false
    }

    if (product.colors.length && !selectedColor) {
      toast.error('Selecciona un color para continuar.')
      return false
    }

    return true
  }

  function handleAddToCart() {
    if (!validateSelection()) {
      return
    }

    addItem(buildCartItem())
    toast.success('Producto agregado al carrito.')
  }

  function handleBackToCatalog() {
    navigate('/productos')
  }

  return (
    <div className="space-y-6">
      {product.sizes_top.length ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-atarah-charcoal-900">Talla de blusa</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {product.sizes_top.map((size) => (
              <SizeOption
                key={size.id ?? size.size}
                label={size.size}
                priceAdjustment={size.price_adjustment ?? 0}
                checked={selectedTopSizeId === (size.id ?? null)}
                onClick={() => setSelectedTopSizeId(size.id ?? null)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {product.sizes_bottom.length ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-atarah-charcoal-900">Talla de pantalon</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {product.sizes_bottom.map((size) => (
              <SizeOption
                key={size.id ?? size.size}
                label={size.size}
                priceAdjustment={size.price_adjustment ?? 0}
                checked={selectedBottomSizeId === (size.id ?? null)}
                onClick={() => setSelectedBottomSizeId(size.id ?? null)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {product.colors.length ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-atarah-charcoal-900">
            Color{selectedColor ? `: ${selectedColor.color_name}` : ''}
          </legend>
          <div className="grid grid-cols-5 gap-x-2 gap-y-4 sm:grid-cols-6">
            {product.colors.map((color) => (
              <ColorOption
                key={color.id ?? color.color_name}
                hex={color.color_hex}
                label={color.color_name}
                priceAdjustment={color.price_adjustment ?? 0}
                checked={selectedColorId === (color.id ?? null)}
                onClick={() => onSelectedColorChange(color.id ?? null)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-atarah-charcoal-900">Cantidad</p>
        <QuantitySelector value={quantity} onChange={setQuantity} />
      </div>

      <Textarea
        id="customerNotes"
        label="Observaciones o personalizacion"
        placeholder="Ej. prefiero ajuste relajado en mangas o bordado con nombre."
        value={customerNotes}
        onChange={(event) => setCustomerNotes(event.target.value)}
      />

      <div className="rounded-2xl border border-atarah-gold-300 bg-white p-4">
        <p className="text-sm text-atarah-charcoal-600">Precio unitario</p>
        <p className="font-display text-3xl font-bold text-atarah-wine-900">{formatCurrency(unitPrice)}</p>
        <p className="mt-2 text-sm text-atarah-charcoal-600">Total de esta seleccion: {formatCurrency(lineTotal)}</p>
      </div>

      {/* Botones normales: visibles en desktop, ocultos en mobile (los reemplaza la barra fija de abajo) */}
      <div className="hidden gap-3 sm:flex">
        <Button className="flex-1" onClick={handleAddToCart}>Agregar al carrito</Button>
        <Button className="flex-1" variant="secondary" onClick={handleBackToCatalog}>Volver al catalogo</Button>
      </div>

      {/* BotÃ³n "volver al catÃ¡logo" en mobile: se queda arriba de la barra fija */}
      <Button className="w-full sm:hidden" variant="secondary" onClick={handleBackToCatalog}>
        Volver al catalogo
      </Button>

      {/* Barra fija de compra en mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-atarah-gold-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-atarah-charcoal-500">Total</p>
            <p className="truncate font-display text-lg font-bold text-atarah-wine-900">
              {formatCurrency(lineTotal)}
            </p>
          </div>
          <Button className="shrink-0" onClick={handleAddToCart}>
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  )
}
