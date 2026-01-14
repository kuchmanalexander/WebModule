import React, { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '../services/sessionService';
import { useSession } from '../context/SessionProvider';
import { clearSessionTokenCookie, getSessionTokenFromCookie } from '../utils/cookie';

export const LogoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useSession();
  const all = params.get('all') === 'true';

  useEffect(() => {
    const run = async () => {
      const token = getSessionTokenFromCookie();
      if (token) {
        await sessionService.logout(token, all);
      }
      clearSessionTokenCookie();
      await refresh();
      navigate('/', { replace: true });
    };
    run();
  }, [all, navigate, refresh]);

  // Пока эффект не отработал
  return <Navigate to="/" replace />;
};
