import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useSession } from '../context/SessionProvider';
import { Attempt } from '../types';
import { mainClient } from '../services/mainClient';

export const AttemptPage: React.FC = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { session, logout } = useSession();
  const userId = session.user?.id || 'unknown_user';

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);

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

  const progress = useMemo(() => {
    if (!attempt) return { answered: 0, total: 0 };
    const total = attempt.questions.length;
    const answered = Object.values(attempt.answers || {}).filter(a => a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined).length;
    return { answered, total };
  }, [attempt]);

  const select = async (questionId: string, optionIndex: number) => {
    if (!attemptId) return;
    setBusy(true);
    try {
      const updated = await mainClient.saveAnswer(attemptId, userId, questionId, optionIndex);
      setAttempt({ ...updated });
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!attemptId) return;
    setBusy(true);
    try {
      const updated = await mainClient.finishAttempt(attemptId, userId);
      setAttempt({ ...updated });
      navigate(`/attempts/${attemptId}/result`);
    } finally {
      setBusy(false);
    }
  };

  if (!attempt) {
    return (
      <Layout user={session.user} status={session.status} onLogout={logout}>
        <div className="max-w-4xl mx-auto px-6 py-10 text-gray-600">Загрузка попытки…</div>
      </Layout>
    );
  }

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to={`/tests/${attempt.testId}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              ← К тесту
            </Link>
            <h1 className="text-2xl font-black text-gray-900 mt-2">Попытка</h1>
            <p className="text-sm text-gray-600 mt-1">
              Прогресс: <span className="font-bold">{progress.answered}/{progress.total}</span>
            </p>
          </div>

          <button
            disabled={busy || progress.answered === 0}
            onClick={finish}
            className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors ${
              busy || progress.answered === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title={progress.answered === 0 ? 'Сначала ответь хотя бы на один вопрос' : 'Завершить попытку'}
          >
            Завершить
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {attempt.questions.map((q, idx) => {
            const selected = attempt.answers?.[q.id]?.selectedOptionIndex;
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500 font-bold">Вопрос {idx + 1} • v{q.version}</div>
                    <div className="text-base font-black text-gray-900 mt-1">{q.text}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {q.options.map((opt, i) => {
                    const isSelected = selected === i;
                    return (
                      <button
                        key={i}
                        disabled={busy}
                        onClick={() => select(q.id, i)}
                        className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`font-semibold ${isSelected ? 'text-indigo-800' : 'text-gray-800'}`}>{opt}</span>
                          {isSelected && <span className="text-indigo-700 font-black">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-xs text-gray-500">
          По ТЗ вопросы в попытке “снэпшотятся” при создании (мы фиксируем version и текст в Attempt).
        </div>
      </div>
    </Layout>
  );
};
