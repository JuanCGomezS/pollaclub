import { useEffect, useState, useRef } from 'react';
import { onAuthStateChange, logoutUser, getUserData } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { User } from 'firebase/auth';
import type { User as UserType } from '../../lib/types';

const baseHeaderClasses = 'bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50';
const containerClasses = 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8';
const logoClasses = 'text-lg sm:text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] flex items-center';

function getInitial(nameOrEmail: string): string {
  const s = (nameOrEmail || 'U').trim();
  if (s.includes('@')) return s[0].toUpperCase();
  return s[0].toUpperCase();
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      if (authUser) {
        loadUserData(authUser.uid);
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const loadUserData = async (uid: string) => {
    try {
      const data = await getUserData(uid);
      setUserData(data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logoutUser();
    window.location.href = getRoute('/');
  };

  const displayName = userData?.displayName || user?.displayName || 'Usuario';
  const email = userData?.email || user?.email || 'Usuario';

  if (loading) {
    return (
      <header className={baseHeaderClasses}>
        <div className={containerClasses}>
          <div className="flex justify-between items-center h-14 sm:h-16">
            <a href={getRoute('/')} className={logoClasses}>
              PollaClub
            </a>
            <div className="h-8 w-20 sm:w-24 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className={baseHeaderClasses}>
        <div className={containerClasses}>
          <div className="flex justify-between items-center h-14 sm:h-16">
            <a href={getRoute('/')} className={logoClasses}>
              PollaClub
            </a>
            <a
              href={getRoute('/login')}
              className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition"
            >
              Iniciar Sesión
            </a>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={baseHeaderClasses}>
      <div className={containerClasses}>
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
          <a href={getRoute('/groups')} className={logoClasses}>
            PollaClub
          </a>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <p className="text-sm text-gray-600 max-w-[180px] lg:max-w-[220px] truncate" title={displayName}>
              <span className="font-medium text-gray-800">Bienvenido,</span>{' '}
              <span className="text-gray-600">{userData?.displayName || user.displayName || 'Usuario'}</span>
            </p>
            <button
              onClick={handleLogout}
              className="shrink-0 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 active:bg-gray-900 transition"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="relative md:hidden shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold text-sm hover:bg-blue-200 active:bg-blue-300 transition"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {getInitial(displayName)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 py-2 w-[min(280px,100vw-2rem)] bg-white rounded-xl border border-gray-200 shadow-lg">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Bienvenido</p>
                  <p className="text-sm font-medium text-gray-900 truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500">{email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 transition"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
