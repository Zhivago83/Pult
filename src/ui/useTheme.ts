import { useEffect, useState } from 'react'

export type Theme = 'paper' | 'console'

const KEY = 'pult.theme'

/** Хук темы: «Бумага» (светлая) или «Консоль» (тёмная), с запоминанием. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'console' ? 'console' : 'paper'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'console' ? '#161615' : '#f6f5f2')
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'paper' ? 'console' : 'paper'))
  return { theme, toggle }
}
