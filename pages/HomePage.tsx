import React from 'react';
import { Link } from 'react-router-dom';
import { UserStatus } from '../types';
import { useSession } from '../context/SessionProvider';

export const HomePage: React.FC = () => {
  const { session, loading } = useSession();

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
