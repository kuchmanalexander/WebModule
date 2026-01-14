
export const SESSION_COOKIE_NAME = 'session_token';
export const API_SIMULATION_LATENCY = 500;

export const USE_MOCK_MAIN_API = true;

export const MAIN_API_BASE_URL = '/api';

export const ACCESS_TOKEN_TTL_MS = 60_000; // 1 минута
export const REFRESH_TOKEN_TTL_MS = 10 * 60_000; // 10 минут

export const PERMISSIONS = {
  USER_LIST_READ: 'user:list:read',
  USER_DATA_READ: 'user:data:read',
  COURSE_INFO_WRITE: 'course:info:write',
  COURSE_TEST_WRITE: 'course:test:write',
  QUEST_CREATE: 'quest:create',
  TEST_QUEST_UPDATE: 'test:quest:update',
};

export const MANUAL_JWT_TOKEN = ''