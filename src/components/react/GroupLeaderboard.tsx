import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { batchGetUsers, getCurrentUser } from '../../lib/auth';
import { calculateUserTotalPoints, calculatePredictionPoints } from '../../lib/points';
import PointsHistoryModal from './PointsHistoryModal';
import type { Group, Match, Prediction, User as UserType } from '../../lib/types';
import type { GroupLeaderboardEntry } from '../../lib/points';
import type { BonusPrediction } from '../../lib/types';

function getInitial(nameOrEmail: string): string {
  const s = (nameOrEmail || 'U').trim();
  return s[0].toUpperCase();
}

interface GroupLeaderboardProps {
  groupId: string;
  group: Group;
}

interface FinishedMatchesData {
  ids: Set<string>;
  map: Map<string, Match>;
}

export default function GroupLeaderboard({ groupId, group }: GroupLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<GroupLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finishedMatches, setFinishedMatches] = useState<FinishedMatchesData>({
    ids: new Set(),
    map: new Map()
  });
  const [usersMap, setUsersMap] = useState<Map<string, UserType>>(new Map());
  const [selectedEntry, setSelectedEntry] = useState<GroupLeaderboardEntry | null>(null);
  const predictionsByUserRef = useRef<Map<string, Prediction[]>>(new Map());
  const bonusByUserRef = useRef<Map<string, BonusPrediction>>(new Map());

  const allUserIds = useMemo(
    () => [...new Set([...group.participants, group.adminUid])],
    [group.participants, group.adminUid]
  );

  useEffect(() => {
    let cancelled = false;
    batchGetUsers(allUserIds).then((map) => {
      if (!cancelled) setUsersMap(map);
    });
    return () => { cancelled = true; };
  }, [groupId, allUserIds.join(',')]);

  useEffect(() => {
    const matchesRef = collection(db, 'competitions', group.competitionId, 'matches');
    const matchesQuery = query(
      matchesRef
    );

    const unsubscribeMatches = onSnapshot(
      matchesQuery,
      (snapshot) => {
        const finishedList: Match[] = [];
        const newMap = new Map<string, Match>();
        snapshot.forEach((doc) => {
          const match = { id: doc.id, ...doc.data() } as Match;
          if (match.status === 'finished') {
            finishedList.push(match);
            newMap.set(match.id, match);
          }
        });
        setFinishedMatches({
          ids: new Set(finishedList.map((m) => m.id)),
          map: newMap
        });
      },
      (err) => setError(err.message)
    );

    return () => unsubscribeMatches();
  }, [group.competitionId]);

  useEffect(() => {
    if (finishedMatches.ids.size === 0) {
      const entries: GroupLeaderboardEntry[] = allUserIds.map((userId) => {
        const user = usersMap.get(userId);
        const userName = user?.displayName ?? `Usuario ${userId.substring(0, 8)}...`;
        return {
          userId,
          userName,
          totalPoints: 0,
          predictionsCount: 0,
          rank: 0
        };
      });
      entries.sort((a, b) => a.userName.localeCompare(b.userName));
      entries.forEach((e, i) => { e.rank = i + 1; });
      setLeaderboard(entries);
      setLoading(false);
      return;
    }

    function buildEntries() {
      const predictionsByUser = predictionsByUserRef.current;
      const bonusByUser = bonusByUserRef.current;
      const entries: GroupLeaderboardEntry[] = allUserIds.map((userId) => {
        const user = usersMap.get(userId);
        const userName = user?.displayName ?? `Usuario ${userId.substring(0, 8)}...`;
        const userPredictions = predictionsByUser.get(userId) ?? [];
        const matchPoints = calculateUserTotalPoints(userPredictions);
        const bonusPoints = bonusByUser.get(userId)?.points ?? 0;
        return {
          userId,
          userName,
          totalPoints: matchPoints + bonusPoints,
          predictionsCount: 0,
          rank: 0
        };
      });
      entries.sort((a, b) =>
        b.totalPoints !== a.totalPoints
          ? b.totalPoints - a.totalPoints
          : a.userName.localeCompare(b.userName)
      );
      entries.forEach((e, i) => {
        e.rank = i + 1;
      });
      setLeaderboard(entries);
      setLoading(false);
    }

    const predictionsRef = collection(db, 'groups', groupId, 'predictions');
    const unsubPredictions = onSnapshot(
      predictionsRef,
      (snapshot) => {
        const predictionsByUser = new Map<string, Prediction[]>();
        snapshot.forEach((doc) => {
          const prediction = { id: doc.id, ...doc.data() } as Prediction;
          if (!finishedMatches.ids.has(prediction.matchId)) return;
          const match = finishedMatches.map.get(prediction.matchId);
          if (!prediction.points && match?.result) {
            const calculated = calculatePredictionPoints(
              prediction,
              match.result,
              group.settings
            );
            prediction.points = calculated.points;
            prediction.pointsBreakdown = calculated.breakdown;
          }
          const userId = prediction.userId;
          if (!predictionsByUser.has(userId)) predictionsByUser.set(userId, []);
          predictionsByUser.get(userId)!.push(prediction);
        });
        predictionsByUserRef.current = predictionsByUser;
        buildEntries();
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const bonusRef = collection(db, 'groups', groupId, 'bonusPredictions');
    const unsubBonus = onSnapshot(
      bonusRef,
      (snapshot) => {
        const bonusByUser = new Map<string, BonusPrediction>();
        snapshot.forEach((doc) => {
          const bonus = { id: doc.id, ...doc.data() } as BonusPrediction;
          if (bonus.userId != null) {
            bonusByUser.set(bonus.userId, bonus);
          }
        });
        bonusByUserRef.current = bonusByUser;
        buildEntries();
      }
    );

    return () => {
      unsubPredictions();
      unsubBonus();
    };
  }, [groupId, allUserIds, group.settings, finishedMatches, usersMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pc-accent)] mx-auto" />
          <p className="mt-4 text-[color:var(--pc-muted)]">Cargando tabla de posiciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-500/60 bg-red-900/40 text-red-100">
        <p>{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/60">
        <p className="text-[color:var(--pc-muted)]">No hay participantes en este grupo.</p>
      </div>
    );
  }

  const currentUserId = getCurrentUser()?.uid;

  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80 shadow-sm">
      <table className="min-w-full divide-y divide-[color:var(--pc-main-dark)]/60">
        <thead className="bg-[color:var(--pc-main-dark)]/60">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              Participante
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              Puntos Totales
            </th>
          </tr>
        </thead>
        <tbody className="bg-[color:var(--pc-surface)] divide-y divide-[color:var(--pc-main-dark)]/40">
          {leaderboard.map((entry) => {
            const isCurrentUser = currentUserId === entry.userId;
            
            return (
              <tr
                key={entry.userId}
                className={`${
                  isCurrentUser
                    ? 'bg-[color:var(--pc-main)]/20'
                    : entry.rank === 1
                      ? 'bg-[color:var(--pc-accent)]/10'
                      : entry.rank <= 3
                        ? 'bg-white/5'
                        : ''
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[color:var(--pc-text-on-dark)]">
                  {entry.rank === 1 && '🥇'}
                  {entry.rank === 2 && '🥈'}
                  {entry.rank === 3 && '🥉'}
                  {entry.rank > 3 && entry.rank}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm ${isCurrentUser ? 'font-bold text-[color:var(--pc-text-on-dark)]' : 'text-[color:var(--pc-text-on-dark)]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-[color:var(--pc-main-dark)]/60 text-[color:var(--pc-muted)] font-semibold text-sm">
                      {(() => {
                        const user = usersMap.get(entry.userId);
                        if (user?.avatarUrl) {
                          return (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          );
                        }
                        return getInitial(entry.userName);
                      })()}
                    </span>
                    <span>{entry.userName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="inline-flex items-center gap-1.5 text-[color:var(--pc-accent)] hover:text-[color:var(--pc-accent-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)] focus:ring-offset-1 rounded"
                    title="Ver historial de puntos"
                  >
                    <span className={`font-bold text-lg ${entry.totalPoints > 0 ? 'text-[color:var(--pc-accent)]' : 'text-[color:var(--pc-muted)]'}`}>
                      {entry.totalPoints}
                    </span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedEntry && (
        <PointsHistoryModal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          userName={selectedEntry.userName}
          avatarUrl={usersMap.get(selectedEntry.userId)?.avatarUrl}
          predictions={predictionsByUserRef.current.get(selectedEntry.userId) ?? []}
          bonus={bonusByUserRef.current.get(selectedEntry.userId)}
          matchesMap={finishedMatches.map}
          competitionId={group.competitionId}
        />
      )}
    </div>
  );
}
