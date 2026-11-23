"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { server } = require("../server");
(async () => {
  let browser;
  let releaseArt;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const click = name => page.getByRole("button", { name, exact: true }).click();
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await click("Play"); await click("Local");
    await page.locator('[data-player-slot="0"] [data-field="kind"]').click();
    await page.locator('[data-player-slot="1"] [data-menu-action="slotReady"]').click();
    await click("Choose Stage");
    const artGate = new Promise(resolve => { releaseArt = resolve; });
    await page.route("**/assets/**", async route => { await artGate; await route.continue(); });
    await click("Fight");
    const countdown = page.locator(".countdown-number");
    await page.locator('[data-menu-screen="countdown"]').waitFor();
    assert(await page.locator("#game").isVisible(), "arena hidden during countdown");
    const state = () => page.evaluate(() => window.__dashPunchDebug.fighters.map(f => ({ x:f.x,y:f.y,health:f.health,attack:Boolean(f.attack) })));
    const initial = await state();
    await page.waitForTimeout(500);
    assert.deepEqual(await state(), initial, "AI/physics moved while art was loading");
    assert.equal(await countdown.innerText(), "…", "countdown started before match art loaded");
    releaseArt();
    await page.waitForFunction(() => document.querySelector(".countdown-number")?.textContent === "3");
    await page.waitForTimeout(400);
    assert.deepEqual(await state(), initial, "fighters moved before countdown ended");
    if(await page.evaluate(()=>Boolean(window.__dashPunchDebug.matchFlow?.state))) {
      // Art loading uses the existing menu gate; 3-2-1-GO now runs in simulation.
      assert(await page.locator("#menuLayer").isHidden());
      const round=await page.evaluate(()=>window.__dashPunchDebug.matchFlow.state);
      assert.equal(round.phase,"countdown");assert.equal(round.remainingTicks,7200);
      assert(round.transitionTicks>0&&round.transitionTicks<180);
    } else {
      const bg = await page.locator("#menuLayer").evaluate(el => getComputedStyle(el).backgroundColor);
      assert.equal(bg, "rgba(0, 0, 0, 0)");
      assert.equal(await page.locator('.countdown-screen').evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    }
    await page.screenshot({ path: "/tmp/dash-countdown.png" });
    await page.locator("#menuLayer").waitFor({ state: "hidden" });
    await page.waitForFunction(old => window.__dashPunchDebug.fighters.some((f,i) => f.x !== old[i].x || f.y !== old[i].y), initial);
    await page.keyboard.press("Escape");
    assert(await page.getByRole("button", { name:"Resume Match",exact:true }).isVisible());
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({tests:"passed",arenaVisible:true,artReadyBeforeCountdown:true,frozenThroughCountdown:true,aiStartsAfterCountdown:true}));
  } finally {
    releaseArt?.();
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
