const FIFA_FLAGS_BASE = 'https://api.fifa.com/api/v3/picture/flags-sq-2';
const BETPLAY_FLAGS_BASE =
  'https://static.prisa.com/aside/resizer/resize/img/sports/football/teams/XXXX.png?width=44&height=44';
const UEFA_LOGOS_BASE = 'https://img.uefa.com/imgml/TP/teams/logos/70x70';

/**
 * Retorna todas las URLs disponibles para un escudo de equipo (útil para <picture> tags)
 * Acepta códigos de:
 * - Selecciones (ISO/FIFA, ej: "GER")
 * - Clubes DIMAYOR (código numérico BetPlay)
 * - Clubes UEFA (código numérico UEFA, ej: "7889")
 */
export function getTeamImageUrls(code: string | undefined): string[] {
  if (!code || !code.trim()) {
    return [];
  }

  const cleanCode = code.trim();
  const upperCode = cleanCode.toUpperCase();
  const baseUrl = getBasePath() || '/';

  return [
    // 1) Escudo UEFA (Champions / clubes europeos)
    `${UEFA_LOGOS_BASE}/${encodeURIComponent(cleanCode)}.png`,
    // 2) Bandera FIFA (selecciones)
    `${FIFA_FLAGS_BASE}/${encodeURIComponent(upperCode)}`,
    // 3) Escudo BetPlay (DIMAYOR)
    BETPLAY_FLAGS_BASE.replace('XXXX', upperCode),
    // 4) Fallback local
    `${baseUrl}team-font.jpg`.replace(/\/+/g, '/')
  ];
}

/**
 * Obtiene el base path configurado en Astro
 */
export function getBasePath(): string {
  const baseUrl = (import.meta as any).env?.BASE_URL;
  if (baseUrl) {
    return baseUrl;
  }
  
  if (typeof document !== 'undefined') {
    const base = document.documentElement.getAttribute('data-base');
    if (base) {
      return base.endsWith('/') ? base : base + '/';
    }
  }
  
  return '/';
}

/**
 * Construye una ruta absoluta con el base path
 */
export function getRoute(path: string): string {
  const base = getBasePath();
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  
  if (base === '/') {
    return cleanPath;
  }
  
  const cleanBase = base.replace(/\/$/, '');
  return cleanBase + cleanPath;
}

const DEFAULT_WHATSAPP_MESSAGE =
  'Hola PollaClub, quiero entrar al juego y comprar mi acceso.';

export function getWhatsappLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  const raw = String(import.meta.env.PUBLIC_WHATSAPP_NUMBER || '');
  const whatsappNumber = raw.replace(/\D/g, '');
  if (!whatsappNumber) return `https://wa.me/?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
