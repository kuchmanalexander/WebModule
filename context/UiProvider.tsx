import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiEventBus, ApiUiEvent } from '../services/apiEvents';

export type Toast = {
  id: string;
  kind: 'info' | 'success' | 'error';
  title: string;
  message?: string;
  ttlMs?: number;
};

type UiState = {
  banner?: string;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id'>) => void;
  clearToast: (id: string) => void;
  clearBanner: () => void;
};

const UiContext = createContext<UiState | null>(null);

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (t: Omit<Toast, 'id'>) => {
    const id = randomId();
    const toast: Toast = { id, ttlMs: 3500, ...t };
    setToasts((prev) => [toast, ...prev].slice(0, 4));
    if (toast.ttlMs && toast.ttlMs > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.ttlMs);
    }
  };

  const clearToast = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));
  const clearBanner = () => setBanner(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = (e as CustomEvent<ApiUiEvent>).detail;

      switch (ev.type) {
        case 'refresh:start':
          setBanner('Обновляем access-токен…');
          break;
        case 'refresh:success':
          setBanner(undefined);
          pushToast({ kind: 'success', title: 'Сессия обновлена', message: 'Продолжаем работу.' });
          break;
        case 'refresh:failed':
          setBanner(undefined);
          pushToast({ kind: 'error', title: 'Не удалось обновить сессию', message: 'Попробуем заново войти.' });
          break;
        case 'session:expired':
          setBanner(undefined);
          pushToast({ kind: 'error', title: 'Сессия истекла', message: 'Выполняем выход…' });
          break;
        case 'forbidden':
          pushToast({ kind: 'error', title: 'Нет доступа', message: 'У вас недостаточно прав.' });
          break;
      }
    };

    apiEventBus.addEventListener('api-ui', handler);
    return () => apiEventBus.removeEventListener('api-ui', handler);
  }, []);

  const value = useMemo(
    () => ({ banner, toasts, pushToast, clearToast, clearBanner }),
    [banner, toasts]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
};

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}
