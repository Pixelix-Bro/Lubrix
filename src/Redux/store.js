import { configureStore } from '@reduxjs/toolkit'
import Sidebar from './Sitebar'
import theme from './theme'
export const store = configureStore({
  reducer: {
    sidebar: Sidebar,
    themes: theme,
  },
})
