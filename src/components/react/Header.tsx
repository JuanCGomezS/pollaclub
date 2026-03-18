import { useEffect, useState, useRef } from 'react';
import { onAuthStateChange, logoutUser, getUserData, uploadUserAvatar } from '../../lib/auth';
import { getRoute } from '../../lib/utils';
import type { User } from 'firebase/auth';
import type { User as UserType } from '../../lib/types';

const baseHeaderClasses =
  'bg-[color:var(--pc-surface)]/95 border-b border-[color:var(--pc-main-dark)]/60 shadow-sm sticky top-0 z-50 backdrop-blur';
const containerClasses = 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8';
const logoClasses =
  'text-lg sm:text-xl font-bold text-[color:var(--pc-text-on-dark)] hover:text-[color:var(--pc-accent)] transition-colors min-h-[44px] min-w-[44px] flex items-center';

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
  const baseUrl = import.meta.env.BASE_URL;

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
              <img
                src={baseUrl + 'inicio.png'}
                alt="PollaClub"
                className="h-10 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
              />
            </a>
            <div className="h-8 w-20 sm:w-24 bg-[color:var(--pc-main-dark)]/40 rounded-full animate-pulse" />
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
              <img
                src={baseUrl + 'inicio.png'}
                alt="PollaClub"
                className="h-10 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
              />
            </a>
            <a
              href={getRoute('/login')}
              className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[color:var(--pc-text-strong)] bg-[color:var(--pc-accent)] hover:bg-[color:var(--pc-accent-dark)] transition shadow-md"
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
          <a href={getRoute('/')} className={logoClasses}>
            <img
              src={baseUrl + 'inicio.png'}
              alt="PollaClub"
              className="h-10 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
            />
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
              className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full overflow-hidden bg-[color:var(--pc-main)] text-[color:var(--pc-text-on-dark)] font-semibold text-sm hover:bg-[color:var(--pc-main-dark)] transition cursor-pointer ring-2 ring-[color:var(--pc-accent)]/70"
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
              <div className="absolute right-0 top-full mt-1 py-2 w-[min(280px,100vw-2rem)] bg-[color:var(--pc-surface)] border border-[color:var(--pc-main-dark)] rounded-xl shadow-xl">
                <div className="px-4 py-3 border-b border-[color:var(--pc-main-dark)]/60">
                  <p className="text-xs text-[color:var(--pc-muted)]/80">Bienvenido</p>
                  <p className="text-sm font-medium text-[color:var(--pc-text-on-dark)] truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs text-[color:var(--pc-muted)]/90">{email}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[44px] flex items-center justify-center rounded-lg text-sm font-semibold text-[color:var(--pc-text-strong)] bg-[color:var(--pc-accent)] hover:bg-[color:var(--pc-accent-dark)] transition disabled:opacity-50 cursor-pointer"
                  >
                    {avatarUploading ? 'Subiendo…' : 'Cambiar foto'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium text-red-100 bg-red-600/80 hover:bg-red-600 transition cursor-pointer"
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
