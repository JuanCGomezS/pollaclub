/**
 * Actualiza (upsert) jugadores destacados para Champions.
 *
 * - Lee equipos existentes en `competitions/{competitionId}/teams`
 * - Escribe jugadores en `competitions/{competitionId}/players`
 * - Opcionalmente elimina jugadores no incluidos (prune)
 *
 * Uso:
 *   npx tsx scripts/update-champions-players.ts
 *   npx tsx scripts/update-champions-players.ts --competitionId=uefa-champions-2026
 *   npx tsx scripts/update-champions-players.ts --dry-run
 *   npx tsx scripts/update-champions-players.ts --prune
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==============================
// Configuración Firebase Admin
// ==============================
const projectId = process.env.PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('❌ Error: PUBLIC_FIREBASE_PROJECT_ID is missing. Please check your .env file.');
  process.exit(1);
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let serviceAccount: any = null;

if (serviceAccountPath) {
  try {
    const fileContent = readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log('✅ Usando credenciales de servicio desde GOOGLE_APPLICATION_CREDENTIALS');
  } catch {
    console.warn('⚠️  No se pudo cargar el archivo de credenciales desde GOOGLE_APPLICATION_CREDENTIALS');
  }
}

if (!serviceAccount) {
  try {
    const keyPath = join(__dirname, 'service-account-key.json');
    const fileContent = readFileSync(keyPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log('✅ Usando credenciales de servicio desde scripts/service-account-key.json');
  } catch {
    console.error('❌ Error: No se encontraron credenciales de servicio.');
    console.error('   Configura GOOGLE_APPLICATION_CREDENTIALS o coloca service-account-key.json en scripts/');
    process.exit(1);
  }
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId
  });
}

const db = admin.firestore();

// ==============================
// CLI args
// ==============================
function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const s = raw.slice(2);
    const eq = s.indexOf('=');
    if (eq === -1) {
      args[s] = true;
      continue;
    }
    args[s.slice(0, eq)] = s.slice(eq + 1);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const competitionId =
  (typeof args.competitionId === 'string' && args.competitionId) || 'uefa-champions-2026';
const dryRun = args['dry-run'] === true || args.dryRun === true;
const prune = args.prune === true;

// ==============================
// Datos de jugadores
// ==============================
interface ChampionsPlayer {
  name: string;
  teamName: string;
  position: string;
}

// Nota: normalizamos `teamName` y deduplicamos por `name` para evitar entradas repetidas.
const CHAMPIONS_PLAYERS_RAW: ChampionsPlayer[] = [
  { name: 'Kylian Mbappé', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Anthony Gordon', teamName: 'Newcastle United', position: 'Delantero' },
  { name: 'Harry Kane', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Julián Álvarez', teamName: 'Atlético de Madrid', position: 'Delantero' },
  { name: 'Erling Haaland', teamName: 'Manchester City', position: 'Delantero' },
  { name: 'Khvicha Kvaratskhelia', teamName: 'Paris Saint-Germain', position: 'Delantero' },
  { name: 'Victor Osimhen', teamName: 'Galatasaray', position: 'Delantero' },
  { name: 'Vitinha', teamName: 'Paris Saint-Germain', position: 'Delantero' },
  { name: 'Jens Petter Hauge', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Harvey Barnes', teamName: 'Newcastle United', position: 'Delantero' },
  { name: 'Fermín López', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Gabriel Martinelli', teamName: 'Arsenal', position: 'Delantero' },
  { name: 'Vinícius Júnior', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Kasper Høgh', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Alexander Sørloth', teamName: 'Atlético de Madrid', position: 'Delantero' },
  { name: 'Dominik Szoboszlai', teamName: 'Liverpool', position: 'Delantero' },
  { name: 'Folarin Balogun', teamName: 'AS Mónaco', position: 'Delantero' },
  { name: 'Luis Suárez', teamName: 'Sporting CP', position: 'Delantero' },
  { name: 'Camilo Durán', teamName: 'FK Qarabag', position: 'Delantero' },
  { name: 'Marcus Rashford', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Lamine Yamal', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Gorka Guruzeta', teamName: 'Athletic Club', position: 'Delantero' },
  { name: 'Alejandro Grimaldo', teamName: 'Bayer Leverkusen', position: 'Delantero' },
  { name: 'Sondre Brunstad Fet', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Weston McKennie', teamName: 'Juventus', position: 'Delantero' },
  { name: 'Marcos Llorente', teamName: 'Atlético de Madrid', position: 'Delantero' },
  { name: 'Serhou Guirassy', teamName: 'Borussia Dortmund', position: 'Delantero' },
  { name: 'Lazar Samardzic', teamName: 'Atalanta', position: 'Delantero' },
  { name: 'Francisco Trincão', teamName: 'Sporting CP', position: 'Delantero' },
  { name: 'Robert Lewandowski', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Patrik Schick', teamName: 'Bayer Leverkusen', position: 'Delantero' },
  { name: 'Randal Kolo Muani', teamName: 'Tottenham Hotspur', position: 'Delantero' },
  { name: 'Scott McTominay', teamName: 'Napoli', position: 'Delantero' },
  { name: 'Luis Díaz', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Viktor Gyökeres', teamName: 'Arsenal', position: 'Delantero' },
  { name: 'Désiré Doué', teamName: 'Paris Saint-Germain', position: 'Delantero' },
  { name: 'Igor Paixão', teamName: 'Marseille', position: 'Delantero' },
  { name: 'Lautaro Martínez', teamName: 'Internazionale', position: 'Delantero' },
  { name: 'Lennart Karl', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Felix Nmecha', teamName: 'Borussia Dortmund', position: 'Delantero' },
  { name: 'Enzo Fernández', teamName: 'Chelsea', position: 'Delantero' },
  { name: 'Hugo Ekitike', teamName: 'Liverpool', position: 'Delantero' },
  { name: 'Alexis Mac Allister', teamName: 'Liverpool', position: 'Delantero' },
  { name: 'Xavi Simons', teamName: 'Tottenham Hotspur', position: 'Delantero' },
  { name: 'Nicolo Tresoldi', teamName: 'Club Brujas', position: 'Delantero' },
  { name: 'Gianluca Scamacca', teamName: 'Atalanta', position: 'Delantero' },
  { name: 'Gelson Martins', teamName: 'Olympiacos', position: 'Delantero' },
  { name: 'Michael Olise', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Jordan Teze', teamName: 'AS Mónaco', position: 'Delantero' },
  { name: 'Achraf Hakimi', teamName: 'PSG', position: 'Delantero' },
  { name: 'Arda Güler', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Federico Valverde', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Serge Gnabry', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Pierre-Emerick Aubameyang', teamName: 'Marseille', position: 'Delantero' },
  { name: 'Bradley Barcola', teamName: 'Paris Saint-Germain', position: 'Delantero' },
  { name: 'Ademola Lookman', teamName: 'Atlético Madrid', position: 'Delantero' },
  { name: 'Antoine Griezmann', teamName: 'Atlético Madrid', position: 'Delantero' },
  { name: 'Hans Vanaken', teamName: 'Club Brujas', position: 'Delantero' },
  { name: 'Virgil van Dijk', teamName: 'Liverpool', position: 'Delantero' },
  { name: 'Maghnes Akliouche', teamName: 'AS Mónaco', position: 'Delantero' },
  { name: 'Kenan Yildiz', teamName: 'Juventus', position: 'Delantero' },
  { name: 'Ole Didrik Blomberg', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Tijjani Reijnders', teamName: 'Manchester City', position: 'Delantero' },
  { name: 'Ange-Yoan Bonny', teamName: 'Internazionale', position: 'Delantero' },
  { name: 'Carlos Forbs', teamName: 'Club Brujas', position: 'Delantero' },
  { name: 'Florian Wirtz', teamName: 'Liverpool', position: 'Delantero' },
  { name: 'Kieran Trippier', teamName: 'Newcastle United', position: 'Delantero' },
  { name: 'Jérémy Doku', teamName: 'Manchester City', position: 'Delantero' },
  { name: 'Jacob Murphy', teamName: 'Newcastle United', position: 'Delantero' },
  { name: 'Guus Til', teamName: 'PSV Eindhoven', position: 'Delantero' },
  { name: 'Konrad Laimer', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Leandro Trossard', teamName: 'Arsenal', position: 'Delantero' },
  { name: 'Hakon Evjen', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Dan Burn', teamName: 'Newcastle United', position: 'Delantero' },
  { name: 'Thibaut Courtois', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Fredrik André Bjørkan', teamName: 'Bodo/Glimt', position: 'Delantero' },
  { name: 'Matteo Ruggeri', teamName: 'Atlético de Madrid', position: 'Delantero' },
  { name: 'Aleksandar Stankovic', teamName: 'Club Brujas', position: 'Delantero' },
  { name: 'Fredrik Aursnes', teamName: 'Benfica', position: 'Delantero' },
  { name: 'Abdellah Zoubir', teamName: 'FK Qarabag', position: 'Delantero' }
];

const TEAM_NAME_NORMALIZATION: Record<string, string> = {
  // Newcastle
  'Newcastle United': 'Newcastle',

  // PSG
  'Paris Saint-Germain': 'PSG',

  // Atlético
  'Atlético de Madrid': 'Atlético Madrid',

  // Bodø/Glimt
  'Bodo/Glimt': 'Bodø/Glimt',

  // Tottenham
  'Tottenham Hotspur': 'Tottenham',

  // Sporting
  'Sporting CP': 'Sporting Lisboa'
};

function normalizeTeamName(teamName: string): string {
  return TEAM_NAME_NORMALIZATION[teamName] ?? teamName;
}

function dedupeByPlayerName(players: ChampionsPlayer[]): ChampionsPlayer[] {
  const byName = new Map<string, ChampionsPlayer>();
  for (const player of players) {
    const existing = byName.get(player.name);
    if (existing) continue;
    byName.set(player.name, { ...player, teamName: normalizeTeamName(player.teamName) });
  }
  return Array.from(byName.values());
}

const CHAMPIONS_PLAYERS = dedupeByPlayerName(CHAMPIONS_PLAYERS_RAW);

function getPlayerDocIdFromName(name: string): string {
  // Firestore document IDs no pueden tener "/"
  return name.replace(/\//g, '-');
}

// ==============================
// Script principal
// ==============================
async function updateChampionsPlayers() {
  console.log(`\n🧑‍🎓 Actualizando jugadores para "${competitionId}"...\n`);
  if (dryRun) console.log('🧪 Modo dry-run (no se escribirá nada)\n');

  const competitionRef = db.collection('competitions').doc(competitionId);
  const teamsSnapshot = await competitionRef.collection('teams').get();

  if (teamsSnapshot.empty) {
    console.error('❌ No hay equipos en la competición. Crea/seed teams primero.');
    process.exit(1);
  }

  const teamIdByName = new Map<string, string>();
  teamsSnapshot.forEach((d) => {
    const data = d.data() as { name?: string };
    if (data?.name) teamIdByName.set(data.name, d.id);
  });

  const playersRef = competitionRef.collection('players');
  const wantedIds = new Set<string>();

  let created = 0;
  let updated = 0;
  let skippedMissingTeam = 0;

  const BATCH_SIZE = 450;
  let batch = db.batch();
  let batchCount = 0;

  for (const player of CHAMPIONS_PLAYERS) {
    const teamId = teamIdByName.get(player.teamName);
    if (!teamId) {
      skippedMissingTeam += 1;
      console.warn(`⚠️  Equipo "${player.teamName}" no encontrado para jugador ${player.name}`);
      continue;
    }

    const playerDocId = getPlayerDocIdFromName(player.name);
    wantedIds.add(playerDocId);
    const ref = playersRef.doc(playerDocId);

    if (!dryRun) {
      const existing = await ref.get();
      const payload = {
        name: player.name,
        teamId,
        position: player.position,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
      };
      batch.set(ref, payload, { merge: true });
      if (existing.exists) updated += 1;
      else created += 1;
    } else {
      // En dry-run no hacemos lecturas por jugador; mostramos intención.
      updated += 1;
    }

    batchCount += 1;
    if (batchCount >= BATCH_SIZE) {
      if (!dryRun) await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    if (!dryRun) await batch.commit();
  }

  let pruned = 0;
  if (prune) {
    console.log('\n🧹 Prune habilitado: eliminando jugadores no incluidos en la lista...');
    const existingPlayers = await playersRef.get();
    const deletions: admin.firestore.DocumentReference[] = [];
    existingPlayers.forEach((d) => {
      if (!wantedIds.has(d.id)) deletions.push(d.ref);
    });

    const DEL_BATCH_SIZE = 450;
    for (let i = 0; i < deletions.length; i += DEL_BATCH_SIZE) {
      const delBatch = db.batch();
      deletions.slice(i, i + DEL_BATCH_SIZE).forEach((ref) => delBatch.delete(ref));
      if (!dryRun) await delBatch.commit();
    }

    pruned = deletions.length;
  }

  console.log('\n✅ Jugadores actualizados.');
  console.log(`  - Creados: ${created}`);
  console.log(`  - Actualizados: ${updated}`);
  console.log(`  - Omitidos (equipo no encontrado): ${skippedMissingTeam}`);
  if (prune) console.log(`  - Eliminados (prune): ${pruned}`);
  console.log('');
}

updateChampionsPlayers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error actualizando jugadores:', error);
    process.exit(1);
  });

