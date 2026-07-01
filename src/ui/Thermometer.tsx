import type { Thermometer as Thermo } from '../core/derive'

/**
 * «Термометр дня»: тонкая полоса + строка «N горят · M ждут · K моих».
 * Красный в полосе — только если что-то горит. Пусто — спокойно, без цвета.
 */
export function Thermometer({ t }: { t: Thermo }) {
  const total = t.total || 1
  const redPct = (t.burning / total) * 100
  const inkPct = ((t.waiting + t.mine) / total) * 100

  return (
    <div className="thermo">
      <div className="thermo__bar">
        {t.burning > 0 && <div className="thermo__fill--red" style={{ width: `${redPct}%` }} />}
        {t.waiting + t.mine > 0 && (
          <div className="thermo__fill--ink" style={{ width: `${inkPct}%` }} />
        )}
      </div>
      <div className="thermo__line data">
        {t.burning > 0 && (
          <>
            <span className="hot">{t.burning} горят</span>
            {' · '}
          </>
        )}
        {t.waiting} ждут · {t.mine} моих
      </div>
    </div>
  )
}
