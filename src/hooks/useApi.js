import { useCallback, useEffect, useState } from 'react'

export function useApi(apiFn, initialData = null) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFn()
      setData(response?.data?.data ?? response?.data ?? null)
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError?.message || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }, [apiFn])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetch(), 0)
    return () => window.clearTimeout(timer)
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
