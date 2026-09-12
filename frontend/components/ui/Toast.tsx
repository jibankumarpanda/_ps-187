"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type = 'info' }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-[#F4C95D] flex-shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
            info: <Info className="w-4 h-4 text-accent flex-shrink-0" />,
          };

          const borderColors = {
            success: 'border-[#39D98A]/30',
            warning: 'border-[#F4C95D]/30',
            error: 'border-[#FF5C67]/40',
            info: 'border-[#37B9FF]/30',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-muted border ${borderColors[toast.type]} rounded-none p-3.5 shadow-xl flex items-start gap-3 animate-fade-in`}
            >
              <div className="mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground leading-snug">{toast.title}</div>
                {toast.message && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{toast.message}</div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
