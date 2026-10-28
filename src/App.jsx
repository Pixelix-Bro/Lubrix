import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './layout/Layout'
import Branches from './pages/Branches'
import Checkout from './pages/Checkout'
import Customers from './pages/Customers'
import Home from './pages/Home'
import InspectionChecklist from './pages/InspectionChecklist'
import InventoryDashboard from './pages/inventory/InventoryDashboard'
import Login from './pages/Login'
import Marketing from './pages/Marketing'
import OilSelector from './pages/OilSelector'
import PlateScanner from './pages/PlateScanner'
import Price from './pages/Price'
import QuickPOS from './pages/QuickPOS'
import Register from './pages/Register'
import Reminders from './pages/Reminders'
import Reports from './pages/Reports'
import Services from './pages/Services'
import Settings from './pages/Settings'
import Staff from './pages/Staff'
import Vehicles from './pages/Vehicles'
import RouteErrorBoundary from './components/RouteErrorBoundary'

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/login',
          element: <Login />,
        },
        {
          path: '/register',
          element: <Register />,
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
          element: <ProtectedRoute />,
          children: [
            {
              index: true,
              element: <Home />,
            },
            {
              path: '/customers',
              element: <Customers />,
            },
            {
              path: '/vehicles',
              element: <Vehicles />,
            },
            {
              path: '/scanner',
              element: <PlateScanner />,
            },
            {
              path: '/pos',
              element: <QuickPOS />,
            },
            {
              path: '/oil-selector',
              element: <OilSelector />,
            },
            {
              path: '/inspection',
              element: <InspectionChecklist />,
            },
            {
              path: '/services',
              element: <Services />,
            },
            {
              path: '/reminders',
              element: <Reminders />,
            },
            {
              path: '/marketing',
              element: <Marketing />,
            },
            {
              path: '/inventory',
              element: <InventoryDashboard />,
            },
            {
              path: '/reports',
              element: <Reports />,
            },
            {
              path: '/branches',
              element: <Branches />,
            },
            {
              path: '/staff',
              element: <Staff />,
            },
            {
              path: '/settings',
              element: <Settings />,
            },
          ],
        },
      ],
    },
  ])

  return <RouterProvider router={router} />
}

export default App
