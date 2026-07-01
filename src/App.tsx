import { useState } from 'react'
import { EngineProvider, useEngine } from './state/engine'
import { useTheme } from './ui/useTheme'
import { Summary } from './ui/Summary'
import { Capture } from './ui/Capture'
import { Trash } from './ui/Trash'
import { UndoToast } from './ui/UndoToast'

function Shell() {
  const { ready, trashed } = useEngine()
  const { theme, toggle } = useTheme()
  const [showCapture, setShowCapture] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  if (!ready) return <div className="app" />

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__title">Пульт руководителя</div>
        <div className="topbar__actions">
          <button className="linkbtn" onClick={() => setShowTrash(true)}>
            Корзина{trashed.length ? ` · ${trashed.length}` : ''}
          </button>
          <button className="linkbtn" onClick={toggle}>
            {theme === 'paper' ? 'Консоль' : 'Бумага'}
          </button>
        </div>
      </header>

      <Summary />

      <button className="fab" aria-label="Добавить пункт" onClick={() => setShowCapture(true)}>
        +
      </button>

      {showCapture && <Capture onClose={() => setShowCapture(false)} />}
      {showTrash && <Trash onClose={() => setShowTrash(false)} />}

      <UndoToast />
    </div>
  )
}

export default function App() {
  return (
    <EngineProvider>
      <Shell />
    </EngineProvider>
  )
}
