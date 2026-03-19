import { useEffect, useState } from 'react';
import { getTeamsForCompetition } from '../../lib/competition-data';
import type { BonusPrediction, Match, Prediction } from '../../lib/types';
import Modal from './Modal';

interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  avatarUrl?: string;
  predictions: Prediction[];
  bonus: BonusPrediction | undefined;
  matchesMap: Map<string, Match>;
  competitionId: string;
}

function getInitial(nameOrEmail: string): string {
  const s = (nameOrEmail || 'U').trim();
  return s[0].toUpperCase();
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
  avatarUrl,
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
      teams.forEach((t) => map.set(t.id, t.name || t.shortName || '?'));
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

  const modalTitle = (
    <div className="flex items-center gap-3">
      <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-[color:var(--pc-main-dark)]/60 text-[color:var(--pc-muted)] font-semibold text-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          getInitial(userName)
        )}
      </span>
      <span className="text-[color:var(--pc-text-on-dark)]">
        Historial de puntos - {userName}
      </span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <div className="space-y-4">
        {rows.length === 0 && totalBonus === 0 ? (
          <p className="text-[color:var(--pc-muted)] text-center py-4">
            No hay puntos registrados aún.
          </p>
        ) : (
          <>
            {rows.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[color:var(--pc-text-on-dark)] mb-2">
                  Pronósticos de partidos
                </h4>
                {rows.length > 0 && (
                  <p className="my-2 text-xs text-[color:var(--pc-muted)]">
                    Haz hover sobre los puntos para ver el detalle (exacto, ganador,
                    diferencia).
                  </p>
                )}
                <div className="overflow-x-auto rounded-lg border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80">
                  <table className="min-w-full divide-y divide-[color:var(--pc-main-dark)]/60 text-sm">
                    <thead className="bg-[color:var(--pc-main-dark)]/60">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                          Partido
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                          Resultado
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                          Pronóstico
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                          Puntos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-[color:var(--pc-surface)] divide-y divide-[color:var(--pc-main-dark)]/40">
                      {rows.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-[color:var(--pc-text-on-dark)] whitespace-nowrap">
                            {row.matchLabel}
                          </td>
                          <td className="px-3 py-2 text-center text-[color:var(--pc-muted)]">
                            {row.result}
                          </td>
                          <td className="px-3 py-2 text-center text-[color:var(--pc-muted)]">
                            {row.prediction}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className="font-semibold text-[color:var(--pc-accent)]"
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
              </div>
            )}

            {totalBonus > 0 && (
              <div className="rounded-lg border border-[color:var(--pc-accent)]/70 bg-[color:var(--pc-main-dark)]/40 p-3">
                <h4 className="text-sm font-semibold text-[color:var(--pc-text-on-dark)] mb-1">
                  Pronósticos bonus
                </h4>
                <p className="text-[color:var(--pc-accent)] font-medium">+{totalBonus} pts</p>
                {hasBonusBreakdown && bonus?.pointsBreakdown && (
                  <ul className="mt-2 text-xs text-[color:var(--pc-muted)] space-y-0.5">
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

            <div className="flex justify-end border-t border-[color:var(--pc-main-dark)]/60 pt-3">
              <span className="text-base font-bold text-[color:var(--pc-text-on-dark)]">
                Total: {total} pts
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
