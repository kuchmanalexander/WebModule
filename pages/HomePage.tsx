import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserStatus } from '../types';
import { useSession } from '../context/SessionProvider';
import { sessionService } from '../services/sessionService';
import { AUTH_POLL_INTERVAL_MS, USE_AUTH_FLOW } from '../constants';

export const HomePage: React.FC = () => {
  const { session, loading, refresh } = useSession();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Запрос к Redis...</p>
        </div>
      </div>
    );
  }

  if (session.status === UserStatus.AUTHORIZED) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Вы уже вошли</h1>
            <p className="text-gray-500 mt-2 text-sm">Перейдите в личный кабинет.</p>
          </div>
          <Link
            to="/dashboard"
            className="block w-full text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Открыть кабинет
          </Link>
          <div className="mt-4 text-xs text-gray-400 text-center">
            Пользователь: {session.user?.fullName}
          </div>
        </div>
      </div>
    );
  }

  if (USE_AUTH_FLOW && session.status === UserStatus.ANONYMOUS && session.loginToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Ожидаем авторизацию</h1>
            <p className="text-gray-500 mt-2 text-sm">Проверяем статус входа...</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
          {authError && (
            <div className="mt-6 p-3 bg-red-50 rounded-lg text-sm text-red-700 border border-red-100">
              {authError}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                sessionService.clearAuthFlow();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-all"
            >
              Отменить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // UNKNOWN или ANONYMOUS (в demо логин начинается через /login?type=...)
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900">Добро пожаловать</h1>
          <p className="text-gray-500 mt-2 text-sm">Пожалуйста, выберите способ авторизации</p>
        </div>

        <div className="space-y-4">
          <Link
            to="/login?type=github"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            GitHub
          </Link>
          <Link
            to="/login?type=yandex"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Яндекс ID
          </Link>
          <div className="relative my-6 text-center">
            <span className="bg-white px-2 text-xs text-gray-400 uppercase">или</span>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100 -z-10" />
          </div>
          <Link
            to="/login?type=code"
            className="w-full block text-center py-3 px-4 bg-white border border-gray-200 hover:border-indigo-600 text-gray-700 font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Вход по коду
          </Link>
        </div>
      </div>
    </div>
  );
};
