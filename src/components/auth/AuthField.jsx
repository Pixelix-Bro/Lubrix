import { AlertCircle } from 'lucide-react'

export default function AuthField({
  id,
  label,
  icon: Icon,
  required = false,
  error,
  hint,
  children,
}) {
  const messageId = `${id}-message`

  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
        htmlFor={id}
      >
        {label}
        {required && (
          <span className="text-emerald-700 dark:text-emerald-300" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div
        className={`flex min-h-11 items-center gap-2.5 rounded-lg border px-3 transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15 dark:focus-within:border-emerald-400 ${error ? 'border-red-500 dark:border-red-400' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'}`}
      >
        {Icon && (
          <Icon
            className="shrink-0 text-slate-400 dark:text-slate-500"
            size={16}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
      {error ? (
        <p
          id={messageId}
          className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-red-600 dark:text-red-300"
          role="alert"
        >
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={messageId}
            className="mt-1.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400"
          >
            {hint}
          </p>
        )
      )}
    </div>
  )
}
