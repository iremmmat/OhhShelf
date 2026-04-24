import { describe, expect, it, beforeEach } from 'vitest'
import { loadStoredThoughts, persistThoughts } from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads an empty list when storage is missing', () => {
    expect(loadStoredThoughts()).toEqual([])
  })

  it('persists and reloads thoughts', () => {
    const thoughts = [{ id: '1', text: 'Dark matter', createdAt: 1 }]
    persistThoughts(thoughts)
    expect(loadStoredThoughts()).toEqual(thoughts)
  })

  it('returns an empty list when storage is invalid JSON', () => {
    localStorage.setItem('ooh-shelf-thoughts-v1', 'not-json')
    expect(loadStoredThoughts()).toEqual([])
  })
})
