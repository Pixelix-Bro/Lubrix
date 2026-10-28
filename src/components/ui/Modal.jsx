import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

/**
 * Modal — universal dialog
 * @param {boolean} isOpen
 * @param {()=>void} onClose
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {string} [size] - 'sm'|'md'|'lg'|'xl'  (default: 'md')
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const theme = useSelector((s) => s.themes.theme);

  // ESC tugmasini ushlab qolish
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) { document.addEventListener('keydown', handler); }
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Scroll lock
  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; }
    else         { document.body.style.overflow = '';       }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] ?? 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 w-full ${sizeClass} rounded-2xl shadow-2xl
          ${theme ? 'bg-surface border border-white/10 text-white' : 'bg-white border border-gray-200 text-gray-900'}
          max-h-[90vh] flex flex-col
        `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme ? 'border-white/10' : 'border-gray-100'}`}>
          <h2 className="text-base font-bold font-[title] tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg transition ${theme ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
