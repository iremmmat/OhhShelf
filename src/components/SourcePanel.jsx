import { fallbackMessage, normalizeTitle } from '../lib/sourcing'

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
  const externalSources = activeThought
    ? [
        {
          label: 'Wikipedia',
          href: `https://en.wikipedia.org/wiki/${normalizeTitle(activeThought.text)}`,
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
        <h2>{activeThought ? activeThought.text : 'Select a thought to explore'}</h2>
        <div className="mode-toggle" role="group" aria-label="Content mode">
          <button
            type="button"
            className={mode === 'brief' ? 'active' : ''}
            onClick={() => onModeChange('brief')}
          >
            Brief
          </button>
          <button
            type="button"
            className={mode === 'full' ? 'active' : ''}
            onClick={() => onModeChange('full')}
          >
            Full
          </button>
        </div>
      </div>

      {!activeThought && <p className="placeholder">Tap any thought tag to load attributed content.</p>}

      {activeThought && isLoading && <p className="placeholder">Fetching sourced content...</p>}

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
          <p className="matched-title">Matched: {resolvedTitle} - Wikipedia</p>
          <div className="source-list">
            {sources.map((source) => (
              <article className="source-block" key={`${source.name}-${source.url}`}>
                {source.excerpt.split('\n\n').map((paragraph, paragraphIndex) => (
                  <p key={`${source.url}-${paragraphIndex}`}>{paragraph}</p>
                ))}
                <p className="attribution">
                  Source: <strong>{source.name}</strong> -{' '}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                </p>
              </article>
            ))}
          </div>

          {deeperTopics.length > 0 && (
            <section className="deeper-topics">
              <h3>Dive deeper</h3>
              <p>Add a follow-up curiosity to your pile:</p>
              <div className="deeper-topic-list">
                {deeperTopics.map((topic) => (
                  <button type="button" key={topic} onClick={() => onAddSuggestedTopic(topic)}>
                    + {topic}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeThought && (
        <div className="panel-actions">
          <button type="button" className="danger" onClick={onDismiss}>
            Mark explored
          </button>
          <button type="button" className="button-secondary" onClick={onKeep}>
            Keep in pile
          </button>
        </div>
      )}
    </section>
  )
}

export default SourcePanel
