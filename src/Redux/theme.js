import { createSlice } from '@reduxjs/toolkit'

const getInitialMode = () => {
  try {
    const savedMode = localStorage.getItem('lubrix-theme-mode')
    if (['system', 'light', 'dark'].includes(savedMode)) return savedMode
    const legacy = localStorage.getItem('lubrix-theme')
    if (legacy !== null) return JSON.parse(legacy) ? 'dark' : 'light'
  } catch {
    // ignore
  }
  return 'system'
}

const getSystemTheme = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

const getInitialTheme = (mode) => mode === 'dark' || (mode === 'system' && getSystemTheme())

const persistTheme = (mode, theme) => {
  try {
    localStorage.setItem('lubrix-theme-mode', mode)
    localStorage.setItem('lubrix-theme', JSON.stringify(theme))
  } catch {
    // ignore storage issues
  }
}

const initialMode = getInitialMode()

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: initialMode,
    theme: getInitialTheme(initialMode),
  },
  reducers: {
    activ: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.theme = action.payload
      } else {
        state.theme = !state.theme
      }
      state.mode = state.theme ? 'dark' : 'light'
      persistTheme(state.mode, state.theme)
    },
    setThemeMode: (state, action) => {
      if (!['system', 'light', 'dark'].includes(action.payload)) return
      state.mode = action.payload
      if (action.payload !== 'system') state.theme = action.payload === 'dark'
      persistTheme(state.mode, state.theme)
    },
    resolveSystemTheme: (state, action) => {
      if (state.mode === 'system') {
        state.theme = Boolean(action.payload)
        persistTheme(state.mode, state.theme)
      }
    },
  },
})

export const { activ, setThemeMode, resolveSystemTheme } = themeSlice.actions
export default themeSlice.reducer
