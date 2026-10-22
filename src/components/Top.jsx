import { Bell, ChevronDown, Moon, Search, Sun } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { activ } from '../Redux/theme'

export default function Top() {
  const value = useSelector((state) => state.sidebar.value)
  const theme = useSelector((state) => state.themes.theme)
  const dispatch = useDispatch()
  const location = useLocation()

  const [tog, setTog] = useState('')
  const routes = {
    '/': 'Dashboard',
    '/customers': 'Customers',
    '/services': 'Services',
    '/products': 'Products',
    '/settings': 'Settings',
  }

  const api = false
  const path =
    routes[location.pathname] ||
    location.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) ||
    'Dashboard'

  console.log(theme)

  return (
    <header
      className={`
        fixed right-0 top-0 z-30
        flex h-[63px] items-center justify-between
        border-b border-gray-200  px-5
        transition-all duration-200
        transition-[width] duration-200

      ${theme ? 'bg-surface text-white' : 'bg-white'}

        ${value ? 'w-[calc(100%-80px)]' : 'w-[87%] '}
      `}
    >
      <div className="min-w-0">
        <h1 className={`truncate text-lg font-semibold ${theme ? 'text-white' : 'text-gray-800'}`}>
          {path}
        </h1>
        <p className="text-xs text-gray-400">Welcome back to Lubrix</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(activ())}
          className={`flex items-center rounded-lg p-2 ${theme ? 'hover:bg-white/20' : 'text-gray-500 transition hover:bg-gray-100'} `}
        >
          {theme ? <Sun /> : <Moon />}
        </button>
        <div
          className={`flex items-center rounded-lg p-2 ${theme ? 'hover:bg-white/20' : 'text-gray-500 transition hover:bg-gray-100'} `}
        >
          <button
            type="button"
            onClick={() => setTog((res) => (!res ? 'search' : ''))}
            aria-label="Toggle search"
            className="group"
          >
            <Search size={19} />

          </button>

          <input
            type="text"
            id="search"
            name="search"
            placeholder="Search..."
            onBlur={() => setTog('')}
            className={`min-w-0 overflow-hidden bg-transparent outline-none transition-all duration-200 ${
              tog === 'search' ? 'ml-2 w-[120px] opacity-100' : 'w-0 opacity-0'
            }`}
          />
        </div>

        <div className="relative transition-all duration-200">
          <button
            type="button"
            onClick={() => setTog((res) => (!res ? 'notifications' : ''))}
            aria-label="Notifications"
            className={`flex items-center rounded-lg p-2 ${theme ? 'hover:bg-white/20' : 'text-gray-500 transition hover:bg-gray-100'} `}
          >
            <Bell size={19} />
            {api ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-yellow-500" />
            ) : (
              ''
            )}
          </button>
          <div
            id="Notifications"
            name="Notifications"
            className={`absolute min-h-[150px] text-center transition-all duration-200 flex ${tog === 'notifications' ? 'w-[300px] h-[150px] ' : 'w-0 h-0 border-0 overflow-hidden'} justify-center items-center bg-white/20 backdrop-blur-[4px] border border-black/25
              -left-[290px]  rounded-tl-2xl rounded-bl-2xl rounded-br-2xl overflow-hidden`}
          >
            {api ? 'malumotlar' : "hech nima yo'q"}
          </div>
        </div>

        <div className="flex cursor-pointer items-center gap-2 border-l border-gray-200 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/10 font-semibold text-yellow-700">
            A
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className={`text-sm font-medium `}>Admin</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>

          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </header>
  )
}
