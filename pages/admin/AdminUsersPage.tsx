import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { mainClient } from '../../services/mainClient';
import { User } from '../../types';
import { useUi } from '../../context/UiProvider';

export const AdminUsersPage: React.FC = () => {
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const currentUserId = session.user?.id;
  const isMe = (u: User) => Boolean(currentUserId && u.id === currentUserId);

  const load = async () => {
    setLoading(true);
    try {
      const list = await mainClient.getUsers();
      setUsers(list);
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить пользователей', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBlocked = async (u: User, block: boolean) => {
    try {
      const updated = block ? await mainClient.blockUser(u.id) : await mainClient.unblockUser(u.id);
      if (!updated) return;
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      pushToast({ kind: 'success', title: block ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Операция не выполнена', message: String(e) });
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Пользователи</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
            >
              Обновить
            </button>
            <Link className="text-sm text-indigo-700 hover:underline" to="/admin">
              ← Админ
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 text-sm text-gray-600">Управление пользователями</div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Имя</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Роли</th>
                    <th className="text-left px-4 py-3">Статус</th>
                    <th className="text-right px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-t border-gray-100 ${isMe(u) ? 'bg-amber-100 ring-2 ring-amber-300' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{u.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{u.fullName}</span>
                          {isMe(u) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold uppercase">
                              Это вы
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 uppercase font-bold">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.isBlocked ? (
                          <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-100">Blocked</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {u.isBlocked ? (
                            <button
                              onClick={() => setBlocked(u, false)}
                              className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200"
                            >
                              Разблокировать
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlocked(u, true)}
                              className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                            >
                              Заблокировать
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
