// lib/firecrawl.js
//
// Thin, dependency-free client for the Firecrawl scrape API — same shape as
// lib/gemini.js and lib/elevenlabs.js: one typed error, one hard timeout, one
// exported function.
//
// Why it's here: lib/extract.js parses HTML with cheerio, which never runs
// JavaScript. Any page that builds its content client-side (most SPAs) comes
// back nearly empty. Firecrawl renders the page first and returns markdown,
// which is the one class of site the old extractor simply could not read.
//
// FIRECRAWL_API_KEY is OPTIONAL. The API answers unauthenticated requests, so
// the app works with no key at all; a key raises the rate limits. Either way a
// failure here is never fatal — extract.js falls back to cheerio.

export class FirecrawlError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'FirecrawlError';
    this.cause = cause;
  }
}

const API_URL = 'https://api.firecrawl.dev/v2/scrape';
const DEFAULT_TIMEOUT_MS = 9000;

/**
 * @param {object} opts
 * @param {string} opts.url - absolute http(s) URL, already validated by the caller
 * @param {number} [opts.timeoutMs] - how long the caller can afford to wait
 * @returns {Promise<{markdown: string, title: string, description: string, sourceUrl: string}>}
 * @throws {FirecrawlError} on timeout, non-2xx, or an empty document
 */
export async function scrapeUrl({ url, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { 'Content-Type': 'application/json' };
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        // Ask Firecrawl to drop nav/header/footer chrome for us. It is not
        // perfect — cleanMarkdown() in extract.js still tidies what's left.
        onlyMainContent: true,
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') throw new FirecrawlError('Firecrawl took too long to respond.', err);
    throw new FirecrawlError('Could not reach Firecrawl.', err);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new FirecrawlError(`Firecrawl API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json().catch(() => null);
  if (!json?.success || !json?.data) {
    throw new FirecrawlError('Firecrawl returned an unsuccessful response.');
  }

  const meta = json.data.metadata || {};
  // Firecrawl reports the ORIGIN page's status in metadata, separate from its
  // own HTTP status — a 404 upstream still comes back as a 200 from Firecrawl.
  const upstream = Number(meta.statusCode);
  if (Number.isFinite(upstream) && upstream >= 400) {
    throw new FirecrawlError(`That page returned a ${upstream} error.`);
  }

  const markdown = typeof json.data.markdown === 'string' ? json.data.markdown : '';
  if (!markdown.trim()) throw new FirecrawlError('Firecrawl found no readable content.');

  return {
    markdown,
    title: (meta.title || meta.ogTitle || '').trim(),
    description: (meta.description || meta.ogDescription || '').trim(),
    sourceUrl: meta.sourceURL || meta.url || url,
  };
}
