import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { mainClient } from '../../services/mainClient';
import { Course, Test } from '../../types';
import { useUi } from '../../context/UiProvider';

export const AdminTestsPage: React.FC = () => {
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [authorId, setAuthorId] = useState('u_teacher_1');

  const load = async () => {
    setLoading(true);
    try {
      const cs = await mainClient.getCourses();
      setCourses(cs);
      const all = await mainClient.getAllTests();
      setTests(all);
      if (!courseId && cs.length) setCourseId(cs[0].id);
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить тесты', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCourseTitle = useMemo(() => {
    const map = new Map(courses.map((c) => [c.id, c.title]));
    return (id: string) => map.get(id) || id;
  }, [courses]);

  const create = async () => {
    if (!title.trim()) {
      pushToast({ kind: 'error', title: 'Введите название теста' });
      return;
    }
    if (!courseId) {
      pushToast({ kind: 'error', title: 'Выберите дисциплину' });
      return;
    }
    try {
      const t = await mainClient.createTest({ title: title.trim(), courseId, isActive: true, authorId });
      setTests((prev) => [t, ...prev]);
      setTitle('');
      pushToast({ kind: 'success', title: 'Тест создан' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Создание не удалось', message: String(e) });
    }
  };

  const toggleActive = async (t: Test) => {
    try {
      const updated = await mainClient.updateTest(t.id, { isActive: !t.isActive });
      if (!updated) return;
      setTests((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      pushToast({ kind: 'success', title: 'Статус обновлён' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось обновить тест', message: String(e) });
    }
  };

  const rename = async (t: Test) => {
    const next = window.prompt('Новое название теста', t.title);
    if (!next) return;
    try {
      const updated = await mainClient.updateTest(t.id, { title: next });
      if (!updated) return;
      setTests((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      pushToast({ kind: 'success', title: 'Название обновлено' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось переименовать', message: String(e) });
    }
  };

  const del = async (t: Test) => {
    const ok = window.confirm(`Удалить тест "${t.title}"?\n\n(В демо также удалятся вопросы и попытки по этому тесту)`);
    if (!ok) return;
    try {
      const removed = await mainClient.deleteTest(t.id);
      if (removed) {
        setTests((prev) => prev.filter((x) => x.id !== t.id));
        pushToast({ kind: 'success', title: 'Тест удалён' });
      }
    } catch (e) {
      pushToast({ kind: 'error', title: 'Удаление не удалось', message: String(e) });
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Тесты (CRUD)</h2>
          <div className="flex items-center gap-3">
            <button onClick={load} className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200">
              Обновить
            </button>
            <Link className="text-sm text-indigo-700 hover:underline" to="/admin">← Админ</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-3">Создание теста</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название теста" className="border rounded px-3 py-2 text-sm" />
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="border rounded px-3 py-2 text-sm">
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <input value={authorId} onChange={(e) => setAuthorId(e.target.value)} placeholder="authorId" className="border rounded px-3 py-2 text-sm" />
            <button onClick={create} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Создать
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 text-sm text-gray-600">
            Управление тестами: активность, переименование, удаление.
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Название</th>
                    <th className="text-left px-4 py-3">Дисциплина</th>
                    <th className="text-left px-4 py-3">Автор</th>
                    <th className="text-left px-4 py-3">Активен</th>
                    <th className="text-right px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{t.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{t.title}</td>
                      <td className="px-4 py-3 text-gray-700">{byCourseTitle(t.courseId)}</td>
                      <td className="px-4 py-3 text-gray-700">{t.authorId}</td>
                      <td className="px-4 py-3">
                        {t.isActive ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100">Yes</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700 border border-gray-100">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => toggleActive(t)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200">
                            {t.isActive ? 'Выключить' : 'Включить'}
                          </button>
                          <button onClick={() => rename(t)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200">Переименовать</button>
                          <button onClick={() => del(t)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Удалить</button>
                          <Link to={`/tests/${t.id}`} className="px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100 hover:bg-indigo-100">Открыть</Link>
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
