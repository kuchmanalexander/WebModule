
import { UserStatus, Session, Role, User } from '../types';
import { API_SIMULATION_LATENCY, ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from '../constants';

/**
 * АРХИТЕКТУРНЫЙ МОДУЛЬ: Session Service
 * 
 * Этот сервис имитирует взаимодействие Web-клиента с Redis.
 * Согласно заданию:
 * 1. Web-клиент не хранит состояние сессии у себя, а проверяет его в Redis по sessionToken.
 * 2. Процесс авторизации разделен на инициацию (Anonymous) и завершение (Authorized).
 */

class SessionService {
  private STORAGE_KEY = 'mock_redis_storage';

  // Имитация БД Redis (Key-Value хранилище)
  private getRedisData(): Record<string, Session> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  private setRedisData(token: string, session: Session) {
    const data = this.getRedisData();
    data[token] = session;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  private deleteRedisData(token: string) {
    const data = this.getRedisData();
    delete data[token];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Сценарий 1 & 3: Проверка статуса сессии.
   * Вызывается при каждой загрузке страницы.
   */
  async getSession(token: string | null): Promise<Session> {
    await new Promise(r => setTimeout(r, API_SIMULATION_LATENCY));
    if (!token) return { status: UserStatus.UNKNOWN };
    
    const data = this.getRedisData();
    return data[token] || { status: UserStatus.UNKNOWN };
  }

  /**
   * Сценарий 2: Инициация логина.
   * Web-клиент создает запись в Redis со статусом ANONYMOUS.
   * loginToken передается в Auth Module как 'state' для безопасности.
   */
  async initiateLogin(type: string): Promise<{ sessionToken: string; loginToken: string; authUrl: string }> {
    const sessionToken = `sess_${Math.random().toString(36).substr(2, 9)}`;
    const loginToken = `log_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: Session = {
      status: UserStatus.ANONYMOUS,
      sessionToken,
      loginToken
    };

    this.setRedisData(sessionToken, session);
    
    // URL для перенаправления пользователя в модуль авторизации
    const authUrl = `https://auth.system.com/auth?type=${type}&state=${loginToken}&client_id=web_client_v1`;
    
    return { sessionToken, loginToken, authUrl };
  }

  /**
   * Завершение авторизации.
   * Вызывается после того, как Auth Module подтвердил личность пользователя.
   */
  async completeLogin(sessionToken: string): Promise<Session> {
    const current = await this.getSession(sessionToken);
    if (current.status !== UserStatus.ANONYMOUS) return current;

    // Имитация данных, которые присылает Auth Module (JWT + User Info)
    const mockUser: User = {
      id: 'usr_123',
      fullName: 'Иван Иванов',
      email: 'ivan@example.com',
      roles: [Role.STUDENT, Role.TEACHER] // Пример пользователя с несколькими ролями
    };

    const permissions = this.rolesToPermissions(mockUser.roles);

    const updatedSession: Session = {
      ...current,
      status: UserStatus.AUTHORIZED,
      accessToken: 'jwt_access_token_mock',
      accessTokenExpiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
      refreshToken: 'jwt_refresh_token_mock',
      refreshTokenExpiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
      user: mockUser,
      permissions
    };

    this.setRedisData(sessionToken, updatedSession);
    return updatedSession;
  }

  /**
   * MOCK ONLY: смена ролей/прав (для демонстрации сценариев с разрешениями).
   * Это имитирует то, что в JWT есть permissions.
   */
  async setUserRoles(sessionToken: string, roles: Role[]): Promise<Session> {
    await new Promise(r => setTimeout(r, API_SIMULATION_LATENCY));
    const current = await this.getSession(sessionToken);
    if (current.status !== UserStatus.AUTHORIZED || !current.user) return current;

    const updated: Session = {
      ...current,
      user: { ...current.user, roles },
      permissions: this.rolesToPermissions(roles),
    };
    this.setRedisData(sessionToken, updated);
    return updated;
  }

  private rolesToPermissions(roles: Role[]): string[] {
    const perms = new Set<string>();
    // ВАЖНО: permissions приведены к списку из ТЗ (таблица прав главного модуля).
    // По умолчанию многие действия разрешены "своим" (например, преподавателю своего курса),
    // но для демо мы выдаём набор прав по ролям, чтобы можно было открывать admin-страницы.

    if (roles.includes(Role.TEACHER)) {
      // Пользователи
      perms.add('user:list:read');
      perms.add('user:roles:read');

      // Дисциплины/тесты (для чужих дисциплин, чтобы проще демонстрировать)
      perms.add('course:add');
      perms.add('course:del');
      perms.add('course:info:write');
      perms.add('course:testList');
      perms.add('course:test:read');
      perms.add('course:test:write');
      perms.add('course:test:add');
      perms.add('course:test:del');
      perms.add('course:userList');
      perms.add('course:user:add');
      perms.add('course:user:del');

      // Вопросы
      perms.add('quest:list:read');
      perms.add('quest:read');
      perms.add('quest:create');
      perms.add('quest:update');
      perms.add('quest:del');

      // Результаты/попытки
      perms.add('test:answer:read');
      perms.add('answer:read');
    }

    if (roles.includes(Role.ADMIN)) {
      // Admin получает всё.
      [
        // users
        'user:list:read',
        'user:fullName:write',
        'user:data:read',
        'user:roles:read',
        'user:roles:write',
        'user:block:read',
        'user:block:write',
        // courses/tests in courses
        'course:info:write',
        'course:testList',
        'course:test:read',
        'course:test:write',
        'course:test:add',
        'course:test:del',
        'course:userList',
        'course:user:add',
        'course:user:del',
        'course:add',
        'course:del',
        // questions
        'quest:list:read',
        'quest:read',
        'quest:update',
        'quest:create',
        'quest:del',
        // tests structure/results
        'test:quest:del',
        'test:quest:add',
        'test:quest:update',
        'test:answer:read',
        // answers
        'answer:read',
        'answer:update',
        'answer:del',
      ].forEach((p) => perms.add(p));
    }

    return Array.from(perms);
  }

  /**
   * Сценарий 5 (часть): refresh access token по refresh token.
   * В реальном проекте Web Client бы ходил в Auth module.
   */
  async refreshAccessToken(sessionToken: string): Promise<Session> {
    await new Promise(r => setTimeout(r, API_SIMULATION_LATENCY));
    const current = await this.getSession(sessionToken);

    if (current.status !== UserStatus.AUTHORIZED) return current;
    if (!current.refreshToken || !current.refreshTokenExpiresAt) {
      this.deleteRedisData(sessionToken);
      return { status: UserStatus.UNKNOWN };
    }

    // refresh истёк — считаем, что пользователь разлогинен
    if (Date.now() > current.refreshTokenExpiresAt) {
      this.deleteRedisData(sessionToken);
      return { status: UserStatus.UNKNOWN };
    }

    const updated: Session = {
      ...current,
      accessToken: `jwt_access_token_mock_${Math.random().toString(36).slice(2)}`,
      accessTokenExpiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    };

    this.setRedisData(sessionToken, updated);
    return updated;
  }

  async logout(sessionToken: string, allDevices: boolean = false) {
    if (allDevices) {
      // Здесь был бы вызов к Auth Module для инвалидации refreshToken во всей системе
      console.log('Revoking tokens globally...');
    }
    this.deleteRedisData(sessionToken);
  }
}

export const sessionService = new SessionService();
