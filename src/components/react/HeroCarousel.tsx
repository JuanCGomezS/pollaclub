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
        <div className="relative w-full bg-black md:aspect-[2/1] md:min-h-[240px] md:max-h-[min(70vh,720px)]">
          {slides.map((slide, i) => {
            const isActive = i === safeIndex;
            return (
            <div
              key={`${slide.src}-${i}`}
              className={`bg-black transition-opacity duration-700 ease-out ${
                isActive ? 'z-[1] opacity-100' : 'z-0 opacity-0 pointer-events-none'
              } ${isActive ? 'max-md:relative max-md:w-full' : 'max-md:absolute max-md:inset-0'} md:absolute md:inset-0`}
              aria-hidden={!isActive}
            >
              <img
                src={resolveUrl(slide.src)}
                alt={slide.alt}
                className={
                  isActive
                    ? 'block h-auto w-full md:h-full md:object-cover'
                    : 'block h-full w-full object-cover'
                }
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent"
                aria-hidden
              />
            </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-1 top-1/2 z-[2] flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md px-1 text-3xl font-light leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--pc-accent)] md:left-3 md:text-4xl"
              aria-label="Anterior"
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-1 top-1/2 z-[2] flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md px-1 text-3xl font-light leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--pc-accent)] md:right-3 md:text-4xl"
              aria-label="Siguiente"
            >
              <span aria-hidden>›</span>
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
