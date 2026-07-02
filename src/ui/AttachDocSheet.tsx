import { useMemo, useState } from 'react'
import { useEngine, type DocInput } from '../state/engine'
import { docLabel, docTypeOptions } from '../core/docs'
import { dateInputToTs, formatDateShort } from '../core/time'

/**
 * «Привязать документ»: сверху — существующие документы (тап — привязать),
 * ниже — форма нового (тип из дополняемого списка, номер, дата,
 * корреспондент из людей или вручную, описание, контрольный срок).
 * Всё полями внутри интерфейса; привязка/создание — через op-log с Undo.
 */
export function AttachDocSheet({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { items, docs, people, attachDoc, createAndAttachDoc } = useEngine()
  const item = items.find((it) => it.id === itemId)
  const attachedIds = item?.docIds ?? []
  const available = docs.filter((d) => !attachedIds.includes(d.id))
  const typeOptions = useMemo(() => docTypeOptions(docs), [docs])

  const [docType, setDocType] = useState('')
  const [number, setNumber] = useState('')
  const [docDate, setDocDate] = useState('')
  const [corr, setCorr] = useState('')
  const [description, setDescription] = useState('')
  const [control, setControl] = useState('')

  const canCreate = (docType.trim() || '') !== '' && number.trim() !== ''

  function create() {
    if (!canCreate) return
    const input: DocInput = {
      docType,
      number,
      docDate: dateInputToTs(docDate),
      correspondent: corr,
      description,
      controlAt: dateInputToTs(control),
    }
    createAndAttachDoc(itemId, input)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <span className="badge">привязать документ</span>
          <button className="detail__close" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Существующие документы */}
        {available.length > 0 && (
          <>
            <div className="detail__histHead">Существующие</div>
            <div className="doc-pick">
              {available.map((d) => (
                <button
                  className="row"
                  key={d.id}
                  onClick={() => {
                    attachDoc(itemId, d.id)
                    onClose()
                  }}
                >
                  <div className="row__body">
                    <div className="row__title data">{docLabel(d)}</div>
                    {(d.description || d.correspondent || d.docDate != null) && (
                      <div className="row__meta">
                        {d.description && <span>{d.description}</span>}
                        {d.correspondent && <span className="data">{d.correspondent}</span>}
                        {d.docDate != null && (
                          <span className="data">{formatDateShort(d.docDate)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Новый документ */}
        <div className="detail__histHead">Новый документ</div>

        <div className="field">
          <label>Тип</label>
          <div className="choices">
            {typeOptions.map((t) => (
              <button
                key={t}
                className={t === docType ? 'is-active' : ''}
                onClick={() => setDocType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={typeOptions.includes(docType) ? '' : docType}
            onChange={(e) => setDocType(e.target.value)}
            placeholder="Или свой тип"
          />
        </div>

        <div className="field">
          <label>Номер</label>
          <input
            className="data"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Например: 118 или 42-П"
          />
        </div>

        <div className="field">
          <label>Дата документа</label>
          <input
            className="data"
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Корреспондент</label>
          {people.length > 0 && (
            <div className="choices">
              {people.map((p) => (
                <button
                  key={p.name}
                  className={p.name === corr ? 'is-active' : ''}
                  onClick={() => setCorr(p.name)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <input
            value={people.some((p) => p.name === corr) ? '' : corr}
            onChange={(e) => setCorr(e.target.value)}
            placeholder="Или вписать вручную"
          />
        </div>

        <div className="field">
          <label>Краткое описание</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="О чём документ"
          />
        </div>

        <div className="field">
          <label>Контрольный срок (необязательно)</label>
          <input
            className="data"
            type="date"
            value={control}
            onChange={(e) => setControl(e.target.value)}
          />
        </div>

        <div className="sheet__row">
          <button className="btn btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn--primary" disabled={!canCreate} onClick={create}>
            Создать и привязать
          </button>
        </div>
      </div>
    </div>
  )
}
