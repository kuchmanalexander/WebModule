import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { mainClient } from '../../services/mainClient';
import { Attempt, Course, Test } from '../../types';
import { useUi } from '../../context/UiProvider';

export const AdminAttemptsPage: React.FC = () => {
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [cs, ts, at] = await Promise.all([
        mainClient.getCourses(),
        mainClient.getAllTests(),
        mainClient.getAllAttempts(),
      ]);
      setCourses(cs);
      setTests(ts);
      setAttempts(at);
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить попытки', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testById = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Попытки (просмотр)</h2>
          <div className="flex items-center gap-3">
            <button onClick={load} className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200">Обновить</button>
            <Link className="text-sm text-indigo-700 hover:underline" to="/admin">← Админ</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 text-sm text-gray-600">
            Заглушка под ресурс <b>Attempts</b>. Здесь удобно проверять, что попытка хранит snapshot вопросов с версиями.
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Пользователь</th>
                    <th className="text-left px-4 py-3">Тест / Дисциплина</th>
                    <th className="text-left px-4 py-3">Статус</th>
                    <th className="text-left px-4 py-3">Счёт</th>
                    <th className="text-left px-4 py-3">Старт</th>
                    <th className="text-right px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const t = testById.get(a.testId);
                    const c = t ? courseById.get(t.courseId) : undefined;
                    return (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.id}</td>
                        <td className="px-4 py-3 text-gray-700">{a.userId}</td>
                        <td className="px-4 py-3 text-gray-900">
                          <div className="font-semibold">{t?.title ?? a.testId}</div>
                          <div className="text-xs text-gray-500">{c?.title ?? ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          {a.status === 'COMPLETED' ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100">COMPLETED</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-100">IN_PROGRESS</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {a.status === 'COMPLETED' ? `${a.score}/${a.maxScore}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{new Date(a.startedAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link to={`/attempts/${a.id}`} className="px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 hover:bg-indigo-100">Открыть</Link>
                            {a.status === 'COMPLETED' && (
                              <Link to={`/attempts/${a.id}/result`} className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200">Результат</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
