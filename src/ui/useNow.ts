import { useEffect, useState } from 'react'

/**
 * Текущее время, обновляется каждую секунду. Нужно, чтобы «период
 * благодати» сам истекал и зачёркнутые пункты исчезали без действий.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
