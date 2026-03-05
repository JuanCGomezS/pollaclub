import { useEffect, useState } from 'react';
import { getTeamsForCompetition } from '../../lib/competition-data';
import type { BonusPrediction, Match, Prediction } from '../../lib/types';
import Modal from './Modal';

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  predictions: Prediction[];
  bonus: BonusPrediction | undefined;
  matchesMap: Map<string, Match>;
  competitionId: string;
}

const BONUS_LABELS: Record<string, string> = {
  winner: 'Ganador',
  runnerUp: 'Subcampeón',
  thirdPlace: 'Tercer lugar',
  topScorer: 'Goleador',
  topAssister: 'Asistidor'
};

export default function PointsHistoryModal({
  isOpen,
  onClose,
  userName,
  predictions,
  bonus,
  matchesMap,
  competitionId
}: PointsHistoryModalProps) {
  const [teamNamesMap, setTeamNamesMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isOpen || !competitionId) return;
    let cancelled = false;
    getTeamsForCompetition(competitionId).then((teams) => {
      if (cancelled) return;
      const map = new Map<string, string>();
      teams.forEach((t) => map.set(t.id, t.shortName || t.name));
      setTeamNamesMap(map);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, competitionId]);

  const totalFromMatches = predictions.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const totalBonus = bonus?.points ?? 0;
  const total = totalFromMatches + totalBonus;

  const rows = predictions
    .map((pred) => {
      const match = matchesMap.get(pred.matchId);
      if (!match?.result) return null;
      const t1 = teamNamesMap.get(match.team1Id) ?? '?';
      const t2 = teamNamesMap.get(match.team2Id) ?? '?';
      const pts = pred.points ?? 0;
      const bd = pred.pointsBreakdown;
      return {
        matchLabel: `${t1} vs ${t2}`,
        result: `${match.result.team1Score} - ${match.result.team2Score}`,
        prediction: `${pred.team1Score} - ${pred.team2Score}`,
        points: pts,
        breakdown: bd,
        matchNumber: match.matchNumber ?? 0
      };
    })
    .filter(Boolean) as Array<{
      matchLabel: string;
      result: string;
      prediction: string;
      points: number;
      breakdown: Prediction['pointsBreakdown'];
      matchNumber: number;
    }>;

  rows.sort((a, b) => a.matchNumber - b.matchNumber);

  const hasBonusBreakdown =
    bonus?.pointsBreakdown &&
    Object.values(bonus.pointsBreakdown).some((v) => v > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historial de puntos - ${userName}`}>
      <div className="space-y-4">
        {rows.length === 0 && totalBonus === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No hay puntos registrados aún.
          </p>
        ) : (
          <>
            {rows.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Pronósticos de partidos
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Partido
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Resultado
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Pronóstico
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Puntos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-900 whitespace-nowrap">
                            {row.matchLabel}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {row.result}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {row.prediction}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className="font-semibold text-green-600"
                              title={
                                row.breakdown
                                  ? [
                                    row.breakdown.exactScore > 0 &&
                                    `Exacto: ${row.breakdown.exactScore}`,
                                    row.breakdown.winner > 0 &&
                                    `Ganador: ${row.breakdown.winner}`,
                                    row.breakdown.goalDifference > 0 &&
                                    `Diferencia: ${row.breakdown.goalDifference}`
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || undefined
                                  : undefined
                              }
                            >
                              +{row.points}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Haz hover sobre los puntos para ver el detalle (exacto, ganador,
                    diferencia).
                  </p>
                )}
              </div>
            )}

            {totalBonus > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <h4 className="text-sm font-semibold text-amber-800 mb-1">
                  Pronósticos bonus
                </h4>
                <p className="text-amber-900 font-medium">+{totalBonus} pts</p>
                {hasBonusBreakdown && bonus?.pointsBreakdown && (
                  <ul className="mt-2 text-xs text-amber-800 space-y-0.5">
                    {(
                      Object.entries(bonus.pointsBreakdown) as [string, number][]
                    )
                      .filter(([, val]) => val > 0)
                      .map(([key, val]) => (
                        <li key={key}>
                          {BONUS_LABELS[key] ?? key}: +{val}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end border-t pt-3">
              <span className="text-base font-bold text-gray-900">
                Total: {total} pts
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
