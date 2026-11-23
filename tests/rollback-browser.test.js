"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { server } = require("../server");

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    const url = `http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`;
    browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const hostContext = await browser.newContext({viewport:{width:1280,height:900}});
    await hostContext.addInitScript(()=>localStorage.setItem("dashPunch.menuPreferences.v1",JSON.stringify({experimentalContent:true})));
    const guestContext = await browser.newContext({viewport:{width:1280,height:900}});
    await guestContext.addInitScript(() => {localStorage.setItem("dashPunch.modelStyles.v1",JSON.stringify(["block","block"]));localStorage.setItem("dashPunch.graphics.v1","classic");});
    const host = await hostContext.newPage(), guest = await guestContext.newPage();
    const errors = [];
    for (const page of [host,guest]) page.on("pageerror", error=>errors.push(error.message));
    await Promise.all([host.goto(url),guest.goto(url)]);
    for (const page of [host,guest]) {
      await page.getByRole("button",{name:"Play",exact:true}).click();
      await page.getByRole("button",{name:"Local",exact:true}).click();
      await page.getByRole("button",{name:"Back",exact:true}).click();
      await page.getByRole("button",{name:"Online 1v1",exact:true}).click();
    }
    await host.getByRole("button",{name:"Host Match",exact:true}).click();
    await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);
    const code = await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await guest.locator("#onlineRoomCode").fill(code);
    await guest.getByRole("button",{name:"Join Match",exact:true}).click();
    for (const page of [host,guest]) await page.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
    assert.equal(await host.evaluate(()=>window.__dashPunchDebug.online.state.transport),"webrtc");
    await host.getByRole("button",{name:"Choose Fighter",exact:true}).click();
    assert.equal(await host.locator(".character-tile").count(),await host.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys.length));
    await host.locator('[data-menu-action="chooseOnlineCharacter"][data-character="paul"]').click();
    const experimentalName=await host.locator(".online-player h3").first().innerText();
    await guest.waitForFunction(name=>document.querySelectorAll(".online-player h3")[1]?.textContent===name,experimentalName);
    await host.getByRole("button",{name:"Choose Fighter",exact:true}).click();
    await host.locator('[data-menu-action="chooseOnlineCharacter"][data-character="orbit"]').click();
    await guest.getByRole("button",{name:"Choose Fighter",exact:true}).click();
    assert.equal(await guest.locator(".character-tile").count(),13);
    await guest.locator('[data-menu-action="chooseOnlineCharacter"][data-character="gunman"]').click();
    for (const page of [host,guest]) await page.getByRole("button",{name:"Ready",exact:true}).click();
    await host.getByRole("button",{name:"Start Fight",exact:true}).click();
    for (const page of [host,guest]) await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>30);
    for (const page of [host,guest]) {
      await page.locator('[data-net="delay"]').selectOption("50");
      await page.locator('[data-net="jitter"]').selectOption("15");
      await page.locator('[data-net="loss"]').selectOption("0.05");
    }
    await host.keyboard.down("f");
    await host.keyboard.down("Shift");
    await host.keyboard.down("d");
    await guest.keyboard.down("f");
    await guest.keyboard.down("a");
    await host.waitForTimeout(180);
    await host.keyboard.up("Shift");
    await host.waitForTimeout(180);
    await host.keyboard.up("f");
    await guest.keyboard.up("f");
    await host.waitForTimeout(1200);
    await host.keyboard.up("d"); await guest.keyboard.up("a");
    for (const page of [host,guest]) await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>150);
    const stats = await Promise.all([host,guest].map(page=>page.evaluate(()=>({ ...window.__dashPunchDebug.online.rollback.stats, state:window.__dashPunchDebug.online.rollback.networkState }))));
    for (const item of stats) {
      assert.equal(item.state.paused,false,item.state.status);
      assert.match(item.hashStatus,/matched frame/);
    }
    assert(stats[0].rollbacks+stats[1].rollbacks>0,"real browser run never rolled back");
    const session = stats[0].state.id;
    await host.keyboard.press("Escape");
    for (const page of [host,guest]) await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);
    await host.getByRole("button",{name:"Rematch",exact:true}).click();
    for (const page of [host,guest]) await page.waitForFunction(previous=>window.__dashPunchDebug.online.rollback.networkState.id!==previous && window.__dashPunchDebug.online.rollback.frame>30,session);
    await guest.close();
    await host.waitForFunction(()=>!window.__dashPunchDebug.online.state.connected);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({tests:"passed",transport:"real WebRTC",contexts:2,latency:50,jitter:15,loss:0.05,pause:true,rematch:true,disconnect:true,stats}));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
