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
import { getCompetition, getCompetitionResults } from './competitions';
import { getGroupsByCompetition } from './groups';
import type { BonusPrediction, Competition, CompetitionResult, Group } from './types';

const normalize = (s: string) => s.trim().toLowerCase();

function matchBonusValue(pred?: string, result?: string): boolean {
  if (!pred || !result) return false;
  return normalize(pred) === normalize(result);
}

type BonusKey = keyof NonNullable<BonusPrediction['pointsBreakdown']>;

const BONUS_CONFIG: { key: BonusKey; pointsKey: keyof Group['settings'] }[] = [
  { key: 'winner', pointsKey: 'pointsWinnerBonus' },
  { key: 'runnerUp', pointsKey: 'pointsRunnerUp' },
  { key: 'thirdPlace', pointsKey: 'pointsThirdPlace' },
  { key: 'topScorer', pointsKey: 'pointsTopScorer' },
  { key: 'topAssister', pointsKey: 'pointsTopAssister' }
];

/**
 * Calcula los puntos bonus de un pronóstico según los resultados oficiales y la configuración del grupo.
 */
export function calculateBonusPoints(
  prediction: BonusPrediction | BonusPredictionInput,
  results: CompetitionResult,
  settings: Group['settings']
): { points: number; breakdown: NonNullable<BonusPrediction['pointsBreakdown']> } {
  const breakdown = Object.fromEntries(BONUS_CONFIG.map(({ key }) => [key, 0])) as NonNullable<BonusPrediction['pointsBreakdown']>;
  let points = 0;

  for (const { key, pointsKey } of BONUS_CONFIG) {
    const result = results[key];
    const pts = settings[pointsKey] as number | undefined;
    if (!result || !pts || !matchBonusValue(prediction[key], result)) continue;
    points += pts;
    breakdown[key] = pts;
  }

  return { points, breakdown };
}

/**
 * Aplica los puntos bonus a todos los grupos de una competición.
 * Lee los resultados oficiales (competitions/{id}/results/main), recorre cada grupo,
 * calcula puntos para cada pronóstico bonus y los escribe en Firestore.
 * Es idempotente: se puede ejecutar varias veces (p. ej. si se corrigen resultados).
 */
export async function applyBonusPointsForCompetition(competitionId: string): Promise<{ groupsProcessed: number; predictionsUpdated: number }> {
  const [results, competition, groups] = await Promise.all([
    getCompetitionResults(competitionId),
    getCompetition(competitionId),
    getGroupsByCompetition(competitionId)
  ]);

  if (!results) {
    throw new Error(`No hay documento de resultados para la competición ${competitionId}. Créalo antes con setCompetitionResults.`);
  }

  const hasAnyResult = BONUS_CONFIG.some(({ key }) => results[key]);

  if (!hasAnyResult) {
    throw new Error(`Los resultados de ${competitionId} están vacíos. Establece al menos ganador, subcampeón, etc. antes de aplicar bonus.`);
  }

  let predictionsUpdated = 0;

  for (const group of groups) {
    const bonusRef = collection(db, 'groups', group.id, 'bonusPredictions');
    const snapshot = await getDocs(bonusRef);
    const settings = group.settings;

    for (const d of snapshot.docs) {
      const prediction = { id: d.id, ...d.data() } as BonusPrediction;
      const { points, breakdown } = calculateBonusPoints(prediction, results, settings);
      const ref = doc(db, 'groups', group.id, 'bonusPredictions', d.id);
      await updateDoc(ref, {
        points,
        pointsBreakdown: breakdown,
        calculatedAt: serverTimestamp()
      });
      predictionsUpdated += 1;
    }
  }

  return { groupsProcessed: groups.length, predictionsUpdated };
}

/**
 * Obtiene todos los pronósticos bonus de un grupo (para leaderboard).
 */
export async function getBonusPredictionsForGroup(groupId: string): Promise<BonusPrediction[]> {
  const bonusRef = collection(db, 'groups', groupId, 'bonusPredictions');
  const snapshot = await getDocs(bonusRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BonusPrediction));
}

/**
 * Comprueba si los pronósticos bonus están bloqueados para esta competición.
 */
export async function isBonusLocked(competitionId: string): Promise<{ isLocked: boolean; lockedAt?: Date | null }> {
  const [competition, results] = await Promise.all([getCompetition(competitionId), getCompetitionResults(competitionId)]);
  if (results?.isLocked) return { isLocked: true, lockedAt: null };
  const lockDate = competition?.bonusSettings?.bonusLockDate;
  if (lockDate?.toMillis && lockDate.toMillis() < Date.now()) return { isLocked: true, lockedAt: lockDate.toDate() };
  return { isLocked: false, lockedAt: lockDate?.toDate() ?? null };
}

/**
 * Indica si la competición tiene al menos un bonus habilitado.
 */
export function hasAnyBonus(competition: Competition): boolean {
  const s = competition?.bonusSettings;
  return Boolean(s?.hasWinner || s?.hasRunnerUp || s?.hasThirdPlace || s?.hasTopScorer || s?.hasTopAssister);
}

/**
 * Obtiene el pronóstico bonus del usuario en el grupo (documento por userId).
 */
export async function getBonusPrediction(
  groupId: string,
  userId: string
): Promise<BonusPrediction | null> {
  const bonusRef = collection(db, 'groups', groupId, 'bonusPredictions');
  const q = query(bonusRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as BonusPrediction;
}

export interface BonusPredictionInput {
  winner?: string;
  runnerUp?: string;
  thirdPlace?: string;
  topScorer?: string;
  topAssister?: string;
}

/**
 * Guarda o actualiza el pronóstico bonus del usuario.
 * Un solo documento por usuario en bonusPredictions (id = userId o doc único por userId).
 */
export async function saveBonusPrediction(
  groupId: string,
  userId: string,
  data: BonusPredictionInput
): Promise<BonusPrediction> {
  const existing = await getBonusPrediction(groupId, userId);

  if (existing) {
    const ref = doc(db, 'groups', groupId, 'bonusPredictions', existing.id);
    await updateDoc(ref, {
      userId,
      ...data,
      updatedAt: serverTimestamp()
    });
    return { ...existing, ...data } as BonusPrediction;
  }

  const bonusRef = doc(collection(db, 'groups', groupId, 'bonusPredictions'));
  await setDoc(bonusRef, {
    userId,
    ...data,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  const saved = await getDoc(bonusRef);
  return { id: saved.id, ...saved.data() } as BonusPrediction;
}
