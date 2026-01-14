// Простые helpers для работы с cookie.
// В реальном Web Client session_token выставляет сервер (HttpOnly).
// Здесь (в рамках "всё вместе" SPA) выставляем его на клиенте.

const COOKIE_NAME = 'session_token';

export function getSessionTokenFromCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionTokenCookie(token: string) {
  // 7 дней — просто для удобства демо
  const maxAgeSeconds = 7 * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearSessionTokenCookie() {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
