import { useEffect, useRef, useState } from 'react';
import { batchGetUsers, getCurrentUser } from '../../lib/auth';
import {
  getBonusPrediction,
  getBonusPredictionsForGroup,
  hasAnyBonus,
  isBonusLocked,
  saveBonusPrediction,
  type BonusPredictionInput
} from '../../lib/bonus-predictions';
import { getPlayerOptionsWithTeam, getTeamNames } from '../../lib/competition-data';
import { getCompetition } from '../../lib/competitions';
import type { BonusPrediction, Competition, Group } from '../../lib/types';
import Modal from './Modal';

interface BonusPredictionsFormProps {
  groupId: string;
  group: Group;
}

type SelectOption = { label: string; value: string };

function filterOptions(options: SelectOption[], query: string): SelectOption[] {
  if (!query.trim()) return options;
  const q = query.trim().toLowerCase();
  return options.filter((opt) => opt.label.toLowerCase().includes(q));
}

function FilterableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...'
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = filterOptions(options, filter);
  const selectedLabel = value ? options.find((o) => o.value === value)?.label : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-lg bg-[color:var(--pc-surface)] text-left text-[color:var(--pc-text-on-dark)] focus:ring-2 focus:ring-[color:var(--pc-accent)] focus:border-[color:var(--pc-accent)]"
      >
        <span className={value ? '' : 'text-[color:var(--pc-muted)]'}>{value ? selectedLabel ?? value : placeholder}</span>
        <span className="text-[color:var(--pc-muted)]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[color:var(--pc-main-dark)]/70 bg-[color:var(--pc-surface)] shadow-lg max-h-56 flex flex-col">
          <input
            type="text"
            placeholder="Filtrar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mx-2 mt-2 py-1.5 px-2 border border-[color:var(--pc-main-dark)]/60 rounded text-sm bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)]"
            autoFocus
          />
          <ul className="overflow-auto py-1 max-h-44">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setFilter('');
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-[color:var(--pc-muted)] hover:bg-[color:var(--pc-main-dark)]/40"
              >
                — Ninguno —
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setFilter('');
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--pc-main-dark)]/40 ${
                    value === opt.value ? 'bg-[color:var(--pc-main)]/40 font-medium' : ''
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-[color:var(--pc-muted)]">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function BonusPredictionsForm({ groupId, group }: BonusPredictionsFormProps) {
  const user = getCurrentUser();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [lockedAt, setLockedAt] = useState<Date | null>(null);
  const [existing, setExisting] = useState<BonusPredictionInput | null>(null);
  const [form, setForm] = useState<BonusPredictionInput>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [playerOptions, setPlayerOptions] = useState<SelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [isAllBonusModalOpen, setIsAllBonusModalOpen] = useState(false);
  const [allBonusLoading, setAllBonusLoading] = useState(false);
  const [allBonusError, setAllBonusError] = useState('');
  const [allBonusRows, setAllBonusRows] = useState<
    Array<{
      userId: string;
      userName: string;
      avatarUrl?: string;
      bonus?: BonusPrediction;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !group) return;
      try {
        const [comp, {isLocked, lockedAt}, pred, teams, players] = await Promise.all([
          getCompetition(group.competitionId),
          isBonusLocked(group.competitionId),
          getBonusPrediction(groupId, user.uid),
          getTeamNames(group.competitionId),
          getPlayerOptionsWithTeam(group.competitionId)
        ]);
        if (cancelled) return;
        setCompetition(comp ?? null);
        setLocked(isLocked);
        setLockedAt(lockedAt ?? null);
        setTeamOptions(teams);
        setPlayerOptions(players);
        setOptionsLoading(false);
        if (pred) {
          const data: BonusPredictionInput = {
            winner: pred.winner ?? '',
            runnerUp: pred.runnerUp ?? '',
            thirdPlace: pred.thirdPlace ?? '',
            topScorer: pred.topScorer ?? '',
            topAssister: pred.topAssister ?? ''
          };
          setExisting(data);
          setForm(data);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Error al cargar');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, group?.competitionId, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    async function loadAllBonus() {
      if (!isAllBonusModalOpen) return;
      setAllBonusLoading(true);
      setAllBonusError('');
      try {
        const allUserIds = [...new Set([...group.participants, group.adminUid])];
        const [usersMap, bonusList] = await Promise.all([
          batchGetUsers(allUserIds),
          getBonusPredictionsForGroup(groupId)
        ]);

        if (cancelled) return;

        const bonusByUserId = new Map<string, BonusPrediction>();
        bonusList.forEach((b) => {
          if (b.userId) bonusByUserId.set(b.userId, b);
        });

        const rows = allUserIds.map((uid) => {
          const u = usersMap.get(uid);
          const userName = u?.displayName ?? `Usuario ${uid.substring(0, 8)}...`;
          return {
            userId: uid,
            userName,
            avatarUrl: u?.avatarUrl,
            bonus: bonusByUserId.get(uid)
          };
        });

        rows.sort((a, b) => a.userName.localeCompare(b.userName));
        setAllBonusRows(rows);
      } catch (e) {
        if (!cancelled) {
          setAllBonusError(e instanceof Error ? e.message : 'Error al cargar pronósticos bonus');
        }
      } finally {
        if (!cancelled) setAllBonusLoading(false);
      }
    }

    loadAllBonus();
    return () => {
      cancelled = true;
    };
  }, [isAllBonusModalOpen, group.adminUid, group.participants, groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || locked === true) return;
    setSaving(true);
    try {
      await saveBonusPrediction(groupId, user.uid, form);
      setExisting({ ...form });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  if (loadError) {
    return (
      <div className="p-4 bg-yellow-900/30 border border-yellow-500/60 rounded-lg text-yellow-100 text-sm">
        {loadError}
      </div>
    );
  }
  if (competition === null || locked === null || optionsLoading) {
    return (
      <div className="p-4 bg-[color:var(--pc-surface)]/80 rounded-lg flex items-center gap-2 border border-[color:var(--pc-main-dark)]/60">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[color:var(--pc-accent)] border-t-transparent" />
        <span className="text-[color:var(--pc-muted)]">Cargando pronósticos bonus...</span>
      </div>
    );
  }
  if (!hasAnyBonus(competition)) return null;

  const b = competition.bonusSettings;
  const display = locked ? existing ?? {} : form;

  const modalTitle = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[color:var(--pc-text-on-dark)]">Pronósticos bonus del grupo</span>
    </div>
  );

  function getInitial(nameOrEmail: string): string {
    const s = (nameOrEmail || 'U').trim();
    return s[0].toUpperCase();
  }

  function CrownIcon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4 4 5-8 5 8 4-4v12H3V8z" />
      </svg>
    );
  }

  function BallIcon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.8 2.8 2.8 14.2 0 18M12 3c-2.8 2.8-2.8 14.2 0 18" />
      </svg>
    );
  }

  function PodiumCard({ rank, value }: { rank: 1 | 2 | 3; value?: string }) {
    const v = value?.trim() ? value : 'Por definir';
    const isWinner = rank === 1;
    const icon = isWinner ? <CrownIcon className="h-5 w-5" /> : <BallIcon className="h-5 w-5" />;

    return (
      <div
        className={`rounded-2xl border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80 px-4 py-5 shadow-sm h-[180px] flex flex-col items-center justify-center text-center ${
          isWinner ? 'ring-1 ring-[color:var(--pc-accent)]/40' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-[color:var(--pc-muted)] text-sm font-medium">
          <span className={isWinner ? 'text-[color:var(--pc-accent)]' : 'text-[color:var(--pc-muted)]'}>{icon}</span>
          Por definir
        </div>
        <div className="mt-2 text-[color:var(--pc-text-on-dark)] text-2xl font-bold">{rank}</div>
        <div className="mt-3 text-[color:var(--pc-text-on-dark)] text-xl sm:text-2xl font-semibold tracking-tight leading-tight">
          {v}
        </div>
      </div>
    );
  }

  function BonusCard({
    title,
    value,
    icon,
    accent
  }: {
    title: React.ReactNode;
    value?: string;
    icon?: React.ReactNode;
    accent?: boolean;
  }) {
    const v = value?.trim() ? value : 'Por definir';
    return (
      <div
        className={`rounded-2xl border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80 px-4 py-5 shadow-sm h-[180px] flex flex-col items-center justify-center text-center ${
          accent ? 'ring-1 ring-[color:var(--pc-accent)]/40' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-[color:var(--pc-muted)] text-sm font-medium">
          {icon ? <span className="text-[color:var(--pc-accent)]">{icon}</span> : null}
          {title}
        </div>
        <div className="mt-3 text-[color:var(--pc-text-on-dark)] text-2xl font-semibold tracking-tight leading-tight">
          {v}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-[color:var(--pc-surface)]/80 p-5 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[color:var(--pc-text-on-dark)] mb-1">Pronósticos bonus</h2>
          {!locked && lockedAt && (
            <p className="text-[color:var(--pc-accent)] text-sm mt-1">
              Se cierran el {lockedAt.toLocaleDateString()} a las {lockedAt.toLocaleTimeString()}.
            </p>
          )}
        </div>

        {locked && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsAllBonusModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[color:var(--pc-main-dark)]/70 bg-[color:var(--pc-main-dark)]/40 text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main-dark)]/55 focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
            >
              Consultar pronósticos bonus
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        {(b.hasWinner || b.hasRunnerUp || b.hasThirdPlace) && (
          <div className="grid gap-4">
            {b.hasWinner && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <PodiumCard rank={1} value={display.winner} />
                </div>
              </div>
            )}

            {(b.hasRunnerUp || b.hasThirdPlace) && (
              <div className="grid grid-cols-2 gap-4 items-stretch">
                <div className="w-full">
                  {b.hasRunnerUp && (
                    <PodiumCard rank={2} value={display.runnerUp} />
                  )}
                </div>
                <div className="w-full">
                  {b.hasThirdPlace && (
                    <PodiumCard rank={3} value={display.thirdPlace} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {b.hasTopScorer && (
            <BonusCard title="Por definir Goleador" value={display.topScorer} icon={<BallIcon className="h-5 w-5" />} />
          )}
          {b.hasTopAssister && (
            <BonusCard title="Por definir Asistidor" value={display.topAssister} icon={<BallIcon className="h-5 w-5" />} />
          )}
        </div>
      </div>

      {!locked && (
        <div className="mt-6">
          <p className="text-[color:var(--pc-muted)] text-sm mb-4">
            Pronósticos globales de la competición. Puedes filtrar cada lista escribiendo en el cuadro.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {b.hasWinner && (
                <FilterableSelect
                  label="Ganador de la competición"
                  options={teamOptions.map((t) => ({ label: t, value: t }))}
                  value={form.winner ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, winner: v }))}
                  placeholder="Seleccionar equipo"
                />
              )}
              {b.hasRunnerUp && (
                <FilterableSelect
                  label="Subcampeón"
                  options={teamOptions.map((t) => ({ label: t, value: t }))}
                  value={form.runnerUp ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, runnerUp: v }))}
                  placeholder="Seleccionar equipo"
                />
              )}
              {b.hasThirdPlace && (
                <FilterableSelect
                  label="Tercer lugar"
                  options={teamOptions.map((t) => ({ label: t, value: t }))}
                  value={form.thirdPlace ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, thirdPlace: v }))}
                  placeholder="Seleccionar equipo"
                />
              )}
              {b.hasTopScorer && (
                <FilterableSelect
                  label="Goleador"
                  options={playerOptions}
                  value={form.topScorer ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, topScorer: v }))}
                  placeholder="Seleccionar jugador"
                />
              )}
              {b.hasTopAssister && (
                <FilterableSelect
                  label="Máximo asistidor"
                  options={playerOptions}
                  value={form.topAssister ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, topAssister: v }))}
                  placeholder="Seleccionar jugador"
                />
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] font-semibold rounded-lg hover:bg-[color:var(--pc-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : existing ? 'Actualizar pronósticos bonus' : 'Guardar pronósticos bonus'}
              </button>
            </div>
          </form>
        </div>
      )}

      <Modal isOpen={isAllBonusModalOpen} onClose={() => setIsAllBonusModalOpen(false)} title={modalTitle}>
        {allBonusLoading ? (
          <div className="p-4 flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[color:var(--pc-accent)] border-t-transparent" />
            <span className="text-[color:var(--pc-muted)]">Cargando pronósticos bonus del grupo...</span>
          </div>
        ) : allBonusError ? (
          <div className="p-4 bg-yellow-900/30 border border-yellow-500/60 rounded-lg text-yellow-100 text-sm">
            {allBonusError}
          </div>
        ) : allBonusRows.length === 0 ? (
          <p className="text-[color:var(--pc-muted)] text-center py-4">No hay participantes en este grupo.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/80">
            <table className="min-w-full divide-y divide-[color:var(--pc-main-dark)]/60 text-sm">
              <thead className="bg-[color:var(--pc-main-dark)]/60">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    Participante
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    1 lugar
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    2 lugar
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    3 lugar
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    Goleador
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    Asistidor
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[color:var(--pc-muted)] uppercase">
                    Puntaje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[color:var(--pc-surface)] divide-y divide-[color:var(--pc-main-dark)]/40">
                {allBonusRows.map((row, idx) => (
                  <tr key={row.userId}>
                    <td className="px-3 py-2 text-[color:var(--pc-text-on-dark)] whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-text-on-dark)] whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-[color:var(--pc-main-dark)]/60 text-[color:var(--pc-muted)] font-semibold text-xs">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitial(row.userName)
                          )}
                        </span>
                        <span>{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-muted)] whitespace-nowrap">
                      {row.bonus?.winner ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-muted)] whitespace-nowrap">
                      {row.bonus?.runnerUp ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-muted)] whitespace-nowrap">
                      {row.bonus?.thirdPlace ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-muted)] whitespace-nowrap">
                      {row.bonus?.topScorer
                        ? playerOptions.find((o) => o.value === row.bonus?.topScorer)?.label ?? row.bonus?.topScorer
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--pc-muted)] whitespace-nowrap">
                      {row.bonus?.topAssister
                        ? playerOptions.find((o) => o.value === row.bonus?.topAssister)?.label ?? row.bonus?.topAssister
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className={`font-semibold ${(row.bonus?.points ?? 0) > 0 ? 'text-[color:var(--pc-accent)]' : 'text-[color:var(--pc-muted)]'}`}>
                        {row.bonus?.points ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  );
}
