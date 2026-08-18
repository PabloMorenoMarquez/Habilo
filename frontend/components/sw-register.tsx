// components/sw-register.tsx
'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.register('/sw.js').catch((err) => {
         console.error('Error registrando el service worker:', err)
       })
     }
  }, [])

  return null
}