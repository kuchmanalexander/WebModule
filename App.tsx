
import React, { useState, useEffect } from 'react';
import { UserStatus, Session, Role } from './types';
import { sessionService } from './services/sessionService';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [session, setSession] = useState<Session>({ status: UserStatus.UNKNOWN });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'admin'>('courses');

  /**
   * СЦЕНАРИЙ 1: Проверка сессии при загрузке.
   * Клиент берет sessionToken из кук/хранилища и запрашивает статус у Redis.
   */
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('session_token');
      const currentSession = await sessionService.getSession(savedToken);
      setSession(currentSession);
      setLoading(false);
    };
    init();
  }, []);

  /**
   * СЦЕНАРИЙ 2: Инициация входа.
   * Статус в Redis становится ANONYMOUS.
   */
  const handleLogin = async (type: 'github' | 'yandex' | 'code') => {
    setLoading(true);
    const result = await sessionService.initiateLogin(type);
    localStorage.setItem('session_token', result.sessionToken);
    
    // В реальном проекте здесь: window.location.href = result.authUrl;
    // Для демонстрации имитируем обратный вызов (callback) от модуля авторизации через 1.5 сек.
    setTimeout(async () => {
      const finalSession = await sessionService.completeLogin(result.sessionToken);
      setSession(finalSession);
      setLoading(false);
    }, 1500);
  };

  const handleLogout = async (all = false) => {
    setLoading(true);
    if (session.sessionToken) {
      await sessionService.logout(session.sessionToken, all);
      localStorage.removeItem('session_token');
      setSession({ status: UserStatus.UNKNOWN });
    }
    setLoading(false);
  };

  // --- Рендеринг согласно статусу сессии ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Запрос к Redis...</p>
        </div>
      </div>
    );
  }

  // Вид: Пользователь не опознан (Scenario 1 Default)
  if (session.status === UserStatus.UNKNOWN) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать</h1>
            <p className="text-gray-500 mt-2 text-sm">Пожалуйста, выберите способ авторизации</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handleLogin('github')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              GitHub
            </button>
            <button 
              onClick={() => handleLogin('yandex')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              Яндекс ID
            </button>
            <div className="relative my-6 text-center">
              <span className="bg-white px-2 text-xs text-gray-400 uppercase">или</span>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100 -z-10"></div>
            </div>
            <button 
              onClick={() => handleLogin('code')}
              className="w-full py-3 px-4 bg-white border border-gray-200 hover:border-indigo-600 text-gray-700 font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              Вход по коду
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Вид: Ожидание ответа от модуля авторизации (Scenario 2)
  if (session.status === UserStatus.ANONYMOUS) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-sm p-6">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold mb-2">Авторизация...</h2>
          <p className="text-gray-500 text-sm">Ожидаем подтверждение от внешнего сервиса.</p>
          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-400">
            State (LoginToken): {session.loginToken}
          </div>
        </div>
      </div>
    );
  }

  // Вид: Успешный вход (Scenario 3)
  return (
    <Layout user={session.user} status={session.status} onLogout={handleLogout}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Личный кабинет</h2>
              <p className="text-gray-500 mt-1">Рады вас видеть, {session.user?.fullName}!</p>
            </div>
            
            {/* Пример RBAC: Вкладка админа видна только при наличии роли ADMIN */}
            {session.user?.roles.includes(Role.ADMIN) && (
              <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                <button 
                  onClick={() => setActiveTab('courses')}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'courses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Мои Курсы
                </button>
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Админ-панель
                </button>
              </div>
            )}
          </div>

          {activeTab === 'courses' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <CourseCard key={i} i={i} />
              ))}
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-500 cursor-pointer transition-all group min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">+</span>
                </div>
                <p className="font-semibold">Добавить дисциплину</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold mb-6">Панель администратора</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminAction title="Список пользователей" desc="Управление ролями и доступом" />
                <AdminAction title="Статистика тестов" desc="Аналитика прохождения по курсам" />
                <AdminAction title="Настройки системы" desc="Конфигурация модулей и Redis" />
                <AdminAction title="Логи безопасности" desc="Аудит входов и изменений" />
              </div>
            </div>
          )}
        </section>

        {/* Информационный блок об архитектуре сессии */}
        <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-xl font-bold mb-2">Статус сессии в Redis</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Ваш сеанс активен. Access-токен используется для подписи запросов к Главному модулю системы.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <p className="text-[10px] text-indigo-200 uppercase font-bold">Статус</p>
                <p className="text-sm font-mono font-bold">AUTHORIZED</p>
              </div>
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <p className="text-[10px] text-indigo-200 uppercase font-bold">TTL Сессии</p>
                <p className="text-sm font-mono font-bold">12:59:59</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

// Вспомогательные компоненты
const AdminAction: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-md transition-all cursor-pointer">
    <p className="font-bold text-gray-900">{title}</p>
    <p className="text-xs text-gray-400 mt-1">{desc}</p>
  </div>
);

const CourseCard: React.FC<{ i: number }> = ({ i }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
    <div className="p-6 flex-1">
      <div className="mb-4">
        <span className="px-3 py-1 bg-indigo-50 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Дисциплина {i}</span>
      </div>
      <h3 className="font-bold text-gray-900 text-xl group-hover:text-indigo-600 transition-colors">
        {i === 1 ? 'Программирование на Go' : i === 2 ? 'Алгоритмы и структуры данных' : 'Базы данных'}
      </h3>
      <p className="text-sm text-gray-500 mt-3 line-clamp-3 leading-relaxed">
        {i === 1 
          ? 'Изучение основ высокопроизводительных систем и микросервисной архитектуры на языке Go.' 
          : i === 2 
          ? 'Глубокое погружение в сложность алгоритмов, динамическое программирование и графы.'
          : 'Проектирование реляционных схем, оптимизация SQL запросов и работа с NoSQL решениями.'}
      </p>
      
      <div className="mt-8 flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map(u => (
            <div key={u} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
              {String.fromCharCode(64 + u)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">+{8 + i * 4}</div>
        </div>
        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/btn">
          Перейти 
          <span className="transform group-hover/btn:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
    <div className="h-1 bg-gray-50 group-hover:bg-indigo-400 transition-colors"></div>
  </div>
);

export default App;
