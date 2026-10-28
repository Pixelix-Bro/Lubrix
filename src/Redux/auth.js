import { createSlice } from '@reduxjs/toolkit';

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem('lubrix_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  try {
    return localStorage.getItem('lubrix_token') || null;
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: getInitialUser(),
    token: getInitialToken(),
    isAuthenticated: !!getInitialToken(),
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      try {
        localStorage.setItem('lubrix_token', action.payload.token);
        localStorage.setItem('lubrix_user', JSON.stringify(action.payload.user));
      } catch (e) {
        console.error('Failed to save auth to localStorage', e);
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      try {
        localStorage.removeItem('lubrix_token');
        localStorage.removeItem('lubrix_user');
      } catch (e) {
        console.error('Failed to clear auth from localStorage', e);
      }
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      try {
        localStorage.setItem('lubrix_user', JSON.stringify(state.user));
      } catch (e) {
        console.error('Failed to update user in localStorage', e);
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
