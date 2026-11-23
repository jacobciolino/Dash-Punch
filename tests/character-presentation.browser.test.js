"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const keys=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"];
(async()=>{let browser;try{
  const out="artifacts/character-presentation";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  await page.evaluate(async keys=>{for(const key of keys){const set=window.DASH_PUNCH_ART.spriteSets[window.DASH_PUNCH_ART.assignments[key].spriteSet];for(const src of[...Object.values(set.clips).map(c=>c.src),set.streamFist?.src,set.magicFist,set.barbell?.src].filter(Boolean)){const image=new Image();image.src=src;await image.decode();}}},keys);
  await page.waitForFunction(keys=>keys.every(key=>Object.keys(window.DASH_PUNCH_ART.spriteSets[window.DASH_PUNCH_ART.assignments[key].spriteSet].clips).every(name=>window.__dashPunchDebug.characterPresentation.sheet(key,name))),keys);
  const sheets=await page.evaluate(keys=>{
    const d=window.__dashPunchDebug,P=window.DashFighterPresentation,results=[],hash=bytes=>bytes.reduce((sum,n)=>(Math.imul(sum,31)+n)>>>0,0),read=image=>{const c=document.createElement("canvas");c.width=image.naturalWidth||image.width;c.height=image.naturalHeight||image.height;const p=c.getContext("2d");p.drawImage(image,0,0);return p.getImageData(0,0,c.width,c.height).data;};
    const before=d.online.rollback.hash();
    for(const key of keys){const set=window.DASH_PUNCH_ART.spriteSets[window.DASH_PUNCH_ART.assignments[key].spriteSet];for(const name of Object.keys(set.clips)){
      const raw=d.characterPresentation.sheet(key,name,false,true),rawPixels=read(raw),original=hash(rawPixels),sheet=d.characterPresentation.sheet(key,name),pixels=read(sheet);
      let changed=0,softEdges=0,eyeChanges=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]!==rawPixels[i]||pixels[i+1]!==rawPixels[i+1]||pixels[i+2]!==rawPixels[i+2]||pixels[i+3]!==rawPixels[i+3]){changed++;if(pixels[i+3]!==0&&pixels[i+3]!==255)softEdges++;}}
      if(["rain","booster","lamer"].includes(key)&&name.startsWith("attack")){const clip=set.clips[name],w=clip.width||set.width,h=clip.height||set.height;sheet.characterDetail.frames.forEach((pose,frame)=>{if(!pose)return;for(let y=Math.max(0,Math.ceil(pose.head[1]+3));y<Math.min(h,pose.head[1]+10);y++)for(let x=Math.max(0,Math.ceil(pose.head[0]-4));x<Math.min(w,pose.head[0]+6);x++){const i=(((clip.row||0)*h+y)*(raw.naturalWidth||raw.width)+(frame+(clip.startFrame||0))*w+x)*4;if(rawPixels[i+1]>150&&rawPixels[i+1]>rawPixels[i]*1.45&&rawPixels[i+1]>rawPixels[i+2]*1.15&&rawPixels[i+3]&&pixels[i+3]!==rawPixels[i+3])eyeChanges++;}});}
      results.push({key,name,changed,softEdges,eyeChanges,removed:sheet.characterDetail?.removed||0,unchanged:hash(pixels)===original,sourceUnchanged:hash(read(d.characterPresentation.sheet(key,name,false,true)))===original,reused:sheet===d.characterPresentation.sheet(key,name)});
    }}
    return {results,pure:before===d.online.rollback.hash(),stats:d.characterPresentation.stats};
  },keys);
  assert(sheets.pure);assert(sheets.results.every(r=>r.sourceUnchanged&&r.reused&&r.softEdges===0&&r.eyeChanges===0),JSON.stringify(sheets.results.filter(r=>r.eyeChanges)));
  for(const key of["anchor","kite","spike","reflektor","boomerangus","chungus","defiplate","orbit"])assert(sheets.results.filter(r=>r.key===key).every(r=>r.unchanged),key);
  for(const key of["edgebert","booster","lamer","phantom","gunman","archer","whipado","lancer","microusb"])assert(sheets.results.some(r=>r.key===key&&r.name==="idle"&&r.changed>0),key);
  for(const key of["rain","reverso","booster","lamer"])assert(sheets.results.filter(r=>r.key===key).reduce((sum,r)=>sum+r.removed,0)>100,key);
  for(const[key,name]of[["archer","melee"],["lancer","attackAir"],["lancer","attackUp"],["lancer","attackDown"]])assert(sheets.results.some(r=>r.key===key&&r.name===name&&r.removed>0),`${key}/${name}`);
  const spear=await page.evaluate(()=>{const d=window.__dashPunchDebug;return ["idle","walk","dash","jump","hurt","death","attack1"].map(name=>({name,back:d.characterPresentation.sheet("lancer",name).characterDetail,held:d.characterPresentation.sheet("lancer",name,true).characterDetail}));});
  for(const r of spear){if(r.name!=="attack1")assert(r.back.frames.some(f=>f?.backSpear),r.name);assert(r.held.frames.every(f=>!f?.backSpear));}
  for(const name of["idle","walk","attack1","dash","jump","hurt","death"]){
    const data=await page.evaluate(({keys,name})=>{
      const d=window.__dashPunchDebug,c=document.createElement("canvas");c.width=1600;c.height=760;const p=c.getContext("2d");p.fillStyle="#18242c";p.fillRect(0,0,c.width,c.height);p.imageSmoothingEnabled=false;
      keys.forEach((key,index)=>{const set=window.DASH_PUNCH_ART.spriteSets[window.DASH_PUNCH_ART.assignments[key].spriteSet],clip=set.clips[name]||set.clips.idle,clipName=set.clips[name]?name:"idle",w=clip.width||set.width,h=clip.height||set.height,frame=name==="attack1"?clip.strikeFrames?.[0]??Math.floor(clip.frames*.55):Math.min(name==="hurt"?2:3,clip.frames-1),anchor=clip.frameAnchors?.[frame]?{pivotX:clip.frameAnchors[frame][0],foot:clip.frameAnchors[frame][1]+set.bodyHeight/2}:{pivotX:clip.pivotX??set.pivotX,foot:clip.foot??set.foot};
        const x=index%5*320,y=Math.floor(index/5)*190,scale=key==="chungus"?72/set.bodyHeight:key==="boomerangus"?2:3;
        p.fillStyle="#d9e4df";p.font=window.DashTypography.canvas(20,700);p.fillText(key.toUpperCase(),x+8,y+24);
        for(const[side,original]of[[0,true],[1,false]]){p.save();p.beginPath();p.rect(x+side*160,y+28,160,154);p.clip();p.translate(x+side*160+80,y+140);if(name==="walk")p.scale(-1,1);const sheet=d.characterPresentation.sheet(key,clipName,false,original);p.drawImage(sheet,(frame+(clip.startFrame||0))*w,(clip.row||0)*h,w,h,-anchor.pivotX*scale,-anchor.foot*scale,w*scale,h*scale);if(key==="rain"&&!original)d.characterPresentation.cloud(p,-12*scale,-(set.bodyHeight+8)*scale,scale,1);p.restore();}
        p.fillStyle="#92acb6";p.font=window.DashTypography.canvas(13,400);p.fillText("BEFORE",x+50,y+176);p.fillText("AFTER",x+213,y+176);
      });return c.toDataURL();
    },{keys,name});fs.writeFileSync(`${out}/roster-${name}-before-after.png`,Buffer.from(data.split(",")[1],"base64"));
  }
  const motion=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:0,characterKeys:["orbit","rain"],seed:19});const f=d.fighters[0];Object.assign(f,{x:600,y:400,onGround:false,dashCarryTimer:2,vx:600,hitstun:0,hitstop:0});
    for(let i=0;i<35;i++){f.x=600+Math.cos(i*.08)*140;f.y=400+Math.sin(i*.08)*90;d.characterPresentation.update(1/60);}
    const ghosts=d.characterPresentation.ghosts[0][1].samples,cloud=d.characterPresentation.clouds[0][1],before=rb.hash(),saved=rb.save();document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");d.camera.update(1);d.stagePresentation.draw();rb.restore(saved);
    return {samples:ghosts,cloud,pure:before===rb.hash(),restored:JSON.stringify(d.characterPresentation.ghosts[0][1].samples)===JSON.stringify(ghosts)};
  });assert(motion.samples.length>5&&motion.samples.length<=9);assert(motion.pure&&motion.restored);assert(new Set(motion.samples.map(p=>Math.round(p.y))).size>4);
  await page.locator("#game").screenshot({path:`${out}/orbit-curve-rain-cloud.png`});
  for(const dir of[1,-1]){
    const arm=await page.evaluate(dir=>{const d=window.__dashPunchDebug;d.online.rollback.setup({stageIndex:0,characterKeys:["chungus","lancer"],seed:19});d.fighters.forEach((f,i)=>Object.assign(f,{x:dir>0?280+i*650:680+i*350,y:470,onGround:false,vx:0,vy:0,face:{x:dir,y:0},invulnerable:0}));d.booster.punch(0,.5,{x:dir,y:0});const f=d.fighters[0];f.attack.age=f.attack.startup+f.attack.active*.55;d.fighters[1].chargingPunch=true;d.fighters[1].punchCharge=.5;d.camera.update(1);const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash()};},dir);assert(arm.pure);await page.waitForTimeout(200);await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await page.locator("#game").screenshot({path:`${out}/chungus-arm-lancer-held-${dir}.png`});
  }
  const scenes=[];
  for(const width of[1280,1920])for(const group of[0,1]){
    await page.setViewportSize({width,height:width*9/16});const scene=await page.evaluate(({keys,group})=>{
      const d=window.__dashPunchDebug,characters=group?keys.slice(10).concat("rain"):keys.slice(0,10);d.dashball.setup({arena:"golden-rush",ruleset:"battle",teamSize:5},{characters,ai:true,seed:19});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
      document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");
      d.fighters.forEach((f,i)=>{Object.assign(f,{x:170+i*240,y:1050,onGround:true,vx:0,vy:0,invulnerable:0,costume:i%4});if(i%3===0||["chungus","reverso","booster","lamer","lancer"].includes(characters[i]))d.booster.punch(i,.6,{x:i%2?-1:1,y:-.2});if(f.attack)f.attack.age=f.attack.startup+f.attack.active*.25;});
      d.characterPresentation.update(1/60);d.camera.update(1);const before=d.online.rollback.hash();d.stagePresentation.draw();return {fighters:d.fighters.length,pure:before===d.online.rollback.hash(),stats:d.characterPresentation.stats};
    },{keys,group});assert(scene.pure&&scene.fighters===10);scenes.push({width,group,...scene});await page.waitForTimeout(200);await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await page.locator("#game").screenshot({path:`${out}/gameplay-${group}-${width}.png`});
  }
  const performanceSample=await page.evaluate(()=>{const d=window.__dashPunchDebug,times=[];for(let n=0;n<160;n++){const start=performance.now();d.online.rollback.step([]);d.stagePresentation.draw();if(n>39)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {samples:times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1),stats:d.characterPresentation.stats};});
  assert(performanceSample.stats.sheets<=128&&performanceSample.stats.pixels<=4_000_000&&performanceSample.stats.ghosts<=90);assert.deepEqual(errors,[]);
  const ghostStress=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush",ruleset:"battle",teamSize:5},{characters:Array(10).fill("orbit"),ai:false,seed:19});const times=[];for(let n=0;n<90;n++){d.fighters.forEach((f,i)=>Object.assign(f,{x:150+i*235+Math.cos(n*.04)*45,y:650+Math.sin(n*.04+i)*70,vx:600,onGround:false,dashCarryTimer:3,hitstop:0,hitstun:0}));const start=performance.now();d.characterPresentation.update(1/60);d.stagePresentation.draw();if(n>30)times.push(performance.now()-start);}times.sort((a,b)=>a-b);const peak=d.characterPresentation.stats.ghosts;d.fighters.forEach(f=>f.dashCarryTimer=0);for(let n=0;n<40;n++)d.characterPresentation.update(1/60);return {peak,remaining:d.characterPresentation.stats.ghosts,p95:times[Math.floor(times.length*.95)],max:times.at(-1)};});assert(ghostStress.peak>50&&ghostStress.peak<=90);assert.equal(ghostStress.remaining,0);
  const offline=await browser.newPage(),requests=[];offline.on("pageerror",e=>errors.push(e.message));offline.on("request",r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const embedded=path.resolve("exports/Release-2026-11-21-Verified/Dash Punch V1 - 2026-11-21");
  for(const file of["presentation-assets.js","typography.css"])await offline.route(`**/${file}`,r=>r.fulfill({contentType:file.endsWith("css")?"text/css":"application/javascript",body:fs.readFileSync(path.join(embedded,file),"utf8")}));
  await offline.goto(pathToFileURL(path.resolve("index.html")).href+"?debugHitboxes=1");
  await offline.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  await offline.waitForFunction(()=>["rain","reverso","edgebert","phantom","lancer"].every(key=>window.__dashPunchDebug.characterPresentation.sheet(key,"attack1")));
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);await offline.close();
  fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,sheets, spear,motion,scenes,performanceSample,ghostStress,offline:true,errors,benchmark:"Headless ten-CPU update/render sample; ghost stress uses ten synthetic native dash poses. Neither is physical hardware or subjective readability certification."},null,2));console.log(JSON.stringify({passed:true,sheets:sheets.results.length,scenes:scenes.length,performanceSample,ghostStress,offline:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
