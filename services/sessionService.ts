
import { UserStatus, Session, Role, User } from '../types';
import { API_SIMULATION_LATENCY } from '../constants';

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

    const updatedSession: Session = {
      ...current,
      status: UserStatus.AUTHORIZED,
      accessToken: 'jwt_access_token_mock',
      refreshToken: 'jwt_refresh_token_mock',
      user: mockUser
    };

    this.setRedisData(sessionToken, updatedSession);
    return updatedSession;
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
