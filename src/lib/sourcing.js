export function normalizeTitle(value) {
  return value.trim().replace(/\s+/g, '_')
}

export function fallbackMessage() {
  return "We couldn't find sourced information on this topic. Try searching directly:"
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
