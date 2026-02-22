interface InlineNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const typeStyles = {
  success: 'bg-[var(--bg-inline-success)] border-[var(--bg-inline-success-border)] text-[var(--text-inline-success)]',
  error: 'bg-[var(--bg-inline-error)] border-[var(--bg-inline-error-border)] text-[var(--text-inline-error)]',
  warning: 'bg-[var(--bg-inline-warning)] border-[var(--bg-inline-warning-border)] text-[var(--text-inline-warning)]',
  info: 'bg-[var(--bg-inline-info)] border-[var(--bg-inline-info-border)] text-[var(--text-inline-info)]',
};

export default function InlineNotification({ type, message, dismissible, onDismiss, className = '' }: InlineNotificationProps) {
  return (
    <div className={`rounded-lg border text-[13px] px-3.5 py-2.5 flex items-center justify-between ${typeStyles[type]} ${className}`}>
      <span>{message}</span>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 bg-transparent border-none cursor-pointer font-bold text-[14px] leading-none text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
