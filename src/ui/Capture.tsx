import { useState } from 'react'
import { useEngine, type CaptureInput } from '../state/engine'
import type { Kind } from '../types'
import { parseCapture } from '../core/parse'
import { dateInputToTs, tsToDateInput } from '../core/time'

/**
 * Лист захвата с умным разбором. Пишем фразу как есть
 * («отчёт от Марины до пятницы #Отчётность») — вид, имя, срок и проект
 * распознаются и подставляются в поля. Любое поле можно поправить руками;
 * тогда авто-подстановка его больше не трогает.
 */
export function Capture({ onClose }: { onClose: () => void }) {
  const { capture } = useEngine()

  const [text, setText] = useState('')
  const [cleanTitle, setCleanTitle] = useState('')
  const [kind, setKind] = useState<Kind>('mine')
  const [who, setWho] = useState('')
  const [due, setDue] = useState('')
  const [project, setProject] = useState('')

  // Что пользователь трогал руками — это авто-разбор перезаписывать не должен.
  const [touched, setTouched] = useState({ kind: false, who: false, due: false, project: false })

  function onText(next: string) {
    setText(next)
    const p = parseCapture(next, Date.now())
    setCleanTitle(p.title)
    if (!touched.kind) setKind(p.kind)
    if (!touched.who) setWho(p.who ?? '')
    if (!touched.due) setDue(p.dueAt != null ? tsToDateInput(p.dueAt) : '')
    if (!touched.project) setProject(p.project ?? '')
  }

  const finalTitle = (cleanTitle || text).trim()
  const canSave = finalTitle.length > 0
  const hint = cleanTitle && cleanTitle !== text.trim() ? cleanTitle : ''

  function save() {
    if (!canSave) return
    const input: CaptureInput = {
      kind,
      title: finalTitle,
      who: kind === 'waiting' ? who : undefined,
      dueAt: dateInputToTs(due),
      project: project.trim() || undefined,
    }
    capture(input)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">Новый пункт</div>

        <div className="segmented">
          <button
            className={kind === 'mine' ? 'is-active' : ''}
            onClick={() => {
              setKind('mine')
              setTouched((t) => ({ ...t, kind: true }))
            }}
          >
            Моё
          </button>
          <button
            className={kind === 'waiting' ? 'is-active' : ''}
            onClick={() => {
              setKind('waiting')
              setTouched((t) => ({ ...t, kind: true }))
            }}
          >
            Жду от кого-то
          </button>
        </div>

        <div className="field">
          <label>{kind === 'mine' ? 'Что нужно сделать' : 'Чего ждём'}</label>
          <input
            autoFocus
            value={text}
            onChange={(e) => onText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="напр.: отчёт от Марины до пятницы #Отчётность"
          />
          {hint ? (
            <div className="capture__hint data">→ {hint}</div>
          ) : (
            <div className="capture__hint capture__hint--muted">
              Можно писать как есть — срок, имя и #проект распознаются сами.
            </div>
          )}
        </div>

        {kind === 'waiting' && (
          <div className="field">
            <label>От кого</label>
            <input
              value={who}
              onChange={(e) => {
                setWho(e.target.value)
                setTouched((t) => ({ ...t, who: true }))
              }}
              placeholder="Имя"
            />
          </div>
        )}

        <div className="field">
          <label>Проект (необязательно)</label>
          <input
            value={project}
            onChange={(e) => {
              setProject(e.target.value)
              setTouched((t) => ({ ...t, project: true }))
            }}
            placeholder="Название проекта"
          />
        </div>

        <div className="field">
          <label>Срок (необязательно)</label>
          <input
            className="data"
            type="date"
            value={due}
            onChange={(e) => {
              setDue(e.target.value)
              setTouched((t) => ({ ...t, due: true }))
            }}
          />
        </div>

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--primary" disabled={!canSave} onClick={save}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
