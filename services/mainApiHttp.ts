import { MAIN_API_BASE_URL, MANUAL_JWT_TOKEN, USE_AUTH_FLOW } from '../constants';
import { Attempt, AttemptAnswer, AttemptStatus, Course, Question, Session, Test, User, UserData } from '../types';
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any),
  };

  // ✅ В BFF+Redis режиме НЕ ставим Authorization на фронте.
  // BFF сам добавляет Bearer из Redis.
  // Поэтому единственное важное: credentials: 'include'
  if (!USE_AUTH_FLOW) {
    if (MANUAL_JWT_TOKEN) headers.Authorization = `Bearer ${MANUAL_JWT_TOKEN}`;
    else if (session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${MAIN_API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      const detail = (body as any)?.detail ?? (body as any)?.message ?? (body as any)?.error ?? body;
      msg = formatErrorDetail(detail) || msg;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, msg);
  }

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
    description: raw.description ? String(raw.description) : '',
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

function mapUserData(raw: any): UserData {
  return {
    id: String(raw.id ?? raw.user_id ?? raw.userId),
    username: String(raw.username ?? raw.login ?? raw.email ?? ''),
    fullName: String(raw.full_name ?? raw.fullName ?? raw.username ?? 'User'),
    email: raw.email ?? null,
    isBlocked: Boolean(raw.is_blocked ?? raw.isBlocked ?? false),
    roles: Array.isArray(raw.roles) ? raw.roles.map(String) : raw.role ? [String(raw.role)] : [],
    coursesCount: Number(raw.courses_count ?? raw.coursesCount ?? 0),
    attemptsCount: Number(raw.attempts_count ?? raw.attemptsCount ?? 0),
  };
}

function getTokenUserId(session: Session): string | null {
  return session.user?.id ? String(session.user.id) : null;
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

function normalizeAttemptStatus(status: any): AttemptStatus {
  const val = String(status ?? '').toLowerCase();
  if (val === 'in_progress' || val === 'active' || val === 'inprogress') return AttemptStatus.IN_PROGRESS;
  if (val === 'finished' || val === 'completed' || val === 'complete') return AttemptStatus.COMPLETED;
  return (status as AttemptStatus) || AttemptStatus.IN_PROGRESS;
}

function parseScore(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function mapAttemptAnswers(raw: any): Record<string, AttemptAnswer> {
  if (!raw) return {};
  if (!Array.isArray(raw)) return raw;
  const out: Record<string, AttemptAnswer> = {};
  for (const item of raw) {
    if (!item) continue;
    const qid = String(item.question_id ?? item.questionId ?? item.question ?? '');
    if (!qid) continue;
    const value = typeof item.value === 'number' ? item.value : Number(item.value);
    out[qid] = {
      questionId: qid,
      selectedOptionIndex: Number.isFinite(value) && value >= 0 ? value : null,
    };
  }
  return out;
}

function mapAttempt(raw: any, answers?: any, questions?: Question[]): Attempt {
  const score = parseScore(raw.score ?? raw.result_score ?? raw.points);
  const maxScore = parseScore(raw.max_score ?? raw.maxScore ?? raw.max_points ?? raw.maxPoints);
  return {
    id: String(raw.id ?? raw.attempt_id ?? raw.attemptId),
    testId: String(raw.test_id ?? raw.testId ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    status: normalizeAttemptStatus(raw.status ?? raw.state),
    startedAt: raw.started_at ?? raw.startedAt ?? raw.created_at ?? raw.createdAt,
    finishedAt: raw.finished_at ?? raw.finishedAt ?? raw.completed_at ?? raw.completedAt,
    // Questions snapshot может прийти как `questions` (массив) или `items`
    questions: questions
      ?? (Array.isArray(raw.questions)
        ? raw.questions.map(mapQuestion)
        : Array.isArray(raw.items)
          ? raw.items.map(mapQuestion)
          : []),
    answers: mapAttemptAnswers(answers ?? raw.answers),
    score,
    maxScore,
  };
}

async function fetchQuestionsForAnswers(session: Session, answers: any[]): Promise<Question[]> {
  const ids = Array.from(
    new Set(
      answers
        .map((a) => String(a?.question_id ?? a?.questionId ?? a?.question ?? ''))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return [];
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const raw = await http<any>(session, `/questions/${encodeURIComponent(id)}`);
        return mapQuestion(raw);
      } catch {
        return {
          id,
          text: 'Вопрос недоступен',
          options: [],
          correctOptionIndex: 0,
          version: 0,
        };
      }
    })
  );
  return results;
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

  getUserData: (session: Session, userId: string) =>
    http<any>(session, `/users/${encodeURIComponent(userId)}/data`).then(mapUserData),

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
    const tokenUserId = getTokenUserId(session);
    const qs = tokenUserId ? `?user_id=${encodeURIComponent(tokenUserId)}` : userId ? `?user_id=${encodeURIComponent(userId)}` : '';
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
      `/courses/${encodeURIComponent(courseId)}/tests/${encodeURIComponent(testId)}/active`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      }
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
    http<any>(
      session,
      `/tests/${encodeURIComponent(testId)}/results/grades${getTokenUserId(session) ? `?user_id=${encodeURIComponent(String(getTokenUserId(session)))}` : userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`
    ),

  getTestAnswers: (session: Session, testId: string, userId?: string) =>
    http<any>(
      session,
      `/tests/${encodeURIComponent(testId)}/results/answers${getTokenUserId(session) ? `?user_id=${encodeURIComponent(String(getTokenUserId(session)))}` : userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`
    ),

  // ----- Attempts & Answers -----
  createAttempt: async (session: Session, testId: string) => {
    const basePath = `/attempts/tests/${encodeURIComponent(testId)}`;
    try {
      const raw = await http<any>(session, basePath, { method: 'POST' });
      const attemptId = String(raw?.id ?? raw?.attempt_id ?? raw?.attemptId ?? '');
      if (!attemptId) return mapAttempt(raw);
      const answers = await mainApiHttp.getAttemptAnswers(session, attemptId);
      const questions = await fetchQuestionsForAnswers(session, answers);
      return mapAttempt(raw, answers, questions);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && session.user?.id) {
        const raw = await http<any>(session, `${basePath}?user_id=${encodeURIComponent(session.user.id)}`, { method: 'POST' });
        const attemptId = String(raw?.id ?? raw?.attempt_id ?? raw?.attemptId ?? '');
        if (!attemptId) return mapAttempt(raw);
        const answers = await mainApiHttp.getAttemptAnswers(session, attemptId);
        const questions = await fetchQuestionsForAnswers(session, answers);
        return mapAttempt(raw, answers, questions);
      }
      throw e;
    }
  },

  finishAttempt: async (session: Session, attemptId: string) => {
    const raw = await http<any>(session, `/attempts/${encodeURIComponent(attemptId)}/finish`, { method: 'POST' });
    const answers = await mainApiHttp.getAttemptAnswers(session, String(raw?.id ?? attemptId));
    const questions = await fetchQuestionsForAnswers(session, answers);
    return mapAttempt(raw, answers, questions);
  },

  getAttempt: async (session: Session, attemptId: string) => {
    const raw = await http<any>(session, `/attempts/${encodeURIComponent(attemptId)}`);
    const answers = await mainApiHttp.getAttemptAnswers(session, attemptId);
    const questions = await fetchQuestionsForAnswers(session, answers);
    return mapAttempt(raw, answers, questions);
  },

  getAttemptAnswers: (session: Session, attemptId: string) =>
    http<any[]>(session, `/answers/attempts/${encodeURIComponent(attemptId)}`),

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
    await mainApiHttp.updateAnswerByQuestionId(session, attemptId, questionId, value);
    return mainApiHttp.getAttempt(session, attemptId);
  },

/**
 * UI-compat: админская страница "все попытки".
 * В наборе эндпоинтов нет GET /attempts для всех — возвращаем пусто.
 */
getAllAttempts: async (_session: Session) => {
  return [] as Attempt[];
},

  getAttemptsForTest: async (session: Session, testId: string, userId: string) => {
    try {
      const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
      const raw = await http<any[]>(session, `/attempts/tests/${encodeURIComponent(testId)}${qs}`);
      return raw.map((item) => mapAttempt(item));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [] as Attempt[];
      throw e;
    }
  },
  getActiveAttempt: async (session: Session, testId: string, userId: string) => {
    const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    try {
      const raw = await http<any>(session, `/attempts/tests/${encodeURIComponent(testId)}/active${qs}`);
      return mapAttempt(raw);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        const list = await mainApiHttp.getAttemptsForTest(session, testId, userId);
        return list.find((a) => a.status === AttemptStatus.IN_PROGRESS) || null;
      }
      throw e;
    }
  },
};
