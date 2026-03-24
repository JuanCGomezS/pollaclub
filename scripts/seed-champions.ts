/**
 * Crea la competición "Liga de Campeones de la UEFA" con:
 * - Documento de competición
 * - Documento de resultados (results/main)
 * - Equipos (usando códigos de logo UEFA cuando se tienen)
 * - Jugadores destacados
 * - Partidos (octavos, cuartos, semis y final) desde
 *   src/lib/Partidos y equipos champions.txt
 *
 * Uso:
 *   npx tsx scripts/seed-champions.ts
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
  } catch (error) {
    console.warn('⚠️  No se pudo cargar el archivo de credenciales desde GOOGLE_APPLICATION_CREDENTIALS');
  }
}

if (!serviceAccount) {
  try {
    const keyPath = join(__dirname, 'service-account-key.json');
    const fileContent = readFileSync(keyPath, 'utf8');
    serviceAccount = JSON.parse(fileContent);
    console.log('✅ Usando credenciales de servicio desde scripts/service-account-key.json');
  } catch (error) {
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
// Datos de equipos y jugadores
// ==============================

interface ChampionsTeam {
  name: string;
  shortName: string;
  code: string;
}

interface ChampionsPlayer {
  name: string;
  teamName: string;
  position: string;
}

const CHAMPIONS_TEAMS: ChampionsTeam[] = [
  { name: 'Liverpool', shortName: 'LIV', code: '7889' },
  { name: 'Galatasaray', shortName: 'GAL', code: '50067' },
  { name: 'Real Madrid', shortName: 'RMA', code: '50051' },
  { name: 'Manchester City', shortName: 'MCI', code: '52919' },
  { name: 'Atalanta', shortName: 'ATA', code: '52816' },
  { name: 'Bayern Munich', shortName: 'BAY', code: '50037' },
  { name: 'Newcastle', shortName: 'NEW', code: '59324' },
  { name: 'Barcelona', shortName: 'BAR', code: '50080' },
  { name: 'Atlético Madrid', shortName: 'ATM', code: '50124' },
  { name: 'Tottenham', shortName: 'TOT', code: '1652' },
  { name: 'Bodø/Glimt', shortName: 'BOD', code: '59333' },
  { name: 'Sporting Lisboa', shortName: 'SPO', code: '50149' },
  { name: 'Bayer Leverkusen', shortName: 'B04', code: '50109' },
  { name: 'Arsenal', shortName: 'ARS', code: '52280' },
  // Equipos con códigos UEFA adicionales proporcionados
  { name: 'PSG', shortName: 'PSG', code: '52747' },
  { name: 'Chelsea', shortName: 'CHE', code: '52914' },
  // Placeholder para rondas "A definir"
  { name: 'A definir', shortName: 'TBD', code: 'TBD' },
  // Equipo adicional para Victor Osimhen (no aparece en el TXT de logos)
  { name: 'Napoli', shortName: 'NAP', code: 'NAP' }
];

const TEAM_ALIASES: Record<string, string> = {
  // Texto del archivo -> nombre canónico de equipo
  Liverpool: 'Liverpool',
  Galatasaray: 'Galatasaray',
  'Real Madrid': 'Real Madrid',
  'Manchester City': 'Manchester City',
  Atalanta: 'Atalanta',
  Bayern: 'Bayern Munich',
  Newcastle: 'Newcastle',
  Barcelona: 'Barcelona',
  'Atlético Madrid': 'Atlético Madrid',
  Tottenham: 'Tottenham',
  'Bodø/Glimt': 'Bodø/Glimt',
  'Sporting Lisboa': 'Sporting Lisboa',
  Leverkusen: 'Bayer Leverkusen',
  Arsenal: 'Arsenal',
  PSG: 'PSG',
  Chelsea: 'Chelsea',
  'A definir': 'A definir'
};

const CHAMPIONS_PLAYERS: ChampionsPlayer[] = [
  { name: 'Kylian Mbappé', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Anthony Gordon', teamName: 'Newcastle', position: 'Delantero' },
  { name: 'Harry Kane', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Erling Haaland', teamName: 'Manchester City', position: 'Delantero' },
  { name: 'Victor Osimhen', teamName: 'Napoli', position: 'Delantero' },
  { name: 'Gabriel Martinelli', teamName: 'Arsenal', position: 'Delantero' },
  { name: 'Jens Hauge', teamName: 'Bodø/Glimt', position: 'Delantero' },
  { name: 'Julián Álvarez', teamName: 'Atlético Madrid', position: 'Delantero' },
  { name: 'Achraf Hakimi', teamName: 'PSG', position: 'Defensor' },
  { name: 'Michael Olise', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Robert Lewandowski', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Lamine Yamal', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Fermín López', teamName: 'Barcelona', position: 'Delantero' },
  { name: 'Serge Gnabry', teamName: 'Bayern Munich', position: 'Delantero' },
  { name: 'Vinícius', teamName: 'Real Madrid', position: 'Delantero' },
  { name: 'Federico Valverde', teamName: 'Real Madrid', position: 'Delantero' }
];

function getTeamDocIdFromName(name: string): string {
  // Firestore document IDs no pueden tener "/"
  return name.replace(/\//g, '-');
}

// ==============================
// Utilidades de parsing
// ==============================

type ChampionsRound = 'round16' | 'quarter' | 'semifinal' | 'final';

interface ParsedChampionsMatch {
  round: ChampionsRound;
  leg: number; // 1 ó 2 (ida/vuelta) cuando aplica
  day: number;
  month: number;
  timeText: string;
  team1Name: string;
  team2Name: string;
}

function isDateLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  // Ej: "Mar, 10/3" o "Mié, 11/3"
  if (/^(Lun|Mar|Mié|Mie|Jue|Vie|Sáb|Sab|Dom),\s*\d{1,2}\/\d{1,2}$/i.test(s)) return true;
  // Ej: "7/4"
  if (/^\d{1,2}\/\d{1,2}$/.test(s)) return true;
  return false;
}

function parseDateLine(line: string): { day: number; month: number } {
  let s = line.trim();
  // Quitar día de la semana si viene ("Mar, 10/3" -> "10/3")
  const parts = s.split(',');
  if (parts.length === 2) {
    s = parts[1].trim();
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) {
    // Fallback razonable: 1 de marzo
    return { day: 1, month: 3 };
  }
  return {
    day: parseInt(m[1], 10),
    month: parseInt(m[2], 10)
  };
}

function parseTime(text: string): { hour: number; minute: number } {
  const s = text.replace(/\s+/g, ' ').trim();
  const m = s.match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)/i);
  if (!m) {
    // "Por definirse" u otros → usar 14:00 por defecto
    return { hour: 14, minute: 0 };
  }
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const isPM = /p\.?\s*m\.?/i.test(m[3]);
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  return { hour, minute };
}

// Hora local → UTC con offset +5 para que en la app se vea la hora local del partido
function toUTC(year: number, month: number, day: number, hour: number, minute: number): Date {
  const utcHour = hour + 5;
  let utcDay = day;
  if (utcHour >= 24) utcDay += 1;
  if (utcHour < 0) utcDay -= 1;
  const h = ((utcHour % 24) + 24) % 24;
  return new Date(Date.UTC(year, month - 1, utcDay, h, minute, 0, 0));
}

function normalizeTeamRaw(line: string): string {
  const s = line.trim();
  if (!s) return s;

  // Muchos equipos vienen duplicados: "GalatasarayGalatasaray"
  const len = s.length;
  if (len % 2 === 0) {
    const half = len / 2;
    const first = s.slice(0, half);
    const second = s.slice(half);
    if (first === second) {
      return first.trim();
    }
  }

  return s;
}

function normalizeTeamName(raw: string): string {
  const base = normalizeTeamRaw(raw);
  return TEAM_ALIASES[base] ?? base;
}

function parseChampionsFile(content: string): ParsedChampionsMatch[] {
  const lines = content.split('\n').map((l) => l.trim());
  const matches: ParsedChampionsMatch[] = [];

  let currentRound: ChampionsRound | null = null;
  let currentLeg = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith('LOGOS DE EQUIPOS')) {
      break; // fin de la sección de partidos
    }

    if (line.startsWith('Octavos de final')) {
      currentRound = 'round16';
      currentLeg = line.includes('Partido 1') ? 1 : 2;
      continue;
    }

    if (line.startsWith('Cuartos de final')) {
      currentRound = 'quarter';
      currentLeg = line.includes('Partido 1') ? 1 : 2;
      continue;
    }

    if (line.startsWith('Semifinal')) {
      currentRound = 'semifinal';
      currentLeg = line.includes('Partido 1') ? 1 : 2;
      continue;
    }

    if (line.startsWith('Final')) {
      currentRound = 'final';
      currentLeg = 1;
      continue;
    }

    if (!currentRound) continue;

    if (isDateLine(line)) {
      const { day, month } = parseDateLine(line);

      // Buscar hora (siguiente línea no vacía)
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const timeText = j < lines.length ? lines[j] : '14:00 p. m.';
      j++;

      // Buscar equipo 1
      while (j < lines.length && !lines[j].trim()) j++;
      const team1Raw = j < lines.length ? lines[j] : 'A definir';
      j++;

      // Buscar equipo 2
      while (j < lines.length && !lines[j].trim()) j++;
      const team2Raw = j < lines.length ? lines[j] : 'A definir';

      matches.push({
        round: currentRound,
        leg: currentLeg,
        day,
        month,
        timeText,
        team1Name: normalizeTeamRaw(team1Raw),
        team2Name: normalizeTeamRaw(team2Raw)
      });

      // Avanzar el índice para continuar desde aquí
      i = j;
    }
  }

  return matches;
}

// ==============================
// Script principal
// ==============================

async function seedChampions() {
  const COMPETITION_ID = 'uefa-champions-2026';
  console.log(`\n🏆 Poblando datos de "${COMPETITION_ID}" (Liga de Campeones de la UEFA)...\n`);

  const now = admin.firestore.Timestamp.now();

  // Leer archivo de partidos/equipos
  const txtPath = join(__dirname, '..', 'src', 'lib', 'Partidos y equipos champions.txt');
  const txtContent = readFileSync(txtPath, 'utf8');

  const parsedMatches = parseChampionsFile(txtContent);
  if (parsedMatches.length === 0) {
    console.error('❌ No se encontraron partidos en el archivo de Champions.');
    process.exit(1);
  }
  console.log(`  ✓ ${parsedMatches.length} partidos parseados desde TXT\n`);

  // Mapear equipos por nombre
  const teamByName = new Map<string, ChampionsTeam>();
  for (const t of CHAMPIONS_TEAMS) {
    teamByName.set(t.name, t);
  }

  // Construir definiciones de partidos con fechas y IDs de equipo
  const matchDefinitions: Array<{
    round: ChampionsRound;
    leg: number;
    date: Date;
    team1: ChampionsTeam;
    team2: ChampionsTeam;
  }> = [];

  const unknownTeams = new Set<string>();

  for (const pm of parsedMatches) {
    const { hour, minute } = parseTime(pm.timeText);
    const date = toUTC(2026, pm.month, pm.day, hour, minute);

    const team1NameCanonical = normalizeTeamName(pm.team1Name);
    const team2NameCanonical = normalizeTeamName(pm.team2Name);

    const team1 = teamByName.get(team1NameCanonical);
    const team2 = teamByName.get(team2NameCanonical);

    if (!team1) {
      unknownTeams.add(team1NameCanonical);
      continue;
    }
    if (!team2) {
      unknownTeams.add(team2NameCanonical);
      continue;
    }

    matchDefinitions.push({
      round: pm.round,
      leg: pm.leg,
      date,
      team1,
      team2
    });
  }

  if (unknownTeams.size > 0) {
    console.warn('⚠️  Equipos no reconocidos (no se crearán sus partidos):');
    for (const name of unknownTeams) {
      console.warn(`   - ${name}`);
    }
    console.warn('');
  }

  if (matchDefinitions.length === 0) {
    console.error('❌ Ningún partido válido después del mapeo de equipos.');
    process.exit(1);
  }

  // Determinar fechas de inicio/fin de la competición a partir de los partidos
  const dates = matchDefinitions.map((m) => m.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const startDateTs = admin.firestore.Timestamp.fromDate(minDate);
  const endDateTs = admin.firestore.Timestamp.fromDate(maxDate);

  // 1) Crear documento de competición
  console.log('📅 Creando documento de competición...');

  const competitionRef = db.collection('competitions').doc(COMPETITION_ID);
  await competitionRef.set({
    id: COMPETITION_ID,
    name: 'Liga de Campeones de la UEFA',
    type: 'club',
    startDate: startDateTs,
    endDate: endDateTs,
    status: 'upcoming',
    bonusSettings: {
      hasWinner: true,
      hasRunnerUp: true,
      hasThirdPlace: false,
      hasTopScorer: true,
      hasTopAssister: false,
      bonusLockDate: startDateTs
    },
    createdAt: now,
    updatedAt: now
  });

  console.log('  ✓ Competición creada\n');

  // 2) Crear documento de resultados (vacío)
  console.log('📊 Creando documento de resultados (main)...');
  const resultsRef = competitionRef.collection('results').doc('main');
  await resultsRef.set({
    id: 'main',
    competitionId: COMPETITION_ID,
    isLocked: false,
    updatedAt: now
  });
  console.log('  ✓ Resultados creados\n');

  // 3) Crear equipos
  console.log('📝 Creando equipos...');
  const teamsRef = competitionRef.collection('teams');
  const teamsBatch = db.batch();
  const teamIds = new Map<string, string>();

  for (const team of CHAMPIONS_TEAMS) {
    const teamDocId = getTeamDocIdFromName(team.name);
    const teamRef = teamsRef.doc(teamDocId);
    teamsBatch.set(teamRef, {
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    teamIds.set(team.name, teamDocId);
    console.log(`  ✓ ${team.name} (${team.code})`);
  }

  await teamsBatch.commit();
  console.log(`\n  ✓ ${CHAMPIONS_TEAMS.length} equipos creados\n`);

  // 4) Crear jugadores
  console.log('🧑‍🎓 Creando jugadores...');
  const playersRef = competitionRef.collection('players');
  const playersBatch = db.batch();

  for (const player of CHAMPIONS_PLAYERS) {
    const teamId = teamIds.get(player.teamName);
    if (!teamId) {
      console.warn(`  ⚠️  Equipo "${player.teamName}" no encontrado para jugador ${player.name}`);
      continue;
    }
    const playerRef = playersRef.doc(player.name);
    playersBatch.set(playerRef, {
      name: player.name,
      teamId,
      position: player.position,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ ${player.name} (${player.teamName})`);
  }

  await playersBatch.commit();
  console.log(`\n  ✓ ${CHAMPIONS_PLAYERS.length} jugadores procesados\n`);

  // 5) Crear partidos
  console.log('⚽ Creando partidos...');
  const matchesRef = competitionRef.collection('matches');

  // Borrar partidos existentes de esta competición (si los hubiera)
  const existing = await matchesRef.get();
  if (!existing.empty) {
    console.log(`  🗑️  Borrando ${existing.size} partidos existentes...`);
    const BATCH_SIZE = 500;
    for (let i = 0; i < existing.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      existing.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  let matchNumber = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const def of matchDefinitions) {
    matchNumber += 1;

    const short1 = def.team1.shortName || def.team1.name.slice(0, 3).toUpperCase();
    const short2 = def.team2.shortName || def.team2.name.slice(0, 3).toUpperCase();
    const matchId = `match-${String(matchNumber).padStart(3, '0')}-${short1}vs${short2}-L${def.leg}`;

    const scheduledTime = admin.firestore.Timestamp.fromDate(def.date);

    const team1Id = teamIds.get(def.team1.name) ?? getTeamDocIdFromName(def.team1.name);
    const team2Id = teamIds.get(def.team2.name) ?? getTeamDocIdFromName(def.team2.name);

    const matchData = {
      id: matchId,
      competitionId: COMPETITION_ID,
      matchNumber,
      round: def.round,
      team1Id,
      team2Id,
      scheduledTime,
      startTime: scheduledTime,
      status: 'scheduled' as const,
      result: { team1Score: 0, team2Score: 0 },
      extraTime1: 0,
      extraTime2: 0,
      halftimeDuration: 15,
      createdAt: now,
      updatedAt: now
    };

    batch.set(matchesRef.doc(matchId), matchData);
    batchCount += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ ${matchNumber} partidos creados para ${COMPETITION_ID}\n`);
  console.log('✨ Seeding de Champions completado.\n');
}

seedChampions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error al poblar Champions:', error);
    process.exit(1);
  });

