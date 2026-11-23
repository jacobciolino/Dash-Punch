"use strict";
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.pad={index:0,id:"GameCube Standard Adapter",mapping:"standard",connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      window.pads=[window.pad];Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});
    });
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
    await page.goto(url);await page.waitForTimeout(200);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    const press=async b=>{await page.evaluate(b=>window.pad.buttons[b]={pressed:true,value:1},b);await page.waitForTimeout(180);await page.evaluate(b=>window.pad.buttons[b]={pressed:false,value:0},b);await page.waitForTimeout(220);};
    const bindings=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("dashPunch.controls.v1"))?.[0]);
    // Keyboard-only access to Settings and mapping.
    await page.getByRole('button',{name:'Settings',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Controls / Button Mapping',exact:true}).focus();
    await page.keyboard.press('Enter');
    await click('Reset to Defaults');
    assert.deepEqual((await bindings()).gamepad.dash,[0,4,6]);
    assert.deepEqual((await bindings()).gamepad.punch,[1,5,7]);
    await page.waitForTimeout(250);
    // Real menu confirm starts capture; that same held button is not assigned.
    await page.locator('[data-binding="punch"]').focus();
    await press(0);assert((await page.locator('[data-binding="punch"]').innerText()).includes('Press a key'));
    await press(10);
    assert.deepEqual((await bindings()).gamepad.punch,[1,5,7,10]);
    await page.locator('[data-binding="dash"]').click();await page.keyboard.press('g');
    assert((await bindings()).keyboard.dash.includes('KeyG'));
    await page.reload();await click('Settings');await click('Controls / Button Mapping');
    assert.deepEqual((await bindings()).gamepad.punch,[1,5,7,10]);
    assert((await page.locator('[data-binding="dash"]').innerText()).includes('G'));
    // Disconnect/reconnect keeps the custom device profile.
    await page.evaluate(()=>window.pads=[]);await page.waitForTimeout(150);
    await page.evaluate(()=>window.pads=[window.pad]);await page.waitForTimeout(150);
    assert.deepEqual((await bindings()).gamepad.punch,[1,5,7,10]);
    // Combat action state must union aliases before generating edges.
    await click('Next Player');await page.locator('[data-binding="dash"]').click();await press(11);
    const separate=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashPunch.controls.v1')));
    assert(separate[1].gamepad.dash.includes(11));assert(!separate[0].gamepad.dash.includes(11));
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.fighters[1].controls.gamepadIndex),null,'mapping stole another player device');
    await click('Previous Player');
    const action=()=>page.evaluate(()=>window.__dashPunchDebug.fighters[0].controls.actions);
    await page.evaluate(()=>{window.pad.buttons[5]={pressed:true,value:1};window.pad.buttons[4]={pressed:true,value:1};});await page.waitForTimeout(100);
    assert.deepEqual(await action(),{dashHeld:true,punchHeld:true});
    await page.evaluate(()=>{Object.assign(window.__dashPunchDebug.fighters[0].controls.buffers,{punchPressed:.09,dashPressed:.09});for(let i=0;i<20;i++)window.__dashPunchDebug.updateHumanInput(0);});
    assert(await page.evaluate(()=>window.__dashPunchDebug.fighters[0].punchCharge>0 && window.__dashPunchDebug.fighters[0].dashCharge>0));
    await page.evaluate(()=>{window.pad.buttons[7]={pressed:false,value:.8};window.pad.buttons[6]={pressed:false,value:.8};});await page.waitForTimeout(100);
    await page.evaluate(()=>{window.pad.buttons[5]={pressed:false,value:0};window.pad.buttons[4]={pressed:false,value:0};});await page.waitForTimeout(100);
    assert.deepEqual(await action(),{dashHeld:true,punchHeld:true},'partial release lost charge');
    await page.evaluate(()=>window.__dashPunchDebug.updateHumanInput(0));
    assert(await page.evaluate(()=>!window.__dashPunchDebug.fighters[0].attack && window.__dashPunchDebug.fighters[0].chargingPunch));
    await page.evaluate(()=>window.pad.buttons[6]={pressed:false,value:0});await page.waitForTimeout(100);
    assert.deepEqual(await action(),{dashHeld:false,punchHeld:true});
    await page.evaluate(()=>{window.__dashPunchDebug.fighters[0].controls.buffers.dashReleased=.09;window.__dashPunchDebug.updateHumanInput(0);});
    await page.evaluate(()=>window.pad.buttons[7]={pressed:false,value:0});await page.waitForTimeout(100);
    assert.deepEqual(await action(),{dashHeld:false,punchHeld:false});
    await page.evaluate(()=>{window.__dashPunchDebug.fighters[0].controls.buffers.punchReleased=.09;window.__dashPunchDebug.updateHumanInput(0);});
    assert(await page.evaluate(()=>!!window.__dashPunchDebug.fighters[0].attack),'final alias release must fire stored punch');
    // Combat aliases now also navigate menus; reopen after the synthetic holds.
    await page.reload();await click('Settings');await click('Controls / Button Mapping');
    await click('Reset to Defaults');assert.deepEqual((await bindings()).gamepad.punch,[1,5,7]);
    await page.screenshot({path:'/tmp/dash-button-mapping.png'});
    await page.waitForTimeout(220);
    await press(1);await page.locator('[data-menu-screen="settings"]').waitFor();
    await page.keyboard.press('Escape');await click("What's New");
    assert((await page.locator('.patch-entry').allTextContents()).join(' ').includes('Projectile'));
    await click('Back');await click('Play');await click('Local');await page.waitForTimeout(220);
    await press(9);await press(8); // Select closes only the private card.
    await page.getByRole('button',{name:'Back',exact:true}).focus();await press(0);
    await page.locator('[data-menu-screen="mode"]').waitFor();
    await page.getByRole('button',{name:'Settings',exact:true}).focus();await press(0);
    await page.locator('[data-menu-screen="settings"]').waitFor();
    assert.deepEqual(errors,[]);
    console.log('Controller mapping: keyboard/controller access, fresh-edge capture, aliases, GameCube digital/analog defaults, persistence/reconnect, simultaneous holds and partial releases, defaults and patch notes passed.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
