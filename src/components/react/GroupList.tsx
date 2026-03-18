import { useEffect, useState } from 'react';
import { getUserGroups, canUserCreateGroups } from '../../lib/groups';
import { getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { Group } from '../../lib/types';

export default function GroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      // Verificar permiso de creación y cargar grupos en paralelo
      const [userGroups, hasPermission] = await Promise.all([
        getUserGroups(user.uid),
        canUserCreateGroups(user.uid)
      ]);

      setGroups(userGroups);
      setCanCreate(hasPermission);
    } catch (err: any) {
      setError(err.message || 'Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--pc-accent)] mx-auto"></div>
          <p className="mt-4 text-[color:var(--pc-muted)]">Cargando grupos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-900/40 border border-red-500/60 text-red-100 rounded">
        <p>{error}</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6">
        <div className="text-center py-12 bg-[color:var(--pc-surface)]/80 rounded-lg border border-[color:var(--pc-main-dark)]/60">
          <h2 className="text-2xl font-bold text-[color:var(--pc-text-on-dark)] mb-4">
            No tienes grupos aún
          </h2>
          <p className="text-[color:var(--pc-muted)] mb-6">
            {canCreate
              ? 'Crea un grupo o únete a uno existente usando un código'
              : 'Únete a un grupo existente usando un código'}
          </p>
          <div className="space-x-4">
            {canCreate && (
              <a
                href={getRoute('/groups/create')}
                  className="inline-block bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] px-6 py-3 rounded-lg hover:bg-[color:var(--pc-accent-dark)] transition"
              >
                Crear Grupo
              </a>
            )}
            <a
              href={getRoute('/groups/join')}
                className="inline-block bg-[color:var(--pc-main-dark)] text-[color:var(--pc-text-on-dark)] px-6 py-3 rounded-lg hover:bg-[color:var(--pc-main)] transition"
            >
              Unirse a Grupo
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      <div className="flex justify-end items-center mb-6 space-x-2">
        {canCreate && (
          <a
          href={getRoute('/groups/create')}
          className="bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] px-4 py-2 rounded-lg hover:bg-[color:var(--pc-accent-dark)] transition text-sm"
          >
            Crear Grupo
          </a>
        )}
        <a
          href={getRoute('/groups/join')}
          className="bg-[color:var(--pc-main-dark)] text-[color:var(--pc-text-on-dark)] px-4 py-2 rounded-lg hover:bg-[color:var(--pc-main)] transition text-sm"
        >
          Unirse
        </a>
      </div>
      
      <h1 className="text-3xl font-bold text-[color:var(--pc-text-on-dark)] my-4">Mis Grupos</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <a
            key={group.id}
            href={getRoute(`/groups/dashboard?groupId=${group.id}&tab=predictions`)}
            className="block p-6 bg-[color:var(--pc-surface)]/80 border border-[color:var(--pc-main-dark)]/60 rounded-lg hover:shadow-lg hover:border-[color:var(--pc-accent)] transition cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-semibold text-[color:var(--pc-text-on-dark)]">
                {group.name}
              </h3>
              {group.isActive ? (
                <span className="px-2 py-1 text-xs bg-[color:var(--pc-main)]/20 text-[color:var(--pc-accent)] rounded">
                  Activo
                </span>
              ) : (
                <span className="px-2 py-1 text-xs bg-gray-700/40 text-gray-200 rounded">
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-sm text-[color:var(--pc-muted)] mb-2">
              Código:{' '}
              <span className="font-mono font-semibold text-[color:var(--pc-text-on-dark)]">
                {group.code}
              </span>
            </p>
            <p className="text-sm text-[color:var(--pc-muted)]">
              {group.participants.length} participante{group.participants.length !== 1 ? 's' : ''}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
