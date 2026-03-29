import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import type { Match, Prediction } from './types';

/**
 * Obtiene el pronóstico de un usuario para un partido específico
 */
export async function getUserPrediction(
  groupId: string, 
  userId: string, 
  matchId: string
): Promise<Prediction | null> {
  try {
    const predictionsRef = collection(db, 'groups', groupId, 'predictions');
    const predictionsQuery = query(
      predictionsRef,
      where('userId', '==', userId),
      where('matchId', '==', matchId)
    );
    
    const snapshot = await getDocs(predictionsQuery);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Prediction;
    }
    
    return null;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener pronóstico');
  }
}

/**
 * Crea o actualiza un pronóstico
 */
export async function savePrediction(
  groupId: string,
  userId: string,
  matchId: string,
  team1Score: number,
  team2Score: number
): Promise<void> {
  try {
    // Obtener el grupo para acceder a competitionId
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      throw new Error('Grupo no encontrado');
    }
    
    const group = groupDoc.data() as any;
    const competitionId = group.competitionId;
    
    // Verificar que el partido esté en estado "scheduled"
    const matchRef = doc(db, 'competitions', competitionId, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      throw new Error('Partido no encontrado');
    }
    
    const match = matchDoc.data() as Match;
    
    if (match.status !== 'scheduled') {
      throw new Error('No se puede hacer pronóstico: el partido ya inició o finalizó');
    }

    // Validación preventiva para planes con límite por número de partido (ej: free trial)
    const maxMatchNumber = Number(group.maxMatchNumber || 0);
    if (maxMatchNumber > 0 && match.matchNumber > maxMatchNumber) {
      throw new Error(
        `Tu plan actual permite pronosticar hasta el partido ${maxMatchNumber}. Actualiza tu plan para continuar.`
      );
    }
    
    // Verificar si ya existe un pronóstico
    const existingPrediction = await getUserPrediction(groupId, userId, matchId);
    
    const predictionData = {
      userId,
      matchId,
      team1Score,
      team2Score,
      submittedAt: serverTimestamp()
    };
    
    if (existingPrediction) {
      // Actualizar pronóstico existente
      const predictionRef = doc(db, 'groups', groupId, 'predictions', existingPrediction.id);
      await updateDoc(predictionRef, predictionData);
    } else {
      // Crear nuevo pronóstico
      const predictionsRef = collection(db, 'groups', groupId, 'predictions');
      const predictionRef = doc(predictionsRef);
      await setDoc(predictionRef, predictionData);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Error al guardar pronóstico');
  }
}

/**
 * Obtiene todos los pronósticos de un partido en un grupo
 */
export async function getMatchPredictions(
  groupId: string, 
  matchId: string
): Promise<Prediction[]> {
  try {
    const predictionsRef = collection(db, 'groups', groupId, 'predictions');
    const predictionsQuery = query(
      predictionsRef,
      where('matchId', '==', matchId)
    );
    
    const snapshot = await getDocs(predictionsQuery);
    const predictions: Prediction[] = [];
    
    snapshot.forEach((doc) => {
      predictions.push({ id: doc.id, ...doc.data() } as Prediction);
    });
    
    // Ordenar por puntos (descendente) si están calculados
    return predictions.sort((a, b) => {
      const pointsA = a.points || 0;
      const pointsB = b.points || 0;
      return pointsB - pointsA;
    });
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener pronósticos del partido');
  }
}

/**
 * Obtiene todos los pronósticos de un usuario en un grupo
 */
export async function getUserPredictions(
  groupId: string, 
  userId: string
): Promise<Prediction[]> {
  try {
    const predictionsRef = collection(db, 'groups', groupId, 'predictions');
    const predictionsQuery = query(
      predictionsRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(predictionsQuery);
    const predictions: Prediction[] = [];
    
    snapshot.forEach((doc) => {
      predictions.push({ id: doc.id, ...doc.data() } as Prediction);
    });
    
    return predictions;
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener pronósticos del usuario');
  }
}
