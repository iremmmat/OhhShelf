import { useState } from 'react'
import { JOURNAL_KEY } from '../lib/constants'
import { t } from '../lib/i18n'

function CuriosityJournal({ thought, isOpen, onClose, onSave }) {
  const [whereHeard, setWhereHeard] = useState('')
  const [howUse, setHowUse] = useState('')
  const [learned, setLearned] = useState('')
  const [notes, setNotes] = useState('')
  const [otherWhereHeard, setOtherWhereHeard] = useState('')
  const [otherHowUse, setOtherHowUse] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    
    const journalEntry = {
      thoughtId: thought.id,
      thoughtText: thought.text,
      timestamp: Date.now(),
      whereHeard: whereHeard === 'other' ? otherWhereHeard : whereHeard,
      howUse: howUse === 'other' ? otherHowUse : howUse,
      learned,
      notes
    }

    // Save to localStorage
    try {
      const existing = localStorage.getItem(JOURNAL_KEY)
      const journal = existing ? JSON.parse(existing) : []
      journal.push(journalEntry)
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal))
    } catch (error) {
      console.error('Failed to save journal entry:', error)
    }

    onSave(journalEntry)
    onClose()
    
    // Reset form
    setWhereHeard('')
    setHowUse('')
    setLearned('')
    setNotes('')
    setOtherWhereHeard('')
    setOtherHowUse('')
  }

  function handleSkip() {
    onClose()
    // Reset form
    setWhereHeard('')
    setHowUse('')
    setLearned('')
    setNotes('')
    setOtherWhereHeard('')
    setOtherHowUse('')
  }

  if (!isOpen || !thought) return null

  return (
    <div className="curiosity-journal-overlay">
      <div className="curiosity-journal-sheet">
        <div className="journal-header">
          <h3>{t('journalTitle')}</h3>
          <button type="button" className="close-button" onClick={handleSkip}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="journal-form">
          <div className="journal-field">
            <label>{t('whereHeard')}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="socialMedia"
                  checked={whereHeard === 'socialMedia'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('socialMedia')}
              </label>
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="friendFamily"
                  checked={whereHeard === 'friendFamily'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('friendFamily')}
              </label>
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="bookArticle"
                  checked={whereHeard === 'bookArticle'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('bookArticle')}
              </label>
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="podcast"
                  checked={whereHeard === 'podcast'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('podcast')}
              </label>
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="justThought"
                  checked={whereHeard === 'justThought'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('justThought')}
              </label>
              <label>
                <input
                  type="radio"
                  name="whereHeard"
                  value="other"
                  checked={whereHeard === 'other'}
                  onChange={(e) => setWhereHeard(e.target.value)}
                />
                {t('other')}
              </label>
            </div>
            {whereHeard === 'other' && (
              <input
                type="text"
                value={otherWhereHeard}
                onChange={(e) => setOtherWhereHeard(e.target.value)}
                placeholder={t('other')}
                className="other-input"
              />
            )}
          </div>

          <div className="journal-field">
            <label>{t('howUse')}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="justCurious"
                  checked={howUse === 'justCurious'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('justCurious')}
              </label>
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="workProject"
                  checked={howUse === 'workProject'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('workProject')}
              </label>
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="creativeIdea"
                  checked={howUse === 'creativeIdea'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('creativeIdea')}
              </label>
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="teaching"
                  checked={howUse === 'teaching'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('teaching')}
              </label>
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="personalDecision"
                  checked={howUse === 'personalDecision'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('personalDecision')}
              </label>
              <label>
                <input
                  type="radio"
                  name="howUse"
                  value="other"
                  checked={howUse === 'other'}
                  onChange={(e) => setHowUse(e.target.value)}
                />
                {t('other')}
              </label>
            </div>
            {howUse === 'other' && (
              <input
                type="text"
                value={otherHowUse}
                onChange={(e) => setOtherHowUse(e.target.value)}
                placeholder={t('other')}
                className="other-input"
              />
            )}
          </div>

          <div className="journal-field">
            <label>{t('learned')}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="learned"
                  value="yesGotIt"
                  checked={learned === 'yesGotIt'}
                  onChange={(e) => setLearned(e.target.value)}
                />
                {t('yesGotIt')}
              </label>
              <label>
                <input
                  type="radio"
                  name="learned"
                  value="partially"
                  checked={learned === 'partially'}
                  onChange={(e) => setLearned(e.target.value)}
                />
                {t('partially')}
              </label>
              <label>
                <input
                  type="radio"
                  name="learned"
                  value="needRevisit"
                  checked={learned === 'needRevisit'}
                  onChange={(e) => setLearned(e.target.value)}
                />
                {t('needRevisit')}
              </label>
              <label>
                <input
                  type="radio"
                  name="learned"
                  value="moreConfused"
                  checked={learned === 'moreConfused'}
                  onChange={(e) => setLearned(e.target.value)}
                />
                {t('moreConfused')}
              </label>
            </div>
          </div>

          <div className="journal-field">
            <label>{t('notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notes')}
              rows={3}
            />
          </div>

          <div className="journal-actions">
            <button type="button" className="button-secondary" onClick={handleSkip}>
              {t('skip')}
            </button>
            <button type="submit" className="button-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CuriosityJournal
