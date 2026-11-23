"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/status-auras";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {if(window.statusFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("drawDebugHitboxes();","");await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  await page.evaluate(async()=>{
    window.statusFreeze=true;const d=window.__dashPunchDebug;d.dashball.setup({arena:"dash-pong",ruleset:"battle",teamSize:3},{characters:["anchor","rain","spike","booster","lamer","phantom"],ai:false,seed:118});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
    document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");
    const images=Object.values(window.DASH_PUNCH_ART.spriteSets).flatMap(set=>Object.values(set.clips||{}).flatMap(clip=>clip.src?[clip.src]:[]));await Promise.all(images.map(src=>{const i=new Image();i.src=src;return i.decode().catch(()=>{});}));
    d.fighters.forEach((f,i)=>{f.x=(i+.5)*d.dashball.arena.width/6;f.y=d.dashball.arena.floorY-f.data.height/2;f.prevX=f.x;f.prevY=f.y;f.invulnerable=0;f.onGround=true;if(i%3!==1)d.booster.apply(i,1);if(i%3!==0){d.lamer.apply(i);d.lamer.apply(i);}});d.camera.update(1);
    const s=d.online.rollback.save();s.core.stageTime=.31;d.online.rollback.restore(s);
  });
  const scenes=[];for(const width of[1280,1920])for(const inverted of[false,true]){
    await page.setViewportSize({width,height:width*9/16});const result=await page.evaluate(inverted=>{const d=window.__dashPunchDebug;d.gravity.setDirection("y",inverted?-1:1);const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),count:d.fighters.length};},inverted);assert(result.pure&&result.count===6);await page.locator("#game").screenshot({path:`${out}/${inverted?"inverted":"normal"}-${width}.png`});scenes.push({width,inverted,...result});
  }
  const samples=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,f=d.fighters[0],c=document.createElement("canvas");c.width=250;c.height=200;const p=c.getContext("2d");d.gravity.setDirection("y",1);d.booster.apply(0,1);d.lamer.apply(0);
    const sample=(kind,time)=>{p.clearRect(0,0,250,200);p.save();p.translate(125-f.x,100-f.y);d.statusAuras.draw(0,kind,time,p);p.restore();const data=p.getImageData(0,0,250,200).data;let count=0;for(let i=3;i<data.length;i+=4)if(data[i])count++;return {count,url:c.toDataURL()};};
    const hash=d.online.rollback.hash(),boosted=sample("boosted",.2),next=sample("boosted",.3),lamed=sample("lamed",.2);f.koScored=true;const ko=sample("boosted",.2);f.koScored=false;
    return {boosted,lamed,animated:boosted.url!==next.url,ko:ko.count,pure:hash===d.online.rollback.hash()};
  });assert(samples.boosted.count>0&&samples.lamed.count>0&&samples.animated&&samples.ko===0&&samples.pure);
  for(const kind of["boosted","lamed"])fs.writeFileSync(`${out}/${kind}.png`,Buffer.from(samples[kind].url.split(",")[1],"base64"));
  const crowd=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"dash-pong",ruleset:"battle",teamSize:5},{characters:["anchor"],ai:false,seed:118});d.matchFlow.begin({countdown:false});d.fighters.forEach((f,i)=>{d.booster.apply(i,1);for(let n=0;n<3;n++)d.lamer.apply(i);});d.camera.update(1);const hash=d.online.rollback.hash(),times=[];for(let n=0;n<60;n++){const start=performance.now();d.stagePresentation.draw();if(n>=20)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {count:d.fighters.length,pure:hash===d.online.rollback.hash(),p95:times[Math.floor(times.length*.95)]};});assert(crowd.count===10&&crowd.pure);assert.deepEqual(errors,[]);
  const report={passed:true,scenes,animated:samples.animated,crowd,errors};fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
