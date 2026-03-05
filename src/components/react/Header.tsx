import { useEffect, useState, useRef } from 'react';
import { onAuthStateChange, logoutUser, getUserData, uploadUserAvatar } from '../../lib/auth';
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setAvatarUploading(true);
    uploadUserAvatar(user.uid, file)
      .then(() => loadUserData(user.uid))
      .catch((err) => alert(err.message))
      .finally(() => {
        setAvatarUploading(false);
        e.target.value = '';
      });
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

          <div className="relative shrink-0" ref={menuRef}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              aria-hidden
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-blue-100 text-blue-800 font-semibold text-sm hover:bg-blue-200 active:bg-blue-300 transition cursor-pointer"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {userData?.avatarUrl ? (
                <img
                  src={userData.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitial(displayName)
              )}
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
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition disabled:opacity-50 cursor-pointer"
                  >
                    {avatarUploading ? 'Subiendo…' : 'Cambiar foto'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 transition cursor-pointer"
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
