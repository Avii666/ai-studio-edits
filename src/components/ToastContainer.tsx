import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isAlert = toast.type === 'alert';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-all transform duration-200 animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : isAlert
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-white border-stone-200/90 text-stone-900 shadow-md'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {isAlert && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {!isSuccess && !isWarning && !isAlert && <Info className="w-4 h-4 text-stone-700" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold tracking-tight leading-tight">
                {toast.title}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5 leading-snug break-words">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 -mr-1 -mt-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
