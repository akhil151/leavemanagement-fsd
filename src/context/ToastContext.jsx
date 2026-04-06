import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ToastContext = createContext(null)

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState(/** @type {{ id: string; message: string }[]} */ ([]))

  const pushToast = useCallback((message) => {
    if (!message) return
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setItems((prev) => [...prev, { id, message }].slice(-4))
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, 4500)
  }, [])

  useEffect(() => {
    const onApiError = (event) => {
      const message = event?.detail?.message
      if (message) pushToast(message)
    }
    window.addEventListener('app:api-error', onApiError)
    return () => window.removeEventListener('app:api-error', onApiError)
  }, [pushToast])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="max-w-sm rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 shadow-[var(--shadow-floating)]"
            role="status"
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
