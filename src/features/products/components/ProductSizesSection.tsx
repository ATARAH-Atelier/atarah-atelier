import { Plus, Trash2 } from 'lucide-react'
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'

import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import type { ProductFormValues } from '../../../types/database'

interface ProductSizesSectionProps {
  topFieldArray: UseFieldArrayReturn<ProductFormValues, 'sizes_top', 'id'>
  bottomFieldArray: UseFieldArrayReturn<ProductFormValues, 'sizes_bottom', 'id'>
  form: UseFormReturn<ProductFormValues>
  onAddPresetSize: (size: string, target: 'top' | 'bottom') => void
  presets: string[]
}

export function ProductSizesSection({
  topFieldArray,
  bottomFieldArray,
  form,
  onAddPresetSize,
  presets,
}: ProductSizesSectionProps) {
  const {
    formState: { errors },
    register,
  } = form

  return (
    <div className="space-y-10">
      {/* Tallas de Blusa */}
      <div className="space-y-5">
        <h3 className="font-display text-2xl font-bold text-atarah-wine-900">Tallas de Blusa</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={`top-${preset}`}
              variant="outline"
              size="sm"
              onClick={() => onAddPresetSize(preset, 'top')}
            >
              Añadir {preset}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {topFieldArray.fields.length ? (
            topFieldArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-2xl border border-atarah-gold-300/70 bg-atarah-cream-100/70 p-4 md:grid-cols-[1fr_180px_auto]"
              >
                <Input
                  id={`sizes_top.${index}.size`}
                  label={index === 0 ? 'Talla' : undefined}
                  placeholder="Ej. M"
                  error={errors.sizes_top?.[index]?.size?.message}
                  {...register(`sizes_top.${index}.size`)}
                />
                <Input
                  id={`sizes_top.${index}.price_adjustment`}
                  label={index === 0 ? 'Ajuste de precio' : undefined}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.sizes_top?.[index]?.price_adjustment?.message}
                  {...register(`sizes_top.${index}.price_adjustment`, {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    className="w-full md:w-auto"
                    leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={() => topFieldArray.remove(index)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 px-4 py-8 text-center text-sm text-atarah-charcoal-600">
              Aún no has agregado tallas de blusa.
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => topFieldArray.append({ price_adjustment: 0, size: '' })}
        >
          Agregar talla de blusa
        </Button>
      </div>

      {/* Tallas de Pantalón */}
      <div className="space-y-5">
        <h3 className="font-display text-2xl font-bold text-atarah-wine-900">Tallas de Pantalón</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={`bottom-${preset}`}
              variant="outline"
              size="sm"
              onClick={() => onAddPresetSize(preset, 'bottom')}
            >
              Añadir {preset}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {bottomFieldArray.fields.length ? (
            bottomFieldArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-2xl border border-atarah-gold-300/70 bg-atarah-cream-100/70 p-4 md:grid-cols-[1fr_180px_auto]"
              >
                <Input
                  id={`sizes_bottom.${index}.size`}
                  label={index === 0 ? 'Talla' : undefined}
                  placeholder="Ej. M"
                  error={errors.sizes_bottom?.[index]?.size?.message}
                  {...register(`sizes_bottom.${index}.size`)}
                />
                <Input
                  id={`sizes_bottom.${index}.price_adjustment`}
                  label={index === 0 ? 'Ajuste de precio' : undefined}
                  type="number"
                  step="0.01"
                  placeholder="0"
                  error={errors.sizes_bottom?.[index]?.price_adjustment?.message}
                  {...register(`sizes_bottom.${index}.price_adjustment`, {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    className="w-full md:w-auto"
                    leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={() => bottomFieldArray.remove(index)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-atarah-gold-300 bg-atarah-cream-100/70 px-4 py-8 text-center text-sm text-atarah-charcoal-600">
              Aún no has agregado tallas de pantalón.
            </div>
          )}
        </div>

        <Button
          variant="secondary"
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => bottomFieldArray.append({ price_adjustment: 0, size: '' })}
        >
          Agregar talla de pantalón
        </Button>
      </div>
    </div>
  )
}