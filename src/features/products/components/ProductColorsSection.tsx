import { Plus, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import type { ProductFormValues } from '../../../types/database'

interface ProductColorsSectionProps {
  fieldArray: UseFieldArrayReturn<ProductFormValues, 'colors', 'id'>
  form: UseFormReturn<ProductFormValues>
}

export function ProductColorsSection({
  fieldArray,
  form,
}: ProductColorsSectionProps) {
  const {
    formState: { errors },
    register,
    setValue,
    watch,
  } = form

  return (
    <div className="space-y-4">
      {fieldArray.fields.length ? (
        fieldArray.fields.map((field, index) => {
          const hex = watch(`colors.${index}.color_hex`) || '#692129'

          return (
            <div
              key={field.id}
              className="grid gap-4 rounded-2xl border border-atarah-gold-300/70 bg-atarah-cream-100/70 p-4 md:grid-cols-[1.1fr_150px_180px_auto]"
            >
              <Input
                id={`colors.${index}.color_name`}
                label={index === 0 ? 'Color' : undefined}
                placeholder="Ej. Vinotinto"
                error={errors.colors?.[index]?.color_name?.message}
                {...register(`colors.${index}.color_name`)}
              />

              <div>
                {index === 0 ? (
                  <label className="mb-2 block text-sm font-medium text-atarah-charcoal-900">
                    Muestra
                  </label>
                ) : null}
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-atarah-gold-300 bg-white px-3">
                  <span
                    className="size-6 rounded-full border border-atarah-gold-300"
                    style={{ backgroundColor: hex }}
                  />
                  <input
                    type="color"
                    aria-label="Seleccionar color"
                    className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                    value={hex}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setValue(`colors.${index}.color_hex`, event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              </div>

              <Input
                id={`colors.${index}.color_hex`}
                label={index === 0 ? 'Hexadecimal' : undefined}
                placeholder="#692129"
                error={errors.colors?.[index]?.color_hex?.message}
                {...register(`colors.${index}.color_hex`, {
                  onChange: (event) => {
                    const value = String(event.target.value).toUpperCase()
                    setValue(`colors.${index}.color_hex`, value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  },
                })}
              />

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end md:col-span-4 xl:col-span-1 xl:grid-cols-1">
                <Input
                  id={`colors.${index}.price_adjustment`}
                  label={index === 0 ? 'Ajuste de precio' : undefined}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.colors?.[index]?.price_adjustment?.message}
                  {...register(`colors.${index}.price_adjustment`, {
                    valueAsNumber: true,
                  })}
                />
                <Button
                  variant="ghost"
                  leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                  onClick={() => fieldArray.remove(index)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          )
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 px-4 py-8 text-center text-sm text-atarah-charcoal-600">
          Aún no has agregado colores para este producto.
        </div>
      )}

      <Button
        variant="secondary"
        leftIcon={<Plus className="size-4" aria-hidden="true" />}
        onClick={() =>
          fieldArray.append({
            color_hex: '#692129',
            color_name: '',
            price_adjustment: 0,
          })
        }
      >
        Agregar color
      </Button>
    </div>
  )
}
