"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  fs.mkdirSync("artifacts/compact-hud",{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  for(const width of[1280,1920]){
    const page=await browser.newPage({viewport:{width,height:width*9/16}});page.on("pageerror",e=>errors.push(e.message));
    const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
    await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
    for(const [name,size,kind]of[["1v1",1,"sports"],["2v2",2,"sports"],["3v3",3,"sports"],["5v5-identical",5,"sports"],["5v5-mixed",5,"mixed"],["ffa",5,"ffa"],["charge",5,"charge"],["sandbag",5,"sandbag"]]){
      await page.evaluate(({size,kind})=>{
        const d=window.__dashPunchDebug;
        if(kind==="ffa")d.ai.configure({teamModeId:"ffa",teams:Array.from({length:10},(_,i)=>i),characters:Array(10).fill("anchor")});
        else if(kind==="sandbag")d.sandbag.setup({teamSize:size,ruleset:"brawl"},{characters:["anchor"]});
        else d.dashball.setup({arena:kind==="charge"?"target-charge-stationary":"standard",teamSize:size,ruleset:"battle"},{characters:kind==="mixed"?["whipado","gunman","lancer","rain","microusb","edgebert","phantom","defiplate","orbit","boomerangus"]:["anchor"]});
        d.matchFlow.begin({countdown:false,seconds:300});d.matchFlow.hud();
        if(d.dashball.state)d.dashball.state.phase="playing";if(d.sandbag.state)d.sandbag.state.phase="playing";
        const floor=d.dashball.state?d.dashball.arena.floorY:d.sandbag.state?d.sandbag.arena.floorY:680;
        d.fighters.forEach((f,i)=>Object.assign(f,{x:kind==="ffa"?80+i*120:600+i*135,y:floor-f.data.height/2,onGround:true,invulnerable:0}));
        d.camera.update(1);d.stagePresentation.draw();
      },{size,kind});await page.waitForTimeout(220);
      const sample=await page.evaluate(()=>{
        const d=window.__dashPunchDebug,rb=d.online.rollback,c=document.querySelector("#game"),layout=d.compactHud.layout(),before=rb.hash(),camera=JSON.stringify(d.camera.state),stage=c.width+":"+c.height;
        const proto=CanvasRenderingContext2D.prototype,original=proto.fillText,labels=[];proto.fillText=function(text,x,y,...rest){if(/^P\d+$/.test(text))labels.push({text,x,y});return original.call(this,text,x,y,...rest);};
        try{d.stagePresentation.draw();}finally{proto.fillText=original;}
        const pixels=c.getContext("2d").getImageData(0,0,c.width,58).data;let colored=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>40)colored++;
        const bounds=c.getBoundingClientRect();
        return {layout,labels,colored,pure:before===rb.hash(),cameraUnchanged:camera===JSON.stringify(d.camera.state),stage,center:d.compactHud.center(),domHud:document.querySelector("#matchHud").getBoundingClientRect().height,canvasWidth:bounds.width,pauseClear:document.querySelector("#pauseButton").getBoundingClientRect().top>=bounds.top+bounds.height*58/720};
      });
      assert(sample.pure&&sample.cameraUnchanged);assert.equal(sample.stage,"1280:720");assert(sample.colored>200);assert.equal(sample.domHud,1);
      const labels=sample.labels.filter(l=>l.y<58);assert.equal(labels.length,size*2);assert.equal(new Set(labels.map(l=>l.text)).size,size*2);assert.equal(new Set(labels.map(l=>l.y)).size,1);
      assert(sample.canvasWidth>width*.8);assert(sample.pauseClear);for(const e of sample.layout.entries)assert(e.x+e.w<=480||e.x>=800);
      await page.screenshot({path:`artifacts/compact-hud/${name}-${width}.png`});results.push({width,name,...sample});
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync("artifacts/compact-hud/results.json",JSON.stringify({passed:true,results,errors,physicalControllersTested:false},null,2));console.log(JSON.stringify({passed:true,layouts:results.length,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
