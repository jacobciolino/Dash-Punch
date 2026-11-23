"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const R=require("../rollback");
function fixture(name="idle"){
  const pixels=new Uint8ClampedArray(40*40*4),put=(x,y,c)=>pixels.set(c,(y*40+x)*4);
  for(let y=3;y<=24;y++)for(let x=9;x<=24;x++)put(x,y,[100,55,130,255]);
  for(const x of[17,21])put(x,8,[0,240,60,255]);for(let y=25;y<29;y++)for(const x of[14,19])put(x,y,[0,0,0,255]);
  return {pixels,original:new Uint8ClampedArray(pixels),frame:{x:0,y:0,w:40,h:40,name,frame:0,head:[15,3],anchor:{pivotX:15,foot:28}},put};
}
function apply(key,f=fixture(),options){const result=P.derive(f.pixels,f.original,40,40,key,[f.frame],options);return Object.assign(f,{result});}
const pixel=(f,x,y)=>[...f.pixels.subarray((y*40+x)*4,(y*40+x)*4+4)];
test("Anchor, Kite, Spike, Reflektor and the other untouched artwork is byte-identical",()=>{
  for(const key of["anchor","kite","spike","reflektor","boomerangus","defiplate","chungus","orbit"]){const f=apply(key);assert.deepEqual(f.pixels,f.original);assert.equal(f.result.changed,0);}
});
test("weaponless attack variants lose baked green/steel sword pixels, not their eyes or cloth",()=>{
  for(const key of P.CLEAN_SWORD){const f=fixture("attack1");for(const x of[30,31])f.put(x,15,x===30?[0,230,120,255]:[235,240,245,255]);f.original.set(f.pixels);apply(key,f);assert.equal(pixel(f,30,15)[3],0);assert.equal(pixel(f,31,15)[3],0);assert(pixel(f,17,8)[3]);assert.deepEqual(pixel(f,15,20),[100,55,130,255]);assert.equal(f.result.removed,2);}
  const f=fixture("attack1");f.put(30,15,[0,230,120,255]);f.original.set(f.pixels);apply("edgebert",f);assert.equal(pixel(f,30,15)[3],255);
});
test("Edgebert gets a fang, attached horns and eyebrows on native pixels",()=>{const f=apply("edgebert");assert.deepEqual(pixel(f,19,13),[255,242,214,255]);assert.equal(pixel(f,12,2)[3],255);assert(f.result.changed>8);});
test("Booster and Lamer use distinct cloth-clipped hood symbols",()=>{
  const a=apply("booster"),b=apply("lamer");assert(a.result.changed>0&&b.result.changed>0);assert.notDeepEqual(a.pixels,b.pixels);
  for(const f of[a,b])for(let i=3;i<f.pixels.length;i+=4)assert.equal(f.pixels[i],f.original[i]);
  assert(P.PLUS.join("").split("g").length-1>=9);assert(P.THUMB.length>=6);
});
test("Reverso changes only his eyes, using green spirals with no mouth or tongue",()=>{
  const f=fixture();for(let y=6;y<=14;y++)for(let x=10;x<=22;x++)f.put(x,y,[4,18,12,255]);for(const x of[13,18])f.put(x,8,[0,240,60,255]);f.original.set(f.pixels);apply("reverso",f);
  for(let y=11;y<=14;y++)for(let x=10;x<=22;x++){const i=(y*40+x)*4;assert.deepEqual([...f.pixels.subarray(i,i+4)],[...f.original.subarray(i,i+4)]);}
  assert(pixel(f,13,7)[1]>pixel(f,13,7)[0]);assert.equal(pixel(f,13,8)[0],9);assert.equal(pixel(f,14,9)[0],9);assert(pixel(f,13,9)[1]>100);
});
test("Micro USB's static is cloth-clipped, animated by native frames and repeatable",()=>{
  const a=fixture(),b=fixture(),same=fixture();b.frame.frame=1;apply("microusb",a);apply("microusb",b);apply("microusb",same);assert.notDeepEqual(a.pixels,a.original);assert.notDeepEqual(a.pixels,b.pixels);assert.deepEqual(a.pixels,same.pixels);
  for(let i=3;i<a.pixels.length;i+=4)assert.equal(a.pixels[i],a.original[i]);assert.deepEqual(pixel(a,17,8),[0,240,60,255]);
});
test("Phantom hides the eyes and replaces the legs with a longer cloak without changing frame dimensions",()=>{const f=apply("phantom");assert.deepEqual(pixel(f,17,8),[19,27,34,255]);assert(pixel(f,16,29)[3]);assert.equal(f.pixels.length,f.original.length);});
test("wand, quiver and idle tentacles remain native attached marks; tentacles animate",()=>{
  for(const key of["gunman","archer","whipado"]){const f=apply(key);assert(f.result.changed>0,key);assert.equal(f.pixels.length,40*40*4);}
  const a=fixture(),b=fixture();b.frame.frame=3;apply("whipado",a);apply("whipado",b);assert.notDeepEqual(a.pixels,b.pixels);
});
test("Lancer carries one back spear only outside the held/attack state",()=>{
  const idle=apply("lancer"),held=apply("lancer",fixture(),{weaponHeld:true}),attack=apply("lancer",fixture("attack1"));
  assert(idle.result.changed>0);assert(idle.result.frames[0].backSpear);assert.deepEqual(held.pixels,held.original);assert.deepEqual(attack.pixels,attack.original);
});
test("white hurt flashes and dissipated death frames retain original pixels",()=>{
  for(const key of P.KEYS){const f=fixture("hurt");for(let i=0;i<f.pixels.length;i+=4)if(f.pixels[i+3])f.pixels.set([255,255,255,255],i);f.original.set(f.pixels);apply(key,f);assert.deepEqual(f.pixels,f.original,key);const dead=fixture("death");dead.frame.head=null;apply(key,dead);assert.deepEqual(dead.pixels,dead.original);}
});
test("cloud easing is bounded, lags travel, and converges equally at different presentation rates",()=>{
  const target={x:-20,y:-60},end=[];
  for(const hz of[30,60,120]){let state={x:0,y:0,offset:{x:30,y:-25},age:0};for(let i=0;i<hz;i++)state=P.tether(state,{x:0,y:0},target,{x:0,y:0},1/hz);end.push(state.offset);}
  for(const point of end){assert(Math.abs(point.x-end[0].x)<1e-8);assert(Math.abs(point.y-end[0].y)<1e-8);}
  const lag=P.tether({offset:target,age:0},{x:20,y:0},target,{x:20,y:0},1/60);assert(lag.offset.x<target.x);assert(Math.hypot(lag.offset.x,lag.offset.y)<=85);
});
test("clouds and curved ghost trails are bounded presentation-only state and restore cleanly",()=>{
  const g=createGame();g.rb.setup({stageIndex:0,characterKeys:["rain","orbit"],seed:55});const d=g.debug,f=d.fighters[1];Object.assign(f,{onGround:false,dashCarryTimer:5,hitstun:0,hitstop:0});
  for(let i=0;i<100;i++){f.x=300+Math.cos(i*.08)*100;f.y=300+Math.sin(i*.08)*100;const hash=g.rb.hash();d.characterPresentation.update(1/60);assert.equal(g.rb.hash(),hash);}
  assert(d.characterPresentation.stats.ghosts>3&&d.characterPresentation.stats.ghosts<=9);assert.equal(d.characterPresentation.stats.clouds,1);
  const saved=g.rb.save(),ghosts=JSON.stringify(d.characterPresentation.ghosts),clouds=JSON.stringify(d.characterPresentation.clouds);
  assert(!JSON.stringify(saved.core).includes("orbitGhosts"));d.characterPresentation.update(.4);g.rb.restore(saved);assert.equal(JSON.stringify(d.characterPresentation.ghosts),ghosts);assert.equal(JSON.stringify(d.characterPresentation.clouds),clouds);
  f.koScored=true;d.characterPresentation.update(1/60);assert.equal(d.characterPresentation.stats.ghosts,0);
});
test("clouds stay above Rain relative to all four gravity directions",()=>{
  const g=createGame();g.rb.setup({stageIndex:0,characterKeys:["rain","anchor"],seed:55});
  for(const[axis,sign]of[["y",1],["y",-1],["x",1],["x",-1]]){g.debug.gravity.setDirection(axis,sign);for(let i=0;i<100;i++)g.debug.characterPresentation.update(1/60);const p=g.debug.characterPresentation.clouds[0][1].offset,v=g.debug.gravity.vector;assert(p.x*v.x+p.y*v.y<-30);assert(Math.hypot(p.x,p.y)<=85);}
});
test("Chungus's arm starts inside the shoulder and the fist stays at the unchanged visual reach",()=>{
  const g=createGame();g.rb.setup({stageIndex:0,characterKeys:["chungus","anchor"],seed:55});const f=g.debug.fighters[0];
  for(const dir of[{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1}])for(const extension of[0,.1,.5,1]){
    const p=g.debug.characterPresentation.arm(0,dir,.5,extension),normal={x:-p.dir.y,y:p.dir.x},x=p.dir.x*p.start+normal.x*p.rootY,y=p.dir.y*p.start+normal.y*p.rootY;
    assert(Math.abs(x)<f.data.width/2&&Math.abs(y)<f.data.height/2);assert.equal(p.headX+p.headWidth,p.end);assert(p.headWidth>0&&p.headWidth<=32*p.scale);
  }
});
test("delayed rollback and 30/60/120 Hz retain identical gameplay with the new visual state",()=>{
  const a=createGame(),b=createGame();for(const g of[a,b])g.rb.setup({stageIndex:0,characterKeys:["rain","orbit"],seed:38});
  const manager=b.rb.manager(0,8),pending=[];
  for(let i=0;i<120;i++){
    const rows=[0,1].map(n=>R.encode({hasAim:true,aimX:Math.cos(i*.06+n),aimY:Math.sin(i*.06+n),dashHeld:i%45<10,punchHeld:(i+n*5)%37<9}));pending.push({frame:i,input:rows[1]});
    if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(rows[0]);a.rb.step(rows.map(R.decode));
  }
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());
  const hashes=[];for(const hz of[30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"golden-rush"},{characters:["rain","orbit"],ai:true,seed:38});for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("all affected and protected fighters preserve the immediate pre-feature simulation",()=>{
  const source=execFileSync("git",["show","af5b795:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=createGame();
  for(const key of[...P.KEYS,"anchor","kite","spike","reflektor","chungus","orbit","boomerangus"]){
    for(const g of[old,now])g.rb.setup({stageIndex:0,characterKeys:[key,"anchor"],seed:91});
    for(let i=0;i<90;i++){const input=[{hasAim:true,aimX:Math.cos(i*.05),aimY:Math.sin(i*.05),punchHeld:i%33<12,dashHeld:i%47<9},{hasAim:true,aimX:-1,punchHeld:i%51<18}];old.rb.step(input);now.rb.step(input);assert.equal(now.rb.hash(),old.rb.hash(),`${key}/${i}`);}
  }
  for(const arena of["golden-rush","boulder-control","total-rush","gravity-flip-soccer"]){for(const g of[old,now])g.debug.dashball.setup({arena,ruleset:"battle",teamSize:2},{characters:["orbit","rain","lancer","chungus"],seed:91});for(let i=0;i<60;i++){old.rb.step([]);now.rb.step([]);assert.equal(now.rb.hash(),old.rb.hash(),`${arena}/${i}`);}}
});
