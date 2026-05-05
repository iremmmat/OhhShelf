import { t } from '../lib/i18n'

function ThoughtPile({ thoughts, onOpenThought, onRemoveThought }) {
  return (
    <>
      <div className="pile-header">
        <h2>{t('thePile')}</h2>
        <span>{thoughts.length} {t('pending')}</span>
      </div>

      {thoughts.length === 0 ? (
        <p className="empty-state">{t('emptyShelf')}</p>
      ) : (
        <ul className="thought-list">
          {thoughts.map((thought) => (
            <li key={thought.id}>
              <button className="thought-chip" type="button" onClick={() => onOpenThought(thought)}>
                {thought.text}
              </button>
              <button
                className="remove-button"
                type="button"
                onClick={() => onRemoveThought(thought.id)}
                aria-label={`${t('remove')} ${thought.text}`}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default ThoughtPile
