import { lazy, Suspense, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import LoadingSpinner from './components/ui/LoadingSpinner'
import Layout from './layout/Layout'

const Branches = lazy(() => import('./pages/Branches'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'))
const Home = lazy(() => import('./pages/Home'))
const History = lazy(() => import('./pages/History'))
const InspectionChecklist = lazy(() => import('./pages/InspectionChecklistComplete'))
const InventoryDashboard = lazy(() => import('./pages/inventory/InventoryDashboard'))
const Login = lazy(() => import('./pages/Login'))
const Marketing = lazy(() => import('./pages/Marketing'))
const OilSelector = lazy(() => import('./pages/OilSelector'))
const PlateScanner = lazy(() => import('./pages/PlateScanner'))
const Price = lazy(() => import('./pages/Price'))
const QuickPOS = lazy(() => import('./pages/QuickPOS'))
const Register = lazy(() => import('./pages/Register'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Reports = lazy(() => import('./pages/Reports'))
const Services = lazy(() => import('./pages/Services'))
const Settings = lazy(() => import('./pages/Settings'))
const Staff = lazy(() => import('./pages/Staff'))
const Vehicles = lazy(() => import('./pages/Vehicles'))

function App() {
  const theme = useSelector((state) => state.themes.theme)
  const locale = useSelector((state) => state.language.language)

  useEffect(() => {
    document.documentElement.dataset.theme = theme ? 'dark' : 'light'
    document.documentElement.lang = locale || 'uz'
  }, [theme, locale])

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
              path: '/customers/:id',
              element: <CustomerDetail />,
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
              path: '/history',
              element: <History />,
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

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}

export default App
