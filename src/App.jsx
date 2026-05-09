import './App.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { t, getLanguage } from './lib/i18n';
import { 
  fetchArticle, 
  fetchBriefSource, 
  fetchFullSource, 
  fetchOfficialWebsiteSource, 
  fetchDeeperTopicSuggestions, 
  fetchFallbackSources, 
  fallbackMessage, 
  normalizeTitle 
} from './lib/sourcing';

import ThoughtInput from './components/ThoughtInput';
import ThoughtPile from './components/ThoughtPile';
import SourcePanel from './components/SourcePanel';
import CuriosityJournal from './components/CuriosityJournal';
import LanguageToggle from './components/LanguageToggle';
import Shelf from './components/Shelf';
import FollowUpPrompt from './components/FollowUpPrompt';
import MonthlyReport from './components/MonthlyReport';

// --- YENİ: FIREBASE BAĞLANTILARI ---
import { db } from './lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- HELPER FUNCTIONS ---
const MAX_THOUGHT_LENGTH = 150;

function checkForFollowUps() { return null; }
function checkForMonthlyReport() { return false; }
function getTemplateSuggestions(topic) {
  return [`More about ${topic}`, `History of ${topic}`];
}
// --------------------------------------------------------------------------

function App() {
  const [input, setInput] = useState('');
  const [activeThoughtId, setActiveThoughtId] = useState(null);
  const [mode, setMode] = useState('brief');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedTitle, setResolvedTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sources, setSources] = useState([]);
  const [deeperTopics, setDeeperTopics] = useState([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [isShelfOpen, setIsShelfOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpThought, setFollowUpThought] = useState(null);
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const inputRef = useRef(null);
  const currentLang = getLanguage();

  // Hafızayı boş başlatıyoruz, veriler artık buluttan gelecek
  const [thoughts, setThoughts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  // --- CLOUD SYNC: GERÇEK ZAMANLI VERİ DİNLEME ---
  useEffect(() => {
    // Düşünceleri (Yığın) dinle
    const qThoughts = query(collection(db, 'thoughts'), orderBy('date', 'desc'));
    const unsubscribeThoughts = onSnapshot(qThoughts, (snapshot) => {
      const thoughtsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThoughts(thoughtsData);
    });

    // Günlükleri (Raf) dinle
    const qJournal = query(collection(db, 'journal'), orderBy('date', 'desc'));
    const unsubscribeJournal = onSnapshot(qJournal, (snapshot) => {
      const journalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJournalEntries(journalData);
    });

    // Uygulama kapandığında dinlemeyi durdur
    return () => {
      unsubscribeThoughts();
      unsubscribeJournal();
    };
  }, []);

  useEffect(() => {
    const followUp = checkForFollowUps();
    if (followUp) {
      setFollowUpThought(followUp);
      setFollowUpOpen(true);
    }
    const shouldShowReport = checkForMonthlyReport();
    if (shouldShowReport) {
      setMonthlyReportOpen(true);
    }
  }, []);

  const activeThought = useMemo(
    () => thoughts.find((t) => t.id === activeThoughtId) ?? null,
    [thoughts, activeThoughtId],
  );

  async function loadSources(thoughtText, selectedMode) {
    const displayTopic = thoughtText.replace(/_/g, ' ');
    setIsLoading(true);
    setErrorMessage('');
    setSources([]);
    setDeeperTopics([]);
  
    try {
      const article = await fetchArticle(displayTopic, currentLang);
  
      if (article.showingFallbackLanguage) {
        const langName = currentLang === 'fr' ? 'French' : 'Turkish';
        setErrorMessage(t('articleNotAvailable').replace('{lang}', langName));
      }
  
      setResolvedTitle(article.title);
  
      const mainSource = selectedMode === 'full'
        ? await fetchFullSource(article.title, article.language)
        : await fetchBriefSource(article.title, article.language);
  
      const officialSource = await fetchOfficialWebsiteSource(article.title, article.language);
      setSources(officialSource ? [mainSource, officialSource] : [mainSource]);
  
      const suggestions = await fetchDeeperTopicSuggestions(article.title, article.language);
      setDeeperTopics(suggestions);
  
    } catch (error) {
      const fallbackSources = await fetchFallbackSources(displayTopic);
      if (fallbackSources.length > 0) {
        setResolvedTitle(`Results for ${displayTopic}`);
        setSources(fallbackSources);
        setDeeperTopics(getTemplateSuggestions(displayTopic));
      } else {
        setErrorMessage(error.message || fallbackMessage());
      }
    } finally {
      setIsLoading(false);
    }
  }

  // --- FIREBASE VERİ EKLEME/SİLME İŞLEMLERİ ---
  async function addThought(event) {
    event.preventDefault();
    if (input.trim().length === 0) return;
    const value = input.trim().slice(0, MAX_THOUGHT_LENGTH);
    
    await addDoc(collection(db, 'thoughts'), {
      text: value,
      date: Date.now()
    });
    
    setInput('');
    inputRef.current?.focus();
  }

  async function removeThought(id) {
    await deleteDoc(doc(db, 'thoughts', id));
    if (activeThoughtId === id) {
      setActiveThoughtId(null);
      setSources([]);
      setResolvedTitle('');
      setErrorMessage('');
    }
  }

  async function openThought(thought) {
    setActiveThoughtId(thought.id);
    await loadSources(normalizeTitle(thought.text), mode);
    if (window.innerWidth <= 768) setIsMobileMenuOpen(false);
  }

  async function handleModeChange(nextMode) {
    if (nextMode === mode || !activeThought) return;
    setMode(nextMode);
    await loadSources(normalizeTitle(activeThought.text), nextMode);
  }

  function dismissActiveThought() {
    if (activeThoughtId) setJournalOpen(true);
  }

  async function handleJournalSave(journalEntry) {
    const entryWithDate = { ...journalEntry, date: Date.now() };
    await addDoc(collection(db, 'journal'), entryWithDate);
    await removeThought(activeThoughtId);
    setJournalOpen(false);
  }

  function handleJournalSkip() {
    removeThought(activeThoughtId);
    setJournalOpen(false);
  }

  async function addSuggestedTopic(topic) {
    const value = topic.trim().slice(0, MAX_THOUGHT_LENGTH);
    if (!value || thoughts.some(t => t.text.toLowerCase() === value.toLowerCase())) return;
    
    await addDoc(collection(db, 'thoughts'), {
      text: value,
      date: Date.now()
    });
  }

  function closePanelKeepThought() {
    setActiveThoughtId(null);
    setSources([]);
    setDeeperTopics([]);
    setResolvedTitle('');
    setErrorMessage('');
  }

  return (
    <div className="app-shell">
      
      <div className="mobile-header">
        <img src="/logo.png" alt="OohShelf Logo" style={{ width: '140px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          ☰
        </button>
      </div>

      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1999 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`left-shell ${isMobileMenuOpen ? 'open' : ''}`}>
        <header className="top-bar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>✕</button>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '10px 0' }}>
            <img src="/logo.png" alt="OohShelf Logo" style={{ width: '220px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>

          <LanguageToggle />
          
          <button 
            onClick={() => {
              setIsShelfOpen(true);
              setIsMobileMenuOpen(false); 
            }}
            style={{
              padding: '12px 16px', backgroundColor: '#C96F35', color: '#ffffff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
              width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', boxShadow: '0 4px 12px rgba(201, 111, 53, 0.35)',
              transition: 'transform 0.2s'
            }}
          >
            <span style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
              </svg>
              {t('myShelf') || 'My Shelf'}
            </span>
            <span style={{ backgroundColor: '#ffffff', color: '#C96F35', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
              {journalEntries.length}
            </span>
          </button>
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
      
      {isShelfOpen && (
        <Shelf 
          entries={journalEntries} 
          onClose={() => setIsShelfOpen(false)} 
        />
      )}
      
      <CuriosityJournal
        thought={activeThought}
        isOpen={journalOpen}
        onClose={handleJournalSkip}
        onSave={handleJournalSave}
      />
      
      <FollowUpPrompt
        isOpen={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        thoughtText={followUpThought?.thoughtText}
        thoughtId={followUpThought?.thoughtId}
      />
      
      <MonthlyReport
        isOpen={monthlyReportOpen}
        onClose={() => setMonthlyReportOpen(false)}
      />
    </div>
  );
}

export default App;