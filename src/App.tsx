import { useMemo, useState } from 'react'
import { EngineProvider, useEngine } from './state/engine'
import { Summary } from './ui/Summary'
import { Waiting } from './ui/Waiting'
import { Projects } from './ui/Projects'
import { Capture } from './ui/Capture'
import { Detail } from './ui/Detail'
import { PersonCard } from './ui/PersonCard'
import { ProjectCard } from './ui/ProjectCard'
import { Archive } from './ui/Archive'
import { Trash } from './ui/Trash'
import { More } from './ui/More'
import { Search } from './ui/Search'
import { UndoToast } from './ui/UndoToast'

type Screen = 'summary' | 'waiting' | 'projects'

function Shell() {
  const { ready, trashed, items } = useEngine()
  const [screen, setScreen] = useState<Screen>('summary')
  const [showCapture, setShowCapture] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [openPerson, setOpenPerson] = useState<string | null>(null)
  const [openProject, setOpenProject] = useState<string | null>(null)

  const waitingCount = useMemo(
    () => items.filter((it) => it.kind === 'waiting' && it.status === 'open').length,
    [items],
  )

  if (!ready) return <div className="app" />

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__title">Пульт руководителя</div>
        <div className="topbar__actions">
          <button className="linkbtn linkbtn--icon" aria-label="Поиск" onClick={() => setShowSearch(true)}>
            ⌕
          </button>
          <button className="linkbtn" onClick={() => setShowArchive(true)}>
            Архив
          </button>
          <button className="linkbtn" onClick={() => setShowTrash(true)}>
            Корзина{trashed.length ? ` · ${trashed.length}` : ''}
          </button>
          <button className="linkbtn linkbtn--icon" aria-label="Ещё" onClick={() => setShowMore(true)}>
            ⋯
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab${screen === 'summary' ? ' is-active' : ''}`}
          onClick={() => setScreen('summary')}
        >
          Сводка
        </button>
        <button
          className={`tab${screen === 'waiting' ? ' is-active' : ''}`}
          onClick={() => setScreen('waiting')}
        >
          Жду{waitingCount ? ` · ${waitingCount}` : ''}
        </button>
        <button
          className={`tab${screen === 'projects' ? ' is-active' : ''}`}
          onClick={() => setScreen('projects')}
        >
          Проекты
        </button>
      </nav>

      {screen === 'summary' && <Summary onOpen={setOpenId} />}
      {screen === 'waiting' && (
        <Waiting onOpenItem={setOpenId} onOpenPerson={setOpenPerson} />
      )}
      {screen === 'projects' && <Projects onOpenProject={setOpenProject} />}

      <button className="fab" aria-label="Добавить пункт" onClick={() => setShowCapture(true)}>
        +
      </button>

      {showCapture && <Capture onClose={() => setShowCapture(false)} />}
      {openPerson && (
        <PersonCard
          name={openPerson}
          onOpenItem={setOpenId}
          onClose={() => setOpenPerson(null)}
        />
      )}
      {openProject !== null && (
        <ProjectCard
          name={openProject}
          onOpenItem={setOpenId}
          onClose={() => setOpenProject(null)}
        />
      )}
      {showArchive && <Archive onOpenItem={setOpenId} onClose={() => setShowArchive(false)} />}
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} />}
      {showTrash && <Trash onClose={() => setShowTrash(false)} />}
      {showSearch && <Search onOpenItem={setOpenId} onClose={() => setShowSearch(false)} />}
      {showMore && <More onClose={() => setShowMore(false)} />}

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
