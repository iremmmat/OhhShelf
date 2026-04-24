import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/sourcing', () => ({
  fallbackMessage: () =>
    "We couldn't find sourced information on this topic. Try searching directly:",
  normalizeTitle: (value) => value.trim().replace(/\s+/g, '_'),
  resolveArticleTitle: vi.fn(async (query) => query),
  fetchBriefSource: vi.fn(async (title) => ({
    name: 'Wikipedia',
    url: `https://example.org/${title}`,
    excerpt: 'Brief sourced content.',
  })),
  fetchFullSource: vi.fn(async (title) => ({
    name: 'Wikipedia',
    url: `https://example.org/${title}`,
    excerpt: 'Full sourced content.',
  })),
  fetchOfficialWebsiteSource: vi.fn(async () => ({
    name: 'Wikidata',
    url: 'https://official.example',
    excerpt: 'Official website identified.',
  })),
}))

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds a thought, opens it, and renders sourced content', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('Add a thought')
    await user.type(input, 'Dark matter')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Dark matter')).toBeTruthy()
    expect(document.activeElement).toBe(input)

    await user.click(screen.getAllByRole('button', { name: 'Dark matter' })[0])

    expect(await screen.findByText('Brief sourced content.')).toBeTruthy()
    expect(screen.getAllByText(/Source:/).length).toBeGreaterThan(0)
  })
})
