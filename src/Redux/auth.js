import { createSlice } from '@reduxjs/toolkit'

const readSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('lubrix_user') || 'null')
  } catch {
    return null
  }
}

const savedUser = readSavedUser()

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: savedUser,
    token: null,
    isAuthenticated: Boolean(savedUser),
    initialized: false,
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action) => {
      state.loading = false
      state.initialized = true
      state.isAuthenticated = Boolean(action.payload.user)
      state.token = null
      state.user = action.payload.user
      state.error = null
    },
    sessionCheckComplete: (state, action) => {
      state.initialized = true
      state.isAuthenticated = Boolean(action.payload)
      state.user = action.payload || null
      state.token = null
    },
    loginFailure: (state, action) => {
      state.loading = false
      state.initialized = true
      state.error = action.payload
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.initialized = true
      state.loading = false
      state.error = null
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    },
  },
})

export const { loginStart, loginSuccess, loginFailure, logout, updateUser, sessionCheckComplete } =
  authSlice.actions
export default authSlice.reducer
