import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("local previews avoid YouTube embeds that lack a Referer", () => {
  assert.match(
    html,
    /location\.protocol !== 'http:' && location\.protocol !== 'https:'/,
  );
  assert.match(html, /directLink\.target = '_blank'/);
  assert.match(html, /directLink\.rel = 'noopener'/);
  assert.match(html, /directLink\.click\(\)/);
});

test("hosted embeds identify their page origin and referrer", () => {
  assert.match(html, /encodeURIComponent\(location\.origin\)/);
  assert.match(html, /frame\.referrerPolicy = 'strict-origin-when-cross-origin'/);
  assert.match(html, /https:\/\/www\.youtube\.com\/embed\//);
});

test("inline players retain a direct YouTube fallback", () => {
  assert.match(html, /fallback\.className = 'youtube-fallback'/);
  assert.match(html, /fallback\.href = watchUrl/);
});

test("other coverage drifts subtly without taking over manual scrolling", () => {
  assert.match(html, /motionRemainder \+= Math\.min\(now - lastMotionTime, 100\) \* \.032/);
  assert.match(html, /var wholePixels = Math\.floor\(motionRemainder\)/);
  assert.match(html, /rail\.style\.scrollSnapType = 'none'/);
  assert.match(html, /railVisible &&/);
  assert.match(html, /!reducedMotion\.matches/);
  assert.match(html, /pauseAutoDrift\(5000\)/);
  assert.match(html, /rail\.addEventListener\('wheel', function\(\)\{ pauseAutoDrift\(5000\); \}/);
});
