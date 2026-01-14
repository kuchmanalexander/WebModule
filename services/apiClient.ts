import { getSessionTokenFromCookie, clearSessionTokenCookie } from '../utils/cookie';
import { sessionService } from './sessionService';
import { Session, UserStatus } from '../types';
import { emitApiUiEvent } from './apiEvents';

/**
 * ApiError — минимальная модель ошибок HTTP.
 * Нужна, чтобы имитировать поведение Web Client из task-flow:
 *  - 401: access истёк → refresh → retry → если refresh невалиден → logout
 *  - 403: нет прав → страница /forbidden
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestFn<T> = (session: Session) => Promise<T>;
export type RequestOptions = {
  suppressForbiddenRedirect?: boolean;
};

async function requireAuthorizedSession(): Promise<Session> {
  const token = getSessionTokenFromCookie();
  const session = await sessionService.getSession(token);
  if (session.status !== UserStatus.AUTHORIZED) throw new ApiError(401, 'Not authorized');
  return session;
}

function isAccessExpired(session: Session) {
  if (!session.accessTokenExpiresAt) return false;
  return Date.now() > session.accessTokenExpiresAt;
}

/**
 * Главный запросный хелпер.
 * В реальном проекте здесь был бы fetch/axios + baseURL.
 */
export async function requestWithAuth<T>(fn: RequestFn<T>, options?: RequestOptions): Promise<T> {
  try {
    let session = await requireAuthorizedSession();

    // access истёк → пытаемся refresh
    if (isAccessExpired(session)) {
      const token = getSessionTokenFromCookie();
      if (!token) throw new ApiError(401, 'Missing session token');

      emitApiUiEvent({ type: 'refresh:start' });
      try {
        session = await sessionService.refreshAccessToken(token);
        if (session.status !== UserStatus.AUTHORIZED) throw new ApiError(401, 'Refresh failed');
        emitApiUiEvent({ type: 'refresh:success' });
      } catch (err) {
        emitApiUiEvent({ type: 'refresh:failed' });
        throw err;
      }
    }

    return await fn(session);
  } catch (e: any) {
    // Унифицированная реакция Web Client на ошибки, как в task-flow.
    if (e instanceof ApiError) {
      if (e.status === 403 && !options?.suppressForbiddenRedirect) {
        emitApiUiEvent({ type: 'forbidden' });
        window.location.href = '/forbidden';
      }

      if (e.status === 401) {
        emitApiUiEvent({ type: 'session:expired' });
        // Считаем, что refresh тоже невалиден → чистим сессию и возвращаем на /
        try {
          const token = getSessionTokenFromCookie();
          if (token) await sessionService.logout(token, false);
        } finally {
          clearSessionTokenCookie();
          window.location.href = '/';
        }
      }
    }
    throw e;
  }
}
