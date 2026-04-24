export function normalizeTitle(value) {
  return value.trim().replace(/\s+/g, '_')
}

export function fallbackMessage() {
  return "We couldn't find sourced information on this topic yet. Try these sources:"
}

function sourceBlock(name, url, excerpt) {
  return { name, url, excerpt }
}

function toBriefParagraphs(excerpt) {
  const sentences = excerpt.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 3) {
    return [excerpt]
  }

  const chunkSize = Math.ceil(sentences.length / 3)
  const chunks = []

  for (let index = 0; index < 3; index += 1) {
    const start = index * chunkSize
    const chunk = sentences.slice(start, start + chunkSize).join(' ').trim()
    if (chunk) {
      chunks.push(chunk)
    }
  }

  return chunks
}

function stripHtml(value) {
  if (!value) {
    return ''
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

async function parseJsonResponse(response, message) {
  if (!response.ok) {
    throw new Error(message)
  }

  return response.json()
}

export async function resolveArticleTitle(query) {
  let payload
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`,
    )
    payload = await parseJsonResponse(response, 'Could not search Wikipedia for this topic.')
  } catch {
    throw new Error('Could not search Wikipedia for this topic.')
  }

  const titles = payload?.[1] ?? []
  return titles[0] ?? null
}

export async function fetchBriefSource(title) {
  let payload
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } },
    )
    payload = await parseJsonResponse(response, 'Could not load a Wikipedia summary.')
  } catch {
    throw new Error('Could not load a Wikipedia summary.')
  }

  const canonicalUrl = payload?.content_urls?.desktop?.page
  const excerpt = payload?.extract
  if (!canonicalUrl || !excerpt) {
    throw new Error('No sourced summary available for this topic.')
  }

  return sourceBlock('Wikipedia', canonicalUrl, toBriefParagraphs(excerpt).join('\n\n'))
}

export async function fetchFullSource(title) {
  const canonicalUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } },
    )
    const payload = await parseJsonResponse(response, 'Could not load the full intro section.')
    const introSections = payload?.lead?.sections ?? []
    const excerpt = introSections
      .map((section) => stripHtml(section?.text))
      .filter(Boolean)
      .join('\n\n')
      .trim()

    if (excerpt) {
      return sourceBlock('Wikipedia', canonicalUrl, excerpt)
    }
  } catch {
    // Fall through to the MediaWiki query API fallback.
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(title)}&explaintext=1&format=json&origin=*`,
    )
    const payload = await parseJsonResponse(response, 'Could not load the full overview.')
    const pages = Object.values(payload?.query?.pages ?? {})
    const page = pages.find((item) => item?.extract)
    const excerpt = page?.extract?.trim()

    if (!excerpt) {
      throw new Error('No sourced full overview available for this topic.')
    }

    return sourceBlock('Wikipedia', canonicalUrl, excerpt)
  } catch {
    throw new Error('Could not load the full overview right now. Please try Brief mode.')
  }
}

export async function fetchOfficialWebsiteSource(title) {
  let summaryPayload
  try {
    const summaryResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } },
    )
    summaryPayload = await parseJsonResponse(summaryResponse, 'Could not load summary metadata.')
  } catch {
    return null
  }

  const wikidataId = summaryPayload?.wikibase_item
  if (!wikidataId) {
    return null
  }

  let wikidataPayload
  try {
    const wikidataResponse = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wikidataId)}&props=claims|labels&languages=en&format=json&origin=*`,
    )
    wikidataPayload = await parseJsonResponse(wikidataResponse, 'Could not load Wikidata details.')
  } catch {
    return null
  }

  const entity = wikidataPayload?.entities?.[wikidataId]
  const officialClaims = entity?.claims?.P856 ?? []
  const officialUrl = officialClaims?.[0]?.mainsnak?.datavalue?.value

  if (!officialUrl) {
    return null
  }

  const label = entity?.labels?.en?.value || title
  return sourceBlock(
    'Wikidata',
    officialUrl,
    `Official website identified for ${label}.`,
  )
}

const DIVE_DEEPER_TEMPLATES = [
  (topic) => `Types of ${topic}`,
  (topic) => `How ${topic} grow`,
  (topic) => `Where ${topic} grow`,
  (topic) => `What is ${topic} good for`,
]

export async function fetchDeeperTopicSuggestions(topic) {
  const baseTopic = topic.trim()
  const suggestions = DIVE_DEEPER_TEMPLATES.map((createTemplate) => createTemplate(baseTopic))

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(baseTopic)}&srlimit=8&format=json&origin=*`,
    )
    const payload = await parseJsonResponse(response, 'Could not load related topics.')
    const relatedTitles = (payload?.query?.search ?? []).map((item) => item?.title).filter(Boolean)
    suggestions.push(...relatedTitles)
  } catch {
    return suggestions
  }

  return [...new Set(suggestions)].slice(0, 8)
}

async function fetchWikidataFallback(topic) {
  const response = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(topic)}&language=en&limit=3&format=json&origin=*`,
  )
  const payload = await parseJsonResponse(response, 'Could not load Wikidata fallback sources.')
  const entries = payload?.search ?? []

  return entries
    .filter((entry) => entry?.id && entry?.concepturi)
    .map((entry) =>
      sourceBlock(
        'Wikidata',
        entry.concepturi,
        entry.description || `Entity result for ${entry.label || topic}.`,
      ),
    )
}

async function fetchOpenLibraryFallback(topic) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&limit=3`,
  )
  const payload = await parseJsonResponse(response, 'Could not load OpenLibrary fallback sources.')
  const docs = payload?.docs ?? []

  return docs
    .filter((doc) => doc?.key || doc?.title)
    .map((doc) => {
      const url = doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org/'
      const author = Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name[0] : null
      const year = doc.first_publish_year ? ` (${doc.first_publish_year})` : ''
      const excerpt = author
        ? `${doc.title || topic} by ${author}${year}.`
        : `${doc.title || topic}${year}.`
      return sourceBlock('OpenLibrary', url, excerpt)
    })
}

async function fetchCrossrefFallback(topic) {
  const response = await fetch(
    `https://api.crossref.org/works?query=${encodeURIComponent(topic)}&rows=3`,
  )
  const payload = await parseJsonResponse(response, 'Could not load Crossref fallback sources.')
  const items = payload?.message?.items ?? []

  return items
    .filter((item) => item?.URL && Array.isArray(item?.title) && item.title[0])
    .map((item) => {
      const title = item.title[0]
      const year = item?.issued?.['date-parts']?.[0]?.[0]
      const excerpt = year ? `${title} (${year}).` : `${title}.`
      return sourceBlock('Crossref', item.URL, excerpt)
    })
}

export async function fetchFallbackSources(topic) {
  const providers = [fetchWikidataFallback, fetchOpenLibraryFallback, fetchCrossrefFallback]
  const results = await Promise.allSettled(providers.map((provider) => provider(topic)))

  const sources = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)

  const deduped = []
  const seen = new Set()
  for (const source of sources) {
    const key = `${source.name}|${source.url}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(source)
    }
  }

  return deduped.slice(0, 8)
}
