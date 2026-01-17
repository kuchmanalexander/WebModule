import { API_SIMULATION_LATENCY } from '../constants';
import { Attempt, AttemptStatus, Course, Question, Test, User, Role, UserData } from '../types';

/**
 * Main API (MOCK)
 *
 * Здесь мы имитируем Main module из ТЗ.
 * Сейчас данные — заглушки + localStorage, чтобы:
 *  - можно было пройти flow (дисциплины → тесты → попытка → результат)
 *  - потом было легко заменить на реальные HTTP-запросы.
 *
 * Чтобы заменить на настоящий бэкенд:
 *  1) оставьте сигнатуры функций
 *  2) замените реализацию внутри на fetch/axios (и подключите apiClient с 401→refresh→retry).
 */

const STORAGE_KEY = 'mock_main_storage_v1';

type MainStorage = {
  courses: Course[];
  tests: Test[];
  // questions are stored per test
  questionsByTestId: Record<string, Question[]>;
  attempts: Attempt[];
  users: User[];
};

function sleep() {
  return new Promise<void>(r => setTimeout(r, API_SIMULATION_LATENCY));
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function load(): MainStorage {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);

  // --- SEED (ЗАГЛУШКИ) ---
  const courses: Course[] = [
    {
      id: 'course_algo',
      title: 'Алгоритмы и программирование',
      description: 'Базовые структуры данных, алгоритмы, практика решения задач.',
      teacherId: 'u_teacher_1',
    },
    {
      id: 'course_discrete',
      title: 'Дискретная математика',
      description: 'Графы, множества, логика, комбинаторика.',
      teacherId: 'u_teacher_1',
    },
  ];

  const tests: Test[] = [
    { id: 'test_sorting', courseId: 'course_algo', title: 'Сортировки (демо)', isActive: true, authorId: 'u_teacher_1' },
    { id: 'test_big_o', courseId: 'course_algo', title: 'Оценка сложности (демо)', isActive: true, authorId: 'u_teacher_1' },
    { id: 'test_graphs', courseId: 'course_discrete', title: 'Графы (демо)', isActive: true, authorId: 'u_teacher_1' },
  ];

  const questionsByTestId: Record<string, Question[]> = {
    test_sorting: [
      {
        id: 'q_sort_1',
        text: 'Какая сортировка в худшем случае работает за O(n^2)?',
        options: ['Merge sort', 'Heap sort', 'Insertion sort', 'Counting sort'],
        correctOptionIndex: 2,
        version: 1,
      },
      {
        id: 'q_sort_2',
        text: 'Что является стабильной сортировкой?',
        options: ['Quick sort (обычный)', 'Merge sort', 'Heap sort', 'Selection sort'],
        correctOptionIndex: 1,
        version: 1,
      },
    ],
    test_big_o: [
      {
        id: 'q_big_o_1',
        text: 'Какой Big-O у бинарного поиска?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctOptionIndex: 1,
        version: 1,
      },
      {
        id: 'q_big_o_2',
        text: 'Если алгоритм делает 3n + 10 операций, его сложность…',
        options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
        correctOptionIndex: 0,
        version: 1,
      },
    ],
    test_graphs: [
      {
        id: 'q_graph_1',
        text: 'Как называется граф без циклов?',
        options: ['Дерево', 'Клика', 'Полный граф', 'Двудольный граф'],
        correctOptionIndex: 0,
        version: 1,
      },
      {
        id: 'q_graph_2',
        text: 'DFS обычно реализуют с помощью…',
        options: ['Очереди', 'Стека (или рекурсии)', 'Кучи', 'Массива фиксированной длины'],
        correctOptionIndex: 1,
        version: 1,
      },
    ],
  };

  const users: User[] = [
    {
      id: 'usr_123',
      fullName: 'Иван Иванов',
      email: 'ivan@example.com',
      roles: [Role.STUDENT, Role.TEACHER],
      isBlocked: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
      id: 'u_teacher_1',
      fullName: 'Мария Петрова',
      email: 'maria@example.com',
      roles: [Role.TEACHER],
      isBlocked: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    },
    {
      id: 'u_admin_1',
      fullName: 'Администратор',
      email: 'admin@example.com',
      roles: [Role.ADMIN],
      isBlocked: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(),
    },
    {
      id: 'u_blocked_1',
      fullName: 'Заблокированный пользователь',
      email: 'blocked@example.com',
      roles: [Role.STUDENT],
      isBlocked: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ];

  const seeded: MainStorage = { courses, tests, questionsByTestId, attempts: [], users };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function save(data: MainStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---- PUBLIC API ----

export async function getCourses(): Promise<Course[]> {
  await sleep();
  return load().courses;
}

export async function getCourse(courseId: string): Promise<Course | null> {
  await sleep();
  return load().courses.find(c => c.id === courseId) || null;
}

export async function getTestsByCourse(courseId: string): Promise<Test[]> {
  await sleep();
  return load().tests.filter(t => t.courseId === courseId);
}

export async function getTest(testId: string): Promise<Test | null> {
  await sleep();
  return load().tests.find(t => t.id === testId) || null;
}

export async function getQuestionsForTest(testId: string): Promise<Question[]> {
  await sleep();
  return load().questionsByTestId[testId] || [];
}

export async function getAttemptsForTest(testId: string, userId: string): Promise<Attempt[]> {
  await sleep();
  const data = load();
  return data.attempts
    .filter(a => a.testId === testId && a.userId === userId)
    .sort((a, b) => (b.startedAt.localeCompare(a.startedAt)));
}

export async function getActiveAttempt(testId: string, userId: string): Promise<Attempt | null> {
  await sleep();
  const data = load();
  return data.attempts.find(a => a.testId === testId && a.userId === userId && a.status === AttemptStatus.IN_PROGRESS) || null;
}

/**
 * Создать попытку:
 * - если уже есть активная попытка — возвращаем её (в ТЗ: "одна активная попытка на тест")
 * - при создании делаем "snapshot" вопросов (с версиями)
 */
export async function createAttempt(testId: string, userId: string): Promise<Attempt> {
  await sleep();
  const data = load();

  const completed = data.attempts.find(
    a => a.testId === testId && a.userId === userId && a.status === AttemptStatus.COMPLETED
  );
  if (completed) {
    throw new Error('Attempt already completed');
  }

  const existing = data.attempts.find(a => a.testId === testId && a.userId === userId && a.status === AttemptStatus.IN_PROGRESS);
  if (existing) return existing;

  const questions = data.questionsByTestId[testId] || [];
  const attempt: Attempt = {
    id: uid('attempt'),
    testId,
    userId,
    status: AttemptStatus.IN_PROGRESS,
    startedAt: new Date().toISOString(),
    questions: questions.map(q => ({ ...q })), // snapshot
    answers: {},
    maxScore: questions.length,
  };

  data.attempts.push(attempt);
  save(data);
  return attempt;
}

export async function getAttempt(attemptId: string, userId: string): Promise<Attempt | null> {
  await sleep();
  const data = load();
  const attempt = data.attempts.find(a => a.id === attemptId && a.userId === userId);
  return attempt || null;
}

export async function saveAnswer(attemptId: string, userId: string, questionId: string, selectedOptionIndex: number): Promise<Attempt> {
  await sleep();
  const data = load();
  const attempt = data.attempts.find(a => a.id === attemptId && a.userId === userId);
  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new Error('Attempt is not active');

  attempt.answers[questionId] = { questionId, selectedOptionIndex };
  save(data);
  return attempt;
}

export async function finishAttempt(attemptId: string, userId: string): Promise<Attempt> {
  await sleep();
  const data = load();
  const attempt = data.attempts.find(a => a.id === attemptId && a.userId === userId);
  if (!attempt) throw new Error('Attempt not found');

  // calculate score
  let score = 0;
  for (const q of attempt.questions) {
    const ans = attempt.answers[q.id];
    if (ans && ans.selectedOptionIndex === q.correctOptionIndex) score += 1;
  }

  attempt.status = AttemptStatus.COMPLETED;
  attempt.finishedAt = new Date().toISOString();
  attempt.score = score;
  attempt.maxScore = attempt.questions.length;

  save(data);
  return attempt;
}

export async function resetMockData(): Promise<void> {
  await sleep();
  localStorage.removeItem(STORAGE_KEY);
  load();
}

// ---- ADMIN / MANAGEMENT (MOCK) ----

export async function getAllUsers(): Promise<User[]> {
  await sleep();
  return load().users;
}

export async function getUserData(userId: string): Promise<UserData | null> {
  await sleep();
  const data = load();
  const u = data.users.find((x) => x.id === userId);
  if (!u) return null;
  const attemptsCount = data.attempts.filter((a) => a.userId === userId).length;
  return {
    id: u.id,
    username: u.id,
    fullName: u.fullName,
    email: u.email ?? null,
    isBlocked: Boolean(u.isBlocked),
    coursesCount: 0,
    attemptsCount,
  };
}

export async function blockUser(userId: string): Promise<User | null> {
  await sleep();
  const data = load();
  const u = data.users.find(x => x.id === userId);
  if (!u) return null;
  u.isBlocked = true;
  save(data);
  return u;
}

export async function updateUserFullName(userId: string, fullName: string): Promise<User | null> {
  await sleep();
  const data = load();
  const u = data.users.find(x => x.id === userId);
  if (!u) return null;
  u.fullName = fullName;
  save(data);
  return u;
}

export async function unblockUser(userId: string): Promise<User | null> {
  await sleep();
  const data = load();
  const u = data.users.find(x => x.id === userId);
  if (!u) return null;
  u.isBlocked = false;
  save(data);
  return u;
}

export async function createCourse(input: Omit<Course, 'id'>): Promise<Course> {
  await sleep();
  const data = load();
  const course: Course = { ...input, id: uid('course') };
  data.courses.push(course);
  save(data);
  return course;
}

export async function updateCourse(courseId: string, patch: Partial<Course>): Promise<Course | null> {
  await sleep();
  const data = load();
  const c = data.courses.find(x => x.id === courseId);
  if (!c) return null;
  Object.assign(c, patch, { id: c.id });
  save(data);
  return c;
}

export async function deleteCourse(courseId: string): Promise<boolean> {
  await sleep();
  const data = load();
  const before = data.courses.length;
  data.courses = data.courses.filter(c => c.id !== courseId);
  // cascade: tests + questions
  const deletedTests = data.tests.filter(t => t.courseId === courseId).map(t => t.id);
  data.tests = data.tests.filter(t => t.courseId !== courseId);
  for (const tid of deletedTests) {
    delete data.questionsByTestId[tid];
    data.attempts = data.attempts.filter(a => a.testId !== tid);
  }
  save(data);
  return data.courses.length !== before;
}

export async function getAllTests(): Promise<Test[]> {
  await sleep();
  return load().tests;
}

export async function createTest(input: Omit<Test, 'id'>): Promise<Test> {
  await sleep();
  const data = load();
  const t: Test = { ...input, id: uid('test') };
  data.tests.push(t);
  if (!data.questionsByTestId[t.id]) data.questionsByTestId[t.id] = [];
  save(data);
  return t;
}

export async function updateTest(testId: string, patch: Partial<Test>): Promise<Test | null> {
  await sleep();
  const data = load();
  const t = data.tests.find(x => x.id === testId);
  if (!t) return null;
  Object.assign(t, patch, { id: t.id });
  save(data);
  return t;
}

export async function deleteTest(testId: string): Promise<boolean> {
  await sleep();
  const data = load();
  const before = data.tests.length;
  data.tests = data.tests.filter(t => t.id !== testId);
  delete data.questionsByTestId[testId];
  data.attempts = data.attempts.filter(a => a.testId !== testId);
  save(data);
  return data.tests.length !== before;
}

export async function getAllQuestions(): Promise<{ testId: string; questions: Question[] }[]> {
  await sleep();
  const data = load();
  return Object.entries(data.questionsByTestId).map(([testId, questions]) => ({ testId, questions }));
}

export async function createQuestion(testId: string, input: Omit<Question, 'id' | 'version'>): Promise<Question> {
  await sleep();
  const data = load();
  const list = data.questionsByTestId[testId] || (data.questionsByTestId[testId] = []);
  const q: Question = { ...input, id: uid('q'), version: 1 };
  list.push(q);
  save(data);
  return q;
}

export async function updateQuestion(testId: string, questionId: string, patch: Partial<Question>, bumpVersion: boolean = true): Promise<Question | null> {
  await sleep();
  const data = load();
  const list = data.questionsByTestId[testId];
  if (!list) return null;
  const q = list.find(x => x.id === questionId);
  if (!q) return null;
  Object.assign(q, patch, { id: q.id });
  if (bumpVersion) q.version += 1;
  save(data);
  return q;
}

export async function deleteQuestion(testId: string, questionId: string): Promise<boolean> {
  await sleep();
  const data = load();
  const list = data.questionsByTestId[testId];
  if (!list) return false;
  const before = list.length;
  data.questionsByTestId[testId] = list.filter(q => q.id !== questionId);
  save(data);
  return data.questionsByTestId[testId].length !== before;
}

export async function getAllAttempts(): Promise<Attempt[]> {
  await sleep();
  return load().attempts.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
