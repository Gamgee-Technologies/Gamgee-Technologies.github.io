import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const site = join(root, 'site');
const canonicalPages = new Map([
  ['index.html', 'https://www.gamgee.io/'],
  ['about/index.html', 'https://www.gamgee.io/about/'],
  ['media/index.html', 'https://www.gamgee.io/media/'],
  ['mission/index.html', 'https://www.gamgee.io/mission/'],
  ['story/index.html', 'https://www.gamgee.io/story/'],
  ['vet/index.html', 'https://www.gamgee.io/vet/'],
]);
const excludedPages = new Map([
  ['about/original.html', 'noindex, nofollow'],
  ['apply/index.html', 'noindex'],
  ['assets/rosie-ascii-direct.html', 'noindex, nofollow'],
  ['original/index.html', 'noindex, nofollow'],
  ['privacy&terms/index.html', 'noindex'],
]);

const readSite = (path) => readFileSync(join(site, path), 'utf8');
const canonicalPattern = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']\s*\/?\s*>/gi;
const robotsPattern = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']\s*\/?\s*>/gi;

function deployedFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? deployedFiles(path) : [path];
  });
}

test('robots.txt allows crawling and declares the canonical sitemap', () => {
  assert.equal(
    readSite('robots.txt'),
    'User-agent: *\nAllow: /\n\nSitemap: https://www.gamgee.io/sitemap.xml\n',
  );
  assert.equal(readSite('CNAME').trim(), 'www.gamgee.io');
});

test('sitemap lists only canonical, deployable 200-page paths with honest lastmod values', () => {
  const xml = readSite('sitemap.xml');
  const entries = [...xml.matchAll(
    /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g,
  )].map((match) => ({ location: match[1], lastmod: match[2] }));

  assert.deepEqual(
    entries.map(({ location }) => location).sort(),
    [...canonicalPages.values()].sort(),
  );
  for (const { location, lastmod } of entries) {
    const pathname = new URL(location).pathname;
    const deployedPath = pathname === '/' ? 'index.html' : `${pathname.slice(1)}index.html`;
    assert.ok(existsSync(join(site, deployedPath)), `${location} must map to a deployed file`);
    assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/, `${location} must use a W3C date`);
    assert.ok(!location.endsWith('/index.html'), `${location} must not expose an index.html alias`);
  }
});

test('each indexable page has one matching www self-canonical', () => {
  for (const [path, expected] of canonicalPages) {
    const html = readSite(path);
    const canonicals = [...html.matchAll(canonicalPattern)].map((match) => match[1]);
    const robots = [...html.matchAll(robotsPattern)].map((match) => match[1]);
    const openGraphUrls = [...html.matchAll(
      /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']\s*\/?\s*>/gi,
    )].map((match) => match[1]);

    assert.deepEqual(canonicals, [expected], `${path} must have one self-canonical`);
    assert.ok(!robots.some((directive) => directive.includes('noindex')), `${path} must be indexable`);
    assert.ok(openGraphUrls.every((url) => url === expected), `${path} og:url must match its canonical`);
  }
});

test('excluded pages have one intentional robots directive and no canonical', () => {
  const sitemap = readSite('sitemap.xml');
  for (const [path, expectedDirective] of excludedPages) {
    const html = readSite(path);
    const canonicals = [...html.matchAll(canonicalPattern)].map((match) => match[1]);
    const directives = [...html.matchAll(robotsPattern)].map((match) => match[1]);

    assert.deepEqual(directives, [expectedDirective], `${path} must have one robots directive`);
    assert.deepEqual(canonicals, [], `${path} must not declare an indexable canonical`);
    assert.ok(!sitemap.includes(path.replace(/index\.html$/, '')), `${path} must stay out of the sitemap`);
  }
});

test('deployed search signals do not regress to apex or index.html URLs', () => {
  const searchableFiles = deployedFiles(site).filter((path) => /\.(?:html|xml|txt)$/.test(path));
  for (const path of searchableFiles) {
    const content = readFileSync(path, 'utf8');
    const label = relative(root, path);
    assert.ok(!content.includes('https://gamgee.io'), `${label} contains a non-www URL`);
    assert.ok(!/href=["'][^"']*\/index\.html(?:[#?"']|$)/i.test(content), `${label} links to index.html`);
  }
});
