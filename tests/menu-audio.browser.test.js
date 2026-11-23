"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/menu-audio";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],results=[],source=fs.readFileSync(path.join(root,"game.js"),"utf8");
  async function open(offline=false){
    const p=await browser.newPage({viewport:{width:1280,height:720}});p.on("pageerror",e=>errors.push(e.stack));
    await p.addInitScript(()=>{
      window.menuTones=[];const Native=window.AudioContext;
      window.AudioContext=class extends Native{
        constructor(){super();window.menuContext=this;}
        createOscillator(){const node=super.createOscillator(),note={},set=node.frequency.setValueAtTime.bind(node.frequency),ramp=node.frequency.exponentialRampToValueAtTime.bind(node.frequency),start=node.start.bind(node),stop=node.stop.bind(node);
          node.frequency.setValueAtTime=(value,time)=>{note.frequency=value;return set(value,time);};
          node.frequency.exponentialRampToValueAtTime=(value,time)=>{note.end=value;return ramp(value,time);};
          node.start=time=>{note.start=time;window.menuTones.push(note);return start(time);};node.stop=time=>{note.stop=time;return stop(time);};return node;
        }
      };
      window.menuPads=[3,8].map(index=>({index,id:`Menu Audio Controller ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));
      Object.defineProperty(navigator,"getGamepads",{value:()=>window.menuPads});
    });
    await p.route("**/game.js",route=>route.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;")}));
    await p.goto(offline?pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1":`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");return p;
  }
  async function clear(p){await poll(p,.2);await p.waitForTimeout(120);await p.evaluate(()=>{window.menuTones=[];});}
  const notes=p=>p.evaluate(()=>window.menuTones);
  async function cue(p,action,frequencies){await clear(p);await action();const list=await notes(p);assert.deepEqual(list.map(n=>n.frequency),frequencies);for(const n of list)assert(n.stop>n.start&&n.stop-n.start<.15);return list;}
  async function poll(p,dt=1/60){await p.evaluate(dt=>window.__dashPunchDebug.sharedMenu.poll(dt),dt);}
  async function press(p,indices,button){await p.evaluate(([indices,button])=>{for(const pad of window.menuPads)if(indices.includes(pad.index))pad.buttons[button]={pressed:true,value:1};},[indices,button]);await poll(p);await p.evaluate(()=>window.menuPads.forEach(p=>p.buttons.forEach(b=>{b.pressed=false;b.value=0;})));await poll(p);await poll(p,.2);}
  async function move(p,indices,x,y){await p.evaluate(([indices,x,y])=>{for(const pad of window.menuPads)if(indices.includes(pad.index))pad.axes=[x,y,0,0];},[indices,x,y]);await poll(p);await p.evaluate(()=>window.menuPads.forEach(p=>p.axes=[0,0,0,0]));await poll(p);}
  const p=await open();assert.deepEqual(await notes(p),[],"No autoplay cue on initial focus");
  await p.getByRole("button",{name:"Play",exact:true}).click();await p.waitForFunction(()=>window.menuContext?.state==="running");
  assert((await notes(p)).some(n=>n.frequency===660),"First gesture has selection feedback");
  await cue(p,()=>p.keyboard.press("ArrowRight"),[470]);
  await cue(p,()=>p.keyboard.press("Escape"),[440]);assert.equal(await p.locator('[data-menu-screen="start"]').count(),1);
  await p.locator('[data-menu-action="goMode"]').focus();await cue(p,()=>p.keyboard.press("Enter"),[660]);
  const local=p.locator('[data-menu-action="localPlay"]');await cue(p,()=>local.hover(),[470]);
  await cue(p,()=>local.dispatchEvent("pointerover"),[]);await cue(p,()=>local.click(),[660]);
  await p.locator('[data-menu-action="goSettings"]').click();await p.locator('[data-menu-action="toggleTeamGlow"]').hover();
  const hash=await p.evaluate(()=>window.__dashPunchDebug.online.rollback.hash());
  await cue(p,()=>p.locator('[data-menu-action="toggleTeamGlow"]').click(),[540]);
  assert.equal(await p.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),hash,"Presentation setting does not change simulation");
  await cue(p,()=>p.keyboard.press("ArrowDown"),[470]);
  await clear(p);await p.evaluate(()=>{const b=[...document.querySelectorAll('#menuLayer [data-menu-action]')];for(let i=0;i<100;i++)b[i%b.length].dispatchEvent(new PointerEvent("pointerover",{bubbles:true}));});
  assert((await notes(p)).length<=1,"Rapid hover is bounded");
  await p.locator('[data-menu-action="settingsBack"]').click();await poll(p,.2);
  await cue(p,()=>press(p,[3],9),[660]);await cue(p,()=>press(p,[8],9),[660]);
  await cue(p,()=>move(p,[3,8],1,0),[470]);
  await cue(p,()=>press(p,[3,8],0),[660]);assert((await p.evaluate(()=>window.__dashPunchDebug.lobby.cards)).every(c=>c.view==="review"));
  await cue(p,()=>press(p,[3,8],0),[660,1318]);assert((await p.evaluate(()=>window.__dashPunchDebug.lobby.slots)).filter(s=>!s.empty&&!s.cpu).every(s=>s.ready));
  await cue(p,()=>move(p,[8],0,1),[470]);
  await clear(p);await p.evaluate(()=>{window.menuPads[1].axes=[0,1,0,0];});await poll(p);
  const count=(await notes(p)).length;for(let i=0;i<5;i++)await poll(p,.01);assert.equal((await notes(p)).length,count,"Held direction does not fire every poll");
  await p.evaluate(()=>window.menuPads[1].axes=[0,0,0,0]);await poll(p);
  results.push({mouse:true,keyboard:true,twoSimultaneousControllers:true,privateCards:true,readyChime:true,hoverBounded:true,simulationUnchanged:true});await p.close();
  const offline=await open(true);await offline.getByRole("button",{name:"Play",exact:true}).click();await offline.waitForFunction(()=>window.menuContext?.state==="running");
  await cue(offline,()=>offline.keyboard.press("ArrowRight"),[470]);await cue(offline,()=>offline.keyboard.press("Escape"),[440]);await offline.close();
  assert.deepEqual(errors,[]);const report={passed:true,root,results,offline:true,actualWebAudioNodes:true,physicalControllersTested:false,physicalPlaybackTested:false,errors};
  fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
