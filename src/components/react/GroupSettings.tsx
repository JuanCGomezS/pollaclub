import { getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { Group } from '../../lib/types';

interface GroupSettingsProps {
  groupId: string;
  group: Group;
}

export default function GroupSettings({ groupId, group: groupProp }: GroupSettingsProps) {
  const user = getCurrentUser();

  if (!user) {
    return (
      <div className="p-6 bg-red-900/40 border border-red-500/60 text-red-100 rounded">
        <p>No hay usuario autenticado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-[color:var(--pc-surface)]/80 p-6 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
        <h2 className="text-xl font-bold text-[color:var(--pc-text-on-dark)] mb-4">Reglas de Puntaje</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-[color:var(--pc-main-dark)]/60">
            <span className="text-[color:var(--pc-muted)]">Marcador Exacto</span>
            <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
              {groupProp.settings.pointsExactScore} puntos
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[color:var(--pc-main-dark)]/60">
            <span className="text-[color:var(--pc-muted)]">Acertar Ganador</span>
            <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
              {groupProp.settings.pointsWinner} puntos
            </span>
          </div>
          {groupProp.settings.pointsGoalDifference != null && groupProp.settings.pointsGoalDifference > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-[color:var(--pc-main-dark)]/60">
              <span className="text-[color:var(--pc-muted)]">Diferencia de Goles</span>
              <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
                {groupProp.settings.pointsGoalDifference} puntos
              </span>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-[color:var(--pc-muted)]">
          Las reglas de puntaje no se pueden modificar después de crear el grupo.
        </p>
      </section>

      <section className="bg-[color:var(--pc-surface)]/80 p-6 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
        <h2 className="text-xl font-bold text-[color:var(--pc-text-on-dark)] mb-4">Pronósticos Bonus</h2>
        <p className="text-sm text-[color:var(--pc-muted)] mb-4">
          Opciones habilitadas para este grupo. Las que tienen 0 puntos no están activas.
        </p>
        <div className="space-y-3">
          {(() => {
            const s = groupProp.settings;
            const items: { label: string; value: number | undefined }[] = [
              { label: 'Ganador de la competición', value: s.pointsWinnerBonus },
              { label: 'Segundo lugar', value: s.pointsRunnerUp },
              { label: 'Tercer lugar', value: s.pointsThirdPlace },
              { label: 'Máximo goleador', value: s.pointsTopScorer },
              { label: 'Máximo asistidor', value: s.pointsTopAssister }
            ];
            const enabled = items.filter((i) => i.value != null && i.value > 0);
            if (enabled.length === 0) {
              return (
                <p className="text-sm text-[color:var(--pc-muted)] py-2">
                  No hay pronósticos bonus habilitados.
                </p>
              );
            }
            return enabled.map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2 border-b border-[color:var(--pc-main-dark)]/60 last:border-0"
              >
                <span className="text-[color:var(--pc-muted)]">{label}</span>
                <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
                  {value} puntos
                </span>
              </div>
            ));
          })()}
        </div>
      </section>

      <section className="bg-[color:var(--pc-surface)]/80 p-6 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
        <h2 className="text-xl font-bold text-[color:var(--pc-text-on-dark)] mb-4">Estado del Grupo</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[color:var(--pc-muted)]">
              El grupo está actualmente{' '}
              <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
                {groupProp.isActive ? 'activo' : 'inactivo'}
              </span>
            </p>
            <p className="text-sm text-[color:var(--pc-muted)] mt-1">
              {groupProp.isActive
                ? 'Los participantes pueden hacer pronósticos y ver resultados.'
                : 'El grupo está pausado.'}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--pc-surface)]/80 p-6 rounded-lg shadow border border-[color:var(--pc-main-dark)]/60">
        <h2 className="text-xl font-bold text-[color:var(--pc-text-on-dark)] mb-4">Participantes</h2>
        <p className="text-[color:var(--pc-muted)] mb-4">
          Total de participantes:{' '}
          <span className="font-semibold text-[color:var(--pc-text-on-dark)]">
            {groupProp.participants.length}
          </span>
        </p>
      </section>
    </div>
  );
}
