import * as mainApi from './mainApi';
import { mainApiHttp } from './mainApiHttp';
import { ApiError, requestWithAuth, RequestOptions } from './apiClient';
import { Attempt, Course, Question, Test } from '../types';
import { USE_MOCK_MAIN_API } from '../constants';

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
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getAttemptsForTest(testId, userId) : mainApiHttp.getAttemptsForTest(session, testId, userId)
    ),

  getActiveAttempt: (testId: string, userId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getActiveAttempt(testId, userId) : mainApiHttp.getActiveAttempt(session, testId, userId)
    ),

  createAttempt: (testId: string, userId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.createAttempt(testId, userId) : mainApiHttp.createAttempt(session, testId, userId)
    ),

  getAttempt: (attemptId: string, userId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.getAttempt(attemptId, userId) : mainApiHttp.getAttempt(session, attemptId, userId)
    ),

  saveAnswer: (attemptId: string, userId: string, questionId: string, selectedOptionIndex: number) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API
        ? mainApi.saveAnswer(attemptId, userId, questionId, selectedOptionIndex)
        : mainApiHttp.saveAnswer(session, attemptId, questionId, selectedOptionIndex)
    ),

  finishAttempt: (attemptId: string, userId: string) =>
    requestWithAuth((session) =>
      USE_MOCK_MAIN_API ? mainApi.finishAttempt(attemptId, userId) : mainApiHttp.finishAttempt(session, attemptId, userId)
    ),

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
      return USE_MOCK_MAIN_API ? mainApi.getQuestionsForTest(testId) : mainApiHttp.getQuestionsForTest(session, testId);
    }),
  createQuestion: (testId: string, input: Omit<Question, 'id' | 'version'>) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:create')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.createQuestion(testId, input) : mainApiHttp.createQuestion(session, { ...input, testId });
    }),
  updateQuestion: (testId: string, questionId: string, patch: Partial<Question>, bumpVersion: boolean = true) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:update') && !session.permissions?.includes('quest:create')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API
        ? mainApi.updateQuestion(testId, questionId, patch, bumpVersion)
        : mainApiHttp.updateQuestion(session, testId, questionId, patch, bumpVersion);
    }),
  deleteQuestion: (testId: string, questionId: string) =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('quest:del') && !session.permissions?.includes('quest:create')) {
        throw new ApiError(403, 'Forbidden');
      }
      return USE_MOCK_MAIN_API ? mainApi.deleteQuestion(testId, questionId) : mainApiHttp.deleteQuestion(session, questionId);
    }),

  getAllAttempts: () =>
    requestWithAuth((session) => {
      if (USE_MOCK_MAIN_API && !session.permissions?.includes('test:answer:read')) throw new ApiError(403, 'Forbidden');
      return USE_MOCK_MAIN_API ? mainApi.getAllAttempts() : mainApiHttp.getAllAttempts(session);
    }),
};
