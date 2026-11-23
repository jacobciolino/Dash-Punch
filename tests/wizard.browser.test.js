"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/wizard";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});const errors=[],samples=[];
  const old=execFileSync("git",["show","ff389d2:fighter-presentation.js"],{encoding:"utf8"});let before;
  for(const previous of[true,false]){
    const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));if(previous)await page.route("**/fighter-presentation.js",r=>r.fulfill({contentType:"application/javascript",body:old}));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");await page.waitForFunction(()=>Object.keys(window.DASH_PUNCH_ART.spriteSets.seekerprogun.clips).every(name=>window.__dashPunchDebug.characterPresentation.sheet("gunman",name)));
    const result=await page.evaluate(()=>{const d=window.__dashPunchDebug,set=window.DASH_PUNCH_ART.spriteSets.seekerprogun,rows=[],hash=window.__dashPunchDebug.online.rollback.hash();
      for(const[name,clip]of Object.entries(set.clips)){
        const sheet=d.characterPresentation.sheet("gunman",name),p=sheet.getContext("2d"),bytes=p.getImageData(0,0,sheet.width,sheet.height).data,w=clip.width||set.width,h=clip.height||set.height;let alpha=0,face=0,rgb=0;
        for(let i=0;i<bytes.length;i++){if(i%4===3)alpha=(Math.imul(alpha,31)+bytes[i])>>>0;else rgb=(Math.imul(rgb,31)+bytes[i])>>>0;}
        for(let f=0;f<clip.frames;f++){const head=sheet.characterDetail.frames[f]?.head;if(!head)continue;for(let y=Math.max(0,Math.ceil(head[1]+3));y<Math.min(h,head[1]+12);y++)for(let x=Math.max(0,Math.ceil(head[0]-5));x<Math.min(w,head[0]+8);x++){const i=(((clip.row||0)*h+y)*sheet.width+(f+(clip.startFrame||0))*w+x)*4;for(let c=0;c<4;c++)face=(Math.imul(face,31)+bytes[i+c])>>>0;}}
        rows.push({name,alpha,face,rgb});
      }
      const c=document.createElement("canvas");c.width=640;c.height=350;const p=c.getContext("2d");p.fillStyle="#17272c";p.fillRect(0,0,640,350);p.imageSmoothingEnabled=false;
      for(const[i,name]of["idle","attack1"].entries()){const clip=set.clips[name],sheet=d.characterPresentation.sheet("gunman",name),frame=name==="idle"?3:clip.strikeFrames?.[0]??3,w=clip.width||set.width,h=clip.height||set.height,anchor={pivotX:clip.pivotX??set.pivotX,foot:clip.foot??set.foot};p.drawImage(sheet,(frame+(clip.startFrame||0))*w,(clip.row||0)*h,w,h,i*320+160-anchor.pivotX*6,240-anchor.foot*6,w*6,h*6);p.font=window.DashTypography.canvas(28,700);p.fillStyle="#f8d897";p.textAlign="center";p.fillText(i?"CASTING":"WIZARD",i*320+160,307);}
      return {rows,pure:hash===d.online.rollback.hash(),image:c.toDataURL()};
    });assert(result.pure);
    if(previous)before=result.rows;
    else{
      for(const row of result.rows){const old=before.find(r=>r.name===row.name);assert.equal(row.alpha,old.alpha,`${row.name}: transparency unchanged`);assert.equal(row.face,old.face,`${row.name}: face preserved`);}for(const name of["idle","walk","attack1"])assert.notEqual(result.rows.find(r=>r.name===name).rgb,before.find(r=>r.name===name).rgb,name);
      fs.writeFileSync(`${out}/appearance.png`,Buffer.from(result.image.split(",")[1],"base64"));
      const click=async name=>{await page.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});await page.getByRole("button",{name,exact:true}).click();};await click("Play");await click("Local");const tile=page.locator('[data-menu-action="chooseCharacter"][data-character="8"]');assert.match(await tile.textContent(),/Wizard/);await tile.hover();await tile.click();
      for(const width of[1280,1920]){await page.setViewportSize({width,height:width*9/16});const r=await tile.boundingBox();assert(r&&r.y>=0&&r.y+r.height<=width*9/16);await page.screenshot({path:`${out}/roster-${width}.png`});samples.push({width,roster:true});}
      const scene=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle",teamSize:1},{characters:["gunman","archer"],ai:false,seed:93});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";d.camera.update(1);const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),name:d.fighters[0].data.name,ammo:d.fighters[0].ammo,reload:d.projectileMagazine.reloadTime(0)};});assert(scene.pure&&scene.name==="Wizard"&&scene.ammo===3&&scene.reload===1.1);
      const victory=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.standard();d.online.rollback.setup({characterKeys:["gunman","archer"],stageIndex:0,seed:93});d.matchFlow.begin({countdown:false});for(let r=0;r<2;r++){d.matchFlow.knockout(1);for(let n=0;n<301;n++)d.matchFlow.step();}d.matchFlow.present();const hash=d.online.rollback.hash();d.matchFlow.victory(4300);return {pure:hash===d.online.rollback.hash(),text:document.getElementById("menuLayer").textContent};});assert(victory.pure&&/Wizard/i.test(victory.text)&&!/Gun Man/i.test(victory.text));await page.screenshot({path:`${out}/victory.png`});
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,nativeClips:before.length,sourceAlphaAndFacePreserved:true,previews:samples,victory:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
