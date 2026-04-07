import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Match, MatchStatus } from './types';

/**
 * Obtiene todos los partidos de una competición
 */
export async function getMatchesByCompetition(competitionId: string): Promise<Match[]> {
  try {
    const matchesRef = collection(db, 'competitions', competitionId, 'matches');
    const matchesQuery = query(
      matchesRef,
      orderBy('scheduledTime', 'asc')
    );

    const snapshot = await getDocs(matchesQuery);
    const result: Match[] = [];

    snapshot.forEach((d) => {
      result.push({ id: d.id, ...d.data() } as Match);
    });

    return result;
  } catch (error: any) {
    // Si falla por falta de índice, intentar sin orderBy
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      try {
        const matchesRef = collection(db, 'competitions', competitionId, 'matches');
        const matchesQuery = query(
          matchesRef
        );

        const snapshot = await getDocs(matchesQuery);
        const result: Match[] = [];

        snapshot.forEach((d) => {
          result.push({ id: d.id, ...d.data() } as Match);
        });

        // Ordenar manualmente
        result.sort((a, b) => {
          const aTime = a.scheduledTime?.toMillis?.() ?? 0;
          const bTime = b.scheduledTime?.toMillis?.() ?? 0;
          return aTime - bTime;
        });

        return result;
      } catch (fallbackError: any) {
        throw new Error(fallbackError.message || 'Error al obtener partidos');
      }
    }
    throw new Error(error.message || 'Error al obtener partidos');
  }
}

/**
 * Obtiene partidos de una competición filtrados por estado
 */
export async function getMatchesByCompetitionAndStatus(
  competitionId: string,
  status: MatchStatus
): Promise<Match[]> {
  try {
    const matchesRef = collection(db, 'competitions', competitionId, 'matches');
    const matchesQuery = query(
      matchesRef,
      where('status', '==', status),
      orderBy('scheduledTime', 'asc')
    );

    const snapshot = await getDocs(matchesQuery);
    const result: Match[] = [];

    snapshot.forEach((d) => {
      result.push({ id: d.id, ...d.data() } as Match);
    });

    return result;
  } catch (error: any) {
    try {
      const matchesRef = collection(db, 'competitions', competitionId, 'matches');
      const matchesQuery = query(
        matchesRef,
        where('status', '==', status)
      );

      const snapshot = await getDocs(matchesQuery);
      const result: Match[] = [];

      snapshot.forEach((d) => {
        result.push({ id: d.id, ...d.data() } as Match);
      });

      result.sort((a, b) => {
        const aTime = a.scheduledTime?.toMillis?.() ?? 0;
        const bTime = b.scheduledTime?.toMillis?.() ?? 0;
        return aTime - bTime;
      });

      return result;
    } catch (fallbackError: any) {
      throw new Error(fallbackError.message || 'Error al obtener partidos');
    }
  }
}

/**
 * Obtiene un partido por ID
 */
export async function getMatch(competitionId: string, matchId: string): Promise<Match | null> {
  try {
    const matchRef = doc(db, 'competitions', competitionId, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);

    if (!matchDoc.exists()) {
      return null;
    }

    return { id: matchDoc.id, ...matchDoc.data() } as Match;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener partido');
  }
}

/**
 * Filtra partidos próximos (scheduled y scheduledTime > now)
 */
export function filterUpcomingMatches(matches: Match[]): Match[] {
  const now = Timestamp.now();
  return matches.filter(
    (m) =>
      m.status === 'scheduled' &&
      m.scheduledTime &&
      (m.scheduledTime as Timestamp).toMillis?.() > now.toMillis()
  );
}

/**
 * Filtra partidos en curso (status === 'live')
 */
export function filterLiveMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.status === 'live');
}

/**
 * Filtra partidos finalizados (status === 'finished')
 */
export function filterFinishedMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.status === 'finished');
}

export type MatchSortByTime = 'asc' | 'desc';

/** Orden por `scheduledTime`: asc = más antiguos primero, desc = más recientes primero. */
export function sortMatchesByScheduledTime(matches: Match[], direction: MatchSortByTime): Match[] {
  const mult = direction === 'asc' ? 1 : -1;
  return [...matches].sort((a, b) => {
    const aTime = a.scheduledTime?.toMillis?.() ?? 0;
    const bTime = b.scheduledTime?.toMillis?.() ?? 0;
    return mult * (aTime - bTime);
  });
}

export interface MatchDayGroup {
  dayKey: string;
  heading: string;
  matches: Match[];
}

function capitalizeEsWord(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** YYYY-MM-DD en hora local (mismo criterio que `timestamp.toDate()` en la UI). */
export function getMatchLocalDayKey(match: Match): string | null {
  const ts = match.scheduledTime;
  if (!ts || typeof (ts as Timestamp).toDate !== 'function') return null;
  const d = (ts as Timestamp).toDate();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Título tipo «Martes 7 de abril de 2026». */
export function formatMatchDayHeading(match: Match): string {
  const ts = match.scheduledTime;
  if (!ts || typeof (ts as Timestamp).toDate !== 'function') return '';
  const d = (ts as Timestamp).toDate();
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(d);
  const month = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(d);
  const dayNum = d.getDate();
  const year = d.getFullYear();
  return `${capitalizeEsWord(weekday)} ${dayNum} de ${capitalizeEsWord(month)} de ${year}`;
}

/**
 * Agrupa por día local manteniendo el orden de la lista (orden del tab: asc/desc).
 */
export function groupMatchesByLocalDayPreservingOrder(matches: Match[]): MatchDayGroup[] {
  const order: string[] = [];
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = getMatchLocalDayKey(m);
    if (!key) continue;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(m);
  }
  return order.map((dayKey) => {
    const mlist = map.get(dayKey)!;
    return {
      dayKey,
      heading: formatMatchDayHeading(mlist[0]),
      matches: mlist
    };
  });
}
