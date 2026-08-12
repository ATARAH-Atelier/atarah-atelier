import type { ProductFormValues } from '../../../types/database'
import { z } from 'zod'

const productSizeSchema = z
  .object({
    id: z.string().optional(),
    price_adjustment: z.coerce.number(),
    product_id: z.string().optional(),
    size: z.string().trim().min(1, 'La talla es obligatoria.').max(50, 'La talla es muy larga.'),
  })
  .refine((value) => value.price_adjustment >= -9999, {
    message: 'El ajuste de precio no es válido.',
    path: ['price_adjustment'],
  })

const productColorSchema = z.object({
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Usa un color hexadecimal válido.'),
  color_name: z.string().trim().min(1, 'El nombre del color es obligatorio.').max(80, 'El nombre del color es muy largo.'),
  id: z.string().optional(),
  price_adjustment: z.coerce.number(),
  product_id: z.string().optional(),
})

const productImageSchema = z.object({
  color_name: z.string().trim().max(80, 'El color asociado es muy largo.').nullable().optional(),
  file: z.custom<File | undefined>((value) => value === undefined || value instanceof File).optional(),
  id: z.string().optional(),
  image_url: z.string().min(1, 'La imagen es obligatoria.'),
  isNew: z.boolean().optional(),
  markedForDeletion: z.boolean().optional(),
  storage_path: z.string().nullable().optional(),
})

export const productFormSchema = z
  .object({
    base_price: z.coerce.number().min(0, 'El precio base debe ser mayor o igual a 0.'),
    category: z.string().trim().min(1, 'La categoría es obligatoria.').max(120, 'La categoría es muy larga.'),
    category_id: z.string().trim().min(1, 'Selecciona una categoría.'),
    colors: z.array(productColorSchema),
    description: z.string().max(3000, 'La descripción es demasiado larga.'),
    estimated_days: z.coerce.number().int('Usa un número entero de días.').min(1, 'El tiempo estimado mínimo es 1 día.').max(365, 'El tiempo estimado máximo es 365 días.'),
    images: z.array(productImageSchema).max(20, 'Solo puedes subir hasta 20 imágenes.'),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(150, 'El nombre no puede superar 150 caracteres.'),
    sizes_top: z.array(productSizeSchema),
    sizes_bottom: z.array(productSizeSchema),
    slug: z.string().trim().min(1, 'El enlace es obligatorio.').max(180, 'El enlace es demasiado largo.').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa solo minúsculas, números y guiones.'),
  })
  .superRefine((values, context) => {
    // Validación de tallas superiores
    const sizeTopSet = new Set<string>()
    values.sizes_top.forEach((size, index) => {
      const normalizedSize = size.size.trim().toLowerCase()
      if (sizeTopSet.has(normalizedSize)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No repitas tallas de blusa.',
          path: ['sizes_top', index, 'size'],
        })
      }
      sizeTopSet.add(normalizedSize)
      if (values.base_price + size.price_adjustment < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El precio final no puede ser negativo.',
          path: ['sizes_top', index, 'price_adjustment'],
        })
      }
    })

    // Validación de tallas inferiores
    const sizeBottomSet = new Set<string>()
    values.sizes_bottom.forEach((size, index) => {
      const normalizedSize = size.size.trim().toLowerCase()
      if (sizeBottomSet.has(normalizedSize)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No repitas tallas de pantalón.',
          path: ['sizes_bottom', index, 'size'],
        })
      }
      sizeBottomSet.add(normalizedSize)
      if (values.base_price + size.price_adjustment < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El precio final no puede ser negativo.',
          path: ['sizes_bottom', index, 'price_adjustment'],
        })
      }
    })

    // Validación de colores (se mantiene igual)
    const colorSet = new Set<string>()
    values.colors.forEach((color, index) => {
      const normalizedColor = color.color_name.trim().toLowerCase()
      if (colorSet.has(normalizedColor)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No repitas colores.',
          path: ['colors', index, 'color_name'],
        })
      }
      colorSet.add(normalizedColor)
      if (values.base_price + color.price_adjustment < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El precio final no puede ser negativo.',
          path: ['colors', index, 'price_adjustment'],
        })
      }
    })
  })

export const emptyProductFormValues: ProductFormValues = {
  base_price: 0,
  category: '',
  category_id: '',
  colors: [],
  description: '',
  estimated_days: 7,
  images: [],
  is_active: true,
  is_featured: false,
  name: '',
  sizes_top: [],
  sizes_bottom: [],
  slug: '',
}