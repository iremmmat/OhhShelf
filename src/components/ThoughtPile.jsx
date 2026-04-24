function ThoughtPile({ thoughts, onOpenThought, onRemoveThought }) {
  return (
    <>
      <div className="pile-header">
        <h2>The Pile</h2>
        <span>{thoughts.length} pending</span>
      </div>

      {thoughts.length === 0 ? (
        <p className="empty-state">Your shelf is empty. Capture any curiosity in under 5 seconds.</p>
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
                aria-label={`Remove ${thought.text}`}
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
