import { createSlice } from '@reduxjs/toolkit'

const getInitialLanguage = () => {
  try {
    return localStorage.getItem('lubrix-language') || 'uz'
  } catch {
    return 'uz'
  }
}

const language = createSlice({
  name: 'language',
  initialState: {
    language: getInitialLanguage(),
  },
  reducers: {
    setLanguage: (state, action) => {
      state.language = action.payload
      try {
        localStorage.setItem('lubrix-language', action.payload)
      } catch {
        // ignore storage issues
      }
    },
  },
})

export const { setLanguage } = language.actions
export default language.reducer
