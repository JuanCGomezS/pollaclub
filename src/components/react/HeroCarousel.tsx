import { useCallback, useEffect, useState } from 'react';
import { getBasePath } from '../../lib/utils';
import type { CarouselSlide } from '../../lib/carousel-public';

const AUTO_MS = 10_000;

function resolveUrl(path: string): string {
  const base = getBasePath() || '/';
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`.replace(/\/+/g, '/');
}

interface HeroCarouselProps {
  slides: CarouselSlide[];
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = slides.length;
  const safeIndex = count > 0 ? index % count : 0;

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = window.setInterval(goNext, AUTO_MS);
    return () => window.clearInterval(t);
  }, [count, goNext, paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (count === 0) {
    return (
      <section
        className="w-full rounded-2xl border border-dashed border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/50 px-6 py-12 text-center"
        aria-label="Carrusel publicitario"
      >
        <p className="text-sm text-[color:var(--pc-muted)]">
          Pronto verás aquí promociones.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full" aria-label="Promociones">
      <div
        className="relative overflow-hidden rounded-2xl border border-[color:var(--pc-main-dark)]/50 bg-black shadow-xl shadow-black/50"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative aspect-[2/1] w-full min-h-[200px] max-h-[min(70vh,720px)] bg-black sm:min-h-[240px]">
          {slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              className={`absolute inset-0 bg-black transition-opacity duration-700 ease-out ${i === safeIndex ? 'z-[1] opacity-100' : 'z-0 opacity-0 pointer-events-none'
                }`}
              aria-hidden={i !== safeIndex}
            >
              <img
                src={resolveUrl(slide.src)}
                alt={slide.alt}
                className="h-full w-full object-cover object-center"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent"
                aria-hidden
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 md:left-4 md:h-12 md:w-12"
              aria-label="Anterior"
            >
              <span className="text-lg md:text-xl" aria-hidden>
                ‹
              </span>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 md:right-4 md:h-12 md:w-12"
              aria-label="Siguiente"
            >
              <span className="text-lg md:text-xl" aria-hidden>
                ›
              </span>
            </button>

            <div className="absolute bottom-3 left-0 right-0 z-[2] flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === safeIndex ? 'w-8 bg-[color:var(--pc-accent)]' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  aria-label={`Ir a slide ${i + 1}`}
                  aria-current={i === safeIndex}
                />
              ))}
            </div>

          </>
        )}
      </div>
    </section>
  );
}
