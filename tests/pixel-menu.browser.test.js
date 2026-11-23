"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/pixel-menu",css=fs.readFileSync("styles.css","utf8"),marker=css.indexOf("/* Two-pixel menu frames");assert(marker>0);
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],results=[];
  for(const width of[1280,1920]){
    const page=await browser.newPage({viewport:{width,height:width*9/16}});page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/styles.css",r=>r.fulfill({contentType:"text/css",body:css.slice(0,marker)}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");const patch=await page.addStyleTag({content:css.slice(marker)});await patch.evaluate(e=>e.id="pixelMenuPatch");
    const click=async(action,screen)=>{await page.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});await page.locator(`[data-menu-action="${action}"]`).click();if(screen)await page.locator(`[data-menu-screen="${screen}"]`).waitFor();await page.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});};
    async function capture(name){
      await page.mouse.move(3,3);await page.waitForTimeout(160);
      const sample=await page.evaluate(()=>{
        const patch=document.getElementById("pixelMenuPatch"),hash=window.__dashPunchDebug.online.rollback.hash();
        const read=()=>[...document.querySelectorAll('#menuLayer button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {action:JSON.stringify({...b.dataset}),text:b.textContent,disabled:b.disabled,rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100),font:[s.fontFamily,s.fontSize,s.lineHeight,s.letterSpacing]};});
        const art=()=>[...document.querySelectorAll('.asset-sprite-preview,.title-screen,.radial-fighter')].map(e=>{const s=getComputedStyle(e);return {image:s.backgroundImage,transform:s.transform,width:e.width,height:e.height,filter:s.filter};});
        patch.disabled=true;const before=read(),originalArt=art();patch.disabled=false;const after=read(),currentArt=art();
        const frames=[...document.querySelectorAll('#menuLayer :is(.menu-button,.mode-card,.character-tile,.stage-tile,.card-command,.card-pick,.binding-remove)')].filter(b=>b.getClientRects().length).map(b=>{const s=getComputedStyle(b),ring=getComputedStyle(b,'::after');return {radius:s.borderRadius,clip:s.clipPath,ring:ring.clipPath,pointer:ring.pointerEvents};});
        const glyphs=[...document.querySelectorAll('#menuLayer :is(.setting-stepper .menu-button,.binding-remove,.card-command[data-field$="Prev"],.card-command[data-field$="Next"],.card-command[data-field="close"])')].filter(b=>b.getClientRects().length).map(b=>{const s=getComputedStyle(b,'::before');return {label:b.getAttribute('aria-label'),width:s.width,height:s.height,shadow:s.boxShadow,color:getComputedStyle(b).color};});
        return {before,after,originalArt,currentArt,frames,glyphs,pure:hash===window.__dashPunchDebug.online.rollback.hash()};
      });assert.deepEqual(sample.after,sample.before,`${name}: hit areas, labels and type must not move`);assert.deepEqual(sample.currentArt,sample.originalArt,`${name}: original artwork untouched`);assert(sample.pure);
      assert(sample.frames.length&&sample.frames.every(f=>f.radius==='0px'&&f.clip.startsWith('polygon(')&&f.ring.startsWith('polygon(evenodd')&&f.pointer==='none'));
      for(const g of sample.glyphs)assert(g.width==='2px'&&g.height==='2px'&&g.shadow!=='none'&&g.color==='rgba(0, 0, 0, 0)');
      await patch.evaluate(e=>e.disabled=true);await page.screenshot({path:`${out}/${name}-before-${width}.png`});await patch.evaluate(e=>e.disabled=false);await page.screenshot({path:`${out}/${name}-after-${width}.png`});
      results.push({name,width,controls:sample.frames.length,glyphs:sample.glyphs.length,geometryAndTypographyUnchanged:true,artUnchanged:true,pure:true});
    }
    await capture("title");await click("goMode","mode");await capture("radial");await click("goSettings","settings");await capture("settings");await click("goControls","controls");await capture("controls");
    await click("controlsBack");await page.getByRole('button',{name:'Confirm Return',exact:true}).click();await click("settingsBack");await page.getByRole('button',{name:'Confirm Return',exact:true}).click();
    await click("goDashballSetup","dashballSetup");await capture("sports-settings");await click("dashballLocal","characters");await capture("roster");
    await click("openKeyboardCard");await page.locator('[data-player-slot="0"] [data-field="confirm"]').click();await page.waitForTimeout(1000);await capture("player-card");
    await page.locator('[data-player-slot="0"] [data-field="ready"]').click();await page.waitForFunction(()=>!window.__dashPunchDebug.radialMenu.active.length);
    await page.locator('[data-player-slot="1"] [data-field="open"]').click();await page.locator('[data-player-slot="1"] [data-field="confirm"]').click();await page.waitForTimeout(1000);
    await page.locator('[data-player-slot="1"] [data-field="ready"]').click();await page.waitForFunction(()=>!window.__dashPunchDebug.radialMenu.active.length);assert(await page.evaluate(()=>window.__dashPunchDebug.lobby.valid));
    await click("goStages","stages");await capture("stage-select");
    // Sample the actual CSS-rendered frame against a solid background, on an
    // integer-aligned probe so font/scene antialiasing cannot pollute the test.
    await page.evaluate(()=>{document.getElementById('menuStars').style.visibility='hidden';document.body.style.background='#000';const host=document.getElementById('menuLayer');host.style.background='#000';for(const child of host.children)child.style.opacity='0';const b=document.createElement('button');b.id='pixelFrameProbe';b.className='menu-button';b.style.cssText='position:fixed;left:64px;top:64px;width:64px;height:32px;min-height:0;padding:0;margin:0;border-color:transparent;background:#18282e;--menu-frame:#e5d78c;z-index:999;';host.appendChild(b);});
    const png=await page.locator('#pixelFrameProbe').screenshot({path:`${out}/pixel-frame-${width}.png`});
    const pixels=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const p=c.getContext('2d');p.drawImage(image,0,0);const data=p.getImageData(0,0,c.width,c.height).data,at=(x,y)=>[...data.slice((y*c.width+x)*4,(y*c.width+x)*4+3)];const colors=new Set();for(let y=0;y<8;y++)for(let x=0;x<8;x++)colors.add(at(x,y).join(','));return {size:[c.width,c.height],colors:[...colors],samples:[[0,0],[3,0],[4,0],[1,2],[2,2],[0,4],[8,8]].map(([x,y])=>at(x,y))};},`data:image/png;base64,${png.toString('base64')}`);
    assert.deepEqual(pixels.size,[64,32]);assert.deepEqual(pixels.samples,[[0,0,0],[0,0,0],[229,215,140],[0,0,0],[229,215,140],[229,215,140],[24,40,46]]);assert(pixels.colors.every(c=>['0,0,0','229,215,140','24,40,46'].includes(c)),"no smoothed corner pixels");results.push({width,pixelMask:pixels});await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,scenes:results.filter(r=>r.name).length,geometryAndArtPreserved:true,crispPixelMasks:2,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
