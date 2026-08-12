import { Expand, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '../ui/Button'

export function ProductGallery({
  fallbackImage,
  images,
  productName,
  selectedColorName,
}: {
  fallbackImage: string | null
  images: Array<{ color_name?: string | null; image_url: string }>
  productName: string
  selectedColorName?: string | null
}) {
  const galleryImages = useMemo(() => {
    if (!images.length) {
      return fallbackImage ? [{ image_url: fallbackImage }] : []
    }

    if (!selectedColorName) {
      return images
    }

    const exactMatchImages = images.filter((image) => image.color_name === selectedColorName)
    const genericImages = images.filter((image) => !image.color_name)

    if (exactMatchImages.length) {
      return [...exactMatchImages, ...genericImages]
    }

    return genericImages.length ? genericImages : images
  }, [fallbackImage, images, selectedColorName])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const selectedImage = galleryImages[selectedIndex]?.image_url ?? null

  useEffect(() => {
    setSelectedIndex(0)
  }, [selectedColorName])

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[2rem] border border-atarah-gold-300/70 bg-white shadow-sm">
          <div className="relative aspect-[4/4.7] bg-atarah-cream-100">
            {selectedImage ? (
              <>
                <img
                  src={selectedImage}
                  alt={`Vista principal de ${productName}`}
                  className="h-full w-full cursor-zoom-in object-cover object-top transition hover:scale-[1.02]"
                  onClick={() => setIsZoomOpen(true)}
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/20 to-transparent p-4">
                  <Button
                    size="sm"
                    className="rounded-full"
                    leftIcon={<Expand className="size-4" aria-hidden="true" />}
                    onClick={() => setIsZoomOpen(true)}
                  >
                    Ampliar foto
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-atarah-charcoal-600">
                Imagen disponible pr?ximamente.
              </div>
            )}
          </div>
        </div>
        {galleryImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-3">
            {galleryImages.map((image, index) => (
              <button
                key={`${image.image_url}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="overflow-hidden rounded-2xl border border-atarah-gold-300/70 bg-white"
              >
                <img
                  src={image.image_url}
                  alt={`Miniatura ${index + 1} de ${productName}`}
                  className="aspect-square h-full w-full object-cover object-top"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isZoomOpen && selectedImage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-atarah-wine-900 shadow-sm transition hover:bg-white"
              onClick={() => setIsZoomOpen(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="max-h-[85vh] overflow-auto bg-[radial-gradient(circle_at_top,_rgba(105,33,41,0.12),_transparent_55%)] p-4 sm:p-6">
              <img
                src={selectedImage}
                alt={`Vista ampliada de ${productName}`}
                className="mx-auto max-h-[78vh] w-full rounded-[1.5rem] object-contain object-top"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
