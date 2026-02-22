import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), type === 'error' ? 5000 : 3000);
  }, [removeToast]);

  const accentColor = (type: Toast['type']) =>
    type === 'success' ? 'var(--color-positive)' : type === 'error' ? 'var(--color-negative)' : 'var(--color-accent)';

  const icon = (type: Toast['type']) =>
    type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col-reverse gap-2 max-w-[380px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-lg text-[13px] font-medium animate-[slideIn_0.2s_ease-out] bg-[var(--bg-card)] border border-[var(--bg-card-border)]"
            style={{
              padding: '10px 14px',
              borderLeft: `3px solid ${accentColor(t.type)}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span className="font-bold text-[14px]" style={{ color: accentColor(t.type) }}>{icon(t.type)}</span>
            <span className="flex-1 text-[var(--text-primary)]">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-[16px] p-0 leading-none"
            >×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
