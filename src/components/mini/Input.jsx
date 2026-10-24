import { useSelector } from 'react-redux'

export default function Input({ type, names, icon }) {
  const theme = useSelector((state) => state.themes.theme)
  return (
    <div className="flex flex-col relative w-full">
      <span className="absolute -left-[40px] top-[10px] text-[50px]">{icon}</span>

      <input
        type={type}
        name="input"
        id="input"
        className={`${theme ? 'placeholder:text-white/40' : 'placeholder:text-gray-400'} border-1  p-[10px] w-full rounded-[10px] outline-none focus:shadow-2xl transition-all duration-200 `}
        placeholder={names}
      />
    </div>
  )
}
