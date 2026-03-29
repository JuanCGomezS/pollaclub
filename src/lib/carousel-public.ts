import fs from 'node:fs';
import path from 'node:path';

export type CarouselSlide = { src: string; alt: string };

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg)$/i;

export function getCarouselSlidesFromPublic(cwd: string = process.cwd()): CarouselSlide[] {
  const dir = path.join(cwd, 'public', 'carousel');
  try {
    if (!fs.existsSync(dir)) return [];
    const names = fs.readdirSync(dir);
    return names
      .filter((n) => IMAGE_EXT.test(n) && !n.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((n) => ({
        src: `carousel/${n}`,
        alt: `Promoción PollaClub — ${n.replace(/\.[^.]+$/, '')}`,
      }));
  } catch {
    return [];
  }
}
