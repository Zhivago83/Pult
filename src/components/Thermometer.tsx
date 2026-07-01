// «Термометр дня»: тонкая полоса жара + строка со счётчиками.
import type { Thermometer as T } from '../core/selectors'

export function Thermometer({ data }: { data: T }) {
  const { burning, waiting, mine, heat } = data
  const empty = burning + waiting + mine === 0

  return (
    <div className="thermo">
      <div className="thermo-bar">
        <div className="thermo-fill" style={{ width: `${Math.round(heat * 100)}%` }} />
      </div>
      <div className="thermo-line mono">
        {empty ? (
          <span>всё спокойно</span>
        ) : (
          <>
            <span className={burning > 0 ? 'hot' : ''}>{burning} горят</span>
            <span className="dot">·</span>
            <span>{waiting} ждут</span>
            <span className="dot">·</span>
            <span>{mine} моих</span>
          </>
        )}
      </div>
    </div>
  )
}
