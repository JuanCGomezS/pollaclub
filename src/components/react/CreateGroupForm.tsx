import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createGroup, canUserCreateGroups, getUserGroupPlan } from '../../lib/groups';
import { getCompetitions } from '../../lib/competitions';
import { getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { Competition, Group } from '../../lib/types';

export default function CreateGroupForm() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ planName: string; maxParticipants: number; slots: number } | null>(null);
  
  const [formData, setFormData] = useState({
    competitionId: '',
    name: '',
    pointsExactScore: '2',
    pointsWinner: '1',
    pointsGoalDifference: '1',
    pointsWinnerBonus: '0',
    pointsRunnerUp: '0',
    pointsThirdPlace: '0',
    pointsTopScorer: '0',
    pointsTopAssister: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      const [competitionsData, hasPermission] = await Promise.all([
        getCompetitions(),
        canUserCreateGroups(user.uid)
      ]);

      const userPlanInfo = await getUserGroupPlan(user.uid);
      setPlanInfo(userPlanInfo);

      if (!hasPermission) {
        setError('No tienes permiso para crear grupos');
        setLoading(false);
        return;
      }

      setCompetitions(competitionsData);
      setCanCreate(true);
      
      // Seleccionar la primera competición por defecto
      if (competitionsData.length > 0) {
        setFormData(prev => ({ ...prev, competitionId: competitionsData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // Verificar permiso nuevamente
      const hasPermission = await canUserCreateGroups(user.uid);
      if (!hasPermission) {
        throw new Error('No tienes permiso para crear grupos');
      }

      const pointsExactScore = parseInt(formData.pointsExactScore, 10) || 0;
      const pointsWinner = parseInt(formData.pointsWinner, 10) || 0;
      const pointsGoalDifference = parseInt(formData.pointsGoalDifference, 10) || 0;
      const pointsWinnerBonus = parseInt(formData.pointsWinnerBonus, 10) || 0;
      const pointsRunnerUp = parseInt(formData.pointsRunnerUp, 10) || 0;
      const pointsThirdPlace = parseInt(formData.pointsThirdPlace, 10) || 0;
      const pointsTopScorer = parseInt(formData.pointsTopScorer, 10) || 0;
      const pointsTopAssister = parseInt(formData.pointsTopAssister, 10) || 0;

      if (pointsExactScore < 1) throw new Error('Los puntos por marcador exacto deben ser al menos 1');
      if (pointsWinner < 1) throw new Error('Los puntos por acertar ganador deben ser al menos 1');

      const settings: Group['settings'] = {
        pointsExactScore,
        pointsWinner,
        ...(pointsGoalDifference > 0 && { pointsGoalDifference }),
        ...(pointsWinnerBonus > 0 && { pointsWinnerBonus }),
        ...(pointsRunnerUp > 0 && { pointsRunnerUp }),
        ...(pointsThirdPlace > 0 && { pointsThirdPlace }),
        ...(pointsTopScorer > 0 && { pointsTopScorer }),
        ...(pointsTopAssister > 0 && { pointsTopAssister })
      };

      const { groupId } = await createGroup(
        formData.competitionId,
        formData.name,
        user.uid,
        settings
      );

      // Redirigir al grupo creado
      window.location.href = getRoute(`/groups/dashboard?groupId=${groupId}&tab=predictions`);
    } catch (err: any) {
      setError(err.message || 'Error al crear grupo');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pc-accent)] mx-auto"></div>
          <p className="mt-4 text-[color:var(--pc-muted)]">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-900/40 border border-red-500/60 text-red-100 rounded">
        <p>No tienes permiso para crear grupos.</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-yellow-900/30 border border-yellow-500/60 text-yellow-100 rounded">
        <p>No hay competiciones disponibles. Contacta al administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <h1 className="text-3xl font-bold text-[color:var(--pc-text-on-dark)] mb-6">
        Crear Nuevo Grupo
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/60 text-red-100 rounded">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-[color:var(--pc-surface)]/80 p-6 rounded-lg shadow-md border border-[color:var(--pc-main-dark)]/60"
      >
        {planInfo && (
          <div className="p-3 rounded-md border border-[color:var(--pc-accent)]/60 bg-[color:var(--pc-main-dark)]/40 text-sm text-[color:var(--pc-muted)]">
            <p>
              <strong className="text-[color:var(--pc-text-on-dark)]">Plan activo:</strong> {planInfo.planName}
            </p>
            <p>
              <strong className="text-[color:var(--pc-text-on-dark)]">Máximo de participantes:</strong> {planInfo.maxParticipants}
            </p>
            <p>
              <strong className="text-[color:var(--pc-text-on-dark)]">Grupos disponibles para crear:</strong> {planInfo.slots}
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="competitionId"
            className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
          >
            Competición *
          </label>
          <select
            id="competitionId"
            value={formData.competitionId}
            onChange={(e) => setFormData(prev => ({ ...prev, competitionId: e.target.value }))}
            className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
            required
          >
            <option value="">Selecciona una competición</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
          >
            Nombre del Grupo *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
            placeholder="Ej: Amigos del trabajo"
            required
            minLength={3}
            maxLength={50}
          />
        </div>

        <div className="border-t border-[color:var(--pc-main-dark)]/60 pt-4">
          <h2 className="text-lg font-semibold text-[color:var(--pc-text-on-dark)] mb-4">
            Configuración de Puntos
          </h2>
          
          <div className="space-y-4">
            <div>
              <label
                htmlFor="pointsExactScore"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Marcador Exacto *
              </label>
              <input
                type="number"
                id="pointsExactScore"
                value={formData.pointsExactScore}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsExactScore: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="1"
                max="20"
                required
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el resultado exacto (ej: 2-1)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsWinner"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Ganador *
              </label>
              <input
                type="number"
                id="pointsWinner"
                value={formData.pointsWinner}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsWinner: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="1"
                max="10"
                required
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar quién gana (sin acertar marcador)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsGoalDifference"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Diferencia de Goles (Opcional)
              </label>
              <input
                type="number"
                id="pointsGoalDifference"
                value={formData.pointsGoalDifference}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsGoalDifference: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="5"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos adicionales por acertar la diferencia de goles (0 para desactivar)
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[color:var(--pc-main-dark)]/60 pt-4">
          <h2 className="text-lg font-semibold text-[color:var(--pc-text-on-dark)] mb-4">
            Pronósticos Bonus (Opcional)
          </h2>
          <p className="text-sm text-[color:var(--pc-muted)] mb-4">
            Configura los puntos para pronósticos bonus. Si dejas el valor en 0, esa opción no estará disponible para los participantes.
          </p>
          
          <div className="space-y-4">
            <div>
              <label
                htmlFor="pointsWinnerBonus"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Ganador de la Competición
              </label>
              <input
                type="number"
                id="pointsWinnerBonus"
                value={formData.pointsWinnerBonus}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsWinnerBonus: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="50"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el ganador final de la competición (0 para desactivar)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsRunnerUp"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Segundo Lugar
              </label>
              <input
                type="number"
                id="pointsRunnerUp"
                value={formData.pointsRunnerUp}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsRunnerUp: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="50"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el segundo lugar (0 para desactivar)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsThirdPlace"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Tercer Lugar
              </label>
              <input
                type="number"
                id="pointsThirdPlace"
                value={formData.pointsThirdPlace}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsThirdPlace: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="50"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el tercer lugar (0 para desactivar)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsTopScorer"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Máximo Goleador
              </label>
              <input
                type="number"
                id="pointsTopScorer"
                value={formData.pointsTopScorer}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsTopScorer: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="50"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el máximo goleador (0 para desactivar)
              </p>
            </div>

            <div>
              <label
                htmlFor="pointsTopAssister"
                className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
              >
                Puntos por Acertar Máximo Asistidor
              </label>
              <input
                type="number"
                id="pointsTopAssister"
                value={formData.pointsTopAssister}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsTopAssister: e.target.value }))}
                className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
                min="0"
                max="50"
              />
              <p className="mt-1 text-xs text-[color:var(--pc-muted)]">
                Puntos por acertar el máximo asistidor (0 para desactivar)
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] py-2 px-4 rounded-md hover:bg-[color:var(--pc-accent-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creando...' : 'Crear Grupo'}
          </button>
          <a
            href={getRoute('/groups')}
            className="flex-1 bg-[color:var(--pc-main-dark)] text-[color:var(--pc-text-on-dark)] py-2 px-4 rounded-md hover:bg-[color:var(--pc-main)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-main-dark)] text-center"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
