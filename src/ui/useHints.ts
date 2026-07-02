import { useSyncExternalStore } from 'react'

// Небольшой общий флажок «подсказки показаны», чтобы блок подсказок и
// кнопка в настройках («Показать снова») жили согласованно и без перезагрузки.

const KEY = 'pult.tipsSeen'
const listeners = new Set<() => void>()
let seen = localStorage.getItem(KEY) === '1'

function emit() {
  listeners.forEach((l) => l())
}

/** Больше не показывать подсказки. */
export function dismissTips() {
  seen = true
  localStorage.setItem(KEY, '1')
  emit()
}

/** Показать подсказки снова. */
export function resetTips() {
  seen = false
  localStorage.removeItem(KEY)
  emit()
}

/** Показаны ли уже подсказки (реактивно). */
export function useTipsSeen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => seen,
  )
}
