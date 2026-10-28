import { createSlice } from '@reduxjs/toolkit';

const getInitialSidebarState = () => {
  try {
    const saved = localStorage.getItem('lubrix-sidebar-collapsed');
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return false;
};

const lubrix = createSlice({
  name: 'Sitebar',
  initialState: {
    value: getInitialSidebarState(),
    mobileOpen: false,
  },

  reducers: {
    Opens: (state) => {
      state.value = !state.value;
      try {
        localStorage.setItem('lubrix-sidebar-collapsed', JSON.stringify(state.value));
      } catch {
        // ignore
      }
    },
    toggleMobile: (state) => {
      state.mobileOpen = !state.mobileOpen;
    },
    closeMobile: (state) => {
      state.mobileOpen = false;
    },
  },
});

export const { Opens, toggleMobile, closeMobile } = lubrix.actions;
export default lubrix.reducer;
