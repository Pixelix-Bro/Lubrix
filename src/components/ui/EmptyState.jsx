import { useSelector } from 'react-redux';

/**
 * EmptyState
 * @param {React.ReactNode} icon
 * @param {string} title
 * @param {string} [description]
 * @param {React.ReactNode} [action]
 */
export default function EmptyState({ icon, title, description, action }) {
  const theme = useSelector((s) => s.themes.theme);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon && (
        <div className={`p-4 rounded-2xl ${theme ? 'bg-white/5' : 'bg-gray-100'}`}>
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className={`text-xs text-center max-w-xs ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
