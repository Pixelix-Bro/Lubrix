import { Search } from 'lucide-react';
import { useSelector } from 'react-redux';

/**
 * SearchBar — qidiruv inputi
 * @param {string} value
 * @param {(v:string)=>void} onChange
 * @param {string} [placeholder]
 * @param {string} [className]
 */
export default function SearchBar({ value, onChange, placeholder = "Qidirish...", className = '' }) {
  const theme = useSelector((s) => s.themes.theme);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
        theme ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
      } ${className}`}
    >
      <Search size={15} className="text-gray-400 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
      />
    </div>
  );
}
