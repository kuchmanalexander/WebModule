
import React from 'react';
import { User, UserStatus, Role } from '../types';

interface LayoutProps {
  user?: User;
  status: UserStatus;
  onLogout: (all?: boolean) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, status, onLogout, children }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-indigo-600">AlgProg</h1>
        </div>

        {status === UserStatus.AUTHORIZED && user && (
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
              <div className="flex gap-1 justify-end">
                {user.roles.map(r => (
                  <span key={r} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 uppercase font-bold">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <button 
              onClick={() => onLogout(false)}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              Выход
            </button>
          </div>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
