import { fallbackMessage, normalizeTitle } from '../lib/sourcing'
import { getLanguage, t } from '../lib/i18n'

function SourcePanel({
  activeThought,
  mode,
  isLoading,
  errorMessage,
  sources,
  deeperTopics,
  resolvedTitle,
  onModeChange,
  onAddSuggestedTopic,
  onDismiss,
  onKeep,
}) {
  const currentLang = getLanguage()
  const externalSources = activeThought
    ? [
        {
          label: 'Wikipedia',
          href: `https://${currentLang}.wikipedia.org/wiki/${normalizeTitle(activeThought.text)}`,
        },
        {
          label: 'Wikidata',
          href: `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(activeThought.text)}`,
        },
        {
          label: 'Britannica',
          href: `https://www.britannica.com/search?query=${encodeURIComponent(activeThought.text)}`,
        },
        {
          label: 'Stanford Encyclopedia',
          href: `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(activeThought.text)}`,
        },
        {
          label: 'Google Scholar',
          href: `https://scholar.google.com/scholar?q=${encodeURIComponent(activeThought.text)}`,
        },
        {
          label: 'Google',
          href: `https://www.google.com/search?q=${encodeURIComponent(activeThought.text)}`,
        },
      ]
    : []

  return (
    <section className="source-panel">
      <div className="panel-header">
        <h2>{activeThought ? activeThought.text : t('placeholder')}</h2>
        <div className="mode-toggle" role="group" aria-label="Content mode">
          <button
            type="button"
            className={mode === 'brief' ? 'active' : ''}
            onClick={() => onModeChange('brief')}
          >
            {t('brief')}
          </button>
          <button
            type="button"
            className={mode === 'full' ? 'active' : ''}
            onClick={() => onModeChange('full')}
          >
            {t('full')}
          </button>
        </div>
      </div>

      {!activeThought && <p className="placeholder">{t('placeholder')}</p>}

      {activeThought && isLoading && <p className="placeholder">{t('loading')}</p>}

      {activeThought && !isLoading && errorMessage && (
        <div className="error-box">
          <p>{errorMessage || fallbackMessage()}</p>
          <div className="fallback-links">
            {externalSources.map((source) => (
              <a key={source.label} href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {activeThought && !isLoading && sources.length > 0 && (
        <>
          <p className="matched-title">{t('matched')}: {resolvedTitle} - {t('wikipedia')}</p>
          <div className="source-list">
            {sources.map((source) => (
              <article className="source-block" key={`${source.name}-${source.url}`}>
                <div className="source-excerpt">
                  {source.excerpt.split('\n\n').map((paragraph, paragraphIndex) => (
                    <p key={`${source.url}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>
                <p className="attribution">
                  {t('source')}: <strong>{source.name}</strong> -{' '}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                </p>
              </article>
            ))}
          </div>

          {deeperTopics.length > 0 && (
            <section className="deeper-topics">
              <h3>{t('diveDeeper')}</h3>
              <p>{t('addFollowUp')}</p>
              <div className="deeper-topic-list">
                {deeperTopics.map((topic, index) => {
                  // Check if this is the last item and contains the Wikipedia link text
                  const isWikipediaLink = index === deeperTopics.length - 1 && 
                    (topic.includes('Read full article') || topic.includes('Lire l\'article') || topic.includes('Wikipedia\'da makale'))
                  
                  if (isWikipediaLink) {
                    const currentLang = getLanguage()
                    const articleTitle = activeThought?.text
                    const wikipediaUrl = `https://${currentLang}.wikipedia.org/wiki/${normalizeTitle(articleTitle)}`
                    return (
                      <a key={topic} href={wikipediaUrl} target="_blank" rel="noreferrer" className="wikipedia-link">
                        {topic}
                      </a>
                    )
                  }
                  // Regular section button or template suggestion
                  return (
                    <button type="button" key={topic} onClick={() => onAddSuggestedTopic(topic)}>
                      + {topic}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {activeThought && (
        <div className="panel-actions">
          <button type="button" className="danger" onClick={onDismiss}>
            {t('markExplored')}
          </button>
          <button type="button" className="button-secondary" onClick={onKeep}>
            {t('keepInPile')}
          </button>
        </div>
      )}
    </section>
  )
}

export default SourcePanel
