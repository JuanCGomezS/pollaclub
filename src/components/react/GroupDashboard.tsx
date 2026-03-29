import { useEffect, useState } from 'react';
import { getGroup, isGroupAdmin } from '../../lib/groups';
import { getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import PredictionsView from './PredictionsView';
import GroupLeaderboard from './GroupLeaderboard';
import GroupSettings from './GroupSettings';
import type { Group } from '../../lib/types';

// Función para leer query params (se ejecuta inmediatamente, fuera del componente)
function getInitialParams() {
  if (typeof window === 'undefined') {
    return { groupId: null, tab: 'predictions' as const };
  }
  const params = new URLSearchParams(window.location.search);
  const gId = params.get('groupId');
  const tab = params.get('tab') as 'predictions' | 'participants' | 'settings' | null;
  return {
    groupId: gId,
    tab: tab || 'predictions'
  };
}

export default function GroupDashboard() {
  // Inicializar estado directamente desde query params (se ejecuta una sola vez al montar)
  const initialParams = getInitialParams();
  const [groupId, setGroupId] = useState<string | null>(initialParams.groupId);
  const [activeTab, setActiveTab] = useState<'predictions' | 'participants' | 'settings'>(initialParams.tab);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [paramsChecked, setParamsChecked] = useState(false);

  useEffect(() => {
    // Leer query params de la URL (por si cambian sin recargar)
    const params = new URLSearchParams(window.location.search);
    const gId = params.get('groupId');
    const tab = params.get('tab') as 'predictions' | 'participants' | 'settings' | null;

    if (!gId) {
      setError('No se especificó un grupo');
      setLoading(false);
      setParamsChecked(true);
      return;
    }

    setGroupId(gId);
    setActiveTab(tab || 'predictions');
    setParamsChecked(true);
  }, []);

  useEffect(() => {
    if (groupId && paramsChecked) {
      loadGroup();
    }
  }, [groupId, paramsChecked]);

  const loadGroup = async () => {
    if (!groupId) return;

    try {
      const user = getCurrentUser();
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      const groupData = await getGroup(groupId);
      if (!groupData) {
        setError('Grupo no encontrado');
        setLoading(false);
        return;
      }

      const isParticipant =
        groupData.participants.includes(user.uid) || groupData.adminUid === user.uid;
      if (!isParticipant) {
        setError('No eres participante de este grupo');
        setLoading(false);
        return;
      }

      setGroup(groupData);
      setUserIsAdmin(isGroupAdmin(groupData, user.uid));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar grupo');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifican los params o se carga el grupo
  if (!paramsChecked || (groupId && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pc-accent)] mx-auto" />
          <p className="mt-4 text-[color:var(--pc-muted)]">Cargando grupo...</p>
        </div>
      </div>
    );
  }

  // Solo mostrar error si ya se verificaron los params y no hay groupId
  if (!groupId) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 rounded-xl border border-[color:var(--pc-accent)]/60 bg-[color:var(--pc-surface)]/80 text-[color:var(--pc-muted)]">
        <p>No se especificó un grupo. Por favor, selecciona un grupo desde la lista.</p>
        <a href={getRoute('/groups')} className="mt-4 inline-block text-[color:var(--pc-accent)] hover:text-[color:var(--pc-accent-dark)]">
          Ir a mis grupos
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 rounded-xl border border-red-500/60 bg-red-900/40 text-red-100">
        <p>{error}</p>
        <a href={getRoute('/groups')} className="mt-4 inline-block text-[color:var(--pc-accent)] hover:text-[color:var(--pc-accent-dark)]">
          Volver a mis grupos
        </a>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6 bg-[color:var(--pc-surface)]/40">
      <div className="mb-4 flex justify-end">
        <a
          href={getRoute('/groups')}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--pc-main-dark)]/60 bg-[color:var(--pc-surface)]/60 px-3 py-2 text-sm font-medium text-[color:var(--pc-muted)] transition hover:border-[color:var(--pc-accent)]/50 hover:text-[color:var(--pc-accent)]"
        >
          <span aria-hidden>←</span>
          Volver a mis grupos
        </a>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-start">
          {group.logoUrl && (
            <div
              className="absolute inset-0 opacity-10 bg-center bg-cover bg-no-repeat pointer-events-none"
              style={{ backgroundImage: `url(${group.logoUrl})` }}
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--pc-text-on-dark)]">{group.name}</h1>
            <p className="text-[color:var(--pc-muted)] mt-1">
              Código:{' '}
              <span className="font-mono font-semibold text-[color:var(--pc-accent)]">
                {group.code}
              </span>
            </p>
            <p className="text-[color:var(--pc-muted)] mt-1">participantes: {group.participants.length} / {group.maxParticipants}</p>
          </div>
          <div className="text-right">
            {group.isActive ? (
              <span className="px-3 py-1 text-sm rounded-full bg-[color:var(--pc-main)]/20 text-[color:var(--pc-accent)] border border-[color:var(--pc-main)]/60">
                Activo
              </span>
            ) : (
              <span className="px-3 py-1 text-sm rounded-full bg-gray-700/40 text-gray-200 border border-gray-500/60">
                Inactivo
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-[color:var(--pc-main-dark)]/60 mb-6">
        <nav className="flex space-x-1">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'predictions');
              window.history.pushState({}, '', url.toString());
              setActiveTab('predictions');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'predictions'
              ? 'bg-[color:var(--pc-main)] text-[color:var(--pc-text-on-dark)] border-b-2 border-[color:var(--pc-accent)] shadow-sm'
              : 'text-[color:var(--pc-muted)]/80 hover:text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main-dark)]/40'
              }`}
          >
            Pronósticos
          </button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'participants');
              window.history.pushState({}, '', url.toString());
              setActiveTab('participants');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'participants'
              ? 'bg-[color:var(--pc-main)] text-[color:var(--pc-text-on-dark)] border-b-2 border-[color:var(--pc-accent)] shadow-sm'
              : 'text-[color:var(--pc-muted)]/80 hover:text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main-dark)]/40'
              }`}
          >
            Participantes
          </button>

          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'settings');
              window.history.pushState({}, '', url.toString());
              setActiveTab('settings');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'settings'
              ? 'bg-[color:var(--pc-main)] text-[color:var(--pc-text-on-dark)] border-b-2 border-[color:var(--pc-accent)] shadow-sm'
              : 'text-[color:var(--pc-muted)]/80 hover:text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main-dark)]/40'
              }`}
          >
            Configuración
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'predictions' && groupId && group && (
          <PredictionsView groupId={groupId} group={group} />
        )}
        {activeTab === 'participants' && groupId && group && (
          <GroupLeaderboard groupId={groupId} group={group} />
        )}
        {activeTab === 'settings' && groupId && group && (
          <GroupSettings groupId={groupId} group={group} />
        )}
      </div>
    </div>
  );
}
