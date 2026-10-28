import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('lubrix-theme');
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return false;
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    theme: getInitialTheme(),
  },
  reducers: {
    activ: (state, action) => {
      if (typeof action.payload === 'boolean') {
        state.theme = action.payload;
      } else {
        state.theme = !state.theme;
      }
      try {
        localStorage.setItem('lubrix-theme', JSON.stringify(state.theme));
      } catch {
        // ignore storage issues
      }
    },
  },
});

export const { activ } = themeSlice.actions;
export default themeSlice.reducer;
