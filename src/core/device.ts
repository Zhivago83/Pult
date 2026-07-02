// Постоянный идентификатор ЭТОГО устройства.
// При первом запуске генерируется и сохраняется в localStorage,
// дальше читается оттуда. Идентификатор локальный: в IndexedDB-сторы
// не пишется и никуда не отправляется сам по себе — он только
// проставляется внутрь операций журнала (Op.device).
import { newId } from './id'

const KEY = 'pult.deviceId'

// Кэш на время работы страницы; заодно запасной вариант,
// если localStorage недоступен (приватный режим и т.п.).
let cached: string | null = null

export function getDeviceId(): string {
  if (cached) return cached
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      cached = saved
      return saved
    }
    const fresh = newId()
    localStorage.setItem(KEY, fresh)
    cached = fresh
    return fresh
  } catch {
    // localStorage недоступен — живём с разовым идентификатором в памяти.
    cached = newId()
    return cached
  }
}
