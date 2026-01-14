import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { Course } from '../types';
import { mainClient } from '../services/mainClient';

export const CoursesPage: React.FC = () => {
  const { session, logout } = useSession();
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    let mounted = true;
    mainClient.getCourses().then((data) => {
      if (mounted) setCourses(data);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Дисциплины</h1>
            <p className="text-sm text-gray-600 mt-1">Список доступных дисциплин.</p>
          </div>
          <Link to="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
            ← В кабинет
          </Link>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {courses === null ? (
            <div className="text-gray-600">Загрузка…</div>
          ) : courses.length === 0 ? (
            <div className="text-gray-600">Пока нет дисциплин.</div>
          ) : (
            courses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {c.title}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{c.description}</div>
                  </div>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};
