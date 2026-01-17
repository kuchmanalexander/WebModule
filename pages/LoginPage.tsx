import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '../services/sessionService';
import { useSession } from '../context/SessionProvider';
import { AUTH_API_BASE_URL, AUTH_POLL_INTERVAL_MS, USE_AUTH_FLOW } from '../constants';
import { UserStatus } from '../types';

export const LoginPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh, session } = useSession();

  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const type = params.get('type');
  const tokenInFromCallback = params.get('token_in'); // приходит с backend auth после callback

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const run = async () => {
      if (!type) return;
      if (!USE_AUTH_FLOW) return;

      try {
        // ✅ если уже авторизованы — просто уходим в кабинет (без раннего return до хуков)
        if (session.status === UserStatus.AUTHORIZED) {
          navigate('/dashboard', { replace: true });
          return;
        }

        // ✅ если пришли с callback — биндим token_in к текущей cookie-сессии в BFF
        if (tokenInFromCallback) {
          await fetch(`${AUTH_API_BASE_URL}/auth/bind?token_in=${encodeURIComponent(tokenInFromCallback)}`, {
            credentials: 'include',
          });
        } else {
          // стартуем auth только если НЕ callback
          const t = type as 'github' | 'yandex' | 'code';
          const { url, code: authCode } = await sessionService.startAuthLogin(t);

          if (url) {
            window.location.href = url;
            return;
          }
          if (authCode) setCode(String(authCode));
        }

        const poll = async () => {
          if (!active) return;

          const res = await sessionService.checkAuth('bff');
          if (!active) return;

          if (res.status === 'authorized') {
            await refresh();
            navigate('/dashboard', { replace: true });
            return;
          }

          if (res.status === 'denied') {
            setError(res.message || 'Доступ отклонён');
          }
        };

        await poll();
        timer = window.setInterval(poll, AUTH_POLL_INTERVAL_MS);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Ошибка авторизации');
      }
    };

    run();

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
    // важно: session.status в deps, чтобы при смене на AUTHORIZED мы вышли из логина корректно
  }, [type, tokenInFromCallback, navigate, refresh, session.status]);

  // ✅ Все return — только после хуков
  if (!type) return <Navigate to="/" replace />;
  if (session.status === UserStatus.AUTHORIZED) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center max-w-sm p-6">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-2">Авторизация...</h2>
        <p className="text-gray-500 text-sm">Ожидаем подтверждение от внешнего сервиса.</p>
        <p className="text-gray-400 text-xs mt-2">type: {type}</p>

        {code && (
          <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">Код для входа</div>
            <div className="text-2xl font-black text-gray-900 tracking-widest">{code}</div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-3 bg-red-50 rounded-lg text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
