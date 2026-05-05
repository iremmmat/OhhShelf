import { useState, useEffect } from 'react'
import { STORAGE_KEY, JOURNAL_KEY, FOLLOWUPS_KEY, REPORT_KEY } from '../lib/constants'
import { t } from '../lib/i18n'

function MonthlyReport({ isOpen, onClose }) {
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    if (isOpen) {
      generateReport()
    }
  }, [isOpen])

  function generateReport() {
    try {
      const thoughts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const journal = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]')
      const followups = JSON.parse(localStorage.getItem(FOLLOWUPS_KEY) || '[]')
      
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      // Filter for current month data
      const monthlyThoughts = thoughts.filter(thought => {
        const thoughtDate = new Date(thought.createdAt)
        return thoughtDate.getMonth() === currentMonth && thoughtDate.getFullYear() === currentYear
      })
      
      const monthlyJournal = journal.filter(entry => {
        const entryDate = new Date(entry.timestamp)
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
      })
      
      const monthlyFollowups = followups.filter(followup => {
        const followupDate = new Date(followup.timestamp)
        return followupDate.getMonth() === currentMonth && followupDate.getFullYear() === currentYear
      })

      // Calculate stats
      const totalCaptured = monthlyThoughts.length
      const totalExplored = monthlyJournal.length
      
      // Extract topic themes (simplified - just use first 2-3 words of each thought)
      const topicThemes = {}
      monthlyThoughts.forEach(thought => {
        const words = thought.text.split(' ').slice(0, 3).join(' ').toLowerCase()
        topicThemes[words] = (topicThemes[words] || 0) + 1
      })
      
      const commonTopics = Object.entries(topicThemes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }))

      // Sources breakdown
      const sourcesBreakdown = {}
      monthlyJournal.forEach(entry => {
        sourcesBreakdown[entry.whereHeard] = (sourcesBreakdown[entry.whereHeard] || 0) + 1
      })

      // Knowledge-to-action ratio
      const actionOrientedEntries = monthlyJournal.filter(entry => 
        ['workProject', 'creativeIdea', 'personalDecision'].includes(entry.howUse)
      )
      const relatedFollowups = monthlyFollowups.filter(followup => 
        actionOrientedEntries.some(entry => entry.thoughtId === followup.thoughtId)
      )
      
      const knowledgeToActionRatio = actionOrientedEntries.length > 0 
        ? Math.round((relatedFollowups.length / actionOrientedEntries.length) * 100)
        : 0

      setReportData({
        totalCaptured,
        totalExplored,
        commonTopics,
        sourcesBreakdown,
        knowledgeToActionRatio,
        monthYear: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })

      // Mark this report as shown for this month
      const reportKey = `report-${currentYear}-${currentMonth}`
      localStorage.setItem(REPORT_KEY, JSON.stringify({ [reportKey]: true }))

    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  if (!isOpen || !reportData) return null

  return (
    <div className="monthly-report-overlay">
      <div className="monthly-report-sheet">
        <div className="report-header">
          <h2>{t('reportTitle')} - {reportData.monthYear}</h2>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="report-content">
          <div className="report-section">
            <h3>{t('totalCaptured')} vs {t('totalExplored')}</h3>
            <div className="stats-comparison">
              <div className="stat-item">
                <span className="stat-number">{reportData.totalCaptured}</span>
                <span className="stat-label">{t('totalCaptured')}</span>
              </div>
              <div className="stat-separator">vs</div>
              <div className="stat-item">
                <span className="stat-number">{reportData.totalExplored}</span>
                <span className="stat-label">{t('totalExplored')}</span>
              </div>
            </div>
          </div>

          {reportData.commonTopics.length > 0 && (
            <div className="report-section">
              <h3>{t('commonTopics')}</h3>
              <div className="topic-list">
                {reportData.commonTopics.map((item, index) => (
                  <div key={index} className="topic-item">
                    <span className="topic-text">{item.topic}</span>
                    <span className="topic-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(reportData.sourcesBreakdown).length > 0 && (
            <div className="report-section">
              <h3>{t('sourcesBreakdown')}</h3>
              <div className="source-list">
                {Object.entries(reportData.sourcesBreakdown).map(([source, count]) => (
                  <div key={source} className="source-item">
                    <span className="source-text">{t(source) || source}</span>
                    <span className="source-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData.knowledgeToActionRatio > 0 && (
            <div className="report-section">
              <h3>{t('knowledgeToAction')}</h3>
              <div className="ratio-display">
                <span className="ratio-number">{reportData.knowledgeToActionRatio}%</span>
                <span className="ratio-label">of actionable curiosities were followed up</span>
              </div>
            </div>
          )}
        </div>

        <div className="report-actions">
          <button type="button" className="button-primary" onClick={onClose}>
            {t('dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Function to check if monthly report should be shown
export function checkForMonthlyReport() {
  try {
    const thoughts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const journal = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]')
    const reportShown = JSON.parse(localStorage.getItem(REPORT_KEY) || '{}')
    
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const reportKey = `report-${currentYear}-${currentMonth}`
    
    // Check if report has already been shown this month
    if (reportShown[reportKey]) {
      return false
    }
    
    // Check if we have at least 5 explored thoughts
    const currentMonthJournal = journal.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear
    })
    
    return currentMonthJournal.length >= 5
    
  } catch (error) {
    console.error('Error checking monthly report:', error)
    return false
  }
}

export default MonthlyReport
