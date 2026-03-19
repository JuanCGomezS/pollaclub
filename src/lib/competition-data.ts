import { collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import type { Team, Player } from './types';

// ============================================
// CACHE CONFIGURATION
// ============================================
const CACHE_VERSION = '1.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

// ============================================
// IN-MEMORY CACHE (evita repetir lecturas en la misma sesión)
// ============================================
const memoryTeams = new Map<string, Team[]>();
const memoryPlayers = new Map<string, Player[]>();
const inFlightTeams = new Map<string, Promise<Team[]>>();
const inFlightPlayers = new Map<string, Promise<Player[]>>();

// ============================================
// CACHE HELPERS (localStorage)
// ============================================
function getCacheKey(competitionId: string, type: 'teams' | 'players'): string {
  return `polla_${type}_${competitionId}`;
}

function getFromLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed: CachedData<T> = JSON.parse(cached);

    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    const now = Date.now();
    if (now - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // ignore
  }
}

export function clearCompetitionCache(competitionId: string): void {
  if (typeof window === 'undefined') return;

  memoryTeams.delete(competitionId);
  memoryPlayers.delete(competitionId);
  inFlightTeams.delete(competitionId);
  inFlightPlayers.delete(competitionId);

  const teamsKey = getCacheKey(competitionId, 'teams');
  const playersKey = getCacheKey(competitionId, 'players');
  localStorage.removeItem(teamsKey);
  localStorage.removeItem(playersKey);
}

// ============================================
// TEAMS (1 lectura Firestore por competición; resto desde memoria/localStorage)
// ============================================
async function fetchTeamsFromFirestore(competitionId: string): Promise<Team[]> {
  const teamsRef = collection(db, 'competitions', competitionId, 'teams');
  const snapshot = await getDocs(query(teamsRef));
  const teams: Team[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  } as Team));
  setLocalCache(getCacheKey(competitionId, 'teams'), teams);
  memoryTeams.set(competitionId, teams);
  return teams;
}

export async function getTeamsForCompetition(competitionId: string): Promise<Team[]> {
  const fromMemory = memoryTeams.get(competitionId);
  if (fromMemory) return fromMemory;

  let promise = inFlightTeams.get(competitionId);
  if (promise) return promise;

  const cacheKey = getCacheKey(competitionId, 'teams');
  const fromLocal = getFromLocalCache<Team[]>(cacheKey);
  if (fromLocal) {
    memoryTeams.set(competitionId, fromLocal);
    return fromLocal;
  }

  promise = fetchTeamsFromFirestore(competitionId);
  inFlightTeams.set(competitionId, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightTeams.delete(competitionId);
  }
}

export async function getTeamById(competitionId: string, teamId: string): Promise<Team | null> {
  const teams = await getTeamsForCompetition(competitionId);
  return teams.find((t) => t.id === teamId) ?? null;
}

// ============================================
// PLAYERS (1 lectura Firestore por competición; resto desde memoria/localStorage)
// ============================================
async function fetchPlayersFromFirestore(competitionId: string): Promise<Player[]> {
  const playersRef = collection(db, 'competitions', competitionId, 'players');
  const snapshot = await getDocs(query(playersRef));
  const players: Player[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data()
  } as Player));
  setLocalCache(getCacheKey(competitionId, 'players'), players);
  memoryPlayers.set(competitionId, players);
  return players;
}

export async function getPlayersForCompetition(competitionId: string): Promise<Player[]> {
  const fromMemory = memoryPlayers.get(competitionId);
  if (fromMemory) return fromMemory;

  let promise = inFlightPlayers.get(competitionId);
  if (promise) return promise;

  const cacheKey = getCacheKey(competitionId, 'players');
  const fromLocal = getFromLocalCache<Player[]>(cacheKey);
  if (fromLocal) {
    memoryPlayers.set(competitionId, fromLocal);
    return fromLocal;
  }

  promise = fetchPlayersFromFirestore(competitionId);
  inFlightPlayers.set(competitionId, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightPlayers.delete(competitionId);
  }
}

export async function getPlayersByTeam(competitionId: string, teamId: string): Promise<Player[]> {
  const players = await getPlayersForCompetition(competitionId);
  return players.filter((p) => p.teamId === teamId);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getTeamNames(competitionId: string): Promise<string[]> {
  const teams = await getTeamsForCompetition(competitionId);
  return teams.map((t) => t.name).sort();
}

export async function getPlayerNames(competitionId: string): Promise<string[]> {
  const players = await getPlayersForCompetition(competitionId);
  return players.map((p) => p.name).sort();
}

export async function getPlayerOptionsWithTeam(
  competitionId: string
): Promise<Array<{ label: string; value: string }>> {
  const [players, teams] = await Promise.all([getPlayersForCompetition(competitionId), getTeamsForCompetition(competitionId)]);
  const teamById = new Map<string, string>(teams.map((t) => [t.id, t.name]));
  const teamByName = new Map<string, string>(teams.map((t) => [t.name, t.name]));

  return players
    .map((p) => {
      const teamName = teamById.get(p.teamId) ?? teamByName.get(p.teamId) ?? 'Sin equipo';
      return { label: `${p.name} (${teamName})`, value: p.name };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function findTeamByName(competitionId: string, name: string): Promise<Team | null> {
  const teams = await getTeamsForCompetition(competitionId);
  return teams.find((t) => t.name === name) ?? null;
}

export async function findPlayerByName(competitionId: string, name: string): Promise<Player | null> {
  const players = await getPlayersForCompetition(competitionId);
  return players.find((p) => p.name === name) ?? null;
}
