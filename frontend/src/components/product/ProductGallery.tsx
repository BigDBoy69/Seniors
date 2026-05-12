import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Props {
  images: string[]
  name: string
}

// Mobile-only simple gallery with lightbox.
// Desktop gallery is handled directly in ProductPage via scroll math.
export function ProductGallery({ images, name }: Props) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const hasMany = images.length > 1

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === 0 ? images.length - 1 : i - 1))
      if (e.key === 'ArrowRight') setLightboxIndex(i => (i === images.length - 1 ? 0 : i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, images.length])

  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  if (!images.length) return null

  return (
    <>
      <div className="relative">
        <div
          className="relative overflow-hidden bg-cream-200 cursor-zoom-in group"
          style={{ aspectRatio: '4/5' }}
          onClick={() => { setLightboxIndex(active); setLightboxOpen(true) }}
        >
          <img
            src={images[active]}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            draggable={false}
          />
          {hasMany && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setActive(i => (i === 0 ? images.length - 1 : i - 1)) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-cream/50 hover:text-cream transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} strokeWidth={1} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setActive(i => (i === images.length - 1 ? 0 : i + 1)) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-cream/50 hover:text-cream transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={20} strokeWidth={1} />
              </button>
            </>
          )}
        </div>
        {hasMany && (
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="w-1.5 h-1.5 rounded-full focus:outline-none"
                style={{ background: i === active ? 'rgba(248,244,238,0.7)' : 'rgba(248,244,238,0.2)' }}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(12,10,9,0.98)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — image gallery`}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-8 text-cream/30 hover:text-cream/90 transition-colors duration-200 z-10"
            aria-label="Close gallery"
          >
            <X size={20} strokeWidth={0.8} />
          </button>
          {hasMany && (
            <div className="absolute top-6 left-8 text-2xs font-sans tracking-[0.2em] text-cream/20 select-none">
              {String(lightboxIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </div>
          )}
          <div className="flex-1 flex items-center justify-center px-8 lg:px-20 py-12 relative">
            {hasMany && (
              <>
                <button
                  onClick={() => setLightboxIndex(i => (i === 0 ? images.length - 1 : i - 1))}
                  className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 text-cream/15 hover:text-cream/70 transition-colors duration-200 p-4 select-none"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} strokeWidth={0.6} />
                </button>
                <button
                  onClick={() => setLightboxIndex(i => (i === images.length - 1 ? 0 : i + 1))}
                  className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 text-cream/15 hover:text-cream/70 transition-colors duration-200 p-4 select-none"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} strokeWidth={0.6} />
                </button>
              </>
            )}
            <div className="relative w-full h-full flex items-center justify-center">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${name} — ${i + 1}`}
                  className="absolute object-contain select-none"
                  style={{
                    opacity: i === lightboxIndex ? 1 : 0,
                    transition: 'opacity 280ms ease-out',
                    maxHeight: '85vh',
                    maxWidth: 'min(70vw, 800px)',
                    width: 'auto',
                    height: 'auto',
                  }}
                  draggable={false}
                />
              ))}
            </div>
          </div>
          {hasMany && (
            <div className="flex items-end justify-center gap-2 pb-10 px-8 flex-shrink-0">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="relative flex-shrink-0 focus:outline-none"
                  aria-label={`View image ${i + 1}`}
                >
                  <div style={{ width: 44, height: 56 }} className="overflow-hidden">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ opacity: lightboxIndex === i ? 0.9 : 0.25, transition: 'opacity 250ms ease-out' }}
                      draggable={false}
                    />
                  </div>
                  <div
                    className="absolute -bottom-1.5 left-0 right-0 h-px"
                    style={{
                      background: lightboxIndex === i ? 'rgba(248,244,238,0.5)' : 'transparent',
                      transition: 'background 250ms ease-out',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
