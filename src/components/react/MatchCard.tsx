import { Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { calculateMatchMinute, formatMatchMinute } from '../../lib/match-time';
import { getBasePath, getTeamImageUrls } from '../../lib/utils';
import { getTeamById } from '../../lib/competition-data';
import MatchLeaderboardModal from './MatchLeaderboardModal';
import type { Match, Prediction, Group, Team } from '../../lib/types';

interface MatchCardProps {
  match: Match;
  groupId: string;
  group: Group;
  userPrediction?: Prediction;
  onSavePrediction: (matchId: string, team1Score: number, team2Score: number) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

export default function MatchCard({
  match,
  groupId,
  group,
  userPrediction,
  onSavePrediction,
  isSaving,
  canEdit
}: MatchCardProps) {
  const [team1Score, setTeam1Score] = useState<string>(
    userPrediction?.team1Score.toString() || ''
  );
  const [team2Score, setTeam2Score] = useState<string>(
    userPrediction?.team2Score.toString() || ''
  );
  const [team1ImageIndex, setTeam1ImageIndex] = useState(0);
  const [team2ImageIndex, setTeam2ImageIndex] = useState(0);
  
  // Estado para equipos resueltos desde Firestore/cache
  const [team1Data, setTeam1Data] = useState<Team | null>(null);
  const [team2Data, setTeam2Data] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(!userPrediction && canEdit);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Cargar datos de equipos desde Firestore/cache
  useEffect(() => {
    let cancelled = false;
    
    async function loadTeams() {
      if (!match.team1Id || !match.team2Id) {
        setTeamsLoading(false);
        return;
      }
      
      try {
        const [t1, t2] = await Promise.all([
          getTeamById(group.competitionId, match.team1Id),
          getTeamById(group.competitionId, match.team2Id)
        ]);
        
        if (!cancelled) {
          setTeam1Data(t1);
          setTeam2Data(t2);
          setTeamsLoading(false);
        }
      } catch (error) {
        console.error('Error loading teams:', error);
        if (!cancelled) {
          setTeamsLoading(false);
        }
      }
    }
    
    loadTeams();
    return () => { cancelled = true; };
  }, [match.team1Id, match.team2Id, group.competitionId]);

  useEffect(() => {
    if (userPrediction) {
      setTeam1Score(userPrediction.team1Score.toString());
      setTeam2Score(userPrediction.team2Score.toString());
      setIsEditing(false);
    } else if (canEdit) {
      setTeam1Score('');
      setTeam2Score('');
      setIsEditing(true);
    } else {
      setTeam1Score('');
      setTeam2Score('');
      setIsEditing(false);
    }
  }, [userPrediction, canEdit]);

  // Nombres y códigos desde teams (team1Id/team2Id)
  const team1Name = team1Data?.name ?? '';
  const team2Name = team2Data?.name ?? '';
  const team1Code = team1Data?.code ?? '';
  const team2Code = team2Data?.code ?? '';

  const baseUrl = getBasePath() || '/';
  const placeholderUrl = `${baseUrl}team-font.jpg`.replace(/\/+/g, '/');
  const team1ImageUrls = getTeamImageUrls(team1Code);
  const team2ImageUrls = getTeamImageUrls(team2Code);

  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const score1 = parseInt(team1Score, 10);
    const score2 = parseInt(team2Score, 10);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Por favor ingresa marcadores válidos (números enteros >= 0)');
      return;
    }

    await onSavePrediction(match.id, score1, score2);
    setIsEditing(false);
  };

  const getStatusBadge = () => {
    if (match.status === 'live') {
      return (
        <span className="text-xs px-2 py-1 rounded-full font-semibold animate-pulse bg-[color:var(--pc-main)]/15 text-[color:var(--pc-accent)] border border-[color:var(--pc-accent)]/60">
          EN VIVO
        </span>
      );
    }
    if (match.status === 'finished') {
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--pc-main-dark)]/20 text-[color:var(--pc-muted)] border border-[color:var(--pc-main-dark)]/60">
          Finalizado
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--pc-surface)]/40 text-[color:var(--pc-muted)] border border-[color:var(--pc-main)]/40">
        Por Jugar
      </span>
    );
  };

  const isMatchStarted = match.status === 'live' || match.status === 'finished';
  const result = match.result && match.result !== null ? match.result : undefined;

  const [currentTime, setCurrentTime] = useState(new Date());
  const extraTime1 = match.extraTime1 ?? 0;
  const extraTime2 = match.extraTime2 ?? 0;
  const halftimeDuration = match.halftimeDuration ?? 15;

  const calculatedMinute = match.status === 'live'
    ? calculateMatchMinute(match.scheduledTime, match.startTime, extraTime1, extraTime2, currentTime, halftimeDuration)
    : null;

  useEffect(() => {
    if (match.status === 'live') {
      setCurrentTime(new Date());

      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [match.status, match.scheduledTime, match.startTime]);

  const displayMinute = match.status === 'live'
    ? calculatedMinute?.minute ?? null
    : null;
  const displayExtraTime = match.status === 'live'
    ? calculatedMinute?.extraTime ?? null
    : null;
  const displayExtraTimeTotal = match.status === 'live'
    ? calculatedMinute?.extraTimeTotal ?? null
    : null;
  const minuteStatus = calculatedMinute?.status;

  return (
    <div
      className={`p-4 rounded-xl border shadow-sm bg-[color:var(--pc-surface)]/80 backdrop-blur ${
        match.status === 'live'
          ? 'border-[color:var(--pc-accent)]/70 shadow-[0_0_0_1px_rgba(244,197,66,0.15)]'
          : 'border-[color:var(--pc-main-dark)]/60'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-[color:var(--pc-muted)]/80">
          {formatDate(match.scheduledTime)}
        </span>
        {getStatusBadge()}
      </div>

      {match.status === 'live' && displayMinute != null && (
        <div className="text-center mb-3">
          <span className="text-sm font-semibold text-[color:var(--pc-accent)]">
            {formatMatchMinute(displayMinute, displayExtraTime, displayExtraTimeTotal, minuteStatus) || `${displayMinute}'`}
          </span>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <img
            src={team1ImageUrls[team1ImageIndex] || placeholderUrl}
            alt={team1Name}
            className="w-12 h-12 object-contain mb-1 drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
            onError={() => {
              if (team1ImageIndex < team1ImageUrls.length - 1) {
                setTeam1ImageIndex(team1ImageIndex + 1);
              } else {
                (document.querySelector(`img[alt="${team1Name}"]`) as HTMLImageElement).src = placeholderUrl;
              }
            }}
          />
          <span className="text-sm font-semibold text-[color:var(--pc-text-on-dark)]">
            {team1Name}
          </span>
        </div>

        {isMatchStarted && result ? (
          <div>
            <div className="flex items-center rounded-lg px-3 py-2">
              <div className="text-center min-w-[60px]">
                <span className="text-lg font-bold text-[color:var(--pc-text-on-dark)]">
                  {result.team1Score}
                </span>
                {userPrediction && (
                  <span className="text-sm text-[color:var(--pc-muted)] ml-1">
                    ({userPrediction.team1Score})
                  </span>
                )}
              </div>
              <span className="text-[color:var(--pc-muted)]/80 font-medium">vs</span>
              <div className="text-center min-w-[60px]">
                <span className="text-lg font-bold text-[color:var(--pc-text-on-dark)]">
                  {result.team2Score}
                </span>
                {userPrediction && (
                  <span className="text-sm text-[color:var(--pc-muted)] ml-1">
                    ({userPrediction.team2Score})
                  </span>
                )}
              </div>
            </div>
            <div
              className="text-sm text-[color:var(--pc-accent)] mt-1 text-center cursor-pointer hover:text-[color:var(--pc-accent-dark)]"
              onClick={() => setIsLeaderboardOpen(true)}
              title="Click para ver tabla de posiciones">
              <h3>Mostrar resultados</h3>
            </div>
          </div>
        ) : canEdit && isEditing ? (
          <>
            <input
              type="number"
              min="0"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
              placeholder="0"
              className="w-14 px-2 py-1.5 text-sm border border-[color:var(--pc-main-dark)]/60 rounded text-center bg-[color:var(--pc-surface)]/60 text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
              required
              disabled={isSaving}
            />
            <span className="text-[color:var(--pc-muted)]/80 font-medium">vs</span>
            <input
              type="number"
              min="0"
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
              placeholder="0"
              className="w-14 px-2 py-1.5 text-sm border border-[color:var(--pc-main-dark)]/60 rounded text-center bg-[color:var(--pc-surface)]/60 text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
              required
              disabled={isSaving}
            />
          </>
        ) : userPrediction ? (
          <>
            <div className="text-center min-w-[60px]">
              <span className="text-lg font-bold text-[color:var(--pc-text-on-dark)]">
                {userPrediction.team1Score}
              </span>
            </div>
            <span className="text-[color:var(--pc-muted)]/80 font-medium">vs</span>
            <div className="text-center min-w-[60px]">
              <span className="text-lg font-bold text-[color:var(--pc-text-on-dark)]">
                {userPrediction.team2Score}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-center min-w-[60px]">
              <span className="text-sm text-[color:var(--pc-muted)]/60">-</span>
            </div>
            <span className="text-[color:var(--pc-muted)]/80 font-medium">vs</span>
            <div className="text-center min-w-[60px]">
              <span className="text-sm text-[color:var(--pc-muted)]/60">-</span>
            </div>
          </>
        )}

        <div className="flex flex-col items-center">
          <img
            src={team2ImageUrls[team2ImageIndex] || placeholderUrl}
            alt={team2Name}
            className="w-12 h-12 object-contain mb-1 drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
            onError={() => {
              if (team2ImageIndex < team2ImageUrls.length - 1) {
                setTeam2ImageIndex(team2ImageIndex + 1);
              } else {
                (document.querySelector(`img[alt="${team2Name}"]`) as HTMLImageElement).src = placeholderUrl;
              }
            }}
          />
          <span className="text-sm font-semibold text-[color:var(--pc-text-on-dark)]">
            {team2Name}
          </span>
        </div>
      </div>

      {canEdit && isEditing && (
        <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-[color:var(--pc-main-dark)]/60">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-[color:var(--pc-text-strong)] bg-[color:var(--pc-accent)] rounded hover:bg-[color:var(--pc-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : userPrediction ? 'Actualizar' : 'Guardar'}
            </button>
            {userPrediction && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTeam1Score(userPrediction.team1Score.toString());
                  setTeam2Score(userPrediction.team2Score.toString());
                }}
                className="px-3 py-1.5 text-xs font-medium text-[color:var(--pc-muted)] bg-[color:var(--pc-main-dark)]/60 rounded hover:bg-[color:var(--pc-main-dark)]"
                disabled={isSaving}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {canEdit && !isEditing && userPrediction && !isMatchStarted && (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full mt-3 pt-3 border-t border-[color:var(--pc-main-dark)]/60 text-xs text-[color:var(--pc-accent)] hover:text-[color:var(--pc-accent-dark)] font-medium"
        >
          Editar pronóstico
        </button>
      )}

      {canEdit && !isEditing && !userPrediction && !isMatchStarted && (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full mt-3 pt-3 border-t border-[color:var(--pc-main-dark)]/60 text-xs text-[color:var(--pc-accent)] hover:text-[color:var(--pc-accent-dark)] font-medium"
        >
          Agregar pronóstico
        </button>
      )}

      {(match.status === 'live' || match.status === 'finished') && match.result && (
        <MatchLeaderboardModal
          match={match}
          group={group}
          groupId={groupId}
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );
}
