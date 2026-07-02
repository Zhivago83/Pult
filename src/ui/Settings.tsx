import { useRef, useState } from 'react'
import { useEngine } from '../state/engine'
import { useTheme } from './useTheme'
import { tsToDateInput } from '../core/time'

/** Вариант выбора для порога. */
interface Opt {
  value: number
  label: string
}

const SOON_OPTS: Opt[] = [
  { value: 6, label: '6 ч' },
  { value: 12, label: '12 ч' },
  { value: 24, label: 'сутки' },
  { value: 48, label: '2 суток' },
]
const NUDGE_OPTS: Opt[] = [
  { value: 1, label: '1 день' },
  { value: 3, label: '3 дня' },
  { value: 7, label: 'неделя' },
]
const GRACE_OPTS: Opt[] = [
  { value: 3, label: '3 с' },
  { value: 6, label: '6 с' },
  { value: 10, label: '10 с' },
]

function OptRow({
  opts,
  value,
  onPick,
}: {
  opts: Opt[]
  value: number
  onPick: (v: number) => void
}) {
  return (
    <div className="repeat-options">
      {opts.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'is-active' : ''}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Настройки: тема, пороги «горит»/«пора пнуть», период благодати,
 * резервная копия и сброс к демо. Всё выбором из понятных вариантов,
 * без системных окон.
 */
export function Settings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, resetDemo, exportData, importData } = useEngine()
  const { theme, toggle } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  async function doExport() {
    const data = await exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pult-backup-${tsToDateInput(data.exportedAt)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg(`Сохранён файл с ${data.items.length} пунктами.`)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const backup = JSON.parse(await file.text())
      await importData(backup)
      setMsg(`Загружено: ${backup.items?.length ?? 0} пунктов.`)
    } catch (err) {
      setMsg('Не удалось загрузить: ' + (err instanceof Error ? err.message : 'неверный файл'))
    } finally {
      e.target.value = ''
    }
  }

  async function doReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    await resetDemo()
    setConfirmReset(false)
    setMsg('Данные сброшены к демо.')
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Настройки</div>

        <div className="field">
          <label>Тема</label>
          <div className="segmented">
            <button
              className={theme === 'paper' ? 'is-active' : ''}
              onClick={() => theme !== 'paper' && toggle()}
            >
              Бумага
            </button>
            <button
              className={theme === 'console' ? 'is-active' : ''}
              onClick={() => theme !== 'console' && toggle()}
            >
              Консоль
            </button>
          </div>
        </div>

        <div className="field">
          <label>«Горит» — за сколько до срока краснеет</label>
          <OptRow
            opts={SOON_OPTS}
            value={settings.soonHours}
            onPick={(v) => updateSettings({ soonHours: v })}
          />
        </div>

        <div className="field">
          <label>«Пора пнуть» — за сколько до срока напомнить</label>
          <OptRow
            opts={NUDGE_OPTS}
            value={settings.nudgeDays}
            onPick={(v) => updateSettings({ nudgeDays: v })}
          />
        </div>

        <div className="field">
          <label>Период благодати — сколько зачёркнут перед исчезновением</label>
          <OptRow
            opts={GRACE_OPTS}
            value={settings.graceSeconds}
            onPick={(v) => updateSettings({ graceSeconds: v })}
          />
        </div>

        <div className="field">
          <label>Резервная копия</label>
          <div className="more__row">
            <button className="btn btn--ghost" onClick={doExport}>
              Экспорт в файл
            </button>
            <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              Импорт из файла
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>

        <div className="field">
          <label>Сброс</label>
          <button className="btn btn--ghost btn--danger" onClick={doReset}>
            {confirmReset ? 'Точно сбросить к демо?' : 'Сбросить к демо-данным'}
          </button>
          <div className="capture__hint capture__hint--muted">
            Заменит все текущие данные демонстрационным набором.
          </div>
        </div>

        {msg && <div className="more__msg data">{msg}</div>}

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
