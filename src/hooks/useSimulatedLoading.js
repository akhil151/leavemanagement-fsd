import { useEffect, useState } from 'react'

/**
 * Brief loading state for skeleton demos (no backend).
 * @param {number} ms
 */
export function useSimulatedLoading(ms = 500) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return loading
}
