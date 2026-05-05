import { STORAGE_KEY, LANGUAGE_KEY, JOURNAL_KEY, FOLLOWUPS_KEY, REPORT_KEY, MAX_THOUGHT_LENGTH } from "./constants";

export function loadStoredThoughts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function persistThoughts(thoughts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts))
}
