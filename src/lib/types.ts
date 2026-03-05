import { Timestamp } from 'firebase/firestore';

// ============================================
// COMPETITIONS
// ============================================
export type CompetitionType = 'world_cup' | 'continental' | 'club' | 'league' | 'other';
export type CompetitionStatus = 'upcoming' | 'active' | 'finished';

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  startDate: Timestamp;
  endDate: Timestamp;
  status: CompetitionStatus;
  bonusSettings: {
    hasWinner: boolean;
    hasRunnerUp: boolean;
    hasThirdPlace: boolean;
    hasTopScorer: boolean;
    hasTopAssister: boolean;
    bonusLockDate?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// TEAMS & PLAYERS
// ============================================
export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  shield?: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position?: string;
}

// ============================================
// MATCHES
// ============================================
export type MatchRound = 'group' | 'round16' | 'round8' | 'quarter' | 'semifinal' | 'third' | 'final';
export type MatchStatus = 'scheduled' | 'live' | 'finished';
export type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface Match {
  id: string;
  competitionId: string;
  matchNumber: number;
  round: MatchRound;
  team1Id: string;
  team2Id: string;
  scheduledTime: Timestamp;
  startTime?: Timestamp;
  status: MatchStatus;
  result?: {
    team1Score: number;
    team2Score: number;
  };
  extraTime1?: number;
  extraTime2?: number;
  halftimeDuration?: number;
  groupStage?: {
    group: GroupLetter;
    matchDay: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// GROUPS
// ============================================
export interface Group {
  id: string;
  competitionId: string;
  name: string;
  code: string;
  adminUid: string;
  participants: string[];
  isActive: boolean;
  settings: {
    pointsExactScore: number;
    pointsWinner: number;
    pointsGoalDifference?: number;
    // Pronósticos bonus (opcionales según competición)
    pointsWinnerBonus?: number;
    pointsRunnerUp?: number;
    pointsThirdPlace?: number;
    pointsTopScorer?: number;
    pointsTopAssister?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// USERS
// ============================================
export interface User {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  groups: string[];
  canCreateGroups: boolean; // Permiso para crear grupos (habilitado manualmente por admin)
  createdAt: Timestamp;
}

// ============================================
// PREDICTIONS
// ============================================
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  team1Score: number;
  team2Score: number;
  submittedAt: Timestamp;
  points?: number;
  pointsBreakdown?: {
    exactScore: number;
    winner: number;
    goalDifference: number;
  };
  calculatedAt?: Timestamp;
}

// ============================================
// BONUS PREDICTIONS
// ============================================
export interface BonusPrediction {
  id: string;
  userId: string;
  winner?: string;
  runnerUp?: string;
  thirdPlace?: string;
  topScorer?: string;
  topAssister?: string;
  submittedAt: Timestamp;
  points?: number;
  pointsBreakdown?: {
    winner: number;
    runnerUp: number;
    thirdPlace: number;
    topScorer: number;
    topAssister: number;
  };
  calculatedAt?: Timestamp;
}

// ============================================
// COMPETITION RESULTS
// ============================================
export interface CompetitionResult {
  id: string;
  competitionId: string;
  winner?: string;
  runnerUp?: string;
  thirdPlace?: string;
  topScorer?: string;
  topAssister?: string;
  isLocked: boolean;
  lockedAt?: Timestamp;
  updatedAt: Timestamp;
}
