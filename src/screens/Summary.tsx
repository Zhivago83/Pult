// Экран «Сводка»: термометр дня + секции по тревожности.
import { useItems, useNow } from '../core/hooks'
import { buildSections, buildThermometer } from '../core/selectors'
import { Thermometer } from '../components/Thermometer'
import { ItemRow } from '../components/ItemRow'

export function Summary() {
  const items = useItems()
  const now = useNow()

  const thermo = buildThermometer(items, now)
  const sections = buildSections(items, now)

  return (
    <>
      <Thermometer data={thermo} />

      {sections.length === 0 ? (
        <div className="empty">Пусто и спокойно.</div>
      ) : (
        sections.map((s) => (
          <section className={'section section-' + s.key} key={s.key}>
            <h2 className="section-title">{s.title}</h2>
            {s.items.map((it) => (
              <ItemRow key={it.id} item={it} now={now} />
            ))}
          </section>
        ))
      )}
    </>
  )
}
