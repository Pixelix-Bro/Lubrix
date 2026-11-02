import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'swiper/css'
import 'swiper/css/navigation'
import App from './App.jsx'
import './index.css'
import { store } from './Redux/store.js'

try {
  localStorage.removeItem('lubrix_token')
} catch {
  // Storage may be disabled by the browser.
}

try {
  const savedSignup = sessionStorage.getItem('lubrix_register_intent')
  if (savedSignup) {
    const { name, email, organizationName, phone } = JSON.parse(savedSignup)
    sessionStorage.setItem(
      'lubrix_register_intent',
      JSON.stringify({ name, email, organizationName, phone })
    )
  }
} catch {
  try {
    sessionStorage.removeItem('lubrix_register_intent')
  } catch {
    // Storage may be disabled by the browser.
  }
}

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)
