import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '../services/sessionService';
import { useSession } from '../context/SessionProvider';

export const LoginPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh, setSessionToken } = useSession();
  const [error, setError] = useState<string | null>(null);

  const type = params.get('type');

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!type) return;
      try {
        const t = type as 'github' | 'yandex' | 'code';
        const { sessionToken } = await sessionService.initiateLogin(t);
        setSessionToken(sessionToken);

        // Обновим контекст (состояние в "Redis")
        await refresh();

        // В реальной системе здесь был бы редирект на Auth Module.
        // В демо имитируем callback спустя небольшую задержку.
        setTimeout(async () => {
          await sessionService.completeLogin(sessionToken);
          await refresh();
          navigate('/dashboard', { replace: true });
        }, 800);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Ошибка авторизации');
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [type, navigate, refresh, setSessionToken]);

  if (!type) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center max-w-sm p-6">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-2">Авторизация...</h2>
        <p className="text-gray-500 text-sm">Ожидаем подтверждение от внешнего сервиса.</p>
        <p className="text-gray-400 text-xs mt-2">type: {type}</p>

        {error && (
          <div className="mt-6 p-3 bg-red-50 rounded-lg text-sm text-red-700 border border-red-100">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
