import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { getGroup } from '../../lib/groups';
import { filterFinishedMatches, filterLiveMatches, filterUpcomingMatches } from '../../lib/matches';
import { getUserPrediction, getUserPredictions, savePrediction } from '../../lib/predictions';
import type { Group, Match, Prediction } from '../../lib/types';
import { getWhatsappLink } from '../../lib/utils';
import BonusPredictionsForm from './BonusPredictionsForm';
import MatchCard from './MatchCard';

export type PredictionsSubTab = 'live' | 'upcoming' | 'finished' | 'bonus';

interface PredictionsViewProps {
  groupId: string;
  group?: Group;
}

export default function PredictionsView({ groupId, group: groupProp }: PredictionsViewProps) {
  const [group, setGroup] = useState<Group | null>(groupProp || null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(!groupProp);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [userPredictions, setUserPredictions] = useState<Record<string, Prediction>>({});
  const [savingPrediction, setSavingPrediction] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId, groupProp?.id]);

  useEffect(() => {
    if (!group?.competitionId) return;

    const matchesRef = collection(db, 'competitions', group.competitionId, 'matches');
    const unsubscribe = onSnapshot(
      matchesRef,
      (snapshot) => {
        const updatedMatches: Match[] = [];
        snapshot.forEach((doc) => {
          const matchData = doc.data();
          updatedMatches.push({ ...matchData, id: doc.id } as Match);
        });
        setMatches(updatedMatches);
      },
      (err) => {
        console.error('Error en listener de partidos:', err);
        setError('Error al actualizar partidos en tiempo real');
      }
    );

    return () => unsubscribe();
  }, [group?.competitionId]);

  const loadData = async () => {
    try {
      if (groupProp) {
        setGroup(groupProp);
        await loadUserPredictions([], groupProp);
        setLoading(false);
        return;
      }

      const user = getCurrentUser();
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      const groupData = await getGroup(groupId);
      if (!groupData) {
        setError('Grupo no encontrado');
        setLoading(false);
        return;
      }

      setGroup(groupData);
      await loadUserPredictions([], groupData);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      setLoading(false);
    }
  };

  const loadUserPredictions = async (_matchesData: Match[], _groupData: Group) => {
    const user = getCurrentUser();
    if (!user) return;
    const all = await getUserPredictions(groupId, user.uid);
    const byMatch: Record<string, Prediction> = {};
    all.forEach((p) => { byMatch[p.matchId] = p; });
    setUserPredictions(byMatch);
  };

  const handleSavePrediction = async (matchId: string, team1Score: number, team2Score: number) => {
    const user = getCurrentUser();
    if (!user || !group) return;

    setSavingPrediction(matchId);
    setSaveError('');
    try {
      await savePrediction(groupId, user.uid, matchId, team1Score, team2Score);
      
      const prediction = await getUserPrediction(groupId, user.uid, matchId);
      if (prediction) {
        setUserPredictions((prev) => ({ ...prev, [matchId]: prediction }));
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el pronóstico');
    } finally {
      setSavingPrediction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pc-accent)] mx-auto" />
          <p className="mt-4 text-[color:var(--pc-muted)]">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/50 bg-red-900/40 text-red-100">
        <p>{error}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 rounded-xl border border-[color:var(--pc-accent)]/60 bg-[color:var(--pc-surface)]/80 text-[color:var(--pc-muted)]">
        <p>No se pudo cargar el grupo.</p>
      </div>
    );
  }

  const upcomingMatches = filterUpcomingMatches(matches);
  const liveMatches = filterLiveMatches(matches);
  const finishedMatches = filterFinishedMatches(matches);

  const defaultSubTab: PredictionsSubTab =
    liveMatches.length > 0 ? 'live' : upcomingMatches.length > 0 ? 'upcoming' : finishedMatches.length > 0 ? 'finished' : 'bonus';
  const [subTab, setSubTab] = useState<PredictionsSubTab>('upcoming');
  const initialDefaultSet = useRef(false);

  useEffect(() => {
    if (matches.length > 0 && !initialDefaultSet.current) {
      initialDefaultSet.current = true;
      setSubTab(defaultSubTab);
    }
  }, [matches.length, defaultSubTab]);

  useEffect(() => {
    setSubTab((current) => {
      if (current === 'live' && liveMatches.length === 0) return defaultSubTab;
      if (current === 'upcoming' && upcomingMatches.length === 0) return defaultSubTab;
      if (current === 'finished' && finishedMatches.length === 0) return defaultSubTab;
      return current;
    });
  }, [liveMatches.length, upcomingMatches.length, finishedMatches.length, defaultSubTab]);

  const subTabs: { id: PredictionsSubTab; label: string; count?: number }[] = [
    ...(liveMatches.length > 0 ? [{ id: 'live' as const, label: 'Partidos en vivo', count: liveMatches.length }] : []),
    { id: 'upcoming', label: 'Próximos partidos', count: upcomingMatches.length },
    { id: 'finished', label: 'Partidos finalizados', count: finishedMatches.length },
    { id: 'bonus', label: 'Pronósticos bonus' },
  ];

  const getLockMessage = (match: Match): string | undefined => {
    const maxMatchNumber = Number(group.maxMatchNumber || 0);
    if (maxMatchNumber > 0 && match.matchNumber > maxMatchNumber) {
      return `Tu plan actual permite jugar solo hasta el partido ${maxMatchNumber}. Actualiza tu plan para seguir pronosticando.`;
    }
    return undefined;
  };

  const lockedUpcomingMatches = upcomingMatches.filter((match) => Boolean(getLockMessage(match)));
  const hasLockedUpcomingMatches = lockedUpcomingMatches.length > 0;
  const maxMatchNumber = Number(group.maxMatchNumber || 0);

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-semibold">No se pudo guardar el pronóstico</p>
          <p className="mt-1">{saveError}</p>
        </div>
      )}

      <nav className="flex flex-wrap gap-1 border-b border-[color:var(--pc-main-dark)]/50 pb-2">
        {subTabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition ${
              subTab === id
                ? 'bg-[color:var(--pc-main)] text-[color:var(--pc-text-on-dark)] border-b-2 border-[color:var(--pc-accent)] shadow-sm'
                : 'text-[color:var(--pc-muted)]/80 hover:text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main-dark)]/40'
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="ml-1.5 text-[color:var(--pc-muted)]/80 font-normal">({count})</span>
            )}
          </button>
        ))}
      </nav>

      {subTab === 'live' && (
        <section>
          {liveMatches.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  groupId={groupId}
                  group={group!}
                  userPrediction={userPredictions[match.id]}
                  onSavePrediction={handleSavePrediction}
                  isSaving={savingPrediction === match.id}
                  canEdit={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/60">
              <p className="text-[color:var(--pc-muted)]">No hay partidos en vivo.</p>
            </div>
          )}
        </section>
      )}

      {subTab === 'upcoming' && (
        <section>
          {hasLockedUpcomingMatches && (
            <div className="mb-4 rounded-lg border border-amber-400/50 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold">Limite del plan gratuito alcanzado</p>
              <p className="mt-1">
                Tu plan actual permite pronosticar hasta el partido {maxMatchNumber}. Para seguir
                jugando en los próximos partidos, actualiza tu plan.{' '}
                <a
                  href={getWhatsappLink(
                    'Hola PollaClub, quiero actualizar mi plan para seguir pronosticando en mi grupo.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-200 underline decoration-amber-400/80 underline-offset-2 hover:text-white"
                >
                  Actualizar ahora
                </a>
              </p>
            </div>
          )}

          {upcomingMatches.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                (() => {
                  const lockMessage = getLockMessage(match);
                  return (
                <MatchCard
                  key={match.id}
                  match={match}
                  groupId={groupId}
                  group={group!}
                  userPrediction={userPredictions[match.id]}
                  onSavePrediction={handleSavePrediction}
                  isSaving={savingPrediction === match.id}
                  canEdit={!lockMessage}
                />
                  );
                })()
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/60">
              <p className="text-[color:var(--pc-muted)]">No hay próximos partidos.</p>
            </div>
          )}
        </section>
      )}

      {subTab === 'finished' && (
        <section>
          {finishedMatches.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {finishedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  groupId={groupId}
                  group={group!}
                  userPrediction={userPredictions[match.id]}
                  onSavePrediction={handleSavePrediction}
                  isSaving={false}
                  canEdit={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/60">
              <p className="text-[color:var(--pc-muted)]">No hay partidos finalizados.</p>
            </div>
          )}
        </section>
      )}

      {subTab === 'bonus' && <BonusPredictionsForm groupId={groupId} group={group} />}
    </div>
  );
}
