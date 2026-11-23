"use strict";
const fs=require("node:fs"),path=require("node:path"),{spawn}=require("node:child_process"),{once}=require("node:events");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
const scenes=require("./tutorial-scenes.cjs");
const root=path.resolve(__dirname,".."),out=path.join(root,"exports");
const auditOnly=process.argv.includes("--audit-only");
const onlyArg=process.argv.find(arg=>arg.startsWith("--only="));
const only=onlyArg?.slice(7);
const selected=scenes.map((scene,index)=>({scene,index})).filter(({scene})=>!only||scene.id===only);
if(!selected.length)throw new Error(`Unknown tutorial lesson: ${only}`);
const bridge=`tutorialFilm: {
 setup(stageName) {
  window.requestAnimationFrame=()=>0;
  configureDefaultOnlineMatch({...getDefaultOnlineMatchConfig(),stageIndex:STAGES.findIndex(s=>s.name===stageName),characterKeys:["orbit","spike"]});
  initializeSimulation(42);menuState.active=false;
  PLAYER_SLOTS.slice(0,2).forEach(s=>{s.aiEnabled=false;s.modelStyle="pixel";});fighters.forEach(f=>{f.modelStyle="pixel";f.invulnerable=0;});
  window.__tutorialEvents=[];
 },
 step(inputs) {simulateFrame(inputs,false,true);},
 launch(index) {return fighters[index].attack?getLaunchDirection(fighters[index],fighters[index].attack):{x:1,y:0};},
 seat(index,terrainIndex,x) {
  const f=fighters[index],r=currentStage().terrain[terrainIndex],rect=getTerrainRect(r);
  Object.assign(f,{x,y:rect.y-f.data.height/2,prevX:x,prevY:rect.y-f.data.height/2,vx:0,vy:0,onGround:true,onPassThroughPlatform:true,groundTerrainId:getTerrainId(r)});
 },
 film(focus,wide) {
  const selected=focus.map(i=>fighters[i]);
  const minX=Math.min(...selected.map(f=>f.x-f.data.width/2)),maxX=Math.max(...selected.map(f=>f.x+f.data.width/2));
  const minY=Math.min(...selected.map(f=>f.y-f.data.height/2)),maxY=Math.max(...selected.map(f=>f.y+f.data.height/2));
  cameraZoom=wide?0.92:Math.min(2.35,1050/Math.max(320,maxX-minX+220),380/Math.max(150,maxY-minY+85));
  cameraX=wide?-55:(minX+maxX)/2-WORLD.width/cameraZoom/2;
  cameraY=wide?-50:(minY+maxY)/2-335/cameraZoom;
  const fixed=currentStage().fixedCamera;currentStage().fixedCamera=false;
  ctx.clearRect(0,0,WORLD.width,WORLD.height);ctx.save();ctx.scale(cameraZoom,cameraZoom);ctx.translate(-cameraX,-cameraY);
  drawBackground();drawTerrain();drawGravitySwitch();for(const f of fighters)drawAfterimages(f);drawParticles();drawFreeProjectiles();
  for(const f of fighters){drawFiredUpFlames(f);drawFighter(f);}drawSparks();ctx.restore();
  currentStage().fixedCamera=fixed;
 },
 async warm() {
  const images=[];for(const set of Object.values(ASSET_SPRITES).filter(s=>s===ASSET_SPRITES.seeker))for(const clip of Object.values(set.clips))images.push(clip.image);
  for(const stage of STAGES)if(STAGE_BACKDROPS[stage.name])images.push(STAGE_BACKDROPS[stage.name].image);
  await Promise.all([...new Set(images)].filter(Boolean).map(image=>image.decode().catch(()=>{})));
 },
},`;
(async()=>{
  let browser,encoder,encoderDone;
  fs.mkdirSync(out,{recursive:true});
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome"});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.addInitScript(()=>Object.defineProperty(navigator,"getGamepads",{value:()=>[]}));
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    let source=fs.readFileSync(path.join(root,"game.js"),"utf8");
    source=source.replace("window.__dashPunchDebug = {",`window.__dashPunchDebug = {${bridge}`);
    source=source.replace("function playAudioEvent(name, options = {}) {","function playAudioEvent(name, options = {}) { window.__tutorialEvents?.push({name,frame:simulationFrame,actor:options.fighter?.id});");
    await page.route("**/game.js",route=>route.fulfill({contentType:"text/javascript",body:source}));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.evaluate(()=>window.DashTypography.ready);
    await page.addScriptTag({path:path.join(__dirname,"tutorial-scenes.cjs")});
    await page.evaluate(async()=>{
      window.requestAnimationFrame=()=>0;
      await window.__dashPunchDebug.tutorialFilm.warm();
      const output=document.createElement("canvas");output.width=1280;output.height=720;document.body.append(output);
      window.TUTORIAL_OUTPUT=output;
      window.TUTORIAL_RENDER={
        begin(index) {
          const scene=window.TUTORIAL_SCENES[index],d=window.__dashPunchDebug,t=d.tutorialFilm;
          t.setup(scene.stage||"Flat");
          this.index=index;this.frame=0;this.simFrame=0;this.accumulator=0;this.freezeFrames=0;this.didFreeze=false;this.previousDown=[false,false];
          this.stats={id:scene.id,events:[],flags:{},maxCombo:0};
          this.context={debug:d,fighters:d.fighters,memory:{},time:0,
            place:(i,x,y,props={})=>Object.assign(d.fighters[i],{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:true,hitstop:0,...props}),
            seat:(...args)=>t.seat(...args),launch:i=>t.launch(i),
            offset:(a,b)=>({x:d.fighters[b].x-d.fighters[a].x,y:d.fighters[b].y-d.fighters[a].y})};
          scene.setup(this.context);this.initialHeat=d.fighters[0].firedUpHealth;
          this.inputs=[{},{},];this.lastX=d.fighters[0].x;
        },
        tick() {
          const scene=window.TUTORIAL_SCENES[this.index],c=this.context,d=c.debug;
          c.time=this.simFrame/60;
          const inputs=scene.inputs(c.time,c);
          inputs.forEach((input,i)=>{
            const length=Math.hypot(input.aimX||0,input.aimY||0);
            if(input.hasAim&&length){input.aimX/=length;input.aimY/=length;}
            input.downPressed=Boolean(input.downHeld&&!this.previousDown[i]);this.previousDown[i]=Boolean(input.downHeld);
          });
          this.inputs=inputs;d.tutorialFilm.step(inputs);this.simFrame++;
          const f=d.fighters[0],flags=this.stats.flags;
          flags.platformDrop ||= f.platformDropTimer>0;
          flags.superJump ||= f.tippyJumpTimer>0;
          flags.cling ||= f.wallClinging;
          flags.shield ||= d.isShielding(0);
          flags.blockstun ||= f.punchBlockstun>0;
          flags.dodge ||= f.spotDodgeInvuln>0;
          flags.exhaust ||= f.punchExhausted;
          flags.techMiss ||= f.floorTechVulnerable>0;
          flags.landedRefill ||= f.onGround&&f.airDashes===f.data.maxAirDashes;
          flags.heatExpired ||= this.initialHeat>0&&f.firedUpHealth<=1e-8&&c.time>6.8;
          flags.spiked ||= f.hitstun>0&&f.stunType==="stun"&&f.lastAttacker===d.fighters[1];
          flags.gravityChanged ||= d.gravity.vector.x!==0||d.gravity.vector.y!==1;
          flags.warped ||= this.lastX>1150&&f.x<100;this.lastX=f.x;
          this.stats.maxCombo=Math.max(this.stats.maxCombo,...d.fighters.map(x=>x.comboHits));
        },
        advance() {
          const scene=window.TUTORIAL_SCENES[this.index];
          if(this.freezeFrames>0){this.freezeFrames--;this.frame++;return;}
          this.accumulator+=2*(scene.rate||1);
          while(this.accumulator>=1){this.tick();this.accumulator--;if(scene.freezeAfterCling&&this.stats.flags.cling&&!this.didFreeze){this.freezeFrames=24;this.didFreeze=true;this.accumulator=0;break;}}
          this.frame++;
        },
        draw() {
          const scene=window.TUTORIAL_SCENES[this.index],c=this.context,d=c.debug;
          d.tutorialFilm.film(scene.focus||[0,1],scene.wide);
          const ctx=window.TUTORIAL_OUTPUT.getContext("2d"),game=document.querySelector("#game");
          ctx.fillStyle="#11171a";ctx.fillRect(0,0,1280,720);ctx.drawImage(game,0,0);
          const top=ctx.createLinearGradient(0,0,0,150);top.addColorStop(0,"#101719");top.addColorStop(.7,"rgba(16,23,25,.96)");top.addColorStop(1,"rgba(16,23,25,0)");ctx.fillStyle=top;ctx.fillRect(0,0,1280,150);
          ctx.fillStyle="#9ae4cd";ctx.font=window.DashTypography.canvas(12,700);ctx.textAlign="left";ctx.fillText(`DASH PUNCH  /  ${scene.section}`,36,28);
          ctx.fillStyle="#f5f6ed";ctx.font=window.DashTypography.canvas(31,750);ctx.fillText(scene.title,36,69);
          ctx.font=window.DashTypography.canvas(12,600);ctx.textAlign="right";ctx.fillStyle="#a6b6b8";ctx.fillText(`${String(this.index+1).padStart(2,"0")} / ${window.TUTORIAL_SCENES.length}`,1244,28);
          if(this.freezeFrames>0){ctx.fillStyle="#f6d47b";ctx.fillText("FREEZE FRAME",1244,61);}
          else if(scene.rate&&scene.rate<1){ctx.fillStyle="#f6d47b";ctx.fillText("SLOW MOTION",1244,61);}
          else if(scene.fixture){ctx.fillStyle="#a6b6b8";ctx.fillText("TRAINING SETUP",1244,61);}
          ctx.fillStyle="rgba(11,17,20,.97)";ctx.fillRect(0,578,1280,142);
          ctx.strokeStyle="#526466";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(36,578);ctx.lineTo(1244,578);ctx.stroke();
          ctx.textAlign="left";ctx.font=window.DashTypography.canvas(20,500);ctx.fillStyle="#f1f3e9";
          const words=scene.caption.split(" ");let line="",row=0;
          for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width>1198&&line){ctx.fillText(line,36,612+row*27);row++;line=word;}else line=next;}
          ctx.fillText(line,36,612+row*27);
          for(let i=0;i<2;i++) {
            const f=d.fighters[i],input=this.inputs[i]||{},x=i?664:36,color=i?"#9ade9c":"#ccadf4";
            ctx.fillStyle=color;ctx.font=window.DashTypography.canvas(15,700);ctx.fillText(f.data.name.toUpperCase(),x,683);
            ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+135,677,14,0,Math.PI*2);ctx.stroke();
            if(input.hasAim){ctx.beginPath();ctx.moveTo(x+135,677);ctx.lineTo(x+135+(input.aimX||0)*12,677+(input.aimY||0)*12);ctx.stroke();}
            for(const [name,held,offset] of [["DASH",input.dashHeld||input.dashPressed,164],["PUNCH",input.punchHeld||input.punchPressed,245]]) {
              ctx.fillStyle=held?color:"#273438";ctx.fillRect(x+offset,664,73,25);
              ctx.fillStyle=held?"#101719":"#e6eeeb";ctx.font=window.DashTypography.canvas(12,700);ctx.fillText(name,x+offset+9,681);
            }
            ctx.fillStyle="#72858a";ctx.fillRect(x+338,665,108,7);ctx.fillStyle=color;ctx.fillRect(x+338,665,108*f.health/f.data.maxHealth,7);
            if(f.firedUpHealth>0){ctx.fillStyle="#ffd36e";ctx.fillRect(x+338,665,108*f.firedUpHealth/40,3);}
            ctx.fillStyle="#98abae";ctx.fillRect(x+338,677,108*f.shieldHealth/f.data.shieldMax,3);
            for(let n=0;n<f.data.maxAirDashes;n++){ctx.fillStyle=n<f.airDashes?color:"#435055";ctx.fillRect(x+459+n*10,666,6,6);}
            ctx.fillStyle="#b5c4c5";ctx.font=window.DashTypography.canvas(10,500);ctx.fillText("AIR DASHES",x+456,687);
          }
          ctx.fillStyle="#78cfb5";ctx.fillRect(0,717,1280*(this.index+this.frame/(scene.seconds*30))/window.TUTORIAL_SCENES.length,3);
        },
        result() {this.stats.events=[...new Set(window.__tutorialEvents.map(e=>e.name))];return this.stats;},
      };
    });
    const audits=[];
    for(const {index} of selected) {
      const stat=await page.evaluate(index=>{const r=window.TUTORIAL_RENDER;r.begin(index);for(let f=0;f<window.TUTORIAL_SCENES[index].seconds*30;f++)r.advance();return r.result();},index);
      const scene=scenes[index];
      const eventOK=!scene.expect||(scene.any?scene.expect.some(e=>stat.events.includes(e)):scene.expect.every(e=>stat.events.includes(e)));
      const checkOK=!scene.check||scene.check(stat);
      stat.passed=Boolean(eventOK&&checkOK);audits.push(stat);
      console.log(`AUDIT ${stat.passed?"PASS":"FAIL"} ${scene.id} ${JSON.stringify(stat)}`);
    }
    fs.writeFileSync(path.join(out,only?`tutorial-audit-${only}.json`:"tutorial-audit.json"),JSON.stringify({errors,chapters:audits},null,2));
    if(audits.some(a=>!a.passed)||errors.length)throw new Error("Tutorial demonstrations need correction; video was not exported.");
    if(auditOnly)return;
    const video=path.join(out,only?`tutorial-replacement-${only}.mp4`:"Dash-Punch-Video-Tutorial.mp4");
    encoder=spawn("/tmp/dash-tutorial-video",["encode",video,"1280","720","30"],{stdio:["pipe","pipe","pipe"]});
    let encoderError="";encoder.stderr.on("data",data=>{encoderError+=data;});encoder.stdout.on("data",data=>process.stdout.write(data));
    encoder.stdin.on("error",()=>{});
    encoderDone=new Promise((resolve,reject)=>{encoder.on("error",reject);encoder.on("exit",code=>code===0?resolve():reject(new Error(encoderError||`Encoder exited ${code}`)));});
    let start=0;const chapters=[];
    for(const {index} of selected) {
      const scene=scenes[index];await page.evaluate(index=>window.TUTORIAL_RENDER.begin(index),index);
      const count=scene.seconds*30;
      for(let frame=0;frame<count;frame+=12) {
        const pngs=await page.evaluate(n=>{const r=window.TUTORIAL_RENDER,out=[];for(let i=0;i<n;i++){r.advance();r.draw();out.push(window.TUTORIAL_OUTPUT.toDataURL("image/png").split(",")[1]);}return out;},Math.min(12,count-frame));
        for(const png of pngs){const data=Buffer.from(png,"base64"),header=Buffer.alloc(4);header.writeUInt32BE(data.length);if(!encoder.stdin.write(Buffer.concat([header,data])))await once(encoder.stdin,"drain");}
        if(frame===0)fs.writeFileSync(path.join(out,`tutorial-${scene.id}.png`),Buffer.from(pngs[0],"base64"));
      }
      chapters.push({title:scene.title,start,duration:scene.seconds});start+=scene.seconds;
      console.log(`RENDER ${index+1}/${scenes.length}: ${scene.title}`);
    }
    encoder.stdin.end();await encoderDone;
    const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
    if(!only)fs.writeFileSync(path.join(out,"Dash-Punch-Tutorial-Chapters.md"),`# Dash Punch: Orbit + Spike\n\nCaptioned tutorial. No spoken narration. Training fixtures are used to isolate defensive timing; actions are executed by the real simulation.\n\n${chapters.map(c=>`- ${clock(c.start)} ${c.title}`).join("\n")}\n\nTotal: ${clock(start)}.\n`);
    console.log(JSON.stringify({video,duration:start,chapters:chapters.length,bytes:fs.statSync(video).size,errors}));
  } finally {
    if(encoder&&!encoder.killed&&encoder.exitCode===null)encoder.kill("SIGTERM");
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
