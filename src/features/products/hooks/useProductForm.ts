import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import { slugify } from '../../../lib/utils'
import type { Product, ProductFormImage, ProductFormValues } from '../../../types/database'
import { emptyProductFormValues } from '../schemas/product.schema'

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function mapProductToFormValues(product: Product): ProductFormValues {
  return {
    base_price: product.base_price,
    category: product.category,
    category_id: product.category_id ?? '',
    colors: product.colors,
    description: product.description ?? '',
    estimated_days: product.estimated_days,
    images: product.images.map((image) => ({
      color_name: image.color_name ?? null,
      id: image.id,
      image_url: image.image_url,
      storage_path: image.storage_path,
    })),
    is_active: product.is_active,
    is_featured: product.is_featured,
    name: product.name,
    sizes_top: product.sizes_top,
    sizes_bottom: product.sizes_bottom,
    slug: product.slug,
  }
}

export function useProductForm(product?: Product) {
  const [hasManualSlug, setHasManualSlug] = useState(Boolean(product?.slug))

  const form = useForm<ProductFormValues>({
    defaultValues: product ? mapProductToFormValues(product) : emptyProductFormValues,
  })

  const sizesTopFieldArray = useFieldArray({
    control: form.control,
    name: 'sizes_top',
  })

  const sizesBottomFieldArray = useFieldArray({
    control: form.control,
    name: 'sizes_bottom',
  })

  const colorsFieldArray = useFieldArray({
    control: form.control,
    name: 'colors',
  })

  const imagesFieldArray = useFieldArray({
    control: form.control,
    name: 'images',
  })

  const nameValue = form.watch('name')

  useEffect(() => {
    if (hasManualSlug) return
    form.setValue('slug', slugify(nameValue), {
      shouldDirty: Boolean(nameValue),
      shouldValidate: true,
    })
  }, [form, hasManualSlug, nameValue])

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!form.formState.isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [form.formState.isDirty])

  function markSlugAsManual(value: string) {
    setHasManualSlug(value.trim().length > 0)
    form.setValue('slug', slugify(value), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function resetSlugAutomation() {
    setHasManualSlug(false)
    form.setValue('slug', slugify(form.getValues('name')), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  // Añade una talla a la lista superior o inferior
  function addPresetSize(size: string, target: 'top' | 'bottom') {
    const fieldArray = target === 'top' ? sizesTopFieldArray : sizesBottomFieldArray
    const currentSizes = form.getValues(target === 'top' ? 'sizes_top' : 'sizes_bottom')
    const exists = currentSizes.some((s) => s.size.trim().toLowerCase() === size.toLowerCase())
    if (exists) return
    fieldArray.append({ price_adjustment: 0, size })
  }

  function addCustomImage(image: ProductFormImage) {
    if ((form.getValues('images') ?? []).length >= 20) return false
    imagesFieldArray.append(image)
    return true
  }

  function makeImagePrimary(index: number) {
    const images = [...form.getValues('images')]
    const [selectedImage] = images.splice(index, 1)
    if (!selectedImage) return
    images.unshift(selectedImage)
    form.setValue('images', images, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return {
    addCustomImage,
    addPresetSize,
    availableSizePresets: SIZE_PRESETS,
    colorsFieldArray,
    form,
    hasManualSlug,
    imagesFieldArray,
    makeImagePrimary,
    markSlugAsManual,
    resetSlugAutomation,
    sizesTopFieldArray,
    sizesBottomFieldArray,
  }
}