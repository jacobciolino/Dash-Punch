"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { server } = require("../server");
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const root = `http://127.0.0.1:${server.address().port}`;
    const first = await fetch(`${root}/game.js`);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "no-cache");
    const cached = await fetch(`${root}/game.js`, { headers: { "if-none-match": first.headers.get("etag") } });
    assert.equal(cached.status, 304);
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${root}/?debugHitboxes=1`);
    await page.waitForTimeout(300);
    const startup = await page.evaluate(() => ({
      images: performance.getEntriesByType("resource").filter(r => r.initiatorType === "img").length,
      cache: window.__dashPunchDebug.presentationCache,
    }));
    assert(startup.images < 10, "startup eagerly loaded the roster");
    assert.equal(startup.cache.images, 0, "hidden arena must not request fighter/stage art");
    await page.getByRole("button", { name: "Extras", exact: true }).click();
    await page.getByRole("button", { name: "Quick Playtest", exact: true }).click();
    await page.evaluate(() => window.__dashPunchDebug.ai.configure({ characters: ["orbit", "runway"] }));
    await page.waitForTimeout(800);
    const timing = await page.evaluate(() => new Promise(resolve => {
      const samples = []; let last = performance.now();
      function tick(now) {
        samples.push(now - last); last = now;
        if (samples.length < 180) return requestAnimationFrame(tick);
        samples.sort((a, b) => a - b);
        resolve({ median: samples[90], p95: samples[171], over25: samples.filter(x => x > 25).length });
      }
      requestAnimationFrame(tick);
    }));
    const render = await page.evaluate(() => {
      const d = window.__dashPunchDebug;
      const before = d.online.rollback.hash();
      for (let i = 0; i < 20; i++) { d.gravity.draw(0); d.gravity.draw(1); }
      const count = d.presentationCache.frames;
      for (let i = 0; i < 20; i++) { d.gravity.draw(0); d.gravity.draw(1); }
      const canvas = document.querySelector("#game");
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) opaque++;
      return { unchanged: before === d.online.rollback.hash(), reused: count === d.presentationCache.frames, cache: d.presentationCache, opaque };
    });
    assert(render.unchanged, "render cache changed gameplay state");
    assert(render.reused, "identical animation frames were not reused");
    assert(render.cache.frames > 0 && render.cache.frames <= 256);
    assert(render.cache.pixels <= 2_000_000);
    assert(render.opaque > 1000, "blank arena");
    await page.screenshot({ path: "/tmp/dash-performance-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/dash-performance-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ tests: "passed", startup, timing, render, conditionalReload: true }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
