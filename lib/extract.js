// lib/extract.js
//
// Real, server-side content extraction for a submitted URL.
// Runs inside the Vercel serverless function (api/analyze.js), never in the
// browser — avoids CORS entirely and keeps the extraction fast + consistent.
//
// Design goal: this must be FAST (the product requirement is "very small
// time gap between scraping and output generation"), so we:
//   - set an aggressive fetch timeout (8s) via AbortController
//   - only ever parse HTML once (cheerio), reuse the $ for every stat
//   - compute reading time / heading count / link count here (cheap, no AI)
//     rather than asking the LLM to do arithmetic
//
// Throws a typed ExtractError the route can map straight to an error code
// the frontend understands (see api/analyze.js + docs/FEATURES.md).

import * as cheerio from 'cheerio';

export class ExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExtractError';
    this.code = code; // 'INVALID_URL' | 'FETCH_FAILED' | 'TIMEOUT' | 'BLOCKED' | 'EMPTY'
  }
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_MAIN_TEXT_CHARS = 12000; // plenty for an LLM prompt, keeps latency down
const READING_WPM = 220;

function normalizeUrl(raw) {
  let candidate = (raw || '').trim();
  if (!candidate) throw new ExtractError('INVALID_URL', 'Please paste a URL.');
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new ExtractError('INVALID_URL', 'That doesn’t look like a valid URL.');
  }
  if (!url.hostname.includes('.')) {
    throw new ExtractError('INVALID_URL', 'That doesn’t look like a valid URL.');
  }
  return url;
}

function guessContentType(url, $) {
  const host = url.hostname.replace(/^www\./, '');
  if (/wikipedia\.org$/.test(host)) return 'Encyclopedia entry';
  if (/(docs\.|documentation)/.test(host)) return 'Documentation';
  if ($('article').length) return 'Article';
  if (host.split('.').length && $('h1').length && $('p').length > 8) return 'Article';
  return 'Web page';
}

export async function extractFromUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const started = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A real UA + accept headers meaningfully reduce bot-blocking on
        // otherwise-public pages compared to Node's default fetch UA.
        'User-Agent':
          'Mozilla/5.0 (compatible; PrismBot/1.0; +https://github.com/MYadnyesh/Outskill-Hackathon) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new ExtractError('TIMEOUT', 'That page took too long to respond.');
    }
    throw new ExtractError('FETCH_FAILED', 'Couldn’t reach that URL.');
  }
  clearTimeout(timeout);

  if (response.status === 403 || response.status === 401 || response.status === 999) {
    throw new ExtractError('BLOCKED', 'That page is blocking automated readers.');
  }
  if (!response.ok) {
    throw new ExtractError('FETCH_FAILED', `That page returned a ${response.status} error.`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('xml')) {
    throw new ExtractError('FETCH_FAILED', 'That URL isn’t a readable web page.');
  }

  const html = await response.text();
  const parsed = parseHtml(html, url);

  return { ...parsed, extractMs: Date.now() - started };
}

/**
 * Pure HTML -> structured content parsing, split out from extractFromUrl so
 * it can be unit-tested with a static HTML string (no network needed) — see
 * scripts/test-extract.js. This is the function to reuse/extend if a
 * teammate wants smarter main-content detection later.
 */
export function parseHtml(html, url) {
  const $ = cheerio.load(html);

  // Strip boilerplate before pulling "main text" so word count / summary
  // input isn't polluted by nav links, scripts, or footers.
  $('script, style, noscript, nav, footer, header, aside, form, svg, iframe').remove();

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    url.hostname;

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  const linkCount = $('a[href]').length;

  const mainScope = $('article').length
    ? $('article')
    : $('main').length
      ? $('main')
      : $('body');

  const mainText = mainScope
    .find('p, li, h1, h2, h3, blockquote')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join('\n')
    .replace(/\s{2,}/g, ' ')
    .slice(0, MAX_MAIN_TEXT_CHARS);

  if (!mainText || mainText.length < 40) {
    throw new ExtractError('EMPTY', 'Couldn’t find any readable content on that page.');
  }

  const wordCount = mainText.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / READING_WPM));

  return {
    url: url.toString(),
    domain: url.hostname.replace(/^www\./, ''),
    title,
    description,
    mainText,
    stats: {
      readingTimeMinutes,
      headingCount,
      linkCount,
      contentType: guessContentType(url, $),
    },
  };
}
