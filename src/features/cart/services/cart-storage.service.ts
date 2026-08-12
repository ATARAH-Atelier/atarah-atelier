import { z } from 'zod'

export const cartItemSchema = z.object({
  basePrice: z.number(),
  bottomSizeAdjustment: z.number(),
  cartItemId: z.string(),
  colorAdjustment: z.number(),
  customerNotes: z.string(),
  estimatedDays: z.number(),
  imageUrl: z.string().nullable(),
  lineTotal: z.number(),
  name: z.string(),
  productId: z.string(),
  quantity: z.number().int().min(1).max(20),
  selectedBottomSize: z.string().nullable(),
  selectedBottomSizeId: z.string().nullable(),
  selectedColor: z.string().nullable(),
  selectedColorHex: z.string().nullable(),
  selectedColorId: z.string().nullable(),
  selectedTopSize: z.string().nullable(),
  selectedTopSizeId: z.string().nullable(),
  slug: z.string(),
  topSizeAdjustment: z.number(),
  unitPrice: z.number(),
})

export const storedCartSchema = z.object({
  items: z.array(cartItemSchema),
  version: z.literal(1),
})
