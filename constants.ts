export const SESSION_COOKIE_NAME = 'session_token';
export const API_SIMULATION_LATENCY = 500;

// В учебной сборке мы держим всё "в одном" (React SPA) и используем моки.
// Когда появится реальный Main module (HTTP), переключите на false.
export const USE_MOCK_MAIN_API = false;
// Использовать реальную авторизацию через Auth module.
export const USE_AUTH_FLOW = true;

// ВАЖНО: чтобы запросы шли в бек, а не в Vite-origin (:5173), укажи полный адрес.
// Main module у тебя на 127.0.0.1:8000
export const MAIN_API_BASE_URL = "http://localhost:3000/api";


// Auth module (Go). Поставь порт, на котором ты его реально поднимаешь (PORT=...)
export const AUTH_API_BASE_URL = "http://localhost:3000";


export const AUTH_POLL_INTERVAL_MS = 1500;

// TTL для имитации жизни JWT. Нужны, чтобы реализовать сценарий из task-flow:
// 401 (access истёк) → refresh → retry.
// В реальной системе TTL задаёт Auth module.
export const ACCESS_TOKEN_TTL_MS = 60_000; // 1 минута
export const REFRESH_TOKEN_TTL_MS = 10 * 60_000; // 10 минут

// Permission strings based on the task description
export const PERMISSIONS = {
  USER_LIST_READ: 'user:list:read',
  USER_DATA_READ: 'user:data:read',
  COURSE_INFO_WRITE: 'course:info:write',
  COURSE_TEST_WRITE: 'course:test:write',
  QUEST_CREATE: 'quest:create',
  TEST_QUEST_UPDATE: 'test:quest:update',
};

// Временно (пока не подключили авторизацию):
// Вставь сюда свой JWT access token, чтобы реальные запросы проходили.
// Оставь пустым, если хочешь работать только на моках.
export const MANUAL_JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZnVsbE5hbWUiOiJcdTA0MjJcdTA0MzhcdTA0M2NcdTA0NDNcdTA0NDAgXHUwNDFhXHUwNDM4XHUwNDNjIiwidXNlcm5hbWUiOiJ2YW5zZXhib3kiLCJlbWFpbCI6IiIsInJvbGVzIjpbInRlYWNoZXIiXSwicGVybWlzc2lvbnMiOlsiY291cnNlOmFkZCIsInVzZXI6bGlzdDpyZWFkIl0sImJsb2NrZWQiOmZhbHNlfQ.dIQEvPe9_sCOvD1djgcbbFbHWxEGhdP8QJDKkic2feM';
