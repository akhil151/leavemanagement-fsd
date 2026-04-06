import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  useEffect(() => {
    const onOffline = () => setOffline(true)
    const onOnline = () => setOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs font-medium">
      You are offline. Some data may be outdated and API actions will retry when possible.
    </div>
  )
}
