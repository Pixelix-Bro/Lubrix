import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { logout, sessionCheckComplete } from '../Redux/auth'
import { lubrixApi, preloadAppData } from '../services/api'
import { LoadingSpinner } from './ui'

export default function ProtectedRoute() {
  const { initialized, isAuthenticated, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const location = useLocation()
  const [preloadResult, setPreloadResult] = useState(null)
  const [preloadAttempt, setPreloadAttempt] = useState(0)
  const userKey = user?._id || user?.id || 'authenticated'

  useEffect(() => {
    let active = true
    const handleExpiredSession = () => dispatch(logout())
    window.addEventListener('lubrix:auth-expired', handleExpiredSession)

    if (!initialized) {
      lubrixApi
        .getCsrf()
        .then(() => lubrixApi.getMe())
        .then((response) => {
          if (active) dispatch(sessionCheckComplete(response.data?.data?.user || null))
        })
        .catch((error) => {
          if (active) {
            dispatch(sessionCheckComplete(error.response?.status === 401 ? null : user))
          }
        })
    }

    return () => {
      active = false
      window.removeEventListener('lubrix:auth-expired', handleExpiredSession)
    }
  }, [dispatch, initialized, user])

  useEffect(() => {
    if (!initialized || !isAuthenticated) return undefined

    let active = true
    preloadAppData()
      .then(() => {
        if (active) setPreloadResult({ userKey, status: 'ready' })
      })
      .catch(() => {
        if (active) setPreloadResult({ userKey, status: 'error' })
      })

    return () => {
      active = false
    }
  }, [initialized, isAuthenticated, preloadAttempt, userKey])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-white">
        <LoadingSpinner text="Sessiya tekshirilmoqda..." size="lg" />
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  const preloadStatus = preloadResult?.userKey === userKey ? preloadResult.status : 'loading'
  if (preloadStatus !== 'ready') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-5 text-center text-white">
        {preloadStatus === 'error' ? (
          <>
            <p className="text-sm text-white/75">Dashboard ma’lumotlarini yuklab bo‘lmadi.</p>
            <button
              type="button"
              onClick={() => {
                setPreloadResult(null)
                setPreloadAttempt((attempt) => attempt + 1)
              }}
              className="rounded-lg bg-[#11966d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c805c]"
            >
              Qayta urinish
            </button>
          </>
        ) : (
          <LoadingSpinner text="Dashboard ma’lumotlari yuklanmoqda..." size="lg" />
        )}
      </div>
    )
  }

  return <Outlet />
}
