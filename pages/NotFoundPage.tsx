import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl font-extrabold text-gray-900">404</div>
        <p className="mt-2 text-gray-500">Страница не найдена.</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
            На главную
          </Link>
          <Link to="/dashboard" className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm hover:bg-gray-200">
            В кабинет
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Подсказка: по ТЗ доступ к ресурсам идёт через защищённые URL, поэтому иногда редирект возвращает на /. 
        </p>
      </div>
    </div>
  );
};
