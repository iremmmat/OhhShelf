import { useState } from 'react'
import { FOLLOWUPS_KEY, JOURNAL_KEY } from '../lib/constants'
import { t } from '../lib/i18n'

function FollowUpPrompt({ isOpen, onClose, thoughtText, thoughtId }) {
  const [selectedResponse, setSelectedResponse] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    
    const followUpEntry = {
      thoughtId,
      thoughtText,
      response: selectedResponse,
      timestamp: Date.now(),
      originalJournalTimestamp: Date.now() - (7 * 24 * 60 * 60 * 1000) // Approximate 7 days ago
    }

    // Save to localStorage
    try {
      const existing = localStorage.getItem(FOLLOWUPS_KEY)
      const followups = existing ? JSON.parse(existing) : []
      followups.push(followUpEntry)
      localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(followups))
    } catch (error) {
      console.error('Failed to save follow-up:', error)
    }

    // Mark this follow-up as shown to prevent showing again
    try {
      const shownFollowups = localStorage.getItem('ooh-shelf-followups-shown')
      const shown = shownFollowups ? JSON.parse(shownFollowups) : []
      shown.push(thoughtId)
      localStorage.setItem('ooh-shelf-followups-shown', JSON.stringify(shown))
    } catch (error) {
      console.error('Failed to mark follow-up as shown:', error)
    }

    onClose()
  }

  function handleDismiss() {
    // Mark as shown even if dismissed
    try {
      const shownFollowups = localStorage.getItem('ooh-shelf-followups-shown')
      const shown = shownFollowups ? JSON.parse(shownFollowups) : []
      shown.push(thoughtId)
      localStorage.setItem('ooh-shelf-followups-shown', JSON.stringify(shown))
    } catch (error) {
      console.error('Failed to mark follow-up as shown:', error)
    }
    
    onClose()
  }

  if (!isOpen || !thoughtText) return null

  return (
    <div className="followup-overlay">
      <div className="followup-prompt">
        <div className="followup-header">
          <h3>{t('followupTitle')}</h3>
          <button type="button" className="close-button" onClick={handleDismiss}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="followup-form">
          <p className="followup-question">
            {t('followupQuestion')} <strong>{thoughtText}</strong>?
          </p>
          
          <div className="response-options">
            <label>
              <input
                type="radio"
                name="response"
                value="yesApplied"
                checked={selectedResponse === 'yesApplied'}
                onChange={(e) => setSelectedResponse(e.target.value)}
                required
              />
              {t('yesApplied')}
            </label>
            <label>
              <input
                type="radio"
                name="response"
                value="notYet"
                checked={selectedResponse === 'notYet'}
                onChange={(e) => setSelectedResponse(e.target.value)}
              />
              {t('notYet')}
            </label>
            <label>
              <input
                type="radio"
                name="response"
                value="decidedNot"
                checked={selectedResponse === 'decidedNot'}
                onChange={(e) => setSelectedResponse(e.target.value)}
              />
              {t('decidedNot')}
            </label>
            <label>
              <input
                type="radio"
                name="response"
                value="forgot"
                checked={selectedResponse === 'forgot'}
                onChange={(e) => setSelectedResponse(e.target.value)}
              />
              {t('forgot')}
            </label>
          </div>

          <div className="followup-actions">
            <button type="button" className="button-secondary" onClick={handleDismiss}>
              {t('dismiss')}
            </button>
            <button type="submit" className="button-primary" disabled={!selectedResponse}>
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Function to check for follow-ups that should be shown
export function checkForFollowUps() {
  try {
    const journalEntries = localStorage.getItem(JOURNAL_KEY)
    const shownFollowups = localStorage.getItem('ooh-shelf-followups-shown')
    
    if (!journalEntries) return null
    
    const journal = JSON.parse(journalEntries)
    const shown = shownFollowups ? JSON.parse(shownFollowups) : []
    
    const now = Date.now()
    const sevenDaysAgo = 7 * 24 * 60 * 60 * 1000
    
    // Find journal entries from 7+ days ago that haven't been shown as follow-ups
    // and have work/project, creative idea, or personal decision tags
    for (const entry of journal) {
      const age = now - entry.timestamp
      const isOldEnough = age >= sevenDaysAgo
      const notShown = !shown.includes(entry.thoughtId)
      const needsFollowUp = ['workProject', 'creativeIdea', 'personalDecision'].includes(entry.howUse)
      
      if (isOldEnough && notShown && needsFollowUp) {
        return {
          thoughtId: entry.thoughtId,
          thoughtText: entry.thoughtText
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error checking follow-ups:', error)
    return null
  }
}

export default FollowUpPrompt
