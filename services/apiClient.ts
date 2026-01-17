import { getSessionTokenFromCookie, clearSessionTokenCookie } from '../utils/cookie';
import { sessionService } from './sessionService';
import { Session, UserStatus } from '../types';
import { emitApiUiEvent } from './apiEvents';
import { USE_AUTH_FLOW } from '../constants';

/**
 * ApiError — минимальная модель ошибок HTTP.
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

/**
 * В BFF+Redis режиме:
 * - cookie HttpOnly, JS не читает session_token
 * - refresh токенов НЕ делает фронт (это на стороне Auth/BFF)
 */
async function requireAuthorizedSession(): Promise<Session> {
  const token = USE_AUTH_FLOW ? null : getSessionTokenFromCookie();
  const session = await sessionService.getSession(token);

  if (session.status !== UserStatus.AUTHORIZED) {
    throw new ApiError(401, 'Not authorized');
  }
  return session;
}

/**
 * Старый helper — актуален только для non-auth-flow (manual/mock).
 */
function isAccessExpired(session: Session) {
  if (!session.accessTokenExpiresAt) return false;
  return Date.now() > session.accessTokenExpiresAt;
}

/**
 * Главный запросный хелпер.
 */
export async function requestWithAuth<T>(fn: RequestFn<T>, options?: RequestOptions): Promise<T> {
  try {
    let session = await requireAuthorizedSession();

    // ✅ В auth-flow НЕ делаем refreshAccessToken на фронте
    if (!USE_AUTH_FLOW && isAccessExpired(session)) {
      const token = getSessionTokenFromCookie();
      if (!token) throw new ApiError(401, 'Missing session token');

      emitApiUiEvent({ type: 'refresh:start' });
      try {
        // @ts-ignore - метод существует в mock режиме
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
    if (e instanceof ApiError) {
      if (e.status === 403 && !options?.suppressForbiddenRedirect) {
        emitApiUiEvent({ type: 'forbidden' });
      }

      if (e.status === 401) {
        emitApiUiEvent({ type: 'session:expired' });

        // ✅ В auth-flow logout делаем через BFF (cookie), а не через token из JS
        try {
          await sessionService.logout(USE_AUTH_FLOW ? null : getSessionTokenFromCookie(), false);
        } finally {
          clearSessionTokenCookie();
          window.location.href = '/';
        }
      }
    }
    throw e;
  }
}
