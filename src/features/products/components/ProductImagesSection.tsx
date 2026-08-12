import { ImagePlus, Star, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'

import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { formatFileSize } from '../../../lib/utils'
import type { ProductFormValues } from '../../../types/database'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 20

interface ProductImagesSectionProps {
  fieldArray: UseFieldArrayReturn<ProductFormValues, 'images', 'id'>
  form: UseFormReturn<ProductFormValues>
  onAddImage: (image: ProductFormValues['images'][number]) => boolean
  onMakePrimary: (index: number) => void
}

export function ProductImagesSection({
  fieldArray,
  form,
  onAddImage,
  onMakePrimary,
}: ProductImagesSectionProps) {
  const {
    formState: { errors },
    setError,
    clearErrors,
    setValue,
    watch,
  } = form

  const images = watch('images') ?? []
  const colors = watch('colors') ?? []

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])

    if (!files.length) {
      return
    }

    clearErrors('images')
    let currentCount = images.length

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('images', {
          message: 'Solo se permiten im?genes JPG, PNG o WEBP.',
        })
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError('images', {
          message: `Cada imagen debe pesar 5 MB o menos. Archivo recibido: ${formatFileSize(file.size)}.`,
        })
        continue
      }

      if (currentCount >= MAX_IMAGES) {
        setError('images', {
          message: 'Solo puedes subir hasta 20 imágenes.',
        })
        break
      }

      const success = onAddImage({
        color_name: null,
        file,
        image_url: URL.createObjectURL(file),
        isNew: true,
      })

      if (success) {
        currentCount += 1
      }

      if (!success) {
        setError('images', {
          message: 'Solo puedes subir hasta 20 imágenes.',
        })
        break
      }
    }

    event.target.value = ''
  }

  function handleColorBindingChange(index: number, value: string) {
    setValue(`images.${index}.color_name`, value || null, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-atarah-charcoal-900">
            Sube imágenes del producto
          </p>
          <p className="mt-1 text-sm text-atarah-charcoal-600">
            Hasta 20 imágenes, máximo 5 MB cada una. Formatos permitidos: JPG, PNG y WEBP.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-atarah-wine-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-atarah-wine-800">
          <ImagePlus className="size-4" aria-hidden="true" />
          Agregar imágenes
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFilesSelected}
          />
        </label>
      </div>

      {errors.images?.message ? (
        <p className="text-sm text-rose-700">{errors.images.message}</p>
      ) : null}

      {fieldArray.fields.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fieldArray.fields.map((field, index) => {
            const image = images[index]
            const isPrimary = index === 0

            return (
              <article
                key={field.id}
                className="overflow-hidden rounded-3xl border border-atarah-gold-300 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] overflow-hidden bg-atarah-cream-100">
                  <img
                    src={image.image_url}
                    alt={`Imagen ${index + 1} del producto`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-atarah-charcoal-900">
                        {isPrimary ? 'Imagen principal' : `Imagen ${index + 1}`}
                      </p>
                      <p className="text-xs text-atarah-charcoal-600">
                        {image.isNew ? 'Nueva imagen' : 'Imagen guardada'}
                      </p>
                    </div>
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-atarah-gold-300/70 px-3 py-1 text-xs font-semibold text-atarah-wine-950">
                        <Star className="size-3.5" aria-hidden="true" /> Principal
                      </span>
                    ) : null}
                  </div>

                  <Select
                    id={`image-color-binding-${index}`}
                    label="Color asociado"
                    value={image.color_name ?? ''}
                    onChange={(event) => handleColorBindingChange(index, event.target.value)}
                  >
                    <option value="">Todas las variantes</option>
                    {colors.map((color, colorIndex) => (
                      <option key={`${color.id ?? color.color_name}-${colorIndex}`} value={color.color_name}>
                        {color.color_name}
                      </option>
                    ))}
                  </Select>

                  <div className="flex gap-2">
                    {!isPrimary ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onMakePrimary(index)}
                      >
                        Hacer principal
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => fieldArray.remove(index)}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 px-4 py-8 text-center text-sm text-atarah-charcoal-600">
          Aún no has agregado imágenes para este producto.
        </div>
      )}
    </div>
  )
}
