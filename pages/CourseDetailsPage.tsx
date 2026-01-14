import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { useUi } from '../context/UiProvider';
import { Course, Test } from '../types';
import { ApiError } from '../services/apiClient';
import { mainClient } from '../services/mainClient';

export const CourseDetailsPage: React.FC = () => {
  const { courseId } = useParams();
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [course, setCourse] = useState<Course | null>(null);
  const [tests, setTests] = useState<Test[] | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const safeTests = tests ?? [];

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!courseId) return;
      setLoadingTests(true);
      setNeedsEnrollment(false);
      try {
        const c = await mainClient.getCourse(courseId);
        if (!mounted) return;
        setCourse(c);
      } catch (e) {
        pushToast({ kind: 'error', title: 'Не удалось загрузить дисциплину', message: String(e) });
      }
      try {
        const t = await mainClient.getTestsByCourse(courseId, { suppressForbiddenRedirect: true });
        if (!mounted) return;
        setTests(t);
      } catch (e) {
        if (!mounted) return;
        if (e instanceof ApiError && e.status === 403) {
          setNeedsEnrollment(true);
          setTests([]);
        } else {
          setTests([]);
          pushToast({ kind: 'error', title: 'Не удалось загрузить тесты', message: String(e) });
        }
      } finally {
        if (mounted) setLoadingTests(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId, pushToast]);

  const enroll = async () => {
    if (!courseId) return;
    setEnrolling(true);
    try {
      await mainClient.enrollInCourse(courseId);
      pushToast({ kind: 'success', title: 'Вы записаны на дисциплину' });
      const t = await mainClient.getTestsByCourse(courseId, { suppressForbiddenRedirect: true });
      setNeedsEnrollment(false);
      setTests(t);
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось записать на дисциплину', message: String(e) });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              ← Все дисциплины
            </Link>
            <h1 className="text-2xl font-black text-gray-900 mt-2">
              {course ? course.title : 'Дисциплина'}
            </h1>
            {course && <p className="text-sm text-gray-600 mt-1">{course.description}</p>}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-black text-gray-900">Тесты</h2>
          <p className="text-sm text-gray-600 mt-1">
            Заглушки. Позже заменим на реальные тесты из Main module.
          </p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {loadingTests ? (
              <div className="text-gray-600">Загрузка…</div>
            ) : needsEnrollment ? (
              <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-amber-900">Вы не записаны на дисциплину</div>
                  <div className="text-xs text-amber-800 mt-1">Запишитесь, чтобы увидеть тесты и материалы.</div>
                </div>
                <button
                  onClick={enroll}
                  disabled={enrolling}
                  className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
                >
                  {enrolling ? 'Записываем…' : 'Записаться'}
                </button>
              </div>
            ) : safeTests.length === 0 ? (
              <div className="text-gray-600">Для этой дисциплины пока нет тестов.</div>
            ) : (
              safeTests.map((t) => (
                <Link
                  key={t.id}
                  to={`/tests/${t.id}`}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {t.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Статус: <span className={t.isActive ? 'text-green-700 font-bold' : 'text-gray-500 font-bold'}>
                          {t.isActive ? 'активен' : 'неактивен'}
                        </span>
                      </div>
                    </div>
                    <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
