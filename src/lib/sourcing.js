import { t } from './i18n'

// ─── Utilities ───────────────────────────────────────────────────────────────

export function normalizeTitle(value) {
  return value.trim().replace(/\s+/g, '_')
}

export function fallbackMessage() {
  return "We couldn't find sourced information on this topic yet. Try these sources:"
}

export function sourceBlock(name, url, excerpt) {
  return { name, url, excerpt }
}

export function toBriefParagraphs(excerpt) {
  const sentences = excerpt.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= 3) return [excerpt]
  const chunkSize = Math.ceil(sentences.length / 3)
  const chunks = []
  for (let i = 0; i < 3; i++) {
    const chunk = sentences.slice(i * chunkSize, i * chunkSize + chunkSize).join(' ').trim()
    if (chunk) chunks.push(chunk)
  }
  return chunks
}

export function stripHtml(value) {
  if (!value) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

async function parseJsonResponse(response, message) {
  if (!response.ok) throw new Error(message)
  return response.json()
}

// ─── Core Article Resolver ────────────────────────────────────────────────────
//
// This is the single source of truth for finding the right Wikipedia article.
// Call this once, get back { title, language, showingFallbackLanguage }.
// All other functions accept a pre-resolved title + language.

export async function fetchArticle(userQuery, lang) {
  const query = userQuery.replace(/_/g, ' ').trim()

  // STEP 1 — If non-English, search target language Wikipedia directly first.
  // This handles cases where the user types in the target language (e.g. "renkler" in TR mode).
  if (lang !== 'en') {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`
      )
      const data = await parseJsonResponse(res, '')
      const title = data?.[1]?.[0]
      if (title) {
        const summaryRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { Accept: 'application/json' } }
        )
        const summary = await parseJsonResponse(summaryRes, '')
        if (summary?.extract) {
          return { title, language: lang, showingFallbackLanguage: false, content: summary }
        }
      }
    } catch {
      // fall through to step 2
    }
  }

  // STEP 2 — Search English Wikipedia to get the canonical article title.
  let englishTitle = null
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`
    )
    const data = await parseJsonResponse(res, '')
    englishTitle = data?.[1]?.[0] ?? null
  } catch {
    // fall through
  }

  if (!englishTitle) {
    throw new Error('No article found for this topic.')
  }

  // STEP 3 — If non-English, use langlinks to find the equivalent title.
  if (lang !== 'en') {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(englishTitle)}&prop=langlinks&lllang=${lang}&format=json&origin=*`
      )
      const data = await parseJsonResponse(res, '')
      const pages = Object.values(data?.query?.pages ?? {})
      const localTitle = pages.find(p => p?.langlinks)?.[`langlinks`]?.[0]?.['*'] ?? null

      if (localTitle) {
        const summaryRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(localTitle)}`,
          { headers: { Accept: 'application/json' } }
        )
        const summary = await parseJsonResponse(summaryRes, '')
        if (summary?.extract) {
          return { title: localTitle, language: lang, showingFallbackLanguage: false, content: summary }
        }
      }
    } catch {
      // fall through to step 4
    }
  }

  // STEP 4 — Fallback: return English article with a notice flag.
  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(englishTitle)}`,
    { headers: { Accept: 'application/json' } }
  )
  const summary = await parseJsonResponse(summaryRes, 'Could not load article.')
  return { title: englishTitle, language: 'en', showingFallbackLanguage: lang !== 'en', content: summary }
}

// ─── Brief Source ─────────────────────────────────────────────────────────────
// Accepts a pre-resolved article title + language from fetchArticle.

export async function fetchBriefSource(resolvedTitle, lang) {
  const canonicalUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedTitle)}`,
      { headers: { Accept: 'application/json' } }
    )
    const payload = await parseJsonResponse(res, 'Could not load summary.')
    const excerpt = payload?.extract
    const url = payload?.content_urls?.desktop?.page ?? canonicalUrl
    if (!excerpt) throw new Error('No summary available.')
    return sourceBlock('Wikipedia', url, toBriefParagraphs(excerpt).join('\n\n'))
  } catch {
    throw new Error('Could not load a Wikipedia summary.')
  }
}

// ─── Full Source ──────────────────────────────────────────────────────────────
// Accepts a pre-resolved article title + language from fetchArticle.

export async function fetchFullSource(resolvedTitle, lang) {
  const canonicalUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`

  // Try mobile-sections first (best structure)
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(resolvedTitle)}`,
      { headers: { Accept: 'application/json' } }
    )
    const payload = await parseJsonResponse(res, '')
    const excerpt = (payload?.lead?.sections ?? [])
      .map(s => stripHtml(s?.text))
      .filter(Boolean)
      .join('\n\n')
      .trim()
    if (excerpt) return sourceBlock('Wikipedia', canonicalUrl, excerpt)
  } catch {
    // fall through
  }

  // Fallback: extracts API
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(resolvedTitle)}&explaintext=1&format=json&origin=*`
    )
    const payload = await parseJsonResponse(res, '')
    const pages = Object.values(payload?.query?.pages ?? {})
    const excerpt = pages.find(p => p?.extract)?.extract?.trim()
    if (excerpt) return sourceBlock('Wikipedia', canonicalUrl, excerpt)
  } catch {
    // fall through
  }

  throw new Error('Could not load the full overview. Please try Brief mode.')
}

// ─── Official Website ─────────────────────────────────────────────────────────
// Accepts a pre-resolved article title + language from fetchArticle.

export async function fetchOfficialWebsiteSource(resolvedTitle, lang) {
  try {
    const summaryRes = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(resolvedTitle)}`,
      { headers: { Accept: 'application/json' } }
    )
    const summaryPayload = await parseJsonResponse(summaryRes, '')
    const wikidataId = summaryPayload?.wikibase_item
    if (!wikidataId) return null

    const wdRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(wikidataId)}&props=claims|labels&languages=${lang}&format=json&origin=*`
    )
    const wdPayload = await parseJsonResponse(wdRes, '')
    const entity = wdPayload?.entities?.[wikidataId]
    const officialUrl = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value
    if (!officialUrl) return null

    const label = entity?.labels?.[lang]?.value || resolvedTitle
    return sourceBlock('Wikidata', officialUrl, `Official website for ${label}.`)
  } catch {
    return null
  }
}

// ─── Dive Deeper Suggestions ──────────────────────────────────────────────────
// Accepts a pre-resolved article title + language from fetchArticle.

const UNWANTED_SECTIONS = new Set([
  // English
  'references', 'see also', 'external links', 'bibliography', 'notes',
  'citations', 'sources', 'further reading', 'gallery', 'footnotes',
  // French
  'références', 'voir aussi', 'liens externes', 'bibliographie',
  'pour aller plus loin', 'galerie', 'catégories',
  // Turkish
  'kaynakça', 'ayrıca bakınız', 'dış bağlantılar', 'bibliyografi',
  'notlar', 'atıflar', 'kaynaklar', 'daha fazla okuma', 'galeri',
])

function isWantedSection(title) {
  return !UNWANTED_SECTIONS.has(title.toLowerCase().trim())
}

function getTemplateSuggestions(topic) {
  return [
    `${t('typesOf')} ${topic}`,
    `${t('howWorks')} ${topic}`,
    `${t('whereFound')}`,
    `${t('usedFor')} ${topic}`,
  ]
}

export async function fetchDeeperTopicSuggestions(resolvedTitle, lang) {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(resolvedTitle)}`,
      { headers: { Accept: 'application/json' } }
    )
    const payload = await parseJsonResponse(res, '')
    const sections = payload?.remaining?.sections ?? []

    const titles = sections
      .map(s => s?.line?.trim())
      .filter(Boolean)
      .filter(isWantedSection)
      .slice(0, 6)

    const suggestions = titles.length >= 2 ? titles : getTemplateSuggestions(resolvedTitle)
    return [...suggestions, t('readFullArticle')]
  } catch {
    return [...getTemplateSuggestions(resolvedTitle), t('readFullArticle')]
  }
}

// ─── Fallback Sources ─────────────────────────────────────────────────────────

async function fetchWikidataFallback(topic) {
  const res = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(topic)}&language=en&limit=3&format=json&origin=*`
  )
  const payload = await parseJsonResponse(res, '')
  return (payload?.search ?? [])
    .filter(e => e?.id && e?.concepturi)
    .map(e => sourceBlock('Wikidata', e.concepturi, e.description || `Entity result for ${e.label || topic}.`))
}

async function fetchOpenLibraryFallback(topic) {
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&limit=3`)
  const payload = await parseJsonResponse(res, '')
  return (payload?.docs ?? [])
    .filter(doc => doc?.key || doc?.title)
    .map(doc => {
      const url = doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org/'
      const author = Array.isArray(doc.author_name) && doc.author_name[0] ? doc.author_name[0] : null
      const year = doc.first_publish_year ? ` (${doc.first_publish_year})` : ''
      const excerpt = author ? `${doc.title || topic} by ${author}${year}.` : `${doc.title || topic}${year}.`
      return sourceBlock('OpenLibrary', url, excerpt)
    })
}

async function fetchCrossrefFallback(topic) {
  const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(topic)}&rows=3`)
  const payload = await parseJsonResponse(res, '')
  return (payload?.message?.items ?? [])
    .filter(item => item?.URL && Array.isArray(item?.title) && item.title[0])
    .map(item => {
      const year = item?.issued?.['date-parts']?.[0]?.[0]
      const excerpt = year ? `${item.title[0]} (${year}).` : `${item.title[0]}.`
      return sourceBlock('Crossref', item.URL, excerpt)
    })
}

export async function fetchFallbackSources(topic) {
  const results = await Promise.allSettled([
    fetchWikidataFallback(topic),
    fetchOpenLibraryFallback(topic),
    fetchCrossrefFallback(topic),
  ])
  const sources = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)

  const seen = new Set()
  return sources.filter(s => {
    const key = `${s.name}|${s.url}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}