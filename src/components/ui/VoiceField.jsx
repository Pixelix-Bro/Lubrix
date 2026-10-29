import { Mic } from 'lucide-react'
import { useVoiceSearch } from '../../hooks/useVoiceSearch'

export default function VoiceField({
  value,
  onChange,
  placeholder = 'Qidirish...',
  className = '',
  inputClassName = '',
}) {
  const { isListening, isSupported, toggleListening } = useVoiceSearch({
    onResult: (text) => onChange(text),
  })

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent outline-none pr-10 ${inputClassName}`}
      />
      {isSupported && (
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'Tinglashni to‘xtatish' : 'Ovoz orqali qidirish'}
          className={`absolute right-1 p-1.5 rounded-lg transition ${
            isListening ? 'bg-rose-500/20 text-rose-400' : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Mic size={15} />
        </button>
      )}
    </div>
  )
}
