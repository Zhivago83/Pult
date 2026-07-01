// Управление темой: «Бумага» (светлая) / «Консоль» (тёмная).
// Выбор сохраняется в localStorage и переживает перезапуск.
import { useEffect, useState } from 'react'

export type Theme = 'paper' | 'console'

const KEY = 'pult-theme'

function readTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  return saved === 'console' ? 'console' : 'paper'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'console' ? '#16171a' : '#f4f1ea')
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'paper' ? 'console' : 'paper'))
  return { theme, toggle }
}
