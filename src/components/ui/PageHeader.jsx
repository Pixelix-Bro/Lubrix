import { useSelector } from 'react-redux';

/**
 * PageHeader — sahifa sarlavhasi
 * @param {React.ReactNode} icon
 * @param {string} title
 * @param {string} [subtitle]
 * @param {React.ReactNode} [action]  — o'ng tomondagi tugma
 */
export default function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-[title] tracking-wide">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
