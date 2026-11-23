"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/own-goals";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[],results=[];
  page.on("pageerror",e=>errors.push(e.stack));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  await page.evaluate(()=>{window.filmFreeze=true;document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");});
  async function shoot(arena,team,teamSize=1){return page.evaluate(({arena,team,teamSize})=>{
    const d=window.__dashPunchDebug;d.dashball.setup({arena,teamSize},{characters:["orbit","rain","edgebert","boomerangus","archer"],ai:false,seed:271});
    const f=d.fighters[team],g=d.dashball.arena.goals[team],b=d.dashball.state.ball,basket=g.line===undefined,sign=team?1:-1,dir={x:basket?0:sign,y:basket?1:0};
    const x=basket?(g.left+g.right)/2:g.line-sign*45,y=basket?g.top-45:(g.top+g.bottom)/2;
    d.fighters.forEach((p,i)=>{if(p!==f){const px=480+Math.floor(i/2)*165+(p.team?1000:0),py=d.dashball.arena.floorY-p.data.height/2;Object.assign(p,{x:px,y:py,prevX:px,prevY:py,onGround:true});}});
    Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,invulnerable:0,chargingPunch:true,punchInputHeld:true,punchCharge:.3,punchAim:dir,aim:dir});
    Object.assign(b,{x:basket?x:x+sign*27,y:basket?y+40:y,vx:basket?0:-sign*700,vy:basket?-700:0});
    const before={x:b.x,y:b.y};d.dashball.ballStep();d.dashball.ballStep();d.camera.update(1);d.dashball.debug(false);d.stagePresentation.draw();
    return {arena,team,teamSize,before,after:{x:b.x,y:b.y},scores:[...d.dashball.state.scores],serial:d.dashball.state.goalSerial,owner:b.ownerTeam,announcement:d.dashball.state.announcement,fighters:d.fighters.length};
  },{arena,team,teamSize});}
  for(const width of [1280,1920]){
    await page.setViewportSize({width,height:width===1280?720:1080});
    for(const arena of ["standard","standard-open","gravity-soccer","gravity-soccer-open","elevated","elevated-open"])for(const team of [0,1]){
      const result=await shoot(arena,team,5);assert.equal(result.scores[1-team],1,`${arena}/${team}`);assert.equal(result.scores[team],0);assert.equal(result.serial,1);assert.equal(result.owner,team);assert.equal(result.fighters,10);
      if(arena==="standard"||arena==="elevated"){
        await page.evaluate(async()=>{const sources=new Set();for(const f of window.__dashPunchDebug.fighters){const set=window.DASH_PUNCH_ART.spriteSets[f.data.spriteSet];for(const clip of Object.values(set.clips))for(const src of [clip.src,clip.unarmedSrc])if(src)sources.add(src);}await Promise.all([...sources].map(async src=>{const i=new Image();i.src=src;await i.decode();}));window.__dashPunchDebug.stagePresentation.draw();});
        await page.locator("#game").screenshot({path:`${out}/${arena}-own-goal-team-${team}-${width}.png`});
      }
      results.push({width,...result});
    }
  }
  const dribbles=await page.evaluate(()=>{const d=window.__dashPunchDebug,R=window.DashRollback,results=[];
    for(const arena of ["standard","standard-open","gravity-soccer","gravity-soccer-open"])for(const team of [0,1])for(const ruleset of ["court","battle"]){
      d.dashball.setup({arena,ruleset},{characters:["orbit","rain"],ai:false});const f=d.fighters[team],g=d.dashball.arena.goals[team],b=d.dashball.state.ball,sign=team?1:-1,x=g.line-sign*90,y=d.dashball.arena.floorY-f.data.height/2;
      Object.assign(f,{x,y,prevX:x,prevY:y,onGround:true,vx:0,vy:0,invulnerable:0});Object.assign(d.fighters[1-team],{x:1280,y:400});
      Object.assign(b,{x:x+sign*50,y:d.dashball.arena.floorY-b.r-.01,vx:0,vy:0});
      for(let i=0;i<45;i++){const row=[R.decode(R.neutral()),R.decode(R.neutral())];row[team]=R.decode(R.encode({hasAim:true,aimX:sign}));d.online.rollback.step(row);}
      results.push({arena,team,ruleset,scores:[...d.dashball.state.scores],serial:d.dashball.state.goalSerial});
    }return results;
  });assert(dribbles.every(r=>r.scores[1-r.team]===1&&r.scores[r.team]===0&&r.serial===1));
  const offline=await browser.newPage({viewport:{width:1280,height:720}});offline.on("pageerror",e=>errors.push(e.stack));
  await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");
  await offline.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  const fileResults=await offline.evaluate(()=>{const d=window.__dashPunchDebug,results=[];
    for(const arena of ["standard","elevated"]){d.dashball.setup({arena},{characters:["orbit","rain"]});const f=d.fighters[0],g=d.dashball.arena.goals[0],b=d.dashball.state.ball,basket=arena==="elevated",dir={x:basket?0:-1,y:basket?1:0};
      const x=basket?(g.left+g.right)/2:g.line+45,y=basket?g.top-45:(g.top+g.bottom)/2;
      Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,invulnerable:0,chargingPunch:true,punchInputHeld:true,punchCharge:.3,punchAim:dir,aim:dir});
      Object.assign(b,{x:basket?x:x-27,y:basket?y+40:y,vx:basket?0:700,vy:basket?-700:0});d.dashball.ballStep();results.push({arena,scores:[...d.dashball.state.scores]});
    }return results;
  });assert(fileResults.every(r=>r.scores[1]===1&&r.scores[0]===0));await offline.close();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({passed:true,root,results,dribbles,offline:fileResults,errors,missing,physicalControllersTested:false},null,2));
  console.log(JSON.stringify({passed:true,browserCases:results.length,dribbleCases:dribbles.length,offline:fileResults,errors,missing}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
