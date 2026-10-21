import { configureStore } from '@reduxjs/toolkit'
import Sidebar from './Sitebar'
export const store = configureStore({
  reducer: {
    sidebar: Sidebar,
  },
})
