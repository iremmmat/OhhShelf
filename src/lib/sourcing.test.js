import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fallbackMessage,
  fetchBriefSource,
  fetchDeeperTopicSuggestions,
  fetchFallbackSources,
  fetchFullSource,
  fetchOfficialWebsiteSource,
  normalizeTitle,
  resolveArticleTitle,
} from './sourcing'

describe('sourcing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes user input into a wikipedia title format', () => {
    expect(normalizeTitle('dark   matter')).toBe('dark_matter')
  })

  it('returns fallback message copy', () => {
    expect(fallbackMessage()).toContain("couldn't find sourced information")
  })

  it('resolves article title with opensearch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ['dark', ['Dark matter']],
    })

    await expect(resolveArticleTitle('dark')).resolves.toBe('Dark matter')
  })

  it('fetches and shapes brief wikipedia source', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: 'A. B. C. D.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Dark_matter' } },
      }),
    })

    const result = await fetchBriefSource('Dark matter')
    expect(result.name).toBe('Wikipedia')
    expect(result.url).toContain('wikipedia.org')
    expect(result.excerpt.length).toBeGreaterThan(0)
  })

  it('fetches and strips html from full wikipedia source', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        lead: {
          displaytitle: 'Dark matter',
          sections: [{ text: '<p>Dark matter is matter.</p>' }],
        },
      }),
    })

    const result = await fetchFullSource('Dark matter')
    expect(result.excerpt).toContain('Dark matter is matter.')
    expect(result.excerpt).not.toContain('<p>')
  })

  it('falls back to MediaWiki query when mobile sections fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              1: { extract: 'Fallback full extract content.' },
            },
          },
        }),
      })

    const result = await fetchFullSource('Dark matter')
    expect(result.excerpt).toContain('Fallback full extract content.')
  })

  it('returns wikidata official website when present', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ wikibase_item: 'Q1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entities: {
            Q1: {
              labels: { en: { value: 'Example' } },
              claims: {
                P856: [
                  {
                    mainsnak: {
                      datavalue: { value: 'https://example.org' },
                    },
                  },
                ],
              },
            },
          },
        }),
      })

    const result = await fetchOfficialWebsiteSource('Example')
    expect(result).toEqual({
      name: 'Wikidata',
      url: 'https://example.org',
      excerpt: 'Official website identified for Example.',
    })
  })

  it('returns deeper topic suggestions with templates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          search: [{ title: 'Mushroom farming' }],
        },
      }),
    })

    const results = await fetchDeeperTopicSuggestions('mushrooms')
    expect(results).toContain('Types of mushrooms')
    expect(results).toContain('How mushrooms grow')
    expect(results).toContain('Mushroom farming')
  })

  it('collects fallback sources from other providers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          search: [
            {
              id: 'Q1',
              concepturi: 'https://www.wikidata.org/wiki/Q1',
              label: 'Mushroom',
              description: 'A fungal fruiting body.',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: '/works/OL1W',
              title: 'Mushrooms',
              author_name: ['Author A'],
              first_publish_year: 1999,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            items: [
              {
                URL: 'https://doi.org/10.1000/test',
                title: ['Mushroom paper'],
                issued: { 'date-parts': [[2020]] },
              },
            ],
          },
        }),
      })

    const results = await fetchFallbackSources('mushrooms')
    expect(results.some((item) => item.name === 'Wikidata')).toBe(true)
    expect(results.some((item) => item.name === 'OpenLibrary')).toBe(true)
    expect(results.some((item) => item.name === 'Crossref')).toBe(true)
  })
})
