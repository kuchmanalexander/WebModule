import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { Attempt, AttemptStatus, Test } from '../types';
import { mainClient } from '../services/mainClient';

export const TestDetailsPage: React.FC = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const userId = session.user?.id || 'unknown_user';

  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!testId) return;
      const t = await mainClient.getTest(testId);
      const a = await mainClient.getAttemptsForTest(testId, userId);
      const active = await mainClient.getActiveAttempt(testId, userId);
      if (!mounted) return;
      setTest(t);
      setAttempts(a);
      setActiveAttempt(active);
    })();
    return () => { mounted = false; };
  }, [testId, userId]);

  const startOrResume = async () => {
    if (!testId) return;
    setBusy(true);
    try {
      const attempt = await mainClient.createAttempt(testId, userId);
      navigate(`/attempts/${attempt.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
          ← К дисциплинам
        </Link>

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{test ? test.title : 'Тест'}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Это демонстрационная страница. Позже данные будут приходить из Main module.
            </p>
          </div>

          <button
            disabled={busy || !test?.isActive}
            onClick={startOrResume}
            className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors ${
              busy || !test?.isActive
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {activeAttempt ? 'Продолжить попытку' : 'Начать попытку'}
          </button>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-black text-gray-900">История попыток</h2>

          {attempts === null ? (
            <div className="text-gray-600 mt-3">Загрузка…</div>
          ) : attempts.length === 0 ? (
            <div className="text-gray-600 mt-3">Пока нет попыток. Нажми “Начать попытку”.</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-3">Старт</th>
                    <th className="py-2 pr-3">Статус</th>
                    <th className="py-2 pr-3">Результат</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3">{new Date(a.startedAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <span className={`font-bold ${a.status === AttemptStatus.COMPLETED ? 'text-green-700' : 'text-indigo-700'}`}>
                          {a.status === AttemptStatus.COMPLETED ? 'завершена' : 'в процессе'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {a.status === AttemptStatus.COMPLETED ? (
                          <span className="font-bold">{a.score}/{a.maxScore}</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {a.status === AttemptStatus.COMPLETED ? (
                          <Link
                            to={`/attempts/${a.id}/result`}
                            className="text-indigo-600 hover:text-indigo-700 font-bold"
                          >
                            Открыть →
                          </Link>
                        ) : (
                          <Link
                            to={`/attempts/${a.id}`}
                            className="text-indigo-600 hover:text-indigo-700 font-bold"
                          >
                            Продолжить →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Примечание: по ТЗ у теста может быть только одна активная попытка (мы соблюдаем это в mock API).
        </div>
      </div>
    </Layout>
  );
};
