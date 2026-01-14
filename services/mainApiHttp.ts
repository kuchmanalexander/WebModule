import { MAIN_API_BASE_URL, MANUAL_JWT_TOKEN } from '../constants';
import { Attempt, Course, Question, Session, Test, User } from '../types';
import { ApiError } from './apiClient';

/**
 * mainApiHttp — HTTP-реализация Main module.
 *
 * ВАЖНО:
 * - Здесь все пути начинаются с `/api` (MAIN_API_BASE_URL).
 * - Реальные ответы бэка могут отличаться от мок-структур, поэтому ниже есть
 *   маленькие "адаптеры" (mapCourse/mapTest/...). Когда у вас будет точный контракт,
 *   поправить нужно только их.
 */

async function http<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MAIN_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      // Пока авторизация не подключена: можно вручную вставить токен в constants.ts (MANUAL_JWT_TOKEN)
      ...(MANUAL_JWT_TOKEN ? { Authorization: `Bearer ${MANUAL_JWT_TOKEN}` } : {}),
      ...(MANUAL_JWT_TOKEN ? {} : session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      const detail = body?.detail ?? body?.message ?? body?.error ?? body;
      msg = formatErrorDetail(detail) || msg;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

function formatErrorDetail(detail: any): string | null {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (item.msg) {
          const loc = Array.isArray(item.loc) ? item.loc.join('.') : item.loc;
          return loc ? `${item.msg} (${loc})` : String(item.msg);
        }
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  if (typeof detail === 'object') {
    if (detail.message) return String(detail.message);
    if (detail.error) return String(detail.error);
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }
  return String(detail);
}

// ---------- Adapters (best-effort) ----------
function mapCourse(raw: any): Course {
  return {
    id: String(raw.id ?? raw.course_id ?? raw.courseId),
    title: String(raw.title ?? raw.name ?? raw.course_name ?? 'Course'),
    description: raw.description ? String(raw.description) : undefined,
    teacherId: String(raw.teacher_id ?? raw.teacherId ?? ''),
  };
}

function mapTest(raw: any, courseId?: string): Test {
  return {
    id: String(raw.id ?? raw.test_id ?? raw.testId),
    courseId: String(courseId ?? raw.course_id ?? raw.courseId ?? ''),
    title: String(raw.title ?? raw.name ?? raw.test_name ?? 'Test'),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    authorId: String(raw.author_id ?? raw.authorId ?? ''),
  };
}


function mapUserShort(raw: any): User {
  return {
    id: String(raw.id ?? raw.user_id ?? raw.userId),
    fullName: String(raw.full_name ?? raw.fullName ?? raw.username ?? 'User'),
    email: raw.email ? String(raw.email) : '',
    roles: Array.isArray(raw.roles) ? raw.roles : raw.role ? [raw.role] : [],
    isBlocked: Boolean(raw.is_blocked ?? raw.isBlocked ?? false),
  };
}

function mapQuestion(raw: any): Question {
  // По контракту:
  // - question_id — логический id вопроса
  // - id — id записи версии
  const logicalId = raw?.question_id ?? raw?.questionId ?? raw?.id;
  return {
    id: String(logicalId),
    text: String(raw?.text ?? raw?.title ?? raw?.question_text ?? ''),
    options: Array.isArray(raw?.options) ? raw.options.map(String) : [],
    correctOptionIndex: Number(raw?.correct_index ?? raw?.correctIndex ?? raw?.correctOptionIndex ?? 0),
    version: Number(raw?.version ?? 1),
  };
}

function mapAttempt(raw: any): Attempt {
  // "Attempt" в UI ожидает questions snapshot + answers.
  return {
    id: String(raw.id ?? raw.attempt_id ?? raw.attemptId),
    testId: String(raw.test_id ?? raw.testId ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    status: (raw.status ?? raw.state ?? 'ACTIVE') as any,
    createdAt: raw.created_at ?? raw.createdAt,
    finishedAt: raw.finished_at ?? raw.finishedAt,
    // Questions snapshot может прийти как `questions` (массив) или `items`
    questions: Array.isArray(raw.questions) ? raw.questions.map(mapQuestion) : Array.isArray(raw.items) ? raw.items.map(mapQuestion) : [],
    // Answers в некоторых API приходят отдельным endpoint'ом — здесь оставляем пусто
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    score: typeof raw.score === 'number' ? raw.score : undefined,
    maxScore: typeof raw.max_score === 'number' ? raw.max_score : typeof raw.maxScore === 'number' ? raw.maxScore : undefined,
  };
}

// ---------- API ----------
export const mainApiHttp = {
  // Health (не защищён)
  health: async () => {
    const res = await fetch(`${MAIN_API_BASE_URL}/health`);
    return res.ok;
  },

  // ----- Users -----
  getAllUsers: (session: Session) =>
    http<any[]>(session, '/users/').then((xs) => xs.map(mapUserShort)),

  // UI-compat alias
  getUsers: (session: Session) => mainApiHttp.getAllUsers(session),

  getUser: (session: Session, userId: string) =>
    http<any>(session, `/users/${encodeURIComponent(userId)}`).then((u) => {
      // По контракту бэка GET /users/{id} возвращает строку (ФИО)
      if (typeof u === 'string') {
        return { id: String(userId), fullName: u, email: '' } as User;
      }
      return mapUserShort(u);
    }),

  updateUserFullName: (session: Session, userId: string, fullName: string) =>
    http<any>(session, `/users/${encodeURIComponent(userId)}/full-name`, {
      method: 'PATCH',
      body: JSON.stringify({ full_name: fullName }),
    }).then(mapUserShort),

  getUserRoles: (session: Session, userId: string) =>
    http<{ roles: string[] } | string[]>(session, `/users/${encodeURIComponent(userId)}/roles`).then((r: any) =>
      Array.isArray(r) ? r : r?.roles ?? []
    ),

  setUserRoles: (session: Session, userId: string, roles: string[]) =>
    http(session, `/users/${encodeURIComponent(userId)}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    }),

  getUserBlockStatus: (session: Session, userId: string) =>
    http<boolean>(session, `/users/${encodeURIComponent(userId)}/block`).then((r: any) => Boolean(r)),

  setUserBlocked: (session: Session, userId: string, isBlocked: boolean) =>
    http<any>(session, `/users/${encodeURIComponent(userId)}/block`, {
      method: 'POST',
      body: JSON.stringify({ is_blocked: isBlocked }),
    }).then(mapUserShort),

  // UI-compat aliases
  blockUser: (session: Session, userId: string) => mainApiHttp.setUserBlocked(session, userId, true),
  unblockUser: (session: Session, userId: string) => mainApiHttp.setUserBlocked(session, userId, false),

  
  createUser: (session: Session) =>
    http<any>(session, `/users/create_user`, { method: 'POST' }).then(mapUserShort),

// ----- Courses -----
  getCourses: (session: Session) =>
    http<any[]>(session, '/courses/').then((xs) => xs.map(mapCourse)),

  getCourse: (session: Session, courseId: string) =>
    http<any>(session, `/courses/${encodeURIComponent(courseId)}`).then(mapCourse),

  updateCourse: (session: Session, courseId: string, patch: Partial<Course>) =>
    http(session, `/courses/${encodeURIComponent(courseId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: patch.title,
        description: patch.description,
      }),
    }),

  createCourse: (session: Session, input: Partial<Course>) =>
    http<any>(session, `/courses/?title=${encodeURIComponent(input.title ?? '')}&description=${encodeURIComponent(input.description ?? '')}`, {
      method: 'POST',
    }).then(mapCourse),

  deleteCourse: (session: Session, courseId: string) =>
    http(session, `/courses/${encodeURIComponent(courseId)}`, { method: 'DELETE' }),

  getTestsByCourse: (session: Session, courseId: string) =>
    http<any[]>(session, `/courses/${encodeURIComponent(courseId)}/tests`).then((xs) => xs.map((t) => mapTest(t, courseId))),

  getCourseStudents: (session: Session, courseId: string) =>
    http<any[]>(session, `/courses/${encodeURIComponent(courseId)}/students`).then((xs) => xs.map(mapUserShort)),

  addCourseStudent: async (session: Session, courseId: string, userId?: string) => {
    const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const primaryPath = `/courses/${encodeURIComponent(courseId)}/student${qs}`;
    const fallbackPath = `/courses/${encodeURIComponent(courseId)}/students${qs}`;
    try {
      return await http(session, primaryPath, { method: 'POST' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        return await http(session, fallbackPath, { method: 'POST' });
      }
      throw e;
    }
  },

  removeCourseStudent: (session: Session, courseId: string, userId: string) =>
    http(session, `/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  // ----- Tests -----
  createTest: (session: Session, courseId: string, input: Partial<Test>) =>
    http<any>(session, `/courses/${encodeURIComponent(courseId)}/tests`, {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        // если бэк ожидает другое — поправишь здесь
        is_active: input.isActive,
      }),
    }).then((t) => mapTest(t, courseId)),

  deleteTest: (session: Session, courseId: string, testId: string) =>
    http(session, `/courses/${encodeURIComponent(courseId)}/tests/${encodeURIComponent(testId)}`, { method: 'DELETE' }),

  getTestActive: (session: Session, courseId: string, testId: string) =>
    http<any>(session, `/courses/${encodeURIComponent(courseId)}/tests/${encodeURIComponent(testId)}/active`).then((r) => {
      if (typeof r === 'boolean') return r;
      return Boolean(r?.is_active ?? r?.isActive);
    }),

  setTestActive: (session: Session, courseId: string, testId: string, isActive: boolean) =>
    http<any>(
      session,
      `/courses/${encodeURIComponent(courseId)}/tests/${encodeURIComponent(testId)}/active?is_active=${encodeURIComponent(
        String(isActive)
      )}`,
      { method: 'PATCH' }
    ).then((t) => mapTest(t, courseId)),

  // ----- Questions -----
  getAllQuestions: (session: Session) =>
    http<any[]>(session, '/questions/').then((xs) => xs.map(mapQuestion)),

  getQuestionLatest: (session: Session, questionId: string) =>
    http<any>(session, `/questions/${encodeURIComponent(questionId)}`).then(mapQuestion),

  getQuestionVersion: (session: Session, questionId: string, version: number) =>
    http<any>(session, `/questions/${encodeURIComponent(questionId)}/versions/${version}`).then(mapQuestion),

  createQuestion: (session: Session, input: any) => {
    const payload = {
      title: String(input?.title ?? input?.text ?? '').trim(),
      text: String(input?.text ?? '').trim(),
      options: Array.isArray(input?.options) ? input.options : [],
      correct_index: Number(input?.correctOptionIndex ?? input?.correct_index ?? 0),
      test_id: input?.testId != null ? Number(input.testId) : input?.test_id != null ? Number(input.test_id) : null,
    };
    return http<any>(session, '/questions/', { method: 'POST', body: JSON.stringify(payload) }).then(mapQuestion);
  },

  createQuestionVersion: (session: Session, questionId: string, input: any) => {
    const payload = {
      title: String(input?.title ?? input?.text ?? '').trim(),
      text: String(input?.text ?? '').trim(),
      options: Array.isArray(input?.options) ? input.options : [],
      correct_index: Number(input?.correctOptionIndex ?? input?.correct_index ?? 0),
    };
    return http<any>(session, `/questions/${encodeURIComponent(questionId)}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(mapQuestion);
  },

  deleteQuestion: (session: Session, questionId: string) =>
    http(session, `/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' }),

  // Test-question bindings
  addQuestionToTest: (session: Session, testId: string, input: any) =>
    http(session, `/tests/${encodeURIComponent(testId)}/questions`, { method: 'POST', body: JSON.stringify(input) }),

  removeQuestionFromTest: (session: Session, testId: string, questionId: string) =>
    http(session, `/tests/${encodeURIComponent(testId)}/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' }),

  updateQuestionOrder: (session: Session, testId: string, questionIds: string[]) =>
    http(session, `/tests/${encodeURIComponent(testId)}/questions/order`, {
      method: 'PUT',
      body: JSON.stringify({ question_ids: questionIds }),
    }),

  // ----- Results -----
  getTestResultUsers: (session: Session, testId: string) =>
    http<any[]>(session, `/tests/${encodeURIComponent(testId)}/results/users`).then((xs) => xs.map(mapUserShort)),

  getTestGrades: (session: Session, testId: string, userId?: string) =>
    http<any>(session, `/tests/${encodeURIComponent(testId)}/results/grades${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),

  getTestAnswers: (session: Session, testId: string, userId?: string) =>
    http<any>(session, `/tests/${encodeURIComponent(testId)}/results/answers${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),

  // ----- Attempts & Answers -----
  createAttempt: (session: Session, testId: string) =>
    http<any>(session, `/tests/${encodeURIComponent(testId)}/attempts`, { method: 'POST' }).then(mapAttempt),

  finishAttempt: (session: Session, attemptId: string) =>
    http(session, `/attempts/${encodeURIComponent(attemptId)}/finish`, { method: 'POST' }),

  getAttempt: (session: Session, attemptId: string) =>
    http<any>(session, `/attempts/${encodeURIComponent(attemptId)}`).then(mapAttempt),

  getAttemptAnswers: (session: Session, attemptId: string) =>
    http<any[]>(session, `/attempts/${encodeURIComponent(attemptId)}/answers`),

  updateAnswer: (session: Session, answerId: string, value: number) =>
    http(session, `/answers/${encodeURIComponent(answerId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

  deleteAnswer: (session: Session, answerId: string) =>
    http(session, `/answers/${encodeURIComponent(answerId)}`, { method: 'DELETE' }),

  // В HTTP режиме “reset demo data” не применим — делаем no-op, чтобы UI не падал.
  resetMockData: async (_session: Session) => {
    return;
  },

  /**
   * Convenience helper: update answer by questionId inside attempt.
   * UI сейчас работает по questionId, а бэк — по answerId.
   */
  updateAnswerByQuestionId: async (session: Session, attemptId: string, questionId: string, value: number) => {
    const answers = await mainApiHttp.getAttemptAnswers(session, attemptId);
    const found = answers.find((a: any) => String(a.question_id ?? a.questionId) === String(questionId));
    if (!found) throw new ApiError(404, 'Answer not found for question');
    const answerId = String(found.id ?? found.answer_id ?? found.answerId);
    return mainApiHttp.updateAnswer(session, answerId, value);
  },

// -------- Compatibility wrappers for existing UI (mock interface) --------

/**
 * UI-compat: получить тест по id (в API нет прямого GET /tests/{id}).
 * Мы пробуем найти тест через перебор курсов и их списка тестов.
 */
getTest: async (session: Session, testId: string) => {
  const courses = await mainApiHttp.getCourses(session);
  for (const c of courses) {
    try {
      const tests = await mainApiHttp.getTestsByCourse(session, c.id);
      const found = tests.find((t) => t.id === String(testId));
      if (found) return found;
    } catch {
      // ignore course access errors
    }
  }
  throw new ApiError(404, 'Test not found');
},

/**
 * UI-compat: список всех тестов (админская таблица в UI).
 */
getAllTests: async (session: Session) => {
  const courses = await mainApiHttp.getCourses(session);
  const out: Test[] = [];
  for (const c of courses) {
    try {
      const tests = await mainApiHttp.getTestsByCourse(session, c.id);
      out.push(...tests);
    } catch {
      // ignore
    }
  }
  return out;
},

/**
 * UI-compat: создание теста из формы админки.
 * Ожидаем, что UI передаёт courseId в input (как и в моках).
 */
createTestCompat: (session: Session, input: Partial<Test>) => {
  if (!input.courseId) throw new ApiError(400, 'courseId is required to create a test');
  return mainApiHttp.createTest(session, input.courseId, input);
},

/**
 * UI-compat: обновление теста. По твоему списку есть только изменение активности.
 * Если patch содержит isActive — пробуем найти courseId и вызвать setTestActive.
 */
updateTest: async (session: Session, testId: string, patch: Partial<Test>) => {
  if (typeof patch.isActive !== 'boolean') return;
  const courses = await mainApiHttp.getCourses(session);
  for (const c of courses) {
    try {
      const tests = await mainApiHttp.getTestsByCourse(session, c.id);
      if (tests.find((t) => t.id === String(testId))) {
        await mainApiHttp.setTestActive(session, c.id, String(testId), patch.isActive);
        return;
      }
    } catch {
      // ignore
    }
  }
  throw new ApiError(404, 'Test not found');
},

/**
 * UI-compat: удалить тест по id (в API нужно courseId).
 */
deleteTestCompat: async (session: Session, testId: string) => {
  const courses = await mainApiHttp.getCourses(session);
  for (const c of courses) {
    try {
      const tests = await mainApiHttp.getTestsByCourse(session, c.id);
      if (tests.find((t) => t.id === String(testId))) {
        return mainApiHttp.deleteTest(session, c.id, String(testId));
      }
    } catch {
      // ignore
    }
  }
  throw new ApiError(404, 'Test not found');
},

/**
 * UI-compat: список вопросов теста.
 * В текущем наборе эндпоинтов нет GET /tests/{id}/questions, поэтому возвращаем пусто.
 */
getQuestionsForTest: async (_session: Session, _testId: string) => {
  return [] as Question[];
},

/**
 * UI-compat: обновить вопрос (в API делается через создание новой версии).
 */
updateQuestion: async (session: Session, _testId: string, questionId: string, patch: any, bumpVersion: boolean = true) => {
  if (!bumpVersion) {
    // без bumpVersion отдельного endpoint нет — создаём версию всё равно
    return mainApiHttp.createQuestionVersion(session, questionId, patch);
  }
  return mainApiHttp.createQuestionVersion(session, questionId, patch);
},

/**
 * UI-compat: сохранить ответ по questionId.
 */
saveAnswer: async (session: Session, attemptId: string, questionId: string, value: number) => {
  return mainApiHttp.updateAnswerByQuestionId(session, attemptId, questionId, value);
},

/**
 * UI-compat: админская страница "все попытки".
 * В наборе эндпоинтов нет GET /attempts для всех — возвращаем пусто.
 */
getAllAttempts: async (_session: Session) => {
  return [] as Attempt[];
},

  // Эти методы отсутствуют в реальном контракте (пока не реализовано) — возвращаем пусто.
  getAttemptsForTest: async (_session: Session, _testId: string, _userId: string) => {
    return [] as Attempt[];
  },
  getActiveAttempt: async (_session: Session, _testId: string, _userId: string) => {
    return undefined as unknown as Attempt | undefined;
  },
};
