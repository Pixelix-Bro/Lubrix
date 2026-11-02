import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { apiCache } from './apiCache'
import auth, { loginSuccess, logout, sessionCheckComplete } from './auth'
import language from './language'
import Sidebar from './Sitebar'
import theme from './theme'

const authCacheListener = createListenerMiddleware()
authCacheListener.startListening({
  matcher: isAnyOf(loginSuccess, logout, sessionCheckComplete),
  effect: (action, listenerApi) => {
    try {
      const user = listenerApi.getState().auth.user
      if (user) localStorage.setItem('lubrix_user', JSON.stringify(user))
      else localStorage.removeItem('lubrix_user')
    } catch {
      // Storage may be disabled by the browser.
    }

    if (loginSuccess.match(action) || logout.match(action)) {
      listenerApi.dispatch(apiCache.util.resetApiState())
    }
  },
})

export const store = configureStore({
  reducer: {
    auth,
    sidebar: Sidebar,
    themes: theme,
    language,
    [apiCache.reducerPath]: apiCache.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authCacheListener.middleware).concat(apiCache.middleware),
})
