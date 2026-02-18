import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { batchGetUsers, getCurrentUser } from '../../lib/auth';
import { calculateUserTotalPoints, calculatePredictionPoints } from '../../lib/points';
import type { Group, Match, Prediction } from '../../lib/types';
import type { GroupLeaderboardEntry } from '../../lib/points';
import type { BonusPrediction } from '../../lib/types';

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
  const [usersMap, setUsersMap] = useState<Map<string, { displayName?: string }>>(new Map());
  const predictionsByUserRef = useRef<Map<string, Prediction[]>>(new Map());
  const bonusPointsByUserRef = useRef<Map<string, number>>(new Map());

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
        return {
          userId,
          userName: user?.displayName ?? `Usuario ${userId.substring(0, 8)}...`,
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
      const bonusPointsByUser = bonusPointsByUserRef.current;
      const entries: GroupLeaderboardEntry[] = allUserIds.map((userId) => {
        const user = usersMap.get(userId);
        const userPredictions = predictionsByUser.get(userId) ?? [];
        const matchPoints = calculateUserTotalPoints(userPredictions);
        const bonusPoints = bonusPointsByUser.get(userId) ?? 0;
        return {
          userId,
          userName: user?.displayName ?? `Usuario ${userId.substring(0, 8)}...`,
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
        e.rank = i > 0 && e.totalPoints === entries[i - 1].totalPoints
          ? entries[i - 1].rank
          : i + 1;
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
        const bonusPointsByUser = new Map<string, number>();
        snapshot.forEach((doc) => {
          const bonus = { id: doc.id, ...doc.data() } as BonusPrediction;
          if (bonus.userId != null) {
            bonusPointsByUser.set(bonus.userId, bonus.points ?? 0);
          }
        });
        bonusPointsByUserRef.current = bonusPointsByUser;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando tabla de posiciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No hay participantes en este grupo.</p>
      </div>
    );
  }

  const currentUserId = getCurrentUser()?.uid;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participante
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Puntos Totales
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {leaderboard.map((entry) => {
            const isCurrentUser = currentUserId === entry.userId;
            
            return (
              <tr
                key={entry.userId}
                className={
                  isCurrentUser 
                    ? 'bg-blue-50 font-semibold' 
                    : entry.rank === 1 
                      ? 'bg-yellow-50' 
                      : entry.rank <= 3 
                        ? 'bg-gray-50' 
                        : ''
                }
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.rank === 1 && '🥇'}
                  {entry.rank === 2 && '🥈'}
                  {entry.rank === 3 && '🥉'}
                  {entry.rank > 3 && entry.rank}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm ${isCurrentUser ? 'font-bold text-gray-900' : 'text-gray-900'}`}>
                  {entry.userName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  <span className={`font-bold text-lg ${entry.totalPoints > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {entry.totalPoints}
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
