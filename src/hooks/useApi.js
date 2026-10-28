import { useCallback, useEffect, useState } from 'react';

/**
 * useApi — API so'rovlari uchun universal hook
 * @param {()=>Promise<any>} apiFn     — API funksiyasi
 * @param {any[]} [deps=[]]            — dependency array
 * @param {any} [initialData=null]     — boshlang'ich data
 *
 * @returns {{ data, loading, error, refetch }}
 */
export function useApi(apiFn, deps = [], initialData = null) {
  const [data,    setData   ] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFn();
      setData(res?.data?.data ?? res?.data ?? null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
