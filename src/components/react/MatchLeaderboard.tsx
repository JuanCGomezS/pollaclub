import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { batchGetUsers, getCurrentUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import type { MatchLeaderboardEntry } from '../../lib/points';
import { calculatePredictionPoints } from '../../lib/points';
import type { Group, Match, Prediction, User as UserType } from '../../lib/types';

function getInitial(nameOrEmail: string): string {
  const s = (nameOrEmail || 'U').trim();
  return s[0].toUpperCase();
}

interface MatchLeaderboardProps {
  groupId: string;
  match: Match;
  group: Group;
}

export default function MatchLeaderboard({ groupId, match, group }: MatchLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<MatchLeaderboardEntry[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, UserType>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!match.result) {
      setLoading(false);
      return;
    }

    const predictionsRef = collection(db, 'groups', groupId, 'predictions');
    const predictionsQuery = query(
      predictionsRef,
      where('matchId', '==', match.id)
    );

    const unsubscribe = onSnapshot(
      predictionsQuery,
      async (snapshot) => {
        try {
          const predictions: Prediction[] = [];
          snapshot.forEach((doc) => {
            predictions.push({ id: doc.id, ...doc.data() } as Prediction);
          });

          if (predictions.length === 0) {
            setLeaderboard([]);
            setLoading(false);
            return;
          }

          const userIds = [...new Set(predictions.map(p => p.userId))];
          const map = await batchGetUsers(userIds);
          setUsersMap(map);

          const entries: MatchLeaderboardEntry[] = predictions.map((prediction) => {
            let points = prediction.points || 0;
            
            if (!prediction.points && match.result) {
              const calculated = calculatePredictionPoints(
                prediction,
                match.result,
                group.settings
              );
              points = calculated.points;
            }

            const user = map.get(prediction.userId);
            return {
              userId: prediction.userId,
              userName: user?.displayName || `Usuario ${prediction.userId.substring(0, 8)}...`,
              prediction,
              points,
              rank: 0
            };
          });

          entries.sort((a, b) => {
            if (b.points !== a.points) {
              return b.points - a.points;
            }
            return a.userName.localeCompare(b.userName);
          });

          entries.forEach((entry, index) => {
            entry.rank = index + 1;
            if (index > 0 && entry.points === entries[index - 1].points) {
              entry.rank = entries[index - 1].rank;
            }
          });

          setLeaderboard(entries);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error al cargar tabla');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId, match.id, match.result, group.settings]);

  if (!match.result) {
    return (
      <div className="text-sm text-[color:var(--pc-muted)] text-center py-4">
        Esperando resultado del partido...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[color:var(--pc-accent)] mx-auto" />
        <p className="mt-2 text-sm text-[color:var(--pc-muted)]">Cargando tabla...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-200 text-center py-4">
        {error}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-sm text-[color:var(--pc-muted)] text-center py-4">
        No hay pronósticos para este partido
      </div>
    );
  }

  const currentUserId = getCurrentUser()?.uid;

  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80 shadow-sm">
      <table className="min-w-full divide-y divide-[color:var(--pc-main-dark)]/60">
        <thead className="bg-[color:var(--pc-main-dark)]/60">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              Participante
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              Pronóstico
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--pc-muted)] uppercase tracking-wider">
              Puntos
            </th>
          </tr>
        </thead>
        <tbody className="bg-[color:var(--pc-surface)] divide-y divide-[color:var(--pc-main-dark)]/40">
          {leaderboard.map((entry) => {
            const isCurrentUser = currentUserId === entry.userId;
            const isExact = entry.prediction.team1Score === match.result!.team1Score &&
                           entry.prediction.team2Score === match.result!.team2Score;

            return (
              <tr
                key={entry.userId}
                className={entry.rank === 1 ? 'bg-[color:var(--pc-accent)]/10' : ''}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm text-[color:var(--pc-text-on-dark)]">
                  {entry.rank}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap text-sm ${isCurrentUser ? 'font-bold text-[color:var(--pc-text-on-dark)]' : 'text-[color:var(--pc-text-on-dark)]'}`}>
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
                <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                  <span className={isExact ? 'font-bold text-[color:var(--pc-accent)]' : ''}>
                    {entry.prediction.team1Score} - {entry.prediction.team2Score}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                  <span className={`font-semibold ${entry.points > 0 ? 'text-[color:var(--pc-accent)]' : 'text-[color:var(--pc-muted)]'}`}>
                    {entry.points}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
