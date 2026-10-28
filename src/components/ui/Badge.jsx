/**
 * Badge — holat belgisi
 * @param {string} label
 * @param {string} [variant] - 'success'|'warning'|'danger'|'info'|'default'
 */
export default function Badge({ label, variant = 'default' }) {
  const variantClass = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    danger:  'bg-rose-500/10   text-rose-400   border-rose-500/20',
    info:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
    default: 'bg-gray-500/10  text-gray-400   border-gray-500/20',
  }[variant] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${variantClass}`}>
      {label}
    </span>
  );
}
