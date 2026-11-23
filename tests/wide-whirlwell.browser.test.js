"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/wide-whirlwell";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding"]});
  const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[],views=[],timings=[];
  p.on("pageerror",e=>errors.push(e.stack));p.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await p.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`,click=name=>p.getByRole("button",{name,exact:true}).click();await p.goto(url);
  await click("Play");await click("Dashball");await click("Choose Fighters");
  if(!await p.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await p.locator('[data-menu-action="waitingCpu"][data-slot="1"]').click();
  await p.locator('[data-player-slot="0"] [data-field="open"]').click();await p.locator('[data-player-slot="0"] [data-field="confirm"]').click();await p.locator('[data-player-slot="0"] [data-field="ready"]').click();await click("Choose Stage");await p.waitForFunction(()=>window.__dashPunchDebug.sportsGuide.ready);
  const names=await p.evaluate(()=>Object.fromEntries(Object.entries(window.DashArenaVariants.WIDE).map(([k,v])=>[k,v.name]))),order=await p.locator(".stage-tile .tile-name").allTextContents();
  for(const [id,base]of [["standard-wide","Soccer"],["field-goal-wide","Field Goal"]]){
    assert.equal(order[order.indexOf(base)+1],names[id]);await click(names[id]);assert.match(await p.locator("#sportsStageFocus").textContent(),/1.75x/);
    for(const width of [1280,1920]){await p.setViewportSize({width,height:width===1280?720:1080});await p.screenshot({path:`${out}/${id}-select-${width}.png`});}
  }
  await click("Field Goal Settings");assert.equal(await p.locator('[data-menu-screen="dashballSetup"] .menu-title').textContent(),names["field-goal-wide"]);await click("Back");await click("Start Dashball");
  await p.locator("#menuLayer").waitFor({state:"hidden",timeout:15000});await p.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state.phase==="playing");assert.equal(await p.evaluate(()=>window.__dashPunchDebug.dashball.state.config.arena),"field-goal-wide");
  await p.goto(url);await click("Play");await click("Local");
  if(!await p.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await p.locator('[data-menu-action="waitingCpu"][data-slot="1"]').click();
  await p.locator('[data-player-slot="0"] [data-field="open"]').click();await p.locator('[data-player-slot="0"] [data-field="confirm"]').click();await p.locator('[data-player-slot="0"] [data-field="ready"]').click();await click("Choose Stage");await click("Whirlwell");
  for(const width of [1280,1920]){await p.setViewportSize({width,height:width===1280?720:1080});const shape=await p.locator('.stage-preview-large .stage-part[style*="boulder.png"]').evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};});assert(Math.abs(shape.width-shape.height)<1,"circular platform preview must not stretch");await p.screenshot({path:`${out}/Whirlwell-select-${width}.png`});}
  await click("Fight");await p.locator("#menuLayer").waitFor({state:"hidden",timeout:15000});await p.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state.phase==="playing");assert.equal(await p.evaluate(()=>window.__dashPunchDebug.arena.definition.name),"Whirlwell");
  await p.evaluate(()=>{window.filmFreeze=true;document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");});
  async function setup(name,ai=false){return p.evaluate(async({name,ai})=>{
    const d=window.__dashPunchDebug,characters=["chungus","boomerangus","orbit","spike","rain","edgebert","gunman","archer","kite","whipado"];
    if(name==="Whirlwell"){d.dashball.standard();d.ai.configure({stageName:name,teamModeId:"teams2",teams:characters.map((_,i)=>i%2),characters});}else d.dashball.setup({arena:name,teamSize:5},{characters,ai,seed:319});
    d.matchFlow.begin({countdown:false});
    const sources=new Set(["assets/dashball/boulder.png"]);for(const f of d.fighters){const set=window.DASH_PUNCH_ART.spriteSets[f.data.spriteSet];for(const c of Object.values(set.clips))for(const src of [c.src,c.unarmedSrc])if(src)sources.add(src);}
    for(const src of sources){const image=new Image();image.src=src;await image.decode();}d.camera.update(1);d.stagePresentation.draw();return {count:d.fighters.length,stage:d.arena.definition};
  },{name,ai});}
  for(const width of [1280,1920])for(const name of ["standard-wide","field-goal-wide","Whirlwell"]){
    await p.setViewportSize({width,height:width===1280?720:1080});const start=await setup(name);assert.equal(start.count,10);
    const view=await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.arena.definition,c=d.camera.state,before=d.online.rollback.hash();d.stagePresentation.draw();const canvas=document.getElementById("game"),pixels=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;let bright=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>120||pixels[i+1]>120||pixels[i+2]>120)bright++;return {camera:c,pure:before===d.online.rollback.hash(),bright,width:s.width,height:s.height};});
    assert(view.pure&&view.bright>2500);assert(view.width*view.camera.zoom+view.camera.offset.x<=1280.01);assert(view.height*view.camera.zoom+view.camera.offset.y<=720.01);await p.locator("#game").screenshot({path:`${out}/${name}-${width}.png`});views.push({name,viewport:width,...view});
  }
  await setup("Whirlwell");
  const wheel=await p.evaluate(()=>{
    const d=window.__dashPunchDebug,s=d.arena.definition,f=d.fighters[0];Object.assign(f,{x:800,y:s.rotor.y-s.rotor.radius-f.data.height/2-5,prevX:800,prevY:s.rotor.y-s.rotor.radius-f.data.height/2-5,onGround:false,vx:0,vy:100});
    for(let i=0;i<10;i++){d.advancePlatforms(1/60);d.gravity.physics(0);}const x=f.x;
    const sample=()=>{d.stagePresentation.draw();const c=document.getElementById("game"),v=d.camera.state,px=Math.round((800-v.x)*v.zoom+v.offset.x),py=Math.round((464-v.y)*v.zoom+v.offset.y),pixels=c.getContext("2d").getImageData(px-50,py-50,100,100).data;let h=2166136261;for(const n of pixels)h=Math.imul(h^n,16777619);return h;};
    const before=sample();for(let i=0;i<45;i++){d.advancePlatforms(1/60);d.gravity.physics(0);}return {dx:f.x-x,grounded:f.onGround,changed:before!==sample()};
  });assert(wheel.dx>40&&wheel.grounded&&wheel.changed);
  const pit=await p.evaluate(()=>{const d=window.__dashPunchDebug,f=d.fighters[0],s=d.arena.definition;Object.assign(f,{x:800,y:s.height+f.data.height/2+60,prevY:s.height+f.data.height/2+60,vx:0,vy:500,onGround:false});d.gravity.physics(0,0);const y=f.y;for(let i=0;i<60;i++){d.advancePlatforms(1/60);d.gravity.physics(0);}return {y,grounded:f.onGround,surface:f.groundTerrainId};});assert(pit.y<0&&pit.grounded);assert.equal(pit.surface,"whirlwell:rotor");
  await p.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.standard();d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf("Whirlwell"),characterKeys:["orbit","spike"],seed:3});d.matchFlow.begin({countdown:false});const f=d.fighters[0];Object.assign(f,{x:400,y:832-f.data.height/2,prevX:400,prevY:832-f.data.height/2,vx:0,vy:0,onGround:true,hitstun:0});d.updateHumanInput(0);d.sharedMenu.poll();});await p.keyboard.down("d");
  const keyboard=await p.evaluate(()=>{const d=window.__dashPunchDebug,x=d.fighters[0].x;for(let i=0;i<30;i++){d.sharedMenu.poll();d.arena.stepAI();}return d.fighters[0].x-x;});await p.keyboard.up("d");assert(keyboard>20);
  await p.setViewportSize({width:1280,height:720});for(const name of ["standard-wide","field-goal-wide","Whirlwell"]){
    await setup(name,true);await p.evaluate(()=>window.filmFreeze=false);await p.waitForTimeout(1000);
    const result=await p.evaluate(()=>new Promise(resolve=>{let last;const times=[];let weapons=0;function sample(now){const d=window.__dashPunchDebug;weapons=Math.max(weapons,d.fighters.flatMap(f=>f.projectiles).length);if(last!==undefined)times.push(now-last);last=now;if(times.length<180)return requestAnimationFrame(sample);times.sort((a,b)=>a-b);resolve({median:times[90],p95:times[171],over25:times.filter(t=>t>25).length,weapons,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}requestAnimationFrame(sample);}));assert(result.finite);await p.evaluate(()=>window.filmFreeze=true);timings.push({name,...result});
  }
  const offline=await browser.newPage({viewport:{width:1280,height:720}});offline.on("pageerror",e=>errors.push(e.stack));await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");await offline.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  const file=await offline.evaluate(async()=>{const d=window.__dashPunchDebug,results=[];document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");for(const name of ["standard-wide","field-goal-wide","Whirlwell"]){if(name==="Whirlwell"){d.dashball.standard();d.ai.configure({stageName:name});}else d.dashball.setup({arena:name});d.matchFlow.begin({countdown:false});for(let i=0;i<60;i++)d.arena.stepAI();d.camera.update(1);d.stagePresentation.draw();results.push({name,width:d.arena.definition.width,fighters:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}return results;});assert(file.every(r=>r.finite));await offline.screenshot({path:`${out}/offline-whirlwell.png`});await offline.close();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,root,views,wheel,pit,keyboardTravel:keyboard,timings,offline:file,errors,missing,physicalControllersTested:false,benchmark:"180 rAF intervals per stage, ten CPUs, headless software Chrome; not a physical-controller or hardware performance guarantee."};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
