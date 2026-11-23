"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate"];
const coreStages=["Crosswire","Flip Chamber","Uplift","Perch","High Perch","High Perch Drift","Battlefield","Smash Vile","Corners","Enchanted Forest","Castle Dungeon"];
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.pad={index:0,id:"Experimental Menu Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.pad]});
    });
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    const toggle=()=>page.getByRole("switch",{name:"Experimental Content",exact:true});
    const press=async button=>{
      await page.evaluate(button=>window.pad.buttons[button]={pressed:true,value:1},button);await page.waitForTimeout(120);
      await page.evaluate(button=>window.pad.buttons[button]={pressed:false,value:0},button);await page.waitForTimeout(120);
    };
    const move=async x=>{
      await page.evaluate(x=>window.pad.axes=[x,0,0,0],x);await page.waitForTimeout(70);
      await page.evaluate(()=>window.pad.axes=[0,0,0,0]);await page.waitForTimeout(70);
    };
    const ready=async()=>{
      for(const slot of await page.evaluate(()=>window.__dashPunchDebug.lobby.slots)) {
        if(!slot.empty&&!slot.cpu&&!slot.ready)await page.locator(`[data-menu-action="slotReady"][data-slot="${slot.index}"]`).click();
      }
      await click("Choose Stage");
    };
    const stageNames=()=>page.locator(".stage-tile .tile-name").allTextContents();
    await page.goto(url);
    assert.equal(await toggle().getAttribute("aria-checked"),"false");
    const allKeys=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys);
    const allStages=await page.evaluate(()=>window.__dashPunchDebug.stageNames);
    await click("Play");await click("Local");
    assert.equal(await page.locator(".character-tile").count(),core.length);
    assert.equal(await page.locator(".experimental-legend").count(),0);
    assert((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots)).every(slot=>core.includes(slot.character)));
    await page.waitForTimeout(200);await press(9);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0);
    await move(-1);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].character),"defiplate","controller wrap selected a hidden fighter");
    await move(1);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].character),"anchor");
    await ready();assert.deepEqual(await stageNames(),coreStages);
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    // Keyboard reaches the switch through ordinary focus traversal; Dash toggles it.
    for(let i=0;i<8&&await page.evaluate(()=>document.activeElement?.dataset.menuAction!=="toggleExperimentalContent");i++)await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.menuAction),"toggleExperimentalContent");
    await page.waitForTimeout(200);
    await press(0);assert.equal(await toggle().getAttribute("aria-checked"),"true");
    await page.reload();assert.equal(await toggle().getAttribute("aria-checked"),"true");
    await click("Play");await click("Local");
    assert.equal(await page.locator(".character-tile").count(),allKeys.length);
    assert.equal(await page.locator(".experimental-legend").count(),1);
    const experimentalIndex=allKeys.findIndex(key=>!core.includes(key));
    await page.locator(`[data-menu-action="chooseCharacter"][data-character="${experimentalIndex}"]`).click();
    await ready();assert.equal((await stageNames()).length,allStages.length);
    assert((await stageNames()).some(name=>name.endsWith("*")));
    const experimentalStage=allStages.findIndex(name=>!coreStages.includes(name));
    await page.locator(`[data-menu-action="chooseStage"][data-stage="${experimentalStage}"]`).click();
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    const before=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash());
    await toggle().click();assert.equal(await toggle().getAttribute("aria-checked"),"false");
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),before,"main-menu toggle changed a match");
    await page.reload();assert.equal(await toggle().getAttribute("aria-checked"),"false");
    await click("Play");await click("Local");
    assert((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots)).every(slot=>core.includes(slot.character)));
    await ready();assert.deepEqual(await stageNames(),coreStages);
    assert.equal(await page.locator(".stage-tile.is-selected .tile-name").innerText(),"Crosswire","hidden saved stage remained selected");
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    await click("Extras");await click("Stage Builder");
    const builderCounts=await page.locator("[data-builder-test-character]").evaluateAll(selects=>selects.map(select=>select.options.length));
    assert(builderCounts.length&&builderCounts.every(count=>count===core.length));
    await page.keyboard.press("Escape");await click("Back");
    // The filter never changes protocol IDs or the simulation's complete content pool.
    assert.deepEqual(await page.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys),allKeys);
    assert.deepEqual(await page.evaluate(()=>window.__dashPunchDebug.stageNames),allStages);
    const customName=await page.evaluate(()=>{
      const d=window.__dashPunchDebug,document=d.stageBuilder.createBlank();
      document.metadata.id="experimental-filter-test";document.metadata.name="Filter Test";
      d.stageBuilder.setDocument(document);const index=d.stageBuilder.promote();return d.stageNames[index];
    });
    await click("Play");await click("Local");await ready();
    assert(!(await stageNames()).includes(customName+"*"));
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    await toggle().click();await click("Play");await click("Local");await ready();
    assert((await stageNames()).includes(customName+"*"),"custom stage was removed rather than hidden");
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    await toggle().click();await page.reload();
    assert(await page.evaluate(()=>window.__dashPunchDebug.stageBuilder.savedIds.includes("experimental-filter-test")));
    fs.mkdirSync("artifacts/experimental-content",{recursive:true});
    for(const [width,height] of [[1280,900],[960,720],[390,844]]) {
      await page.setViewportSize({width,height});
      const fit=await toggle().evaluate(button=>{const r=button.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth+1&&button.scrollWidth<=button.clientWidth+1;});
      assert(fit,"main-menu switch overflows");await page.screenshot({path:`artifacts/experimental-content/main-${width}.png`});
    }
    assert.deepEqual(errors,[]);
    console.log("Experimental filter: default Off, persisted On/Off, core/full local rosters and stages, controller wrap, keyboard/controller toggle, stale selection fallback, builder roster, retained custom stages, unchanged IDs/state and responsive main menu passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
