import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import SourcePanel from './components/SourcePanel'
import ThoughtInput from './components/ThoughtInput'
import ThoughtPile from './components/ThoughtPile'
import { MAX_THOUGHT_LENGTH } from './lib/constants'
import {
  fallbackMessage,
  fetchBriefSource,
  fetchFullSource,
  fetchOfficialWebsiteSource,
  normalizeTitle,
  resolveArticleTitle,
} from './lib/sourcing'
import { loadStoredThoughts, persistThoughts } from './lib/storage'

function createThought(input) {
  return {
    id: crypto.randomUUID(),
    text: input.trim(),
    createdAt: Date.now(),
  }
}

function App() {
  const [input, setInput] = useState('')
  const [thoughts, setThoughts] = useState(loadStoredThoughts)
  const [activeThoughtId, setActiveThoughtId] = useState(null)
  const [mode, setMode] = useState('brief')
  const [isLoading, setIsLoading] = useState(false)
  const [resolvedTitle, setResolvedTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sources, setSources] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    persistThoughts(thoughts)
  }, [thoughts])

  const activeThought = useMemo(
    () => thoughts.find((thought) => thought.id === activeThoughtId) ?? null,
    [thoughts, activeThoughtId],
  )

  async function loadSources(thoughtText, selectedMode) {
    setIsLoading(true)
    setErrorMessage('')
    setSources([])
    try {
      const articleTitle = await resolveArticleTitle(thoughtText)
      if (!articleTitle) {
        throw new Error(fallbackMessage())
      }

      setResolvedTitle(articleTitle)
      const wikipediaSource =
        selectedMode === 'brief'
          ? await fetchBriefSource(articleTitle)
          : await fetchFullSource(articleTitle)

      const officialSource = await fetchOfficialWebsiteSource(articleTitle)
      const nextSources = [wikipediaSource]
      if (officialSource) {
        nextSources.push(officialSource)
      }
      setSources(nextSources)
    } catch (error) {
      setErrorMessage(error.message || fallbackMessage())
    } finally {
      setIsLoading(false)
    }
  }

  function addThought(event) {
    event.preventDefault()
    if (input.trim().length === 0) {
      return
    }

    const value = input.trim().slice(0, MAX_THOUGHT_LENGTH)
    const nextThought = createThought(value)
    setThoughts((previous) => [nextThought, ...previous])
    setInput('')
    inputRef.current?.focus()
  }

  function removeThought(id) {
    setThoughts((previous) => previous.filter((thought) => thought.id !== id))
    if (activeThoughtId === id) {
      setActiveThoughtId(null)
      setSources([])
      setResolvedTitle('')
      setErrorMessage('')
    }
  }

  async function openThought(thought) {
    setActiveThoughtId(thought.id)
    await loadSources(normalizeTitle(thought.text), mode)
  }

  async function handleModeChange(nextMode) {
    if (nextMode === mode) {
      return
    }
    setMode(nextMode)
    if (!activeThought) {
      return
    }
    await loadSources(normalizeTitle(activeThought.text), nextMode)
  }

  function dismissActiveThought() {
    if (!activeThoughtId) {
      return
    }
    removeThought(activeThoughtId)
  }

  function closePanelKeepThought() {
    setActiveThoughtId(null)
    setSources([])
    setResolvedTitle('')
    setErrorMessage('')
  }

  return (
    <div className="app">
      <header className="top-bar">
        <h1>Ooh Shelf</h1>
        <p>Capture fleeting curiosities. Explore them later with real sources.</p>
      </header>

      <main className="layout">
        <section className="pile-panel">
          <ThoughtInput
            input={input}
            onInputChange={setInput}
            onSubmit={addThought}
            inputRef={inputRef}
          />
          <ThoughtPile thoughts={thoughts} onOpenThought={openThought} onRemoveThought={removeThought} />
        </section>
        <SourcePanel
          activeThought={activeThought}
          mode={mode}
          isLoading={isLoading}
          errorMessage={errorMessage}
          sources={sources}
          resolvedTitle={resolvedTitle}
          onModeChange={handleModeChange}
          onDismiss={dismissActiveThought}
          onKeep={closePanelKeepThought}
        />
      </main>
    </div>
  )
}

export default App
