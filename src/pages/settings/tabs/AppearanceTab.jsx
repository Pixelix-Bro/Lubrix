import { Moon, Palette, Sun } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { activ } from '../../../Redux/theme';
import { setLanguage } from '../../../Redux/language';
import { languageOptions } from '../../../i18n/translations';

/**
 * AppearanceTab — Tashqi Ko'rinish & Til tab
 */
export default function AppearanceTab() {
  const theme  = useSelector((s) => s.themes.theme);
  const locale = useSelector((s) => s.language.language);
  const dispatch = useDispatch();

  const cardCls = `p-5 rounded-2xl border ${
    theme ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'
  }`;

  return (
    <div className="space-y-6">
      {/* Mavzu */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold font-[title] flex items-center gap-2 mb-4">
          <Palette size={15} className="text-primary" />
          Interfeys Mavzusi
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => dispatch(activ(true))}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              theme
                ? 'border-primary bg-primary/10 text-primary'
                : theme === false
                  ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/5'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            } ${theme ? 'border-primary bg-primary/10' : ''}`}
          >
            <Moon size={22} className={theme ? 'text-primary' : 'text-gray-400'} />
            <span className="text-xs font-semibold">Qorong'u Mavzu</span>
            {theme && <span className="text-[10px] text-primary font-mono">Faol</span>}
          </button>

          <button
            type="button"
            onClick={() => dispatch(activ(false))}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              !theme
                ? 'border-primary bg-primary/10 text-primary'
                : theme
                  ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Sun size={22} className={!theme ? 'text-primary' : 'text-gray-400'} />
            <span className="text-xs font-semibold">Yorug' Mavzu</span>
            {!theme && <span className="text-[10px] text-primary font-mono">Faol</span>}
          </button>
        </div>
      </div>

      {/* Til */}
      <div className={cardCls}>
        <h3 className="text-sm font-bold font-[title] mb-4">Interfejs Tili</h3>
        <div className="grid grid-cols-3 gap-3">
          {languageOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => dispatch(setLanguage(opt.value))}
              className={`py-3 rounded-xl border text-sm font-medium transition ${
                locale === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : theme
                    ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
