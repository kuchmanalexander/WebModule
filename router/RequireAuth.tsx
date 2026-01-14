import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserStatus } from '../types';
import { useSession } from '../context/SessionProvider';

export const RequireAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Запрос к Redis...</p>
        </div>
      </div>
    );
  }

  if (session.status !== UserStatus.AUTHORIZED) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
