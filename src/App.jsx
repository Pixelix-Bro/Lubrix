import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './layout/Layout'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Login from './pages/Login'
import Price from './pages/Price'
import Register from './pages/Register'
function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: '/login',
          element: <Login />,
        },
        {
          path: '/plans',
          element: <Price />,
        },
        {
          path: '/checkout',
          element: <Checkout />,
        },
        {
          path: '/register',
          element: <Register />,
        },
      ],
    },
  ])
  return <RouterProvider router={router} />
}

export default App
