"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),out="artifacts/menu-back",{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});const errors=[];
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.stack));
  await page.addInitScript(()=>{window.menuNow=10000;Object.defineProperty(performance,"now",{value:()=>window.menuNow});window.pads=Array.from({length:6},(_,i)=>({index:i+2,id:`Couch Pad ${i+2}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});});
  const source=fs.readFileSync(path.join(root,"game.js"),"utf8");await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;")}));
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  async function tick(seconds=.02){await page.evaluate(seconds=>{window.menuNow+=Math.round(seconds*1000);const d=window.__dashPunchDebug;d.sharedMenu.poll(seconds);d.radialMenu?.draw(performance.now());},seconds);}
  async function button(index,n,down){await page.evaluate(([index,n,down])=>{const p=window.pads.find(p=>p.index===index);p.buttons[n]={pressed:down,value:down?1:0};},[index,n,down]);await tick(0);}
  async function press(index,n){await button(index,n,true);await button(index,n,false);await tick(.2);}
  async function screen(name){assert.equal(await page.locator(`[data-menu-screen="${name}"]`).count(),1,name);}
  const click=name=>page.getByRole("button",{name,exact:true}).click();
  await tick(.2);await click("Play");await tick(.2);await button(2,1,true);await tick(3);await screen("mode");await button(2,1,false); // Unjoined cannot exit.
  await click("Local");await tick(.2);for(const i of[2,3,4,5,6,7])await press(i,9);
  assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots)).filter(s=>s.device!==null&&!s.empty&&!s.cpu).length,6);
  // The owner keeps immediate private-card Back, View and Start.
  await press(2,0);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.cards[0].view),"review");
  await press(2,1);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.cards[0].view),"browse");await screen("characters");
  await press(2,8);assert(!await page.evaluate(()=>window.__dashPunchDebug.lobby.cards[0].open));await press(2,9);assert(await page.evaluate(()=>window.__dashPunchDebug.lobby.cards[0].open));
  for(const i of[2,3,4,5,6,7])await press(i,8);
  await press(3,1);await screen("characters"); // Tap does not exit.
  await button(3,1,true);await tick(1.59);await screen("characters");assert(await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.backProgress>.98));
  for(const viewport of[{width:1280,height:720},{width:1920,height:1080}]){await page.setViewportSize(viewport);await page.screenshot({path:`${out}/hold-${viewport.width}.png`});const bounds=await page.locator(".menu-back-hold").boundingBox();assert(bounds&&bounds.y>=0&&bounds.y+bounds.height<=viewport.height);}
  await tick(.01);await screen("mode");await tick(3);await screen("mode");await button(3,1,false);
  // Independent timers; releases do not donate time to another player.
  await button(3,1,true);await tick(.8);await button(4,1,true);await button(3,1,false);await tick(.8);await screen("mode");await button(4,1,false);
  await button(4,1,true);await tick(.7);await page.evaluate(()=>window.dispatchEvent(new Event("blur")));await tick(2);await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await tick(2);await screen("mode");await button(4,1,false);
  // Disconnect/reconnect with Back held cannot finish a stale timer.
  await button(4,1,true);await tick(.7);await page.evaluate(()=>{window.saved=window.pads.find(p=>p.index===4);window.pads=window.pads.filter(p=>p.index!==4);});await tick(.2);await page.evaluate(()=>window.pads.push(window.saved));await tick(2);await screen("mode");await button(4,1,false);
  await page.keyboard.down("Escape");await tick(1.59);await screen("mode");await page.keyboard.up("Escape");assert.equal(await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.backProgress),0);
  await page.keyboard.down("Escape");await tick(1.6);await screen("start");await tick(3);await screen("start");await page.keyboard.up("Escape");
  // Clickable exits require a distinct, labeled confirmation.
  await click("Play");await tick(.2);await click("Back");await screen("mode");await click("Confirm Return");await screen("start");
  assert.deepEqual(errors,[]);
  // file:// verifies runtime loading without building another release.
  const offline=await browser.newPage();offline.on("pageerror",e=>errors.push(e.stack));
  // Reuse the existing offline asset embedding, without making another release.
  const embeddedArt=path.resolve("exports/Dash-Punch-Soccer-Grass-2026-11-16/presentation-assets.js");
  await offline.route("**/presentation-assets.js",r=>r.fulfill({contentType:"application/javascript",body:fs.readFileSync(embeddedArt,"utf8")}));
  await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");await offline.waitForFunction(()=>window.__dashPunchDebug);await offline.getByRole("button",{name:"Play",exact:true}).click();await offline.waitForTimeout(180);await offline.keyboard.press("Escape");assert.equal(await offline.locator('[data-menu-screen="mode"]').count(),1);await offline.keyboard.down("Escape");await offline.locator('[data-menu-screen="start"]').waitFor();await offline.keyboard.up("Escape");
  assert.deepEqual(errors,[]);const report={passed:true,controllers:6,simulated:true,physicalControllersTested:false,offline:true,errors};fs.writeFileSync(`${out}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
