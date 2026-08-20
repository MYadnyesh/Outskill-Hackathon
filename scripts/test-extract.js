// scripts/test-extract.js
//
// Unit test for the HTML-parsing half of lib/extract.js using a static HTML
// fixture — no network call. This sandbox's outbound network is allowlisted
// to package registries only, so a live fetch() to an arbitrary site can't
// be exercised here; this proves the parsing logic itself is correct. The
// network fetch half is a handful of lines of plain `fetch()` + timeout
// (see extractFromUrl) and will work anywhere with normal internet egress,
// including every Vercel deployment and every teammate's laptop.

import assert from 'node:assert/strict';
import { parseHtml } from '../lib/extract.js';

const FIXTURE_HTML = `
<!doctype html>
<html>
<head>
  <title>What Are Black Holes? | NASA</title>
  <meta name="description" content="NASA's explainer on how black holes form, what the event horizon means, and how astronomers spot the invisible.">
</head>
<body>
  <nav><a href="/">Home</a><a href="/missions">Missions</a></nav>
  <header><h1>Site Header (should be stripped)</h1></header>
  <article>
    <h1>What Are Black Holes?</h1>
    <p>A black hole is a place in space where gravity pulls so much that even light cannot get out.</p>
    <h2>How do black holes form?</h2>
    <p>Black holes form when massive stars collapse under their own gravity at the end of their lives.</p>
    <p>Nothing that passes the event horizon, not even light, can escape a black hole's pull.</p>
    <h2>Supermassive black holes</h2>
    <p>Supermassive black holes sit at the centers of most large galaxies, including our own Milky Way.</p>
    <p>Astronomers detect black holes indirectly, by observing their gravitational effect on nearby matter.</p>
    <a href="/related-1">Related story</a>
    <a href="/related-2">Another related story</a>
  </article>
  <aside>Sidebar content (should be stripped)</aside>
  <footer><a href="/privacy">Privacy</a></footer>
</body>
</html>
`;

const url = new URL('https://www.nasa.gov/black-holes');
const result = parseHtml(FIXTURE_HTML, url);

assert.equal(result.title, 'What Are Black Holes? | NASA', 'title should prefer <title>');
assert.match(result.description, /event horizon/, 'description should come from meta tag');
assert.equal(result.domain, 'nasa.gov', 'domain should strip the www. prefix');
assert.ok(result.mainText.includes('massive stars collapse'), 'main text should include article body copy');
assert.ok(!result.mainText.includes('Site Header'), 'header content must be stripped');
assert.ok(!result.mainText.includes('Sidebar content'), 'aside content must be stripped');
assert.ok(!result.mainText.includes('Privacy'), 'footer content must be stripped');
assert.equal(result.stats.headingCount, 3, 'should count the 3 headings inside <article>');
// nav/header/footer are stripped before counting, same as for mainText, so
// linkCount reflects content links only (the 2 "related story" links here) —
// not site-chrome navigation.
assert.equal(result.stats.linkCount, 2, 'should count only <a href> inside real content, not nav/footer chrome');
assert.ok(result.stats.readingTimeMinutes >= 1, 'reading time should be at least 1 minute');

console.log('✔ parseHtml: title, description, boilerplate stripping, heading/link counts all correct');
console.log(JSON.stringify(result, null, 2));
