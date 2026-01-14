import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { mainClient } from '../../services/mainClient';
import { Course } from '../../types';
import { useUi } from '../../context/UiProvider';

export const AdminCoursesPage: React.FC = () => {
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // teacher_id задаётся на backend по текущему пользователю/правилам

  const load = async () => {
    setLoading(true);
    try {
      setCourses(await mainClient.getCourses());
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить дисциплины', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    try {
      if (!title.trim()) {
        pushToast({ kind: 'error', title: 'Введите название' });
        return;
      }
      const created = await mainClient.createCourse({ title: title.trim(), description: description.trim() || undefined, teacherId: '' });
      setCourses((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      pushToast({ kind: 'success', title: 'Дисциплина создана' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Создание не удалось', message: String(e) });
    }
  };

  const rename = async (c: Course) => {
    const next = window.prompt('Новое название дисциплины', c.title);
    if (!next) return;
    try {
      const updated = await mainClient.updateCourse(c.id, { title: next });
      if (!updated) return;
      setCourses((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      pushToast({ kind: 'success', title: 'Изменения сохранены' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Обновление не удалось', message: String(e) });
    }
  };

  const del = async (c: Course) => {
    const ok = window.confirm(`Удалить дисциплину "${c.title}"?\n\n(В демо удаление также удалит связанные тесты/вопросы)`);
    if (!ok) return;
    try {
      const removed = await mainClient.deleteCourse(c.id);
      if (removed) {
        setCourses((prev) => prev.filter((x) => x.id !== c.id));
        pushToast({ kind: 'success', title: 'Дисциплина удалена' });
      }
    } catch (e) {
      pushToast({ kind: 'error', title: 'Удаление не удалось', message: String(e) });
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Дисциплины (CRUD)</h2>
          <div className="flex items-center gap-3">
            <button onClick={load} className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200">
              Обновить
            </button>
            <Link className="text-sm text-indigo-700 hover:underline" to="/admin">← Админ</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-3">Создание дисциплины</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" className="border rounded px-3 py-2 text-sm" />
            <button onClick={create} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Создать
            </button>
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" className="mt-3 border rounded px-3 py-2 text-sm w-full" rows={2} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 text-sm text-gray-600">Управление дисциплинами</div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Название</th>
                    <th className="text-left px-4 py-3">Описание</th>
                    <th className="text-right px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{c.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{c.title}</td>
                      <td className="px-4 py-3 text-gray-700">{c.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => rename(c)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200">Переименовать</button>
                          <button onClick={() => del(c)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Удалить</button>
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
