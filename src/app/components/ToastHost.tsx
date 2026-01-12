import { useEffect, useState } from 'react';

/**
 * Toast notification types
 */
type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast message structure
 */
type ToastMessage = {
  type: ToastType;
  message: string;
};

/**
 * ToastHost - Lightweight toast notification system
 * 
 * Listens for custom "lexa:toast" events and displays toast notifications.
 * 
 * Usage:
 * ```typescript
 * window.dispatchEvent(new CustomEvent('lexa:toast', {
 *   detail: { type: 'warning', message: 'Session expired' }
 * }));
 * ```
 * 
 * Enterprise features:
 * - Auto-dismiss after 3.5 seconds
 * - Visual feedback with type-based styling
 * - Non-blocking, fixed position
 * - Accessible markup
 */
export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      const detail = customEvent?.detail;

      if (!detail || !detail.message) {
        console.warn('ToastHost: Invalid toast event', e);
        return;
      }

      setToast({
        type: detail.type || 'info',
        message: detail.message,
      });

      // Auto-dismiss after 3.5 seconds
      setTimeout(() => setToast(null), 3500);
    };

    window.addEventListener('lexa:toast', onToast);
    return () => window.removeEventListener('lexa:toast', onToast);
  }, []);

  if (!toast) return null;

  // Type-based styling
  const typeStyles = {
    info: {
      background: '#eff6ff',
      border: '#3b82f6',
      color: '#1e40af',
    },
    success: {
      background: '#f0fdf4',
      border: '#22c55e',
      color: '#166534',
    },
    warning: {
      background: '#fffbeb',
      border: '#f59e0b',
      color: '#92400e',
    },
    error: {
      background: '#fef2f2',
      border: '#ef4444',
      color: '#991b1b',
    },
  };

  const style = typeStyles[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        minWidth: 280,
        maxWidth: 420,
        border: `1px solid ${style.border}`,
        background: style.background,
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: style.color,
          textTransform: 'capitalize',
          marginBottom: 4,
        }}
      >
        {toast.type}
      </div>
      <div
        style={{
          fontSize: 13,
          color: style.color,
          lineHeight: 1.4,
          opacity: 0.9,
        }}
      >
        {toast.message}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
