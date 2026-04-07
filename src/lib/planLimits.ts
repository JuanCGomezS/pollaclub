import type { Group, Match } from './types';

export const FREE_PLAN_CODE = 'free_3_matches';

/** Plan free: `maxMatchNumber` es cantidad de partidos de la prueba (p. ej. 3), no un tope de índice. */
export function isFreeSlotPlan(group: Pick<Group, 'planCode' | 'maxMatchNumber'>): boolean {
  return group.planCode === FREE_PLAN_CODE && Number(group.maxMatchNumber || 0) > 0;
}

export function getFreeSlotCount(group: Pick<Group, 'planCode' | 'maxMatchNumber'>): number {
  return isFreeSlotPlan(group) ? Number(group.maxMatchNumber || 0) : 0;
}

/**
 * Partidos que entran en la prueba gratuita (una sola vez): los N primeros `scheduled` por `matchNumber`.
 * Si hay menos de N programados, se guardan los que haya.
 */
export function computeFreeMatchIds(matches: Match[], slotCount: number): string[] {
  if (slotCount <= 0) return [];
  return matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .slice(0, slotCount)
    .map((m) => m.id);
}
