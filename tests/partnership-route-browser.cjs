const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, launchOptions } = require('./browser-runtime.cjs');

const site = path.resolve(__dirname, '../site');
const origin = 'http://gamgee.local';
const currentPath = '/partnership/';
const currentURL = 'https://www.gamgee.io' + currentPath;
const publicPages = [
  '/', '/mission/', '/story/', '/media/', '/trial/',
  '/dog-cancer-vaccine/', '/privacy&terms/',
  '/career/', '/career/Career.html', currentPath,
];
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };

(async () => {
  const browser = await chromium.launch(launchOptions);
  let posts = 0;
  async function context(options = {}) {
    const ctx = await browser.newContext(options);
    await ctx.route('**/*', route => {
      const request = route.request();
      if (request.method() === 'POST') { posts++; return route.abort(); }
      const url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/route-test-start') {
        return route.fulfill({ contentType:'text/html', body:'<!doctype html><title>Start</title>' });
      }
      const pathname = decodeURIComponent(url.pathname);
      const file = path.resolve(site, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      if (!file.startsWith(site + path.sep) || !fs.existsSync(file)) {
        return route.fulfill({ status:404, body:'' });
      }
      return route.fulfill({ body:fs.readFileSync(file), contentType:mime[path.extname(file)] || 'application/octet-stream' });
    });
    return ctx;
  }
  try {
    const ctx = await context();
    const page = await ctx.newPage();
    for (const suffix of ['', '?utm_source=legacy&tag=one&tag=two#partner-inquiry',
      '?next=https%3A%2F%2Fexample.invalid%2Fx%3Fa%3D1#research']) {
      for (const oldPath of ['/vet/', '/vet/index.html']) {
        await page.goto(origin + '/route-test-start');
        await page.goto(origin + oldPath + suffix, { waitUntil:'domcontentloaded' });
        await page.waitForURL(origin + currentPath + suffix);
        assert.equal(page.url(), origin + currentPath + suffix);
        await page.goBack({ waitUntil:'domcontentloaded' });
        assert.equal(page.url(), origin + '/route-test-start', 'Legacy redirect must replace its history entry');
      }
    }
    console.log('PASS: legacy redirects preserve query/hash and replace browser history.');
    for (const route of publicPages) {
      await page.goto(origin + route, { waitUntil:'domcontentloaded' });
      await page.locator('.site-footer').waitFor({ state:'attached' });
      const links = await page.locator('a[href]').evaluateAll(anchors => anchors
        .filter(a => a.textContent.trim() === 'Partnership')
        .map(a => ({ href:a.href, pathname:new URL(a.href).pathname })));
      assert.ok(links.length > 0, route + ': missing Partnership link');
      for (const link of links) assert.equal(link.pathname, currentPath, route + ': ' + link.href);
      assert.equal(await page.locator('a[href="/vet/"],a[href^="/vet/#"],a[href^="/vet/?"],a[href^="https://www.gamgee.io/vet/"]').count(), 0, route);
    }
    console.log('PASS: Partnership links on all 10 routes with shared navigation.');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), currentURL);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), currentURL);
    const breadcrumb = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    assert.equal(breadcrumb['@id'], currentURL + '#breadcrumb');
    assert.equal(breadcrumb.itemListElement.at(-1).item, currentURL);
    assert.ok(fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8').includes('<loc>' + currentURL + '</loc>'));
    assert.ok(!fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8').includes('/vet/'));
    assert.ok(fs.readFileSync(path.join(site, 'llms.txt'), 'utf8').includes(currentURL));
    await ctx.close();

    const noJS = await context({ javaScriptEnabled:false });
    const fallback = await noJS.newPage();
    for (const oldPath of ['/vet/', '/vet/index.html']) {
      await fallback.goto(origin + oldPath, { waitUntil:'domcontentloaded' });
      await fallback.waitForURL(origin + currentPath);
      assert.equal(fallback.url(), origin + currentPath);
    }
    const redirectHTML = fs.readFileSync(path.join(site, 'vet/index.html'), 'utf8');
    assert.match(redirectHTML, /<a href="\/partnership\/">/);
    await noJS.close();
    assert.equal(posts, 0);
    console.log('PASS: 6 redirects preserve query/hash and replace history; 2 no-JavaScript redirects; 10 public routes link to Partnership; canonical, Open Graph, JSON-LD and sitemap agree; zero POSTs.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
