import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../context/SessionProvider';
import { USE_MOCK_MAIN_API } from '../constants';

type Props = {
  permission: string;
  children: React.ReactNode;
};

export default function RequirePermission({ permission, children }: Props) {
  const { session } = useSession();
  if (!USE_MOCK_MAIN_API) return <>{children}</>;

  const perms = session.permissions || [];
  if (!perms.includes(permission)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
