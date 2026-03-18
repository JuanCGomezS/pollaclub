import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../../lib/auth';
import {
  getBonusPrediction,
  saveBonusPrediction,
  isBonusLocked,
  hasAnyBonus,
  type BonusPredictionInput
} from '../../lib/bonus-predictions';
import { getCompetition } from '../../lib/competitions';
import { getTeamNames, getPlayerNames } from '../../lib/competition-data';
import type { Group, Competition } from '../../lib/types';

interface BonusPredictionsFormProps {
  groupId: string;
  group: Group;
}

function filterOptions(options: string[], query: string): string[] {
  if (!query.trim()) return options;
  const q = query.trim().toLowerCase();
  return options.filter((opt) => opt.toLowerCase().includes(q));
}

function FilterableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...'
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = filterOptions(options, filter);

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
        <span className={value ? '' : 'text-[color:var(--pc-muted)]'}>{value || placeholder}</span>
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
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setFilter('');
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[color:var(--pc-main-dark)]/40 ${
                    value === opt ? 'bg-[color:var(--pc-main)]/40 font-medium' : ''
                  }`}
                >
                  {opt}
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
  
  // Listas dinámicas de equipos y jugadores desde Firestore/cache
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [playerOptions, setPlayerOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

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
          getPlayerNames(group.competitionId)
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

  if (locked) {
    return (
      <section className="bg-[color:var(--pc-surface)]/80 p-5 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
        <h2 className="text-lg font-bold text-[color:var(--pc-text-on-dark)] mb-2">Pronósticos bonus</h2>
        <p className="text-[color:var(--pc-muted)] text-sm">
          Los pronósticos bonus están cerrados. No se pueden enviar ni modificar.
        </p>
        {existing && (
          <div className="mt-4 p-3 bg-[color:var(--pc-main-dark)]/40 rounded-lg text-sm space-y-1">
            {existing.winner && (
              <p>
                <span className="text-[color:var(--pc-muted)]">Ganador:</span> {existing.winner}
              </p>
            )}
            {existing.runnerUp && (
              <p>
                <span className="text-[color:var(--pc-muted)]">Subcampeón:</span> {existing.runnerUp}
              </p>
            )}
            {existing.thirdPlace && (
              <p>
                <span className="text-[color:var(--pc-muted)]">Tercero:</span> {existing.thirdPlace}
              </p>
            )}
            {existing.topScorer && (
              <p>
                <span className="text-[color:var(--pc-muted)]">Goleador:</span> {existing.topScorer}
              </p>
            )}
            {existing.topAssister && (
              <p>
                <span className="text-[color:var(--pc-muted)]">Máximo asistidor:</span> {existing.topAssister}
              </p>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="bg-[color:var(--pc-surface)]/80 p-5 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
      <h2 className="text-lg font-bold text-[color:var(--pc-text-on-dark)] mb-1">Pronósticos bonus</h2>
      <p className="text-[color:var(--pc-muted)] text-sm mb-4">
        Pronósticos globales de la competición. Puedes filtrar cada lista escribiendo en el cuadro.
      </p>
      {lockedAt && (
        <p className="text-[color:var(--pc-muted)] text-sm mb-4">
          Los pronósticos se cerrarán el {lockedAt.toLocaleDateString()} a las {lockedAt.toLocaleTimeString()}.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {b.hasWinner && (
            <FilterableSelect
              label="Ganador de la competición"
              options={teamOptions}
              value={form.winner ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, winner: v }))}
              placeholder="Seleccionar equipo"
            />
          )}
          {b.hasRunnerUp && (
            <FilterableSelect
              label="Subcampeón"
              options={teamOptions}
              value={form.runnerUp ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, runnerUp: v }))}
              placeholder="Seleccionar equipo"
            />
          )}
          {b.hasThirdPlace && (
            <FilterableSelect
              label="Tercer lugar"
              options={teamOptions}
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
          {(b.hasTopAssister || b.hasTopScorer) && (
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
    </section>
  );
}
