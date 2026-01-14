import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { getSessionTokenFromCookie } from '../../utils/cookie';
import { sessionService } from '../../services/sessionService';
import { Role } from '../../types';
import { useUi } from '../../context/UiProvider';
import { USE_MOCK_MAIN_API } from '../../constants';

export const AdminHomePage: React.FC = () => {
  const { session, logout, refresh } = useSession();
  const { pushToast } = useUi();

  const perms = session.permissions || [];
  const sections = useMemo(
    () => [
      { key: 'users', title: 'Пользователи', to: '/admin/users', perm: 'user:list:read' },
      { key: 'courses', title: 'Дисциплины', to: '/admin/courses', perm: 'course:add' },
      { key: 'tests', title: 'Тесты', to: '/admin/tests', perm: 'course:test:add' },
      { key: 'questions', title: 'Вопросы', to: '/admin/questions', perm: 'quest:list:read' },
      { key: 'attempts', title: 'Попытки', to: '/admin/attempts', perm: 'test:answer:read' },
    ],
    []
  );

  const canSeeAny = USE_MOCK_MAIN_API ? sections.some((s) => perms.includes(s.perm)) : true;

  const grantAdmin = async () => {
    try {
      const token = getSessionTokenFromCookie();
      if (!token) return;
      const currentRoles = session.user?.roles || [];
      if (currentRoles.includes(Role.ADMIN)) {
        pushToast({ kind: 'info', title: 'Роль уже установлена', message: 'У вас уже есть Admin.' });
        return;
      }
      await sessionService.setUserRoles(token, [...currentRoles, Role.ADMIN]);
      await refresh();
      pushToast({ kind: 'success', title: 'Демо: добавлена роль Admin', message: 'Теперь доступен полный admin-раздел.' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось обновить роли', message: String(e) });
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Админ-инструменты</h2>
          <Link className="text-sm text-indigo-700 hover:underline" to="/dashboard">
            ← В кабинет
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">Инструменты управления пользователями и контентом.</p>
          {USE_MOCK_MAIN_API && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={grantAdmin}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
              >
                Демо: дать роль Admin
              </button>
              <button
                onClick={() => logout(true)}
                className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
              >
                Выйти со всех устройств
              </button>
            </div>
          )}
        </div>

        {!canSeeAny ? (
          <div className="bg-white border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">
              У вас нет прав ни на один из admin-разделов. В демо можно добавить роль Admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sections
              .filter((s) => (USE_MOCK_MAIN_API ? perms.includes(s.perm) : true))
              .map((s) => (
                <Link
                  key={s.key}
                  to={s.to}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition"
                >
                  <div className="font-semibold text-gray-900">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Открыть раздел</div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
