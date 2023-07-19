import React, { useEffect, useState } from 'react'

// const themes = ['light', 'dark']
export default function ThemeToggle() {
  const [isMounted, setIsMounted] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (import.meta.env.SSR) return undefined
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) return localStorage.getItem('theme')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  })
  const toggleTheme = () => {
    const t = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', t)
    setTheme(t)
  }
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') root.classList.remove('dark')
    else root.classList.add('dark')
  }, [theme])
  useEffect(() => {
    setIsMounted(true)
  }, [])
  return isMounted ? (
    <div className="flex items-center">
      <button key={theme} className="hover:opacity-80 focus:opacity-50" onClick={toggleTheme}>
        {theme === 'light' ? <div className="i-ion-moon-outline" /> : <div className="i-ion-sunny-outline" />}
      </button>
    </div>
  ) : (
    <div />
  )
}
