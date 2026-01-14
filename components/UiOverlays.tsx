import React from 'react';
import { useUi } from '../context/UiProvider';

export default function UiOverlays() {
  const { banner, toasts, clearToast } = useUi();

  return (
    <>
      {banner && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm flex items-center justify-between">
              <div className="text-sm font-semibold text-indigo-900">{banner}</div>
              <div className="w-3 h-3 rounded-full bg-indigo-300 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 space-y-3 w-[320px] max-w-[90vw]">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => clearToast(t.id)}
            className={`text-left w-full rounded-2xl border p-4 shadow-lg hover:shadow-xl transition-all bg-white ${
              t.kind === 'success'
                ? 'border-emerald-200'
                : t.kind === 'error'
                  ? 'border-red-200'
                  : 'border-gray-200'
            }`}
            title="Нажмите, чтобы закрыть"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-gray-900">{t.title}</div>
                {t.message && <div className="text-xs text-gray-500 mt-1 leading-relaxed">{t.message}</div>}
              </div>
              <span className="text-xs text-gray-400">×</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
