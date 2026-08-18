// components/mobile-debug-console.tsx
'use client'

import { useEffect } from 'react'

export function MobileDebugConsole() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.location.search.includes('debug=1')) {
      localStorage.setItem('debug-console', '1')
    }

    if (localStorage.getItem('debug-console') !== '1') return

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/eruda'
    script.onload = () => {
      // @ts-ignore
      window.eruda?.init()
    }
    document.body.appendChild(script)
  }, [])

  return null
}