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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando grupo...</p>
        </div>
      </div>
    );
  }

  // Solo mostrar error si ya se verificaron los params y no hay groupId
  if (!groupId) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        <p>No se especificó un grupo. Por favor, selecciona un grupo desde la lista.</p>
        <a href={getRoute('/groups')} className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Ir a mis grupos
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>{error}</p>
        <a href={getRoute('/groups')} className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          Volver a mis grupos
        </a>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600 mt-1">
              Código: <span className="font-mono font-semibold">{group.code}</span>
            </p>
          </div>
          <div className="text-right">
            {group.isActive ? (
              <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">Activo</span>
            ) : (
              <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">Inactivo</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-1">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'predictions');
              window.history.pushState({}, '', url.toString());
              setActiveTab('predictions');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === 'predictions'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
