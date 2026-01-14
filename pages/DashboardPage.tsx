import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
// Role import больше не нужен: доступ к админ-разделу определяется permissions
import { useSession } from '../context/SessionProvider';
import { mainClient } from '../services/mainClient';
import { useUi } from '../context/UiProvider';
import { USE_MOCK_MAIN_API } from '../constants';

export const DashboardPage: React.FC = () => {
  const { session } = useSession();
  const { pushToast } = useUi();
  const [activeTab, setActiveTab] = useState<'courses' | 'admin'>('courses');

  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);

  const user = session.user;
  const perms = session.permissions || [];
  const canSeeAdmin = !USE_MOCK_MAIN_API
    ? true
    : [
        'user:list:read',
        'course:add',
        'course:del',
        'course:test:add',
        'quest:list:read',
        'quest:create',
        'user:block:write',
        'test:answer:read',
      ].some((p) => perms.includes(p));

  const canCreateCourse = !USE_MOCK_MAIN_API ? false : perms.includes('course:add');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCoursesLoading(true);
        const list = await mainClient.getCourses();
        if (!mounted) return;
        setCourses(list.map((c) => ({ id: c.id, title: c.title })));
      } catch (e: any) {
        if (!mounted) return;
        // В реальном режиме, если токен не задан/нет доступа, мы не ломаем кабинет.
        pushToast({ kind: 'error', title: 'Не удалось загрузить дисциплины', message: e?.message || 'Ошибка' });
      } finally {
        if (mounted) setCoursesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pushToast]);

  const courseCards = useMemo(() => {
    if (coursesLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 animate-pulse min-h-[220px]" />
      ));
    }
    if (!courses.length) {
      return (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-sm text-gray-600">
          Дисциплины не найдены (или нет доступа). Перейдите в раздел дисциплин, чтобы увидеть детали.
        </div>
      );
    }
    return courses.map((c) => <CourseCardReal key={c.id} id={c.id} title={c.title} />);
  }, [courses, coursesLoading]);

  const resetDemo = async () => {
    try {
      await mainClient.resetMockData();
      pushToast({ kind: 'success', title: 'Демо-данные сброшены', message: 'Заглушки пересозданы.' });
      // Перезагрузим текущую страницу, чтобы заново прочитать мок-данные.
      window.location.reload();
    } catch (e: any) {
      pushToast({ kind: 'error', title: 'Не удалось сбросить данные', message: e?.message || 'Ошибка' });
    }
  };

  return (
    <Layout
      user={user}
      status={session.status}
      onLogout={(all) => {
        // Layout вызывает onLogout — используем навигацию через обычный Link (/logout).
        window.location.href = all ? '/logout?all=true' : '/logout';
      }}
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Личный кабинет</h2>
              <p className="text-gray-500 mt-1">Рады вас видеть, {user?.fullName}!</p>
              <div className="mt-4">
                <Link to="/courses" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
                  Перейти к дисциплинам <span className="translate-y-[1px]">→</span>
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border bg-white">
                  API: {USE_MOCK_MAIN_API ? 'MOCK' : 'HTTP'}
                </span>
                {USE_MOCK_MAIN_API && (
                  <button
                    onClick={resetDemo}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200"
                  >
                    Сбросить демо
                  </button>
                )}
              </div>

              {canSeeAdmin && (
                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                  <button
                    onClick={() => setActiveTab('courses')}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === 'courses'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Мои Курсы
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === 'admin'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Админ-панель
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'courses' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseCards}
              {canCreateCourse && (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-500 cursor-pointer transition-all group min-h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">+</span>
                  </div>
                  <p className="font-semibold">Добавить дисциплину</p>
                  <p className="mt-1 text-xs">(демо-режим)</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold mb-2">Админ-инструменты</h3>
              <p className="text-sm text-gray-500 mb-6">
                Инструменты администратора.
              </p>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
              >
                Открыть админ-раздел <span className="translate-y-[1px]">→</span>
              </Link>
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-xl font-bold mb-2">Статус сессии в Redis</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Ваш сеанс активен. Access-токен используется для подписи запросов к Главному модулю системы.
              </p>
              <div className="mt-4">
                <Link to="/courses" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
                  Перейти к дисциплинам <span className="translate-y-[1px]">→</span>
                </Link>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <p className="text-[10px] text-indigo-200 uppercase font-bold">Статус</p>
                <p className="text-sm font-mono font-bold">AUTHORIZED</p>
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <p className="text-[10px] text-indigo-200 uppercase font-bold">TTL Сессии</p>
                <p className="text-sm font-mono font-bold">12:59:59</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

// AdminAction оставлен в прежних версиях; сейчас admin вынесен в отдельную страницу.

const CourseCardReal: React.FC<{ id: string; title: string }> = ({ id, title }) => (
  <Link
    to={`/courses/${encodeURIComponent(id)}`}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col"
  >
    <div className="p-6 flex-1">
      <div className="mb-4">
        <span className="px-3 py-1 bg-indigo-50 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
          Course #{id}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-3 line-clamp-3 leading-relaxed">
        Откройте дисциплину, чтобы посмотреть тесты и участников.
      </p>
      <div className="mt-8 flex items-center justify-between">
        <div className="text-xs text-gray-400">ID: {id}</div>
        <div className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/btn">
          Перейти <span className="transform group-hover/btn:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
    <div className="h-1 bg-gray-50 group-hover:bg-indigo-400 transition-colors" />
  </Link>
);
