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

export async function resolveArticleTitle(query) {
  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`,
  )

  if (!response.ok) {
    throw new Error('Could not search Wikipedia for this topic.')
  }

  const payload = await response.json()
  const titles = payload?.[1] ?? []
  return titles[0] ?? null
}

export async function fetchBriefSource(title) {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error('Could not load a Wikipedia summary.')
  }

  const payload = await response.json()
  const canonicalUrl = payload?.content_urls?.desktop?.page
  const excerpt = payload?.extract
  if (!canonicalUrl || !excerpt) {
    throw new Error('No sourced summary available for this topic.')
  }

  return sourceBlock('Wikipedia', canonicalUrl, toBriefParagraphs(excerpt).join('\n\n'))
}

export async function fetchFullSource(title) {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!response.ok) {
    throw new Error('Could not load the full intro section.')
  }

  const payload = await response.json()
  const canonicalUrl = payload?.lead?.displaytitle
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
    : null
  const introSections = payload?.lead?.sections ?? []
  const excerpt = introSections
    .map((section) => stripHtml(section?.text))
    .filter(Boolean)
    .join('\n\n')
    .trim()

  if (!canonicalUrl || !excerpt) {
    throw new Error('No sourced full overview available for this topic.')
  }

  return sourceBlock('Wikipedia', canonicalUrl, excerpt)
}

export async function fetchOfficialWebsiteSource(title) {
  const summaryResponse = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { Accept: 'application/json' } },
  )

  if (!summaryResponse.ok) {
    return null
  }

  const summaryPayload = await summaryResponse.json()
  const wikidataId = summaryPayload?.wikibase_item
  if (!wikidataId) {
    return null
  }

  const wikidataResponse = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wikidataId)}&props=claims|labels&languages=en&format=json&origin=*`,
  )

  if (!wikidataResponse.ok) {
    return null
  }

  const wikidataPayload = await wikidataResponse.json()
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
