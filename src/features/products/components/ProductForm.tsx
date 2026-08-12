import { ArrowLeft, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { FormSection } from '../../../components/ui/FormSection'
import { checkSlugExists } from '../../../services/products.service'
import type { Product, ProductFormValues } from '../../../types/database'
import { ProductColorsSection } from './ProductColorsSection'
import { ProductGeneralSection } from './ProductGeneralSection'
import { ProductImagesSection } from './ProductImagesSection'
import { ProductSizesSection } from './ProductSizesSection'
import { useProductForm } from '../hooks/useProductForm'
import { productFormSchema } from '../schemas/product.schema'

interface ProductFormProps {
  cancelHref: string
  mode: 'create' | 'edit'
  onCancel: () => void
  onSubmit: (values: ProductFormValues, existingImages: Product['images']) => Promise<void>
  product?: Product
  submitLabel?: ReactNode
}

export function ProductForm({
  cancelHref: _cancelHref,
  mode,
  onCancel,
  onSubmit,
  product,
  submitLabel,
}: ProductFormProps) {
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const {
    addCustomImage,
    addPresetSize,
    availableSizePresets,
    colorsFieldArray,
    form,
    imagesFieldArray,
    makeImagePrimary,
    markSlugAsManual,
    resetSlugAutomation,
    sizesTopFieldArray,
    sizesBottomFieldArray,
  } = useProductForm(product)

  const {
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    setError,
  } = form

  async function validateSlugAvailability(slug: string) {
    if (!slug.trim()) return true
    setIsCheckingSlug(true)
    try {
      const exists = await checkSlugExists(slug, product?.id)
      if (exists) {
        setError('slug', {
          message: 'Ya existe un producto con este enlace.',
        })
        return false
      }
      if (errors.slug?.message === 'Ya existe un producto con este enlace.') {
        clearErrors('slug')
      }
      return true
    } catch (error) {
      setError('slug', {
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible validar el enlace del producto.',
      })
      return false
    } finally {
      setIsCheckingSlug(false)
    }
  }

  async function handleFormSubmit(values: ProductFormValues) {
    clearErrors()
    const parsedValues = productFormSchema.safeParse(values)
    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const fieldPath = issue.path.join('.') as Parameters<typeof setError>[0]
        setError(fieldPath, { message: issue.message })
      }
      return
    }
    const isSlugValid = await validateSlugAvailability(parsedValues.data.slug)
    if (!isSlugValid) return
    await onSubmit(parsedValues.data, product?.images ?? [])
  }

  function handleCancel() {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Deseas salir de todos modos?')) {
      return
    }
    onCancel()
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="sticky top-20 z-20 flex flex-col gap-4 rounded-3xl border border-atarah-gold-300/70 bg-atarah-cream-50/95 p-4 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-3xl font-bold text-atarah-wine-900">
            {mode === 'create' ? 'Nuevo producto' : 'Editar producto'}
          </p>
          <p className="mt-1 text-sm text-atarah-charcoal-600">
            Completa la información general, variantes e imágenes del producto.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="ghost"
            type="button"
            leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            leftIcon={<Save className="size-4" aria-hidden="true" />}
          >
            {submitLabel ?? 'Guardar producto'}
          </Button>
        </div>
      </div>

      <FormSection
        title="Información"
        description="Define el nombre, slug, categoría, descripción y configuración base del producto."
      >
        <ProductGeneralSection
          form={form}
          onResetSlugAutomation={resetSlugAutomation}
          onSlugChange={markSlugAsManual}
          slugChecking={isCheckingSlug}
        />
      </FormSection>

      <FormSection
        title="Tallas"
        description="Agrega las tallas disponibles para blusa y pantalón, y sus ajustes de precio en USD."
      >
        <ProductSizesSection
          topFieldArray={sizesTopFieldArray}
          bottomFieldArray={sizesBottomFieldArray}
          form={form}
          onAddPresetSize={addPresetSize}
          presets={availableSizePresets}
        />
      </FormSection>

      <FormSection
        title="Colores"
        description="Define opciones de color, su hexadecimal y cualquier ajuste de precio."
      >
        <ProductColorsSection fieldArray={colorsFieldArray} form={form} />
      </FormSection>

      <FormSection
        title="Imágenes"
        description="Sube hasta 8 imágenes y selecciona cuál será la imagen principal."
      >
        <ProductImagesSection
          fieldArray={imagesFieldArray}
          form={form}
          onAddImage={addCustomImage}
          onMakePrimary={makeImagePrimary}
        />
      </FormSection>
    </form>
  )
}