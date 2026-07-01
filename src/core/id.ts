// Генератор идентификаторов. Используем встроенный crypto,
// с запасным вариантом на случай старых окружений.
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
