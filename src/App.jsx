import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import SourcePanel from './components/SourcePanel'
import ThoughtInput from './components/ThoughtInput'
import ThoughtPile from './components/ThoughtPile'
import LanguageToggle from './components/LanguageToggle'
import CuriosityJournal from './components/CuriosityJournal'
import FollowUpPrompt, { checkForFollowUps } from './components/FollowUpPrompt'
import MonthlyReport, { checkForMonthlyReport } from './components/MonthlyReport'
import { MAX_THOUGHT_LENGTH } from './lib/constants'
import {
  fallbackMessage,
  fetchArticle,
  fetchBriefSource,
  fetchDeeperTopicSuggestions,
  fetchFallbackSources,
  fetchFullSource,
  fetchOfficialWebsiteSource,
  normalizeTitle,
} from './lib/sourcing'
import { loadStoredThoughts, persistThoughts } from './lib/storage'
import { getLanguage, t } from './lib/i18n'

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
  const [deeperTopics, setDeeperTopics] = useState([])
  const [journalOpen, setJournalOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpThought, setFollowUpThought] = useState(null)
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false)
  const inputRef = useRef(null)
  const currentLang = getLanguage()

  useEffect(() => {
    persistThoughts(thoughts)
  }, [thoughts])

  useEffect(() => {
    // Check for follow-ups on app load
    const followUp = checkForFollowUps()
    if (followUp) {
      setFollowUpThought(followUp)
      setFollowUpOpen(true)
    }
    
    // Check for monthly report
    const shouldShowReport = checkForMonthlyReport()
    if (shouldShowReport) {
      setMonthlyReportOpen(true)
    }
  }, [])

  const activeThought = useMemo(
    () => thoughts.find((thought) => thought.id === activeThoughtId) ?? null,
    [thoughts, activeThoughtId],
  )

  async function loadSources(thoughtText, selectedMode) {
    const displayTopic = thoughtText.replace(/_/g, ' ')
    setIsLoading(true)
    setErrorMessage('')
    setSources([])
    setDeeperTopics([])
  
    try {
      // Resolve the article once — get back title, language, content
      const article = await fetchArticle(displayTopic, currentLang)
  
      if (article.showingFallbackLanguage) {
        const langName = currentLang === 'fr' ? 'French' : 'Turkish'
        setErrorMessage(t('articleNotAvailable').replace('{lang}', langName))
      }
  
      setResolvedTitle(article.title)
  
      // Fetch content using the resolved title + language (no second lookup)
      const mainSource = selectedMode === 'full'
        ? await fetchFullSource(article.title, article.language)
        : await fetchBriefSource(article.title, article.language)
  
      // Try official website (optional, silent fail)
      const officialSource = await fetchOfficialWebsiteSource(article.title, article.language)
  
      setSources(officialSource ? [mainSource, officialSource] : [mainSource])
  
      // Dive deeper uses the same resolved title + language
      const suggestions = await fetchDeeperTopicSuggestions(article.title, article.language)
      setDeeperTopics(suggestions)
  
    } catch (error) {
      const fallbackSources = await fetchFallbackSources(displayTopic)
      if (fallbackSources.length > 0) {
        setResolvedTitle(`Results for ${displayTopic}`)
        setSources(fallbackSources)
        setDeeperTopics(getTemplateSuggestions(displayTopic))
      } else {
        setErrorMessage(error.message || fallbackMessage())
      }
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
    setJournalOpen(true)
  }

  function handleJournalSave(journalEntry) {
    // The journal entry is already saved in the component
    // Now remove the thought
    removeThought(activeThoughtId)
  }

  function handleJournalSkip() {
    // User skipped journal, just remove the thought
    removeThought(activeThoughtId)
  }

  function handleMonthlyReportClose() {
    setMonthlyReportOpen(false)
  }

  function addSuggestedTopic(topic) {
    const value = topic.trim().slice(0, MAX_THOUGHT_LENGTH)
    if (!value) {
      return
    }

    const exists = thoughts.some((thought) => thought.text.toLowerCase() === value.toLowerCase())
    if (exists) {
      return
    }

    setThoughts((previous) => [createThought(value), ...previous])
  }

  function closePanelKeepThought() {
    setActiveThoughtId(null)
    setSources([])
    setDeeperTopics([])
    setResolvedTitle('')
    setErrorMessage('')
  }

  function handleFollowUpClose() {
    setFollowUpOpen(false)
    setFollowUpThought(null)
  }

  return (
    <div className="app-shell">
      <aside className="left-shell">
        <header className="top-bar">
          <h1>{t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
          <LanguageToggle />
        </header>
      </aside>

      <div className="app">
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
            deeperTopics={deeperTopics}
            resolvedTitle={resolvedTitle}
            onModeChange={handleModeChange}
            onAddSuggestedTopic={addSuggestedTopic}
            onDismiss={dismissActiveThought}
            onKeep={closePanelKeepThought}
          />
        </main>
      </div>
      
      <CuriosityJournal
        thought={activeThought}
        isOpen={journalOpen}
        onClose={handleJournalSkip}
        onSave={handleJournalSave}
      />
      
      <FollowUpPrompt
        isOpen={followUpOpen}
        onClose={handleFollowUpClose}
        thoughtText={followUpThought?.thoughtText}
        thoughtId={followUpThought?.thoughtId}
      />
      
      <MonthlyReport
        isOpen={monthlyReportOpen}
        onClose={handleMonthlyReportClose}
      />
    </div>
  )
}

export default App
