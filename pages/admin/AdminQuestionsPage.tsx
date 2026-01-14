import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useSession } from '../../context/SessionProvider';
import { mainClient } from '../../services/mainClient';
import { Question, Test } from '../../types';
import { useUi } from '../../context/UiProvider';

export const AdminQuestionsPage: React.FC = () => {
  const { session, logout } = useSession();
  const { pushToast } = useUi();
  const [tests, setTests] = useState<Test[]>([]);
  const [testId, setTestId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState(0);

  const load = async (forceTestId?: string) => {
    setLoading(true);
    try {
      const allTests = await mainClient.getAllTests();
      setTests(allTests);
      const tid = forceTestId || testId || (allTests[0]?.id ?? '');
      setTestId(tid);
      if (tid) {
        setQuestions(await mainClient.getQuestionsByTest(tid));
      } else {
        setQuestions([]);
      }
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить вопросы', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeTest = async (nextId: string) => {
    setTestId(nextId);
    try {
      setQuestions(await mainClient.getQuestionsByTest(nextId));
    } catch (e) {
      pushToast({ kind: 'error', title: 'Не удалось загрузить вопросы теста', message: String(e) });
    }
  };

  const create = async () => {
    if (!testId) return;
    if (!text.trim()) {
      pushToast({ kind: 'error', title: 'Введите текст вопроса' });
      return;
    }
    const options = [optA, optB, optC, optD].map((x) => x.trim()).filter(Boolean);
    if (options.length < 2) {
      pushToast({ kind: 'error', title: 'Нужно минимум 2 варианта ответа' });
      return;
    }
    if (correct < 0 || correct >= options.length) {
      pushToast({ kind: 'error', title: 'Неверный индекс правильного ответа' });
      return;
    }
    try {
      const q = await mainClient.createQuestion(testId, { text: text.trim(), options, correctOptionIndex: correct });
      setQuestions((prev) => [q, ...prev]);
      setText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setCorrect(0);
      pushToast({ kind: 'success', title: 'Вопрос создан' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Создание не удалось', message: String(e) });
    }
  };

  const edit = async (q: Question) => {
    const nextText = window.prompt('Новый текст вопроса', q.text);
    if (!nextText) return;
    const bump = window.confirm('Увеличить версию вопроса? (как в task-flow)');
    try {
      const updated = await mainClient.updateQuestion(testId, q.id, { text: nextText }, bump);
      if (!updated) return;
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? updated : x)));
      pushToast({ kind: 'success', title: 'Вопрос обновлён' });
    } catch (e) {
      pushToast({ kind: 'error', title: 'Обновление не удалось', message: String(e) });
    }
  };

  const del = async (q: Question) => {
    const ok = window.confirm(`Удалить вопрос?\n\n${q.text}`);
    if (!ok) return;
    try {
      const removed = await mainClient.deleteQuestion(testId, q.id);
      if (removed) {
        setQuestions((prev) => prev.filter((x) => x.id !== q.id));
        pushToast({ kind: 'success', title: 'Вопрос удалён' });
      }
    } catch (e) {
      pushToast({ kind: 'error', title: 'Удаление не удалось', message: String(e) });
    }
  };

  const testTitle = useMemo(() => {
    const m = new Map(tests.map((t) => [t.id, t.title]));
    return (id: string) => m.get(id) || id;
  }, [tests]);

  return (
    <Layout user={session.user} status={session.status} onLogout={logout}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Вопросы (CRUD)</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => load()} className="px-3 py-2 rounded bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200">Обновить</button>
            <Link className="text-sm text-indigo-700 hover:underline" to="/admin">← Админ</Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Тест:</div>
            <select value={testId} onChange={(e) => onChangeTest(e.target.value)} className="border rounded px-3 py-2 text-sm">
              {tests.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {testId && (
              <Link to={`/tests/${testId}`} className="text-sm text-indigo-700 hover:underline">Открыть как студент</Link>
            )}
          </div>
          <div className="text-sm text-gray-600">Создание вопроса</div>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Текст вопроса" className="border rounded px-3 py-2 text-sm w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Вариант A" className="border rounded px-3 py-2 text-sm" />
            <input value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Вариант B" className="border rounded px-3 py-2 text-sm" />
            <input value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Вариант C" className="border rounded px-3 py-2 text-sm" />
            <input value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Вариант D" className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Правильный индекс:</span>
              <input type="number" min={0} value={correct} onChange={(e) => setCorrect(Number(e.target.value))} className="border rounded px-2 py-1 text-sm w-20" />
            </div>
            <button onClick={create} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Создать</button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200 text-sm text-gray-600">
            Список вопросов для теста: <b>{testTitle(testId)}</b>. Редактирование предлагает поднять версию (как в task-flow).
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Текст</th>
                    <th className="text-left px-4 py-3">Версия</th>
                    <th className="text-left px-4 py-3">Правильный</th>
                    <th className="text-right px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{q.id}</td>
                      <td className="px-4 py-3 text-gray-900">
                        <div className="font-semibold">{q.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {q.options.map((o, i) => (
                            <div key={i} className={i === q.correctOptionIndex ? 'text-green-700' : ''}>
                              {i}. {o}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{q.version}</td>
                      <td className="px-4 py-3 text-gray-700">{q.correctOptionIndex}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => edit(q)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200">Редактировать</button>
                          <button onClick={() => del(q)} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold hover:bg-red-700">Удалить</button>
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
