import React from 'react'
import { fallbackMessage, normalizeTitle } from '../lib/sourcing'
import { getLanguage, t } from '../lib/i18n'

// --- YENİ: Metin içi [1] referanslarını linke dönüştüren yardımcı bileşen ---
function SourcedText({ text, citations }) {
  if (!citations || citations.length === 0) return <span>{text}</span>;

  // [1], [2] gibi yapıları yakalamak için Regex kullanıyoruz
  const parts = text.split(/(\[\d+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
          const citeIndex = parseInt(match[1], 10) - 1; // [1] -> citations[0]
          const url = citations[citeIndex];
          if (url) {
            return (
              <a 
                key={i} 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="citation-link" 
                title={url}
                style={{ 
                  color: '#2563eb', 
                  textDecoration: 'none', 
                  fontSize: '0.85em', 
                  verticalAlign: 'super',
                  margin: '0 2px'
                }}
              >
                {part}
              </a>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

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
          label: 'Google Scholar',
          href: `https://scholar.google.com/scholar?q=${encodeURIComponent(activeThought.text)}`,
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

      {activeThought && isLoading && <p className="placeholder">{t('loading')} (Yapay zeka kaynakları tarıyor...)</p>}

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
          <p className="matched-title">{t('matched')}: {resolvedTitle}</p>
          <div className="source-list">
            {sources.map((source, index) => (
              <article className="source-block" key={`source-${index}`}>
                <div className="source-excerpt">
                  {source.excerpt.split('\n\n').map((paragraph, paragraphIndex) => (
                    <p key={`para-${paragraphIndex}`}>
                      {/* YENİ: Paragrafları SourcedText bileşeninden geçiriyoruz */}
                      <SourcedText text={paragraph} citations={source.citations} />
                    </p>
                  ))}
                </div>
                
                {/* YENİ: Eğer yapay zeka çoklu kaynak döndürdüyse listele, yoksa eski tekil URL'yi göster */}
                {source.citations && source.citations.length > 0 ? (
                  <div className="attribution" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Kullanılan Kaynaklar:</p>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#4b5563' }}>
                      {source.citations.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                            {new URL(url).hostname.replace('www.', '')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  source.url !== '#' && (
                    <p className="attribution">
                      {t('source')}: <strong>{source.name}</strong> -{' '}
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.url}
                      </a>
                    </p>
                  )
                )}
              </article>
            ))}
          </div>

          {deeperTopics.length > 0 && (
            <section className="deeper-topics">
              <h3>{t('diveDeeper')}</h3>
              <p>{t('addFollowUp')}</p>
              <div className="deeper-topic-list">
                {deeperTopics.map((topic, index) => {
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