import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner
 * @param {string} [text]
 * @param {string} [size] - 'sm'|'md'|'lg'
 */
export default function LoadingSpinner({ text = "Yuklanmoqda...", size = 'md' }) {
  const sizeMap = { sm: 16, md: 24, lg: 36 };
  const s = sizeMap[size] || 24;

  return (
    <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
      <Loader2 size={s} className="animate-spin text-primary" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}
