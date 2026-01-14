import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { Attempt, AttemptStatus } from '../types';
import { mainClient } from '../services/mainClient';

export const AttemptResultPage: React.FC = () => {
  const { attemptId } = useParams();
  const { session, logout } = useSession();
  const userId = session.user?.id || 'unknown_user';

  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!attemptId) return;
      const a = await mainClient.getAttempt(attemptId, userId);
      if (!mounted) return;
      setAttempt(a);
    })();
    return () => { mounted = false; };
  }, [attemptId, userId]);

  if (!attempt) {
    return (
      <Layout user={session.user} status={session.status} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-6 py-10 text-gray-600">Загрузка результата…</div>
      </Layout>
    );
  }

  const isCompleted = attempt.status === AttemptStatus.COMPLETED;

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to={`/tests/${attempt.testId}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
          ← К тесту
        </Link>

        <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-2xl font-black text-gray-900">Результат попытки</h1>

          {!isCompleted ? (
            <div className="text-gray-600 mt-2">
              Эта попытка ещё не завершена. <Link className="text-indigo-600 font-bold" to={`/attempts/${attempt.id}`}>Продолжить →</Link>
            </div>
          ) : (
            <>
              <div className="mt-3 text-gray-700">
                Итог: <span className="font-black text-gray-900">{attempt.score}/{attempt.maxScore}</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Старт: {new Date(attempt.startedAt).toLocaleString()} • Завершение: {attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleString() : '—'}
              </div>

              <div className="mt-6 space-y-4">
                {attempt.questions.map((q, idx) => {
                  const selected = attempt.answers?.[q.id]?.selectedOptionIndex;
                  const isCorrect = selected === q.correctOptionIndex;
                  return (
                    <div key={q.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-gray-500 font-bold">Вопрос {idx + 1}</div>
                          <div className="font-black text-gray-900 mt-1">{q.text}</div>
                        </div>
                        <div className={`text-sm font-black ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {selected === undefined ? 'нет ответа' : isCorrect ? 'верно' : 'неверно'}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-700">
                        Твой ответ: <span className="font-bold">{selected === undefined ? '—' : q.options[selected]}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        Правильный: <span className="font-bold">{q.options[q.correctOptionIndex]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Результат попытки.
        </div>
      </div>
    </Layout>
  );
};
