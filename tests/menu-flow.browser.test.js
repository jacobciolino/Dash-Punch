"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { server } = require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.addInitScript(()=>Object.defineProperty(navigator,"getGamepads",{value:()=>[]}));
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await click("Extras");await click("Stage Builder");
    await page.locator("#stageBuilderLayer").waitFor({state:"visible"});
    await page.keyboard.press("Escape");await click("Back");await click("Play");await click("Local");
    assert.equal(await page.locator(".slot-card").count(),10);
    assert(!(await page.getByRole("button",{name:"Choose Stage",exact:true}).isEnabled()));
    await page.locator('[data-player-slot="0"] [data-menu-action="slotReady"]').click();
    await page.locator('[data-player-slot="1"] [data-menu-action="slotReady"]').click();
    assert(await page.getByRole("button",{name:"Choose Stage",exact:true}).isEnabled());
    await page.getByRole("button",{name:"Team Attack: On",exact:true}).click();
    await page.reload();await click("Play");await click("Local");
    assert(await page.getByRole("button",{name:"Team Attack: Off",exact:true}).isVisible());
    await page.keyboard.press("o");await click("Controls");
    await page.locator('[data-binding="dash"]').click();await page.keyboard.press("g");
    assert((await page.locator('[data-binding="dash"]').innerText()).includes("G"));
    await click("Back");await click("Done");
    await page.reload();await click("Play");await click("Local");await page.keyboard.press("o");await click("Controls");
    assert((await page.locator('[data-binding="dash"]').innerText()).includes("G"));
    await click("Back");await click("Done");
    await page.locator('[data-player-slot="0"] [data-menu-action="slotReady"]').click();
    await page.locator('[data-player-slot="1"] [data-menu-action="slotReady"]').click();
    await click("Choose Stage");await click("Fight");
    await page.locator('[data-menu-screen="countdown"]').waitFor();
    await page.locator("#menuLayer").waitFor({state:"hidden"});
    await page.keyboard.press("Escape");assert(await page.getByRole("button",{name:"Resume Match",exact:true}).isVisible());
    await click("Local");
    for(const viewport of [{width:1280,height:900},{width:960,height:720}]) {
      await page.setViewportSize(viewport);
      const overflow=await page.locator('.character-tile').evaluateAll(tiles=>tiles.filter(tile=>{
        const r=tile.getBoundingClientRect(),n=tile.querySelector('.tile-name').getBoundingClientRect();
        return n.bottom>r.bottom+1||n.right>r.right+1;
      }).length);
      assert.equal(overflow,0,"roster label overflow");
      const overlap=await page.evaluate(()=>{
        const grid=document.querySelector('.character-grid').getBoundingClientRect();
        const slots=document.querySelector('.lobby-slots').getBoundingClientRect();
        const toolbar=document.querySelector('.lobby-toolbar').getBoundingClientRect();
        return grid.bottom>slots.top||toolbar.bottom>grid.top;
      });
      assert(!overlap,"lobby bands overlap");
      await page.screenshot({path:`/tmp/dash-lobby-${viewport.width}.png`});
    }
    assert.deepEqual(errors,[]);
    console.log("Menu flow: builder, keyboard/mouse ready gate, settings persistence, remapping persistence, countdown, pause, desktop/small-window labels and layout passed.");
  } finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
