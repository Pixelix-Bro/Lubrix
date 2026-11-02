import { Languages, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { languageOptions } from '../../i18n/translations'
import { setLanguage } from '../../Redux/language'
import { resolveSystemTheme, setThemeMode } from '../../Redux/theme'

const themeOptions = [
  { value: 'light', label: 'Yorug‘ tema', Icon: Sun },
  { value: 'dark', label: 'Qorong‘i tema', Icon: Moon },
  { value: 'system', label: 'Tizim temasi', Icon: Monitor },
]

export default function AuthHeaderControls() {
  const dispatch = useDispatch()
  const mode = useSelector((state) => state.themes.mode)
  const language = useSelector((state) => state.language.language)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (dark) => {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      dispatch(resolveSystemTheme(dark))
    }

    if (mode === 'system') {
      const handleSystemThemeChange = (event) => applyTheme(event.matches)
      applyTheme(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }

    document.documentElement.dataset.theme = mode
    return undefined
  }, [dispatch, mode])

  const chooseTheme = (nextMode) => {
    dispatch(setThemeMode(nextMode))
    if (nextMode === 'system') {
      dispatch(resolveSystemTheme(window.matchMedia('(prefers-color-scheme: dark)').matches))
    }
  }

  return (
    <div className="absolute right-4 flex items-center gap-1.5 sm:right-7 sm:gap-2">
      <label className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-slate-500 dark:border-white/10 dark:bg-[#0d141d] dark:text-slate-300 sm:gap-1.5 sm:px-2">
        <Languages size={13} aria-hidden="true" />
        <span className="sr-only">Tilni tanlang</span>
        <select
          value={language}
          onChange={(event) => dispatch(setLanguage(event.target.value))}
          className="max-w-9 cursor-pointer border-0 bg-transparent text-[10px] font-semibold text-inherit outline-none sm:max-w-none"
          aria-label="Tilni tanlang"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <div
        className="inline-flex gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-[#0d141d]"
        role="group"
        aria-label="Rang mavzusi"
      >
        {themeOptions.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => chooseTheme(value)}
            className={`grid h-6 w-6 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white ${mode === value ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : ''}`}
            aria-label={label}
            aria-pressed={mode === value}
            title={label}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
