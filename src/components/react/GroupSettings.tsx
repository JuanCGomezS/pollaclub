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
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>No hay usuario autenticado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reglas de Puntaje</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Marcador Exacto</span>
            <span className="font-semibold text-gray-900">{groupProp.settings.pointsExactScore} puntos</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-700">Acertar Ganador</span>
            <span className="font-semibold text-gray-900">{groupProp.settings.pointsWinner} puntos</span>
          </div>
          {groupProp.settings.pointsGoalDifference != null && groupProp.settings.pointsGoalDifference > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">Diferencia de Goles</span>
              <span className="font-semibold text-gray-900">{groupProp.settings.pointsGoalDifference} puntos</span>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Las reglas de puntaje no se pueden modificar después de crear el grupo.
        </p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pronósticos Bonus</h2>
        <p className="text-sm text-gray-600 mb-4">
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
                <p className="text-sm text-gray-500 py-2">No hay pronósticos bonus habilitados.</p>
              );
            }
            return enabled.map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                <span className="text-gray-700">{label}</span>
                <span className="font-semibold text-gray-900">{value} puntos</span>
              </div>
            ));
          })()}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Estado del Grupo</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-700">
              El grupo está actualmente{' '}
              <span className="font-semibold">{groupProp.isActive ? 'activo' : 'inactivo'}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {groupProp.isActive
                ? 'Los participantes pueden hacer pronósticos y ver resultados.'
                : 'El grupo está pausado.'}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Participantes</h2>
        <p className="text-gray-700 mb-4">
          Total de participantes: <span className="font-semibold">{groupProp.participants.length}</span>
        </p>
      </section>
    </div>
  );
}
