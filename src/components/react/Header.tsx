import { useEffect, useState, useRef } from 'react';
import { onAuthStateChange, logoutUser, getUserData, uploadUserAvatar } from '../../lib/auth';
import { getRoute, getWhatsappLink } from '../../lib/utils';
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
              Iniciar Sesión / Registrarse
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
                <nav
                  className="px-2 py-2 border-b border-[color:var(--pc-main-dark)]/60"
                  aria-label="Enlaces del sitio"
                >
                  <ul className="space-y-0.5">
                    <li>
                      <a
                        href={getRoute('/')}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center rounded-lg px-2 py-2 min-h-[40px] text-sm text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main)]/25 transition"
                      >
                        Inicio
                      </a>
                    </li>
                    <li>
                      <a
                        href={`${getRoute('/')}#como-funciona`}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center rounded-lg px-2 py-2 min-h-[40px] text-sm text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main)]/25 transition"
                      >
                        Cómo funciona
                      </a>
                    </li>
                    <li>
                      <a
                        href={`${getRoute('/')}#planes`}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center rounded-lg px-2 py-2 min-h-[40px] text-sm text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main)]/25 transition"
                      >
                        Planes
                      </a>
                    </li>
                  </ul>
                </nav>
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
                  <hr className="my-2 border-[color:var(--pc-main-dark)]/60" />
                  <div className="pt-1">
                    <a
                      href={getWhatsappLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2.5 min-h-[44px] text-xs font-medium text-[color:var(--pc-muted)]/90 hover:text-[color:var(--pc-text-on-dark)] hover:bg-[color:var(--pc-main)]/25 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 shrink-0"
                        aria-hidden
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Soporte técnico
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
