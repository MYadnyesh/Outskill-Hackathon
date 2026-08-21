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
import dns from 'node:dns/promises';
import net from 'node:net';

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
const MAX_REDIRECTS = 5;

function normalizeUrl(raw) {
  let candidate = (raw || '').trim();
  if (!candidate) throw new ExtractError('INVALID_URL', 'Please paste a URL.');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new ExtractError('INVALID_URL', 'That doesn’t look like a valid URL.');
  }
  // Only ever speak http(s). Without this, file:, gopher:, ftp: and friends
  // reach the fetch layer.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExtractError('INVALID_URL', 'Only http and https URLs are supported.');
  }
  if (!url.hostname.includes('.')) {
    throw new ExtractError('INVALID_URL', 'That doesn’t look like a valid URL.');
  }
  return url;
}

// ---- SSRF guard -------------------------------------------------------------
// This endpoint is public and unauthenticated, and it fetches whatever URL it is
// handed from inside our own network. Without these checks it is a confused
// deputy: anyone can point it at cloud metadata (169.254.169.254 on AWS, which
// is what Vercel runs on), at loopback, or at RFC-1918 addresses, and read the
// response body back out of the API. Checking the *resolved* IP matters —
// a hostname that looks public can resolve to 127.0.0.1 — and every redirect hop
// has to be rechecked, or a public URL can just 302 to an internal one.

function isBlockedIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0) return true;                          // "this network"
    if (a === 10) return true;                         // RFC-1918
    if (a === 127) return true;                        // loopback
    if (a === 169 && b === 254) return true;           // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;  // RFC-1918
    if (a === 192 && b === 168) return true;           // RFC-1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true;                         // multicast / reserved
    return false;
  }
  if (type === 6) {
    const v6 = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (v6 === '::1' || v6 === '::') return true;      // loopback / unspecified
    if (v6.startsWith('fe80')) return true;            // link-local
    if (/^f[cd]/.test(v6)) return true;                // unique local
    // IPv4-mapped (::ffff:127.0.0.1) — judge on the embedded v4 address.
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  return true; // not an IP literal we understand — refuse rather than guess
}

async function assertPublicHost(hostname) {
  // A bare IP literal never hits DNS, so check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new ExtractError('BLOCKED', 'That address isn’t allowed.');
    }
    return;
  }
  let records;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new ExtractError('FETCH_FAILED', 'Couldn’t reach that URL.');
  }
  if (!records.length) {
    throw new ExtractError('FETCH_FAILED', 'Couldn’t reach that URL.');
  }
  // Every resolved address must be public — one internal answer is enough to
  // make the request unsafe (DNS can round-robin between them).
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new ExtractError('BLOCKED', 'That address isn’t allowed.');
    }
  }
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
  let url = normalizeUrl(rawUrl);
  const started = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    // Redirects are followed by hand so each hop can be re-checked against the
    // SSRF guard — `redirect: 'follow'` would let a public URL bounce us to an
    // internal one without another look.
    for (let hop = 0; ; hop++) {
      await assertPublicHost(url.hostname);

      response = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          // A real UA + accept headers meaningfully reduce bot-blocking on
          // otherwise-public pages compared to Node's default fetch UA.
          'User-Agent':
            'Mozilla/5.0 (compatible; PrismBot/1.0; +https://github.com/MYadnyesh/Outskill-Hackathon) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.status < 300 || response.status > 399) break;

      const location = response.headers.get('location');
      if (!location) break; // a 3xx with nowhere to go — treat as the final response
      if (hop >= MAX_REDIRECTS) {
        throw new ExtractError('FETCH_FAILED', 'That page redirected too many times.');
      }

      let next;
      try {
        next = new URL(location, url); // resolve relative Location headers
      } catch {
        throw new ExtractError('FETCH_FAILED', 'That page sent an invalid redirect.');
      }
      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new ExtractError('BLOCKED', 'That page redirected somewhere we can’t follow.');
      }
      url = next;
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ExtractError) throw err;
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
  // Parse against the FINAL url so domain/title reflect where we actually landed.
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
