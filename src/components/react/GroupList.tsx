import { useEffect, useState } from 'react';
import { getUserGroups, canUserCreateGroups } from '../../lib/groups';
import { getCurrentUser } from '../../lib/auth';
import { getRoute, getWhatsappLink } from '../../lib/utils';
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
          <div className="flex justify-center mb-8">
            <a
              href={getWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-auto items-center justify-center gap-2 rounded-md bg-[color:var(--pc-accent)] px-4 py-2 font-semibold text-[color:var(--pc-text-strong)] transition hover:bg-[color:var(--pc-accent-dark)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 shrink-0"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Solicitar acceso
            </a>
          </div>
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
              Unirse a Grupo existente
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
            className="relative block p-6 bg-[color:var(--pc-surface)]/80 border border-[color:var(--pc-main-dark)]/60 rounded-lg hover:shadow-[0_2px_12px_0_var(--pc-main-dark)] hover:border-[color:var(--pc-accent)] transition cursor-pointer overflow-hidden"
          >
            {group.logoUrl && (
              <div
                className="absolute inset-0 opacity-10 bg-center bg-cover bg-no-repeat pointer-events-none"
                style={{ backgroundImage: `url(${group.logoUrl})` }}
              />
            )}
            <div className="relative">
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
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
