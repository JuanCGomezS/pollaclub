/**
 * Aplica los puntos bonus a todos los grupos de una competición.
 * Lee los resultados oficiales (competitions/{id}/results/main), recorre cada grupo,
 * calcula puntos para cada pronóstico bonus y los escribe en Firestore.
 *
 * Debes haber llamado antes a set-competition-results.ts con ganador, subcampeón, etc.
 *
 * Uso: npx tsx scripts/apply-bonus-points.ts <competitionId>
 * Ejemplo: npx tsx scripts/apply-bonus-points.ts mundial-2026
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function matchBonusValue(pred?: string, result?: string): boolean {
  if (pred == null || result == null || pred === '' || result === '') return false;
  return pred.trim().toLowerCase() === result.trim().toLowerCase();
}

function calculateBonusPoints(
  prediction: { winner?: string; runnerUp?: string; thirdPlace?: string; topScorer?: string; topAssister?: string },
  results: { winner?: string; runnerUp?: string; thirdPlace?: string; topScorer?: string; topAssister?: string },
  settings: { pointsWinnerBonus?: number; pointsRunnerUp?: number; pointsThirdPlace?: number; pointsTopScorer?: number; pointsTopAssister?: number }
): { points: number; breakdown: { winner: number; runnerUp: number; thirdPlace: number; topScorer: number; topAssister: number } } {
  const breakdown = { winner: 0, runnerUp: 0, thirdPlace: 0, topScorer: 0, topAssister: 0 };
  let points = 0;
  if (results.winner != null && results.winner !== '' && settings.pointsWinnerBonus && matchBonusValue(prediction.winner, results.winner)) {
    points += settings.pointsWinnerBonus; breakdown.winner = settings.pointsWinnerBonus;
  }
  if (results.runnerUp != null && results.runnerUp !== '' && settings.pointsRunnerUp && matchBonusValue(prediction.runnerUp, results.runnerUp)) {
    points += settings.pointsRunnerUp; breakdown.runnerUp = settings.pointsRunnerUp;
  }
  if (results.thirdPlace != null && results.thirdPlace !== '' && settings.pointsThirdPlace && matchBonusValue(prediction.thirdPlace, results.thirdPlace)) {
    points += settings.pointsThirdPlace; breakdown.thirdPlace = settings.pointsThirdPlace;
  }
  if (results.topScorer != null && results.topScorer !== '' && settings.pointsTopScorer && matchBonusValue(prediction.topScorer, results.topScorer)) {
    points += settings.pointsTopScorer; breakdown.topScorer = settings.pointsTopScorer;
  }
  if (results.topAssister != null && results.topAssister !== '' && settings.pointsTopAssister && matchBonusValue(prediction.topAssister, results.topAssister)) {
    points += settings.pointsTopAssister; breakdown.topAssister = settings.pointsTopAssister;
  }
  return { points, breakdown };
}

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectId = process.env.PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('❌ PUBLIC_FIREBASE_PROJECT_ID is missing.');
  process.exit(1);
}

let serviceAccount: admin.ServiceAccount | null = null;
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credPath) {
  try {
    serviceAccount = JSON.parse(readFileSync(credPath, 'utf8')) as admin.ServiceAccount;
  } catch {
    //
  }
}
if (!serviceAccount) {
  try {
    serviceAccount = JSON.parse(readFileSync(join(__dirname, 'service-account-key.json'), 'utf8')) as admin.ServiceAccount;
  } catch {
    console.error('❌ No se encontraron credenciales.');
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount!), projectId });
  }

  const db = admin.firestore();

  async function getCompetitionResults(competitionId: string) {
    const ref = db.collection('competitions').doc(competitionId).collection('results').doc('main');
    const snap = await ref.get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return {
      id: 'main',
      competitionId,
      winner: d.winner,
      runnerUp: d.runnerUp,
      thirdPlace: d.thirdPlace,
      topScorer: d.topScorer,
      topAssister: d.topAssister,
      isLocked: d.isLocked ?? false,
      updatedAt: d.updatedAt
    };
  }

  async function getGroupsByCompetition(competitionId: string) {
    const snap = await db.collection('groups').where('competitionId', '==', competitionId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; settings: { pointsWinnerBonus?: number; pointsRunnerUp?: number; pointsThirdPlace?: number; pointsTopScorer?: number; pointsTopAssister?: number } }));
  }

  async function main() {
    const competitionId = process.argv[2];
    if (!competitionId) {
      console.error('Uso: npx tsx scripts/apply-bonus-points.ts <competitionId>');
      process.exit(1);
    }

    const results = await getCompetitionResults(competitionId);
    if (!results) {
      console.error('❌ No hay documento de resultados. Ejecuta antes: npx tsx scripts/set-competition-results.ts', competitionId, '--winner "..." --runner-up "..." ...');
      process.exit(1);
    }

    const hasAny =
      (results.winner != null && results.winner !== '') ||
      (results.runnerUp != null && results.runnerUp !== '') ||
      (results.thirdPlace != null && results.thirdPlace !== '') ||
      (results.topScorer != null && results.topScorer !== '') ||
      (results.topAssister != null && results.topAssister !== '');
    if (!hasAny) {
      console.error('❌ Los resultados están vacíos. Establece al menos ganador/subcampeón/etc. con set-competition-results.ts');
      process.exit(1);
    }

    const groups = await getGroupsByCompetition(competitionId);
    let predictionsUpdated = 0;

    for (const group of groups) {
      const bonusSnap = await db.collection('groups').doc(group.id).collection('bonusPredictions').get();
      const settings = group.settings;

      for (const d of bonusSnap.docs) {
        const prediction = { id: d.id, ...d.data() } as { winner?: string; runnerUp?: string; thirdPlace?: string; topScorer?: string; topAssister?: string };
        const { points, breakdown } = calculateBonusPoints(prediction, results, settings);
        await db.collection('groups').doc(group.id).collection('bonusPredictions').doc(d.id).update({
          points,
          pointsBreakdown: breakdown,
          calculatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        predictionsUpdated++;
      }
    }

    console.log('✅ Bonus aplicados:', competitionId, '| Grupos:', groups.length, '| Pronósticos actualizados:', predictionsUpdated);
  }

  main().catch((e) => { console.error(e); process.exit(1); });
}