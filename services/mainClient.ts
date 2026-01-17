import * as mainApi from './mainApi';
import { mainApiHttp } from './mainApiHttp';
import { ApiError, requestWithAuth, RequestOptions } from './apiClient';
import { Attempt, AttemptStatus, Course, Question, Test, UserData } from '../types';
import { USE_MOCK_MAIN_API } from '../constants';

const activeAttemptKey = (testId: string, userId: string) => `active_attempt:${userId}:${testId}`;
const questionCacheKey = (testId: string) => `questions_by_test:${testId}`;

function loadActiveAttemptId(testId: string, userId: string) {
  try {
    return localStorage.getItem(activeAttemptKey(testId, userId));
  } catch {
    return null;
  }
}

function saveActiveAttemptId(testId: string, userId: string, attemptId: string) {
  try {
    localStorage.setItem(activeAttemptKey(testId, userId), attemptId);
  } catch {
    // ignore storage failures
  }
}

function clearActiveAttemptId(testId: string, userId: string) {
  try {
    localStorage.removeItem(activeAttemptKey(testId, userId));
  } catch {
    // ignore storage failures
  }
}

function trackAttempt(attempt: Attempt | null, fallbackTestId?: string, fallbackUserId?: string) {
  if (!attempt) return attempt;
  const testId = attempt.testId || fallbackTestId;
  const userId = attempt.userId || fallbackUserId;
  if (!testId || !userId) return attempt;
  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    saveActiveAttemptId(testId, userId, attempt.id);
  } else {
    clearActiveAttemptId(testId, userId);
  }
  return attempt;
}

function loadCachedQuestions(testId: string): Question[] {
  try {
    const raw = localStorage.getItem(questionCacheKey(testId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedQuestions(testId: string, questions: Question[]) {
  try {
    localStorage.setItem(questionCacheKey(testId), JSON.stringify(questions));
  } catch {
    // ignore storage failures
  }
}

function upsertCachedQuestion(testId: string, q: Question) {
  const list = loadCachedQuestions(testId);
  const idx = list.findIndex((x) => x.id === q.id);
  const next = idx >= 0 ? [...list.slice(0, idx), q, ...list.slice(idx + 1)] : [q, ...list];
  saveCachedQuestions(testId, next);
  return next;
}

function removeCachedQuestion(testId: string, questionId: string) {
  const list = loadCachedQuestions(testId);
  const next = list.filter((x) => x.id !== questionId);
  saveCachedQuestions(testId, next);
  return next;
}

/**
 * MainClient — тонкая обёртка над Main API.
 *
 * Сейчас mainApi — мок на localStorage.
 * Позже вы можете заменить реализацию mainApi на реальные HTTP-запросы,
 * а этот слой останется без изменений.
 */

export const mainClient = {
  getCourses: () =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getCourses() : mainApiHttp.getCourses(session)
    ),
  getCourse: (courseId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getCourse(courseId) : mainApiHttp.getCourse(session, courseId)
    ),
  getTestsByCourse: (courseId: string, options?: RequestOptions) =>
    requestWithAuth(
      (session) =>
        USE_MOCK_MAIN_API ? mainApi.getTestsByCourse(courseId) : mainApiHttp.getTestsByCourse(session, courseId),
      options
    ),
  getTest: (testId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getTest(testId) : mainApiHttp.getTest(session, testId)
    ),
  getQuestionsForTest: (testId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getQuestionsForTest(testId) : mainApiHttp.getQuestionsForTest(session, testId)
    ),

  getAttemptsForTest: (testId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.getAttemptsForTest(testId, userId);
      const activeId = loadActiveAttemptId(testId, userId);
      if (!activeId) return Promise.resolve([] as Attempt[]);
      return mainApiHttp.getAttempt(session, activeId).then((a) => (trackAttempt(a, testId, userId) ? [a] : []));
    }),

  getActiveAttempt: (testId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.getActiveAttempt(testId, userId);
      const activeId = loadActiveAttemptId(testId, userId);
      if (!activeId) return Promise.resolve(null);
      return mainApiHttp.getAttempt(session, activeId).then((a) => trackAttempt(a, testId, userId));
    }),

  createAttempt: (testId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.createAttempt(testId, userId);
      return mainApiHttp.createAttempt(session, testId).then((a) => trackAttempt(a, testId, userId) || a);
    }),

  getTestGrades: (testId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) {
        return mainApi.getAttemptsForTest(testId, userId).then((list) =>
          list.filter((a) => a.status === AttemptStatus.COMPLETED)
        );
      }
      return mainApiHttp.getTestGrades(session, testId, userId);
    }),

  getAttempt: (attemptId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.getAttempt(attemptId, userId);
      return mainApiHttp.getAttempt(session, attemptId).then((a) => trackAttempt(a, a?.testId, userId));
    }),

  saveAnswer: (attemptId: string, userId: string, questionId: string, selectedOptionIndex: number) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API
        ? mainApi.saveAnswer(attemptId, userId, questionId, selectedOptionIndex)
        : mainApiHttp.saveAnswer(session, attemptId, questionId, selectedOptionIndex)
    ),

  finishAttempt: (attemptId: string, userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.finishAttempt(attemptId, userId);
      return mainApiHttp.finishAttempt(session, attemptId).then((a) => trackAttempt(a, a?.testId, userId));
    }),

  resetMockData: () =>
    requestWithAuth((session) => (USE_MOCK_MAIN_API ? mainApi.resetMockData() : mainApiHttp.resetMockData(session))),

  // ---- Admin / privileged resources (stubs) ----
  getUsers: () =>
    requestWithAuth((session) => {
      // Пока авторизация/permissions не интегрированы на фронте,
      // в HTTP-режиме не блокируем операции: пусть решает backend (403).
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('user:list:read')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.getUsers() : mainApiHttp.getUsers(session);
    }),
  getUserData: (userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.getUserData(userId) as Promise<UserData | null>;
      return mainApiHttp.getUserData(session, userId);
    }),
  updateUserFullName: (userId: string, fullName: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API) return mainApi.updateUserFullName(userId, fullName);
      return mainApiHttp.updateUserFullName(session, userId, fullName);
    }),
  blockUser: (userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('user:block:write')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.blockUser(userId) : mainApiHttp.blockUser(session, userId);
    }),
  unblockUser: (userId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('user:block:write')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.unblockUser(userId) : mainApiHttp.unblockUser(session, userId);
    }),

  createCourse: (input: Omit<Course, 'id'>) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:add')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.createCourse(input) : mainApiHttp.createCourse(session, input);
    }),
  updateCourse: (courseId: string, patch: Partial<Course>) =>
    requestWithAuth((session) => {
      // В бэке права отличаются (course:info:write / course:del),
      // поэтому в HTTP режиме не фильтруем на фронте.
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:info:write') && !session.permissions?.includes('course:add')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.updateCourse(courseId, patch) : mainApiHttp.updateCourse(session, courseId, patch);
    }),
  deleteCourse: (courseId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:del') && !session.permissions?.includes('course:add')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.deleteCourse(courseId) : mainApiHttp.deleteCourse(session, courseId);
    }),

  enrollInCourse: (courseId: string, userId?: string) =>
    requestWithAuth(
      (session) => {
        if (USE_MOCK_MAIN_API) return Promise.resolve(true);
        return mainApiHttp.addCourseStudent(session, courseId, userId);
      },
      { suppressForbiddenRedirect: true }
    ),

  getAllTests: () =>
    requestWithAuth((session) => {
      if (
        USE_MOCK_MAIN_API &&
        !session.permissions?.includes('course:test:add') &&
        !session.permissions?.includes('course:test:write') &&
        !session.permissions?.includes('course:test:del')
      ) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.getAllTests() : mainApiHttp.getAllTests(session);
    }),
  createTest: (input: Omit<Test, 'id'>) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:test:add')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.createTest(input) : mainApiHttp.createTestCompat(session, input);
    }),
  updateTest: (testId: string, patch: Partial<Test>) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:test:write') && !session.permissions?.includes('course:test:add')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.updateTest(testId, patch) : mainApiHttp.updateTest(session, testId, patch);
    }),
  deleteTest: (testId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('course:test:del') && !session.permissions?.includes('course:test:add')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.deleteTest(testId) : mainApiHttp.deleteTestCompat(session, testId);
    }),

  getQuestionsByTest: (testId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:list:read') && !session.permissions?.includes('quest:create')) {
        throw new ApiError(403, 'Forbidden');
      }
      if (USE_MOCK_MAIN_API) return mainApi.getQuestionsForTest(testId);
      const cached = loadCachedQuestions(testId);
      if (cached.length > 0) return Promise.resolve(cached);
      return mainApiHttp.getQuestionsForTest(session, testId).then((list) => {
        if (list.length > 0) saveCachedQuestions(testId, list);
        return list;
      });
    }),
  createQuestion: (testId: string, input: Omit<Question, 'id' | 'version'>) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:create')) throw new ApiError(403, 'Forbidden');
      if (USE_MOCK_MAIN_API) return mainApi.createQuestion(testId, input);
      return mainApiHttp.createQuestion(session, { ...input, testId }).then((q) => {
        upsertCachedQuestion(testId, q);
        return q;
      });
    }),
  updateQuestion: (testId: string, questionId: string, patch: Partial<Question>, bumpVersion: boolean = true) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:update') && !session.permissions?.includes('quest:create')) {
        throw new ApiError(403, 'Forbidden');
      }
      if (USE_MOCK_MAIN_API) return mainApi.updateQuestion(testId, questionId, patch, bumpVersion);
      return mainApiHttp.updateQuestion(session, testId, questionId, patch, bumpVersion).then((q) => {
        if (q) upsertCachedQuestion(testId, q);
        return q;
      });
    }),
  deleteQuestion: (testId: string, questionId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:del') && !session.permissions?.includes('quest:create')) {
        throw new ApiError(403, 'Forbidden');
      }
      if (USE_MOCK_MAIN_API) return mainApi.deleteQuestion(testId, questionId);
      return mainApiHttp.deleteQuestion(session, questionId).then((res) => {
        removeCachedQuestion(testId, questionId);
        return res;
      });
    }),

  getAllAttempts: () =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('test:answer:read')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.getAllAttempts() : mainApiHttp.getAllAttempts(session);
    }),
};
