// ─────────────────────────────────────────────────────────────
//  ЯДРО: настройки под себя
//  Пользователь может подкрутить пороги «горит»/«пора пнуть» и длину
//  периода благодати. Чтобы не тащить их через все компоненты, держим
//  «активные» пороги в мс здесь; чистые функции читают их через
//  thresholds(). Движок обновляет их при загрузке и при изменении.
// ─────────────────────────────────────────────────────────────

import { SOON_MS, NUDGE_MS, STALE_MS, GRACE_MS } from './constants'

export interface Settings {
  /** «Горит»: за сколько часов до срока (или после) пункт краснеет. */
  soonHours: number
  /** «Пора пнуть»: за сколько дней до срока ожидание просится пнуть. */
  nudgeDays: number
  /** Период благодати: сколько секунд закрытый пункт держится зачёркнутым. */
  graceSeconds: number
}

export const DEFAULT_SETTINGS: Settings = {
  soonHours: SOON_MS / 3_600_000,
  nudgeDays: NUDGE_MS / 86_400_000,
  graceSeconds: GRACE_MS / 1000,
}

export interface Thresholds {
  soonMs: number
  nudgeMs: number
  staleMs: number
  graceMs: number
}

// Активные пороги в миллисекундах. По умолчанию — как в constants.
let active: Thresholds = {
  soonMs: SOON_MS,
  nudgeMs: NUDGE_MS,
  staleMs: STALE_MS, // не настраивается, но нужен derive
  graceMs: GRACE_MS,
}

/** Применить настройки к активным порогам (вызывает движок). */
export function applySettings(s: Settings): void {
  active = {
    soonMs: Math.max(0, s.soonHours) * 3_600_000,
    nudgeMs: Math.max(0, s.nudgeDays) * 86_400_000,
    staleMs: STALE_MS,
    graceMs: Math.max(0, s.graceSeconds) * 1000,
  }
}

/** Текущие активные пороги — для чистых функций и компонентов. */
export function thresholds(): Thresholds {
  return active
}
