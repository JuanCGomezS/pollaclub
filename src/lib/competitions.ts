import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import type { Competition, CompetitionResult } from './types';

/**
 * Obtiene todas las competiciones disponibles
 */
export async function getCompetitions(): Promise<Competition[]> {
  try {
    const competitionsRef = collection(db, 'competitions');
    
    // Intentar con el query completo (requiere índice compuesto)
    try {
      const competitionsQuery = query(
        competitionsRef,
        where('status', 'in', ['upcoming', 'active']),
        orderBy('startDate', 'asc')
      );
      
      const snapshot = await getDocs(competitionsQuery);
      const competitions: Competition[] = [];
      
      snapshot.forEach((doc) => {
        competitions.push({ id: doc.id, ...doc.data() } as Competition);
      });
      
      return competitions;
    } catch (indexError: any) {
      // Si falla por falta de índice, intentar sin orderBy y ordenar manualmente
      const competitionsQuery = query(
        competitionsRef,
        where('status', 'in', ['upcoming', 'active'])
      );
      
      const snapshot = await getDocs(competitionsQuery);
      const competitions: Competition[] = [];
      
      snapshot.forEach((doc) => {
        competitions.push({ id: doc.id, ...doc.data() } as Competition);
      });
      
      // Ordenar manualmente por fecha de inicio
      competitions.sort((a, b) => {
        const aDate = a.startDate?.toMillis() || 0;
        const bDate = b.startDate?.toMillis() || 0;
        return aDate - bDate;
      });
      
      return competitions;
    }
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener competiciones');
  }
}

/**
 * Obtiene una competición por ID
 */
export async function getCompetition(competitionId: string): Promise<Competition | null> {
  try {
    const competitionRef = doc(db, 'competitions', competitionId);
    const competitionDoc = await getDoc(competitionRef);
    
    if (!competitionDoc.exists()) {
      return null;
    }
    
    return { id: competitionDoc.id, ...competitionDoc.data() } as Competition;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener competición');
  }
}

/**
 * Obtiene los resultados oficiales de una competición (ganador, subcampeón, etc.)
 * Ruta: competitions/{competitionId}/results/main
 */
export async function getCompetitionResults(competitionId: string): Promise<CompetitionResult | null> {
  try {
    const resultsRef = doc(db, 'competitions', competitionId, 'results', 'main');
    const resultsDoc = await getDoc(resultsRef);
    if (!resultsDoc.exists()) return null;
    return { id: resultsDoc.id, ...resultsDoc.data() } as CompetitionResult;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener resultados de competición');
  }
}

/**
 * Guarda o actualiza los resultados oficiales de la competición (ganador, subcampeón, etc.).
 */
export async function setCompetitionResults(
  competitionId: string,
  data: {
    winner?: string;
    runnerUp?: string;
    thirdPlace?: string;
    topScorer?: string;
    topAssister?: string;
    isLocked?: boolean;
  }
): Promise<void> {
  const resultsRef = doc(db, 'competitions', competitionId, 'results', 'main');
  const existing = await getDoc(resultsRef);
  const now = serverTimestamp();
  if (existing.exists()) {
    await updateDoc(resultsRef, { ...data, updatedAt: now });
  } else {
    await setDoc(resultsRef, {
      id: 'main',
      competitionId,
      ...data,
      isLocked: data.isLocked ?? false,
      updatedAt: now
    });
  }
}
