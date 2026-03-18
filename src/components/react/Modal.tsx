import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="relative transform overflow-hidden rounded-lg bg-[color:var(--pc-surface)] text-left shadow-2xl transition-all w-full max-w-4xl my-8 border border-[color:var(--pc-main-dark)]/70"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--pc-main-dark)]/70 px-6 py-4">
            <h3 className="text-lg font-semibold text-[color:var(--pc-text-on-dark)]" id="modal-title">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-md text-[color:var(--pc-muted)] hover:text-[color:var(--pc-text-on-dark)] focus:outline-none focus:ring-2 focus:ring-[color:var(--pc-accent)]"
            >
              <span className="sr-only">Cerrar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 max-h-[calc(100vh-160px)] overflow-y-auto bg-[color:var(--pc-surface)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
