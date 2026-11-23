"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const current=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),previous=path.resolve("exports/Dash-Punch-BackOut-Release-2026-11-14"),roots=[current,previous];
(async()=>{let browser;const servers=[];try{
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const pages=[],errors=[];
 for(const root of roots){const {server}=require(path.join(root,"server.js"));servers.push(server);await new Promise(r=>server.listen(0,"127.0.0.1",r));const p=await browser.newPage({viewport:{width:1280,height:720}});p.on("pageerror",e=>errors.push(e.stack));
  await p.route("**/game.js",async route=>{const r=await route.fetch(),source=await r.text();await route.fulfill({response:r,body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("      drawDebugHitboxes();","")});});await p.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.DashTypography.status==="ready"&&window.__dashPunchDebug);await p.evaluate(async()=>{for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();});pages.push(p);
 }
 const stages=await pages[0].evaluate(()=>window.Dashball.ARENAS.map(a=>a.id)),results=[];
 const cases=[...stages.map(id=>({type:"dashball",id})),...["race","brawl","scramble"].map(id=>({type:"sandbag",id})),...[1,-1].flatMap(sign=>["x","y"].map(axis=>({type:"flip",axis,sign})))];
 for(const c of cases){const outputs=[];for(const p of pages){
   await p.evaluate(c=>{const d=window.__dashPunchDebug;Math.random=()=>.5;if(c.type==="flip"){d.dashball.standard();d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf("Flip Chamber"),characterKeys:["orbit","rain"],seed:55});d.gravity.setDirection(c.axis,c.sign);}else{d[c.type].setup(c.type==="sandbag"?{ruleset:c.id,teamSize:3}:{arena:c.id,teamSize:3},{characters:["orbit","rain","boomerangus"],ai:true,seed:55});for(let n=0;n<36;n++)d[c.type].step();}d.stagePresentation.draw();},c);
   await p.waitForFunction(()=>[...document.images].every(i=>i.complete));await p.waitForTimeout(60);
   outputs.push(await p.evaluate(()=>{const d=window.__dashPunchDebug;const before=d.online.rollback.hash();d.stagePresentation.draw();const pixels=document.getElementById("game").getContext("2d").getImageData(0,0,1280,720).data;let hash=2166136261;for(const value of pixels)hash=Math.imul(hash^value,16777619);return {pixels:hash>>>0,before,after:d.online.rollback.hash()};}));
  }assert.equal(outputs[0].pixels,outputs[1].pixels,JSON.stringify({case:c,outputs}));assert.equal(outputs[0].before,outputs[0].after);assert.equal(outputs[1].before,outputs[1].after);results.push({...c,pixelHash:outputs[0].pixels});
 }
 assert.deepEqual(errors,[]);fs.mkdirSync("artifacts/sports-previews",{recursive:true});fs.writeFileSync("artifacts/sports-previews/live-render-parity.json",JSON.stringify({passed:true,current,previous,results,errors},null,2));console.log(JSON.stringify({passed:true,unchangedLiveRenders:results.length,errors}));
}finally{if(browser)await browser.close();for(const server of servers)await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
