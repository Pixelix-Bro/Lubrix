import { configureStore } from '@reduxjs/toolkit';
import auth from './auth';
import language from './language';
import Sidebar from './Sitebar';
import theme from './theme';

export const store = configureStore({
  reducer: {
    auth,
    sidebar: Sidebar,
    themes: theme,
    language,
  },
});
