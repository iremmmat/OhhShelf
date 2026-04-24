import { MAX_THOUGHT_LENGTH } from '../lib/constants'

function ThoughtInput({ input, onInputChange, onSubmit, inputRef }) {
  const hasInput = input.trim().length > 0

  return (
    <form className="thought-form" onSubmit={onSubmit}>
      <label htmlFor="thought-input">Add a thought</label>
      <div className="input-row">
        <input
          ref={inputRef}
          id="thought-input"
          type="text"
          value={input}
          maxLength={MAX_THOUGHT_LENGTH}
          placeholder="e.g. dark matter, Ottoman calligraphy, CRDTs"
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button type="submit" disabled={!hasInput} className="button-primary">
          Add
        </button>
      </div>
      <small>
        {input.length}/{MAX_THOUGHT_LENGTH}
      </small>
    </form>
  )
}

export default ThoughtInput
