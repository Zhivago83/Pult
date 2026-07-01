import { useRef, useState } from 'react'
import { useEngine } from '../state/engine'
import { useTheme } from './useTheme'
import { tsToDateInput } from '../core/time'

/**
 * Экран «Ещё»: тема и резервная копия данных.
 * Экспорт скачивает всё одним JSON-файлом; импорт заменяет данные из файла.
 * Файл выбирается вручную — это и есть подтверждение (без системных окон).
 */
export function More({ onClose }: { onClose: () => void }) {
  const { exportData, importData } = useEngine()
  const { theme, toggle } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

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
      e.target.value = '' // сброс — чтобы можно было выбрать тот же файл снова
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Ещё</div>

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
          <label>Резервная копия</label>
          <div className="more__row">
            <button className="btn btn--ghost" onClick={doExport}>
              Экспорт в файл
            </button>
            <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              Импорт из файла
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFile}
          />
          <div className="capture__hint capture__hint--muted">
            Экспорт скачивает все данные одним файлом. Импорт заменяет текущие
            данные данными из файла.
          </div>
          {msg && <div className="more__msg data">{msg}</div>}
        </div>

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
