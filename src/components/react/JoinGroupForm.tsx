import { useState } from 'react';
import type { FormEvent } from 'react';
import { joinGroupByCode } from '../../lib/groups';
import { getCurrentUser } from '../../lib/auth';
import { getRoute } from '../../lib/utils';

export default function JoinGroupForm() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      const normalizedCode = code.trim().toUpperCase();

      if (!normalizedCode) {
        throw new Error('Por favor ingresa un código');
      }

      const group = await joinGroupByCode(normalizedCode, user.uid);

      // Redirigir a la lista de grupos
      window.location.href = getRoute('/groups');
    } catch (err: any) {
      setError(err.message || 'Error al unirse al grupo');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6">
      <h1 className="text-3xl font-bold text-[color:var(--pc-text-on-dark)] mb-6">
        Unirse a un Grupo
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/60 text-red-100 rounded">
          {error}
        </div>
      )}

      <div className="bg-[color:var(--pc-surface)]/90 p-6 rounded-lg shadow-md border border-[color:var(--pc-main-dark)]/60">
        <p className="text-[color:var(--pc-muted)] mb-6">
          Ingresa el código del grupo que te compartió el administrador. El código tiene el formato <span className="font-mono font-semibold">PD-XXXXXX</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-[color:var(--pc-muted)] mb-1"
            >
              Código del Grupo *
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-[color:var(--pc-main-dark)]/60 rounded-md bg-[color:var(--pc-surface)] text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)] font-mono text-lg tracking-wider"
              placeholder="PD-ABC123"
              required
              minLength={3}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[color:var(--pc-accent)] text-[color:var(--pc-text-strong)] py-2 px-4 rounded-md hover:bg-[color:var(--pc-accent-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uniéndose...' : 'Unirse al Grupo'}
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
    </div>
  );
}
