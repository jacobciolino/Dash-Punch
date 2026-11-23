"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/local-hitstop";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],scenes=[],page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});
    for(const [name,key,target,charge,kind]of[["tap","anchor","rain",0,"hit"],["heavy","booster","anchor",1,"hit"],["finisher","edgebert","anchor",1,"hit"],["spear-clash","lancer","anchor",.5,"clash"],["spike-block","anchor","spike",0,"block"],["mirror-block","anchor","reflektor",0,"block"]]){
      await page.evaluate(async({key,target,charge,kind,name})=>{
        const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle",teamSize:1},{characters:[key,target],seed:41});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
        const[a,b]=d.fighters;for(const[f,x]of[[a,1100],[b,1175]])Object.assign(f,{x,y:900,prevX:x,prevY:900,onGround:false,invulnerable:0,hitstun:0,hitstop:0,health:1000,vx:0,vy:0});
        const set=window.DASH_PUNCH_ART.spriteSets[a.data.spriteSet],other=window.DASH_PUNCH_ART.spriteSets[b.data.spriteSet];await Promise.all([set.clips.attack1.src,set.clips.attack2?.src,set.clips.attack3?.src,other.clips.hurt.src].filter(Boolean).map(async src=>{const image=new Image();image.src=src;await image.decode();}));
        const punch=(index,dir)=>{d.booster.punch(index,charge,{x:dir,y:0});const f=d.fighters[index],a=f.attack,t=f.data.spear;a.age=a.startup+(t?t.extension[0]+(t.extension[1]-t.extension[0])*charge+.01:.001);return a;};
        let attack=punch(0,1);
        if(name==="finisher")for(let i=0;i<2;i++){d.updateAttack(0,attack.total-attack.age+.0001);attack=a.attack;attack.age=attack.startup+.001;}
        if(kind==="clash"){b.x=a.x+a.data.spear.reach;b.prevX=b.x;punch(1,-1);if(!d.firedUp.clash())throw Error("No spear clash");}
        else {if(kind==="block")Object.assign(b,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},shieldActiveTime:.1,shieldReactivationTimer:0});d.resolveHit(0,1);}
        d.camera.update(1);d.stagePresentation.draw();
      },{key,target,charge,kind,name});await page.waitForTimeout(120);
      const sample=await page.evaluate(()=>{
        const d=window.__dashPunchDebug,hash=d.online.rollback.hash(),camera=JSON.stringify(d.camera.state);d.stagePresentation.draw();const effects=d.impactFeedback.effects;
        const c=document.querySelector("#game"),p=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let colors=0;for(let i=0;i<p.length;i+=4)if(p[i]>230&&p[i+1]>150&&p[i+2]<140||p[i]<180&&p[i+1]>200&&p[i+2]>225)colors++;
        return {pure:hash===d.online.rollback.hash(),cameraUnchanged:camera===JSON.stringify(d.camera.state),effects,stops:d.fighters.map(f=>f.hitstop),shake:d.fighters.map((_,i)=>d.impactFeedback.shake(i)),slowMo:d.online.rollback.save().core.slowMo,screenShake:d.online.rollback.save().presentation.screenShake,colors};
      });assert(sample.pure&&sample.cameraUnchanged);assert(sample.colors>10);assert.equal(sample.slowMo,0);assert.equal(sample.screenShake,0);assert(sample.stops.every(n=>n>0&&n<=8/60));
      assert(sample.shake.every(p=>Math.abs(p.x)<=3&&Math.abs(p.y)<=3));if(kind==="clash")assert(sample.effects.some(p=>p.spearWithdraw));if(kind==="hit")assert(sample.effects.some(p=>p.combatImpact==="hitImpact"));
      await page.screenshot({path:`${out}/${name}-${width}.png`});scenes.push({name,width,stops:sample.stops,particleCount:sample.effects.filter(p=>p.combatImpact).length});
    }
  }
  const crowded=await page.evaluate(()=>{
    const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["anchor","rain","lancer","spike","boomerangus","reflektor","gunman","archer","edgebert","phantom"],ai:true,seed:41});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
    d.fighters.forEach((f,i)=>Object.assign(f,{x:1000+i*140,y:1700,prevX:1000+i*140,prevY:1700,onGround:false,invulnerable:0,health:1000,vx:0,vy:0}));
    for(let n=0;n<40;n++){const i=n%10,j=(i+1)%10,a=d.fighters[i],b=d.fighters[j];Object.assign(a,{attack:null,punchVisual:null,hitstop:0,hitstun:0,juked:0,punchLockout:0,whiffLag:0});b.invulnerable=0;d.booster.punch(i,.5,{x:1,y:0});if(a.attack&&!a.attack.projectile){a.attack.age=a.attack.startup+.001;d.resolveHit(i,j);}}
    const peak=d.impactFeedback.effects.filter(p=>p.combatImpact).length,hash=d.online.rollback.hash(),times=[];for(let n=0;n<50;n++){const start=performance.now();d.stagePresentation.draw();times.push(performance.now()-start);}times.sort((a,b)=>a-b);const pure=hash===d.online.rollback.hash();
    for(let n=0;n<20;n++)d.presentationEffects.step(1/60);
    return {peak,pure,median:times[25],p95:times[47],remaining:d.impactFeedback.effects.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))};
  });assert(crowded.peak<=256);assert(crowded.pure&&crowded.finite);assert.equal(crowded.remaining,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/ten-fighter.png`});fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,scenes,crowded,errors,limitations:"Headless rendering and simulated contacts; no physical-pad or subjective impact/balance certification."},null,2));console.log(JSON.stringify({passed:true,scenes:scenes.length,crowded,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
