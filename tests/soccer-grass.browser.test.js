"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const current=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),previous=path.resolve("exports/Dash-Punch-Boomerangus-Preview-2026-11-16"),out="artifacts/soccer-grass";
const fields=["standard","standard-wide","standard-open","gravity-soccer","gravity-soccer-open"];
(async()=>{let browser;const servers=[];try{
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});const errors=[],missing=[],results=[];
  async function open(root,offline=false){
    const {server}=require(path.join(root,"server.js"));if(!server.listening){await new Promise(r=>server.listen(0,"127.0.0.1",r));servers.push(server);}
    const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.stack));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
    await page.addInitScript(()=>{window.createdCanvases=[];const create=document.createElement.bind(document);document.createElement=(tag,...args)=>{const n=create(tag,...args);if(tag==="canvas")window.createdCanvases.push(n);return n;};});
    const source=fs.readFileSync(path.join(root,"game.js"),"utf8");await page.route("**/game.js",route=>route.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("      drawDebugHitboxes();","")}));
    await page.goto((offline?pathToFileURL(path.join(root,"index.html")).href:`http://127.0.0.1:${server.address().port}/`)+"?debugHitboxes=1");await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
    await page.evaluate(()=>{document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");});return page;
  }
  const old=await open(previous),page=await open(current);
  async function scene(p,arena,up=false){await p.evaluate(({arena,up})=>{const d=window.__dashPunchDebug;d.dashball.setup({arena,teamSize:5},{characters:["orbit","spike","chungus","boomerangus","gunman","archer","kite","rain","anchor","phantom"],ai:false,seed:476});if(up)d.gravity.setDirection("y",-1);d.camera.update(1);d.stagePresentation.draw();},{arena,up});await p.waitForTimeout(120);await p.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());}
  async function pixels(p){return p.evaluate(()=>{const d=window.__dashPunchDebug,canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),stage=d.dashball.arena,cam=d.camera.state,hash=d.online.rollback.hash();d.stagePresentation.draw();
    const x=Math.round(cam.offset.x+stage.width*.2*cam.zoom),y=Math.round(cam.offset.y+(stage.floorY+36)*cam.zoom),w=Math.floor(stage.width*.6*cam.zoom),h=Math.max(1,Math.floor(84*cam.zoom)),data=ctx.getImageData(x,y,w,h).data,colors=new Set();let green=0,ink=2166136261;
    for(let i=0;i<data.length;i+=4){if(data[i+1]>data[i]+12&&data[i+1]>data[i+2]+8)green++;colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);for(let c=0;c<4;c++)ink=Math.imul(ink^data[i+c],16777619);}
    return {green,area:w*h,colors:colors.size,pixelHash:ink>>>0,pure:hash===d.online.rollback.hash(),hash,fighters:d.fighters.length};
  });}
  for(const arena of fields){
    await scene(old,arena);await scene(page,arena);const before=await pixels(old),after=await pixels(page);
    assert.equal(after.hash,before.hash);assert(after.pure);assert.equal(after.fighters,10);assert(after.green>after.area*.95);assert(after.colors>=6);assert.notEqual(after.pixelHash,before.pixelHash);
    for(const viewport of[{width:1280,height:720},{width:1920,height:1080}]){await page.setViewportSize(viewport);await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await page.locator("#game").screenshot({path:`${out}/${arena}-${viewport.width}.png`});}
    results.push({arena,before,after});
  }
  await page.setViewportSize({width:1280,height:720});await scene(page,"gravity-soccer",true);assert((await pixels(page)).pure);await page.locator("#game").screenshot({path:`${out}/gravity-up-1280.png`});
  for(const arena of["elevated","elevated-open","field-goal","field-goal-wide","golden-rush","target-break","volleyball"]){await scene(old,arena);await scene(page,arena);const before=await pixels(old),after=await pixels(page);assert.equal(after.pixelHash,before.pixelHash,`${arena} floor changed`);assert.equal(after.hash,before.hash);results.push({arena,unchanged:true});}
  await scene(page,"standard");
  const cache=await page.evaluate(()=>{const d=window.__dashPunchDebug,before=window.createdCanvases.length,hash=d.online.rollback.hash(),times=[];for(let n=0;n<90;n++){const t=performance.now();d.stagePresentation.draw();times.push(performance.now()-t);}times.sort((a,b)=>a-b);
    const surfaces=window.createdCanvases.filter(c=>(c.width===854||c.width===1494)&&c.height===54);
    return {newCanvases:window.createdCanvases.length-before,pure:hash===d.online.rollback.hash(),surfaces:surfaces.map(c=>({width:c.width,height:c.height})),median:times[45],p95:times[85]};
  });assert.equal(cache.newCanvases,0);assert(cache.pure);assert.equal(cache.surfaces.length,2);
  const preview=await page.evaluate(()=>{const d=window.__dashPunchDebug,hash=d.online.rollback.hash(),scene=d.sportsGuide.scene("dashball","standard"),c=document.createElement("canvas");c.width=640;c.height=360;const ctx=c.getContext("2d");ctx.scale(.25,.25);d.sportsGuide.paint(ctx,scene,.25);const data=ctx.getImageData(20,329,600,20).data;let green=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>data[i]+12&&data[i+1]>data[i+2]+8)green++;return {green,pure:hash===d.online.rollback.hash()};});assert(preview.green>11000);assert(preview.pure);
  const offline=await open(current,true);await scene(offline,"standard-open");
  const file=await offline.evaluate(()=>{const d=window.__dashPunchDebug,hash=d.online.rollback.hash(),c=window.createdCanvases.find(c=>c.width===854&&c.height===54),data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let green=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>data[i]+12&&data[i+1]>data[i+2]+8)green++;d.stagePresentation.draw();return {green,total:c.width*c.height,pure:hash===d.online.rollback.hash()};});assert(file.green>file.total*.99);assert(file.pure);await offline.locator("#game").screenshot({path:`${out}/offline.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,current,previous,fields,results,cache,preview,offline:file,pixelWorldUnits:3,errors,missing,benchmark:"90 warmed frozen-scene ten-fighter draws in headless Chrome; not a full-match hardware guarantee."};fs.writeFileSync(`${out}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();for(const server of servers)await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
