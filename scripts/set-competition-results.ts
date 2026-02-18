/**
 * Escribe los resultados oficiales de una competición (ganador, subcampeón, etc.)
 * en Firestore: competitions/{competitionId}/results/main
 *
 * Uso:
 *   npx tsx scripts/set-competition-results.ts <competitionId> [--winner "Argentina"] [--runner-up "Francia"] [--third-place "Croacia"] [--top-scorer "Jugador"] [--top-assister "Jugador"] [--lock]
 *   npx tsx scripts/set-competition-results.ts mundial-2026 --winner "Francia" --runner-up "España" --third-place "Colombia" --top-scorer "Kylian Mbappé" --top-assister "Kevin De Bruyne"
 *   Los valores deben coincidir con lo que los usuarios eligieron (nombres de equipos/jugadores).
 *
 * Ejemplo:
 *   npx tsx scripts/set-competition-results.ts mundial-2026 --winner "Argentina" --runner-up "Francia" --third-place "Croacia" --top-scorer "Lionel Messi"
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
    console.error('❌ No se encontraron credenciales (GOOGLE_APPLICATION_CREDENTIALS o scripts/service-account-key.json).');
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount!), projectId });
  }

  const db = admin.firestore();

  function parseArgs(): { competitionId: string; winner?: string; runnerUp?: string; thirdPlace?: string; topScorer?: string; topAssister?: string; isLocked: boolean } {
    const args = process.argv.slice(2);
    const competitionId = args[0];
    if (!competitionId) {
      console.error('Uso: npx tsx scripts/set-competition-results.ts <competitionId> [--winner "X"] [--runner-up "X"] ... [--lock]');
      process.exit(1);
    }
    const result: { competitionId: string; winner?: string; runnerUp?: string; thirdPlace?: string; topScorer?: string; topAssister?: string; isLocked: boolean } = {
      competitionId,
      isLocked: false
    };
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--winner' && args[i + 1]) { result.winner = args[++i]; continue; }
      if (args[i] === '--runner-up' && args[i + 1]) { result.runnerUp = args[++i]; continue; }
      if (args[i] === '--third-place' && args[i + 1]) { result.thirdPlace = args[++i]; continue; }
      if (args[i] === '--top-scorer' && args[i + 1]) { result.topScorer = args[++i]; continue; }
      if (args[i] === '--top-assister' && args[i + 1]) { result.topAssister = args[++i]; continue; }
      if (args[i] === '--lock') { result.isLocked = true; }
    }
    return result;
  }

  async function main() {
    const { competitionId, winner, runnerUp, thirdPlace, topScorer, topAssister, isLocked } = parseArgs();
    const resultsRef = db.collection('competitions').doc(competitionId).collection('results').doc('main');
    const data: Record<string, unknown> = {
      id: 'main',
      competitionId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (winner !== undefined) data.winner = winner;
    if (runnerUp !== undefined) data.runnerUp = runnerUp;
    if (thirdPlace !== undefined) data.thirdPlace = thirdPlace;
    if (topScorer !== undefined) data.topScorer = topScorer;
    if (topAssister !== undefined) data.topAssister = topAssister;
    if (isLocked !== undefined) data.isLocked = isLocked;

    const snap = await resultsRef.get();
    if (snap.exists) {
      await resultsRef.update(data);
      console.log('✅ Resultados actualizados:', competitionId, data);
    } else {
      await resultsRef.set({ ...data, isLocked: data.isLocked ?? false });
      console.log('✅ Resultados creados:', competitionId, data);
    }
  }

  main().catch((e) => { console.error(e); process.exit(1); });

}