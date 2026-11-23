"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = process.env.CORE_RELEASE_DIR || path.resolve(__dirname, "..");
const { server } = require(path.join(root, "server.js"));
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || "chrome" });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [], missing = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.status() >= 400) missing.push(r.url()); });
    await page.addInitScript(() => {
      window.pad = { index: 0, id: "Projectile Controller", connected: true, mapping: "standard", axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.pad] });
    });
    await page.route("**/game.js", async route => {
      const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace("drawDebugHitboxes();", "") });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click = name => page.getByRole("button", { name, exact: true }).click();
    const button = async (index, held) => { await page.evaluate(({ index, held }) => window.pad.buttons[index] = { pressed: held, value: held ? 1 : 0 }, { index, held }); await page.waitForTimeout(100); };
    await click("Play"); await click("Local"); await page.waitForTimeout(200);
    await button(9, true); await button(9, false);
    assert.equal(await page.evaluate(() => window.__dashPunchDebug.lobby.slots[0].device), 0);
    const keys = await page.evaluate(() => window.__dashPunchDebug.online.rollback.characterKeys);
    for (const [index, key] of [[0, "gunman"], [1, "archer"]]) {
      await page.locator(`[data-menu-action="selectSlot"][data-slot="${index}"]`).click();
      await page.locator(`[data-menu-action="chooseCharacter"][data-character="${keys.indexOf(key)}"]`).click();
    }
    if (!await page.evaluate(() => window.__dashPunchDebug.lobby.slots[1].cpu)) await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click(); await click("Choose Stage");
    const stage = await page.evaluate(() => window.__dashPunchDebug.stageNames.indexOf("Perch"));
    await page.locator(`[data-menu-action="chooseStage"][data-stage="${stage}"]`).click(); await click("Fight");
    await page.locator("#menuLayer").waitFor({ state: "hidden", timeout: 30000 });
    await page.evaluate(() => {
      const d = window.__dashPunchDebug; d.updateHumanInput(1);
      Object.assign(d.fighters[1], { x: 1100, y: -1000, health: 10000 });
      window.shotsSeen = new Set(); window.maximumShots = 0;
      function count() { const shots = d.fighters[0].projectiles; window.maximumShots = Math.max(window.maximumShots, shots.length);
        for (const a of shots) window.shotsSeen.add(a.id); requestAnimationFrame(count); }
      requestAnimationFrame(count); window.pad.axes = [1, 0, 0, 0];
    });
    for (let i = 0; i < 16; i++) { await button(1, true); await button(1, false); }
    assert(await page.evaluate(() => window.shotsSeen.size > 3 && window.maximumShots === 3), "controller rapid firing/cap failed");
    await page.waitForFunction(()=>window.__dashPunchDebug.fighters[0].reloadRemaining===0);
    await button(7, true); await button(1, true); await button(1, false);
    assert(await page.evaluate(() => window.__dashPunchDebug.fighters[0].chargingPunch), "alias release accidentally fired Punch");
    await button(0, true); await button(0, false);
    assert(await page.evaluate(() => window.__dashPunchDebug.fighters[0].chargingPunch), "Dash release canceled held Punch");
    const seen = await page.evaluate(() => window.shotsSeen.size); await button(7, false);
    assert(await page.evaluate(previous => window.shotsSeen.size > previous, seen), "final Punch release did not fire");
    await page.keyboard.press("Escape");
    fs.mkdirSync("artifacts/projectile-rework", { recursive: true });
    const scenes = [];
    for (const scene of ["bullet-bounce", "arrow-up", "arrow-lodged", "owned-kickoff", "owned-ricochet"]) {
      const result = await page.evaluate(async scene => {
        const d = window.__dashPunchDebug, rb = d.online.rollback, key = scene.startsWith("arrow") ? "archer" : "gunman";
        rb.setup({ characterKeys: [key, "anchor"], stageIndex: rb.stageNames.indexOf("Perch"), seed: 91 });
        const [f, target] = d.fighters;
        Object.assign(f, { x: 220, y: 250, prevX: 220, prevY: 250, vx: 0, vy: 0, onGround: false });
        Object.assign(target, { x: 1100, y: 200 });
        function fire() {
          f.whiffLag = f.punchLockout = f.hitstop = 0;
          Object.assign(f.controls, { hasAim: true, aim: { x: 1, y: 0 } });
          for (const held of [true, false]) {
            f.controls.actions.punchHeld = held; f.controls.buffers[held ? "punchPressed" : "punchReleased"] = .09; d.updateHumanInput(0);
          }
          const a = f.attack; d.updateAttack(0, a.startup + 1e-9); return a;
        }
        const a = fire(), p = d.terrainArt.rects.find(t => t.kind === "oneway");
        for (let i = 0; i < 6; i++) { d.stagePresentation.draw(); await new Promise(resolve => setTimeout(resolve, 40)); }
        if (scene === "owned-kickoff") {
          Object.assign(f, { x: 500, y: 300, prevX: 470, prevY: 300, vx: 900, vy: 0, dashDir: { x: 1, y: 0 }, dashCarryTimer: .3, airDashes: 0, punchInputHeld: false });
          Object.assign(a.projectile, { x: 530, y: 300, speed: 0, kickoffReady: true }); d.updateProjectiles(0);
          if (a.projectile.generation !== 1 || f.airDashes !== 1) throw Error("browser Kickoff did not re-hit/refill");
        } else if (scene === "owned-ricochet") {
          const b = fire(); Object.assign(a.projectile, { x: 600, y: 300, speed: 1000 });
          Object.assign(b.projectile, { x: 650, y: 308, speed: 600 }); b.dir = { x: -1, y: 0 }; f.airDashes = 0;
          d.updateProjectiles(.05); if (!a.projectile.generation || f.airDashes !== f.data.maxAirDashes) throw Error("browser ricochet failed");
        } else {
          const up = scene === "arrow-up";
          Object.assign(a.projectile, { x: p.x + p.w / 2, y: p.y + (up ? 70 : -70), speed: 1000 });
          a.dir = { x: 0, y: up ? -1 : 1 }; d.updateProjectiles(.1);
          if (scene === "arrow-lodged" && f.projectiles.length) throw Error("arrow still active after platform hit");
          if (scene !== "arrow-lodged" && a.dir.y >= 0) throw Error("one-way platform direction rule failed");
        }
        let arrowDraws = 0;
        const proto = CanvasRenderingContext2D.prototype, original = proto.drawImage;
        proto.drawImage = function(image, ...args) { if (image.src?.includes("Arrow_Projectile")) arrowDraws++; return original.call(this, image, ...args); };
        const hash = rb.hash(); d.stagePresentation.draw(); proto.drawImage = original;
        if (hash !== rb.hash()) throw Error("render changed projectile state");
        if (scene === "arrow-lodged" && !arrowDraws) throw Error("lodged arrow artwork did not render");
        const canvas = document.querySelector("#game"), pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0; for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 255) opaque++;
        return { scene, active: f.projectiles.length, opaque, arrowDraws, image: canvas.toDataURL(), generation: a.projectile.generation };
      }, scene);
      assert(result.opaque > 500000);
      fs.writeFileSync(`artifacts/projectile-rework/${scene}.png`, Buffer.from(result.image.split(",")[1], "base64"));
      delete result.image; scenes.push(result);
    }
    // Return to live play for a deliberately projectile-heavy ten-fighter sample.
    const resume = page.getByRole("button", { name: "Resume Match", exact: true });
    if (await resume.count()) await resume.click();
    else if (await page.locator("#menuLayer").isVisible()) await page.keyboard.press("Escape");
    await page.locator("#menuLayer").waitFor({ state: "hidden" });
    await page.evaluate(() => {
      const d = window.__dashPunchDebug, stage = d.arena.setup("Castle Dungeon", { characters: ["gunman", "archer"], ai: true });
      for (const [i, f] of d.fighters.entries()) Object.assign(f, { x: 500 + i * 135, y: stage.floorY - f.data.height / 2, health: 10000 });
    });
    await page.waitForTimeout(1500);
    const timing = await page.evaluate(() => new Promise(resolve => {
      const samples = []; let last, peakShots = 0;
      function tick(now) {
        const d = window.__dashPunchDebug; peakShots = Math.max(peakShots, d.fighters.reduce((n, f) => n + f.projectiles.length, 0));
        if (last !== undefined) samples.push(now - last); last = now;
        if (samples.length < 180) return requestAnimationFrame(tick);
        samples.sort((a, b) => a - b); resolve({ median: samples[90], p95: samples[171], over25: samples.filter(n => n > 25).length,
          fighters: d.fighters.length, peakShots, finite: d.fighters.every(f => [f.x, f.y, f.vx, f.vy].every(Number.isFinite)) });
      }
      requestAnimationFrame(tick);
    }));
    assert(timing.fighters === 10 && timing.finite && timing.peakShots > 5, JSON.stringify(timing));
    await page.locator("#game").screenshot({ path: "artifacts/projectile-rework/ten-projectile-fighters.png" });
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    const report = { tests: "passed", root, realGamepadPolling: true, aliasHolds: true, simultaneousDashPunch: true, scenes, timing };
    fs.writeFileSync("artifacts/projectile-rework/browser-results.json", JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
