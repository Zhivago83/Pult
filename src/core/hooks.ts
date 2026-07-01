// Мостики между ядром и React.
import { useEffect, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { subscribe, getItems } from './engine'

/** Живой список всех пунктов. Перерисовка при любом изменении. */
export function useItems() {
  return useSyncExternalStore(subscribe, getItems, getItems)
}

/**
 * «Часы»: возвращает текущее время и обновляется каждую секунду.
 * Нужно, чтобы сроки истекали и «период благодати» заканчивался
 * без действий пользователя.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
