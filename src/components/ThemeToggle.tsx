import React, { useEffect, useState } from 'react'
import { IoSunny, IoMoon } from 'react-icons/io5/index.js'

const themes = ['light', 'dark']
export default function ThemeToggle() {
  const [isMounted, setIsMounted] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (import.meta.env.SSR) return undefined
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme'))
      return localStorage.getItem('theme')
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
      <button
        key={theme}
        className="hover:opacity-80 focus:opacity-50"
        onClick={toggleTheme}
      >
        {theme === 'light' ? <IoMoon /> : <IoSunny />}
      </button>
    </div>
  ) : (
    <div />
  )
}
