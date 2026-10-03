import React, { useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

/* -------------------------------------------------------
   Toast context + provider
   Usage:
     const { showToast } = useToast();
     showToast('Saved!', 'success');  // severity: success | error | warning | info
------------------------------------------------------- */

const ToastContext = React.createContext(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const ICONS = {
  success: <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0 }} />,
  error:   <XCircle    size={18} style={{ color: '#DC2626', flexShrink: 0 }} />,
  warning: <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />,
  info:    <Info       size={18} style={{ color: '#2563EB', flexShrink: 0 }} />,
};

const COLORS = {
  success: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  error:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message, severity = 'info', duration = 4000) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '100%',
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => {
          const c = COLORS[t.severity] || COLORS.info;
          return (
            <div
              key={t.id}
              role="alert"
              style={{
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.border}`,
                color: c.text,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                pointerEvents: 'all',
                animation: 'toast-in 0.2s ease',
                fontFamily: 'var(--font-family-sans)',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {ICONS[t.severity]}
              <span style={{ flexGrow: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: c.text,
                  opacity: 0.6,
                  padding: '1px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
