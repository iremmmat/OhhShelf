import { fallbackMessage, normalizeTitle } from '../lib/sourcing'

function SourcePanel({
  activeThought,
  mode,
  isLoading,
  errorMessage,
  sources,
  resolvedTitle,
  onModeChange,
  onDismiss,
  onKeep,
}) {
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
            <a
              href={`https://en.wikipedia.org/wiki/${normalizeTitle(activeThought.text)}`}
              target="_blank"
              rel="noreferrer"
            >
              Wikipedia
            </a>
            <a
              href={`https://www.britannica.com/search?query=${encodeURIComponent(activeThought.text)}`}
              target="_blank"
              rel="noreferrer"
            >
              Britannica
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(activeThought.text)}`}
              target="_blank"
              rel="noreferrer"
            >
              Google
            </a>
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
        </>
      )}

      {activeThought && (
        <div className="panel-actions">
          <button type="button" className="danger" onClick={onDismiss}>
            Mark explored
          </button>
          <button type="button" onClick={onKeep}>
            Keep in pile
          </button>
        </div>
      )}
    </section>
  )
}

export default SourcePanel
