import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { useUi } from '../context/UiProvider';
import { Attempt, AttemptStatus, Test } from '../types';
import { mainClient } from '../services/mainClient';

export const TestDetailsPage: React.FC = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const userId = session.user?.id || 'unknown_user';

  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasCompletedAttempt, setHasCompletedAttempt] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!testId) return;
      const t = await mainClient.getTest(testId);
      const [a, active, grades] = await Promise.all([
        mainClient.getAttemptsForTest(testId, userId),
        mainClient.getActiveAttempt(testId, userId),
        mainClient.getTestGrades(testId, userId).catch(() => []),
      ]);
      if (!mounted) return;
      setTest(t);
      if (active && !a.find((item) => item.id === active.id)) {
        setAttempts([active, ...a]);
      } else {
        setAttempts(a);
      }
      setActiveAttempt(active);
      setHasCompletedAttempt(Array.isArray(grades) ? grades.length > 0 : Boolean(grades));
    })();
    return () => { mounted = false; };
  }, [testId, userId]);

  const startOrResume = async () => {
    if (!testId) return;
    if (!activeAttempt && hasCompletedAttempt) {
      pushToast({ kind: 'info', title: 'Тест уже пройден', message: 'Повторное прохождение недоступно.' });
      return;
    }
    setBusy(true);
    try {
      if (activeAttempt) {
        navigate(`/attempts/${activeAttempt.id}`);
        return;
      }
      const attempt = await mainClient.createAttempt(testId, userId);
      navigate(`/attempts/${attempt.id}`);
    } catch (e) {
      try {
        const active = await mainClient.getActiveAttempt(testId, userId);
        if (active) {
          navigate(`/attempts/${active.id}`);
          return;
        }
      } catch {
        // ignore fallback errors
      }
      pushToast({ kind: 'error', title: 'Не удалось начать попытку', message: String(e) });
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

          <div className="text-right">
            <button
              disabled={busy || !test?.isActive || (!activeAttempt && hasCompletedAttempt)}
              onClick={startOrResume}
              className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors ${
                busy || !test?.isActive || (!activeAttempt && hasCompletedAttempt)
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {activeAttempt ? 'Продолжить попытку' : hasCompletedAttempt ? 'Тест пройден' : 'Начать попытку'}
            </button>
            {!activeAttempt && hasCompletedAttempt && (
              <div className="mt-2 text-xs text-gray-500">Повторное прохождение недоступно.</div>
            )}
          </div>
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
