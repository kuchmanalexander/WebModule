import React from 'react';
import { Link } from 'react-router-dom';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">403 — Нет доступа</h1>
        <p className="text-gray-500 mt-2 text-sm">
          У вас недостаточно прав для просмотра этой страницы.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition-all"
          >
            На главную
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-white border border-gray-200 hover:border-indigo-600 text-gray-700 font-semibold rounded-xl transition-all"
          >
            В кабинет
          </Link>
        </div>
      </div>
    </div>
  );
};
