import { t } from './i18n';

// ─── Utilities ───────────────────────────────────────────────────────────────

export function normalizeTitle(value) {
  return value.trim().split(' ').join('_');
}

export function fallbackMessage() {
  return "We couldn't find verified sources for this topic. Please try a different term.";
}

export function sourceBlock(name, url, excerpt, citations) {
  if (!citations) citations = [];
  return { name: name, url: url, excerpt: excerpt, citations: citations };
}

async function parseJsonResponse(response, message) {
  if (!response.ok) throw new Error(message);
  return response.json();
}

// ─── API Clients (Groq, Tavily, Semantic Scholar) ─────────────────────────

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY;

// 1. Intent Router
async function determineIntent(topic) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', 
        temperature: 0.0,
        messages: [
          { 
            role: 'system', 
            content: "Analyze the topic (max 150 chars). If it's a scientific theory, research, or academic concept, return strictly the word 'ACADEMIC'. Otherwise, return 'GENERAL'. No other text." 
          },
          { role: 'user', content: topic }
        ]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content.trim() === 'ACADEMIC' ? 'ACADEMIC' : 'GENERAL';
  } catch (error) {
    console.warn("Intent Router Error:", error);
    return 'GENERAL';
  }
}

// 2. Tavily Search
async function fetchFromTavily(topic) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: topic,
      search_depth: "basic",
      include_answer: false,
      max_results: 3
    })
  });
  const data = await parseJsonResponse(res, 'Tavily API error');
  return data.results.map(function(r, index) { 
    return "[Source " + (index + 1) + "] URL: " + r.url + " | Content: " + r.content; 
  }).join('\n\n');
}

// 3. Semantic Scholar
async function fetchFromSemanticScholar(topic) {
  const url = "https://api.semanticscholar.org/graph/v1/paper/search?query=" + encodeURIComponent(topic) + "&limit=3&fields=title,url,abstract,year";
  const res = await fetch(url);
  const data = await parseJsonResponse(res, 'Semantic Scholar API error');
  if (!data.data || data.data.length === 0) throw new Error("No academic data found");
  return data.data.map(function(p, index) { 
    return "[Source " + (index + 1) + "] URL: " + p.url + " | Title: " + p.title + " (" + p.year + ") | Abstract: " + p.abstract; 
  }).join('\n\n');
}

// 4. Groq RAG Translation/Synthesis
async function generateSourcedSummary(topic, rawContext, lang, mode) {
  const lengthInstruction = mode === 'full' ? 'Provide a comprehensive overview (4-5 paragraphs).' : 'Provide a brief, direct introduction (2 paragraphs).';
  
  // DİL MANTIĞI DÜZELTİLDİ
  let targetLang = 'English';
  if (lang === 'tr') targetLang = 'Turkish';
  if (lang === 'fr') targetLang = 'French';
  
  let systemPrompt = "You are a strict translation and summarization engine for a knowledge app.\n" +
    "YOUR TASK: Summarize the provided context regarding the topic '" + topic + "' into the target language: " + targetLang + ".\n" +
    "STRICT RULES:\n" +
    "1. Use ONLY the provided context. Do NOT invent or add external facts.\n" +
    "2. " + lengthInstruction + "\n" +
    "3. You MUST cite your claims using inline brackets pointing to the source number from the context (e.g., [1], [2]).\n" +
    "4. If the context is empty or irrelevant, reply exactly with: 'ERROR_NO_INFO'.\n" +
    "5. Output your response as a valid JSON object with two keys: 'text' (the summary string) and 'citations' (an array of URLs exactly matching the source numbers used).\n" +
    "Example Output: {'text': 'Employee engagement is crucial [1].', 'citations': ['https://url1.com']}";
  
  systemPrompt = systemPrompt.split("'").join('"');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.0,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawContext }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Groq API Error: " + res.status + " - " + errText);
  }

  const data = await res.json();
  let contentString = data.choices[0].message.content;
  
  const md = String.fromCharCode(96, 96, 96);
  contentString = contentString.split(md + "json").join("").split(md).join("").trim();
  
  const startIdx = contentString.indexOf('{');
  const endIdx = contentString.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1) {
    contentString = contentString.substring(startIdx, endIdx + 1);
  }
  
  const resultObj = JSON.parse(contentString);
  
  if (resultObj.text === 'ERROR_NO_INFO') throw new Error('No relevant information found in sources.');
  return resultObj;
}

// ─── Core Application Methods (Mapped to App.jsx) ─────────────────────────────

export async function fetchArticle(userQuery, lang) {
  const topic = userQuery.split('_').join(' ').trim();
  const intent = await determineIntent(topic);
  return { title: topic, language: lang, intent: intent, showingFallbackLanguage: false };
}

async function getSourcedContent(title, lang, mode, intent) {
  let rawContext = "";
  try {
    if (intent === 'ACADEMIC') {
      try {
        rawContext = await fetchFromSemanticScholar(title);
      } catch (semanticError) {
        console.warn("Semantic Scholar failed, falling back to Tavily:", semanticError);
        rawContext = await fetchFromTavily(title);
      }
    } else {
      rawContext = await fetchFromTavily(title);
    }

    if (!rawContext) throw new Error("Search engines returned empty data.");

    const aiResult = await generateSourcedSummary(title, rawContext, lang, mode);
    return sourceBlock('AI Knowledge Engine', '#', aiResult.text, aiResult.citations);

  } catch (error) {
    console.error("FETCHING ERROR (getSourcedContent):", error);
    throw new Error(fallbackMessage());
  }
}

export async function fetchBriefSource(resolvedTitle, lang) {
  const intent = await determineIntent(resolvedTitle);
  return await getSourcedContent(resolvedTitle, lang, 'brief', intent);
}

export async function fetchFullSource(resolvedTitle, lang) {
  const intent = await determineIntent(resolvedTitle);
  return await getSourcedContent(resolvedTitle, lang, 'full', intent);
}

export async function fetchOfficialWebsiteSource(resolvedTitle, lang) {
  return null; 
}

export async function fetchDeeperTopicSuggestions(resolvedTitle, lang) {
  try {
    // DİL MANTIĞI DÜZELTİLDİ
    let targetLang = 'English';
    if (lang === 'tr') targetLang = 'Turkish';
    if (lang === 'fr') targetLang = 'French';
    
    const promptContent = "Generate exactly 4 short, interesting follow-up questions or sub-topics to explore regarding '" + resolvedTitle + "'. The output must be strictly a JSON array of strings in " + targetLang + ". No other text.";
    
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', 
        temperature: 0.7,
        messages: [
          { role: 'system', content: promptContent }
        ]
      })
    });
    
    const data = await res.json();
    let contentString = data.choices[0].message.content;
    
    const md = String.fromCharCode(96, 96, 96);
    contentString = contentString.split(md + "json").join("").split(md).join("").trim();
    
    const startIdx = contentString.indexOf('[');
    const endIdx = contentString.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1) {
      contentString = contentString.substring(startIdx, endIdx + 1);
    }

    let questions = JSON.parse(contentString);
    return questions;
  } catch (error) {
    console.warn("Follow-up generation error:", error);
    return ["More about " + resolvedTitle, "How does " + resolvedTitle + " work?"];
  }
}

export async function fetchFallbackSources(topic) {
  return [];
}