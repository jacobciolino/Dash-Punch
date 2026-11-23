"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);let groups=0;
const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
function setup(key="gunman",other="anchor"){
  const g=createGame();g.rb.setup({characterKeys:[key,other],stageIndex:g.rb.stageNames.indexOf("Flat"),seed:17});
  g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:200+i*800,y:300,prevX:200+i*800,prevY:300,onGround:false,vx:0,vy:0,health:10000}));return g;
}
function press(g,index,held,dir={x:1,y:0}){
  const f=g.debug.fighters[index];Object.assign(f.controls,{hasAim:true,aim:dir});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;g.debug.updateHumanInput(index);
}
function release(g,index=0){const f=g.debug.fighters[index];f.whiffLag=f.punchLockout=f.hitstop=0;press(g,index,true);press(g,index,false);assert(f.attack);return f.attack;}
function fire(g,index=0){const a=release(g,index);assert(a.projectile);g.debug.updateAttack(index,a.startup+1e-9);return a;}
function place(a,x,y=300,vx=0,vy=0){const speed=Math.hypot(vx,vy);a.dir=speed?{x:vx/speed,y:vy/speed}:{x:1,y:0};Object.assign(a.projectile,{x,y,speed,vx,vy});}
function drain(g,index=0){const f=g.debug.fighters[index],shots=[];while(f.ammo>0)shots.push(fire(g,index));return shots;}
const controlled=(g,index)=>g.debug.fighters.flatMap(f=>Array.from(f.projectiles)).filter(a=>!a.projectile.removed&&(a.reflectedOwnerId||a.projectile.creatorId)===g.debug.fighters[index].id);
check("3/5 magazines start one exact 1.1s Gun Man / 1.4s Archer reload",()=>{
  for(const [key,capacity,duration,ticks] of [["gunman",3,1.1,66],["archer",5,1.4,84]]){
    const g=setup(key),f=g.debug.fighters[0];assert.equal(f.ammo,capacity);const a=release(g);assert.equal(f.ammo,capacity);g.debug.updateAttack(0,a.startup+1e-9);assert.equal(f.ammo,capacity-1);
    drain(g);assert.equal(f.ammo,0);near(f.reloadRemaining,duration);assert.equal(controlled(g,0).length,capacity);near(g.debug.projectileMagazine.reloadTime(0),duration);
    const melee=release(g);assert(!melee.projectile);assert.equal(f.ammo,0);near(f.reloadRemaining,duration);
    for(let n=0;n<ticks-1;n++)g.debug.projectileMagazine.tick(0,dt);assert.equal(f.ammo,0);near(f.reloadRemaining,dt);
    g.debug.projectileMagazine.tick(0,dt);assert.equal(f.ammo,capacity);assert.equal(f.reloadRemaining,0);
    f.attack=null;assert(fire(g).projectile);assert.equal(f.ammo,capacity-1);
    for(const step of [.01,.02,1/120]){f.ammo=0;f.reloadRemaining=duration;for(let t=0;t<Math.round(duration/step);t++)g.debug.projectileMagazine.tick(0,step);assert.equal(f.ammo,capacity);assert.equal(f.reloadRemaining,0);}
  }
});
check("reload clock continues through hitstop, movement, shields, melee and casting interruptions",()=>{
  for(const key of ["gunman","archer"]){const g=setup(key),f=g.debug.fighters[0],duration=f.data.projectileConfig.reloadTime;drain(g);f.gunRecoil=0;f.onGround=true;
    assert.equal(g.debug.getAssetAnimation(0).clip,"reload");g.debug.projectileMagazine.tick(0,.4);const frame=g.debug.getAssetAnimation(0).frame;
    assert(frame>0);Object.assign(f,{hitstop:.4,vx:400,onGround:false});g.debug.gravity.physics(0,.1);near(f.reloadRemaining,duration-.5);
    f.hitstop=0;press(g,0,true);for(let n=0;n<8;n++)g.debug.updateHumanInput(0);assert(g.debug.isShielding(0));g.debug.gravity.physics(0,.1);near(f.reloadRemaining,duration-.6);
    f.whiffLag=f.punchLockout=0;press(g,0,false);assert(f.attack&&!f.attack.projectile);assert.equal(g.debug.getAssetAnimation(0).clip,"melee");
    f.attack=null;f.chargingPunch=false;f.punchInputHeld=false;f.airDashes=3;g.debug.gravity.dash(0,{x:1,y:-.2},0);assert(f.vx>0);const t=f.reloadRemaining;g.debug.gravity.physics(0,.1);near(f.reloadRemaining,t-.1);
    g.debug.projectileMagazine.tick(0,f.reloadRemaining);assert.equal(f.ammo,f.data.projectileConfig.magazine);
  }
});
check("native lifetimes/ranges, cadence and hitstun distinguish fast bullets from long-range arrows",()=>{
  const gun=setup(),bow=setup("archer"),a=fire(gun),b=fire(bow);
  near(a.projectile.remainingLife,.8);near(b.projectile.remainingLife,2.5);near(a.projectile.hitstun,.07);near(b.projectile.hitstun,.22);
  assert(a.projectile.hitstun<.2&&b.projectile.hitstun<.5);assert(a.projectile.speed>b.projectile.speed);assert(gun.debug.fighters[0].punchLockout<bow.debug.fighters[0].punchLockout/4);
  const config=bow.debug.fighters[0].data.projectileConfig;assert.equal(config.speed*config.life,2875);assert.equal((config.speed+config.chargeSpeed)*config.life,3500);
  for(const g of [gun,bow]){const f=g.debug.fighters[0],a=f.projectiles[0],life=a.projectile.remainingLife;place(a,600);g.debug.updateProjectiles(life-.001);assert(f.projectiles.includes(a));g.debug.updateProjectiles(.002);assert(!f.projectiles.includes(a));}
});
check("projectile stun and blockstun decay to zero under continuous spam; melee timings stay unchanged",()=>{
  for(const key of ["gunman","archer"])for(const block of [false,true]){
    const g=setup(key),[f,t]=g.debug.fighters,base=fire(g),stuns=[];
    for(let i=0;i<10;i++){
      const a={...base,id:1000+i,hitTargets:new (vm.runInContext("Set",g.sandbox))(),projectile:{...base.projectile}};
      Object.assign(t,{x:700,y:300,invulnerable:0,chargingPunch:block,punchPending:block,punchInputHeld:block,punchAim:{x:-1,y:0},shieldHealth:10000});
      if(i===7&&!block){t.chargingDash=true;t.attack={id:500,projectile:null};}
      f.attack=a;g.debug.resolveHit(0,1);stuns.push(block?t.punchBlockstun:t.hitstun);
      if(i>=5){near(t.hitstop,0);near(stuns[i],0);}
      if(i===7&&!block){assert(t.chargingDash);assert(t.attack);}
    }
    assert(stuns[0]>stuns[1]&&stuns[1]>stuns[2]);assert(stuns[0]< (key==="gunman"?.11:.33));
    if(block)assert(10000-t.shieldHealth<(key==="gunman"?20:100));
    g.debug.gravity.physics(1,1.01);assert.equal(t.projectilePressure,undefined);
    f.attack={...base,id:2000,hitTargets:new Set(),projectile:{...base.projectile}};g.debug.resolveHit(0,1);assert((block?t.punchBlockstun:t.hitstun)>0);
  }
  const g=setup("anchor"),[f,t]=g.debug.fighters;f.attack={id:800,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};g.debug.resolveHit(0,1);near(t.hitstun,f.data.punchHitstun);assert.equal(t.projectilePressure,undefined);
});
check("reflection transfers caps immediately, removes oldest by original ID, halves remaining life and never ammo",()=>{
  for(const key of ["gunman","archer","anchor"]){
    const g=setup("gunman",key),[f,t]=g.debug.fighters,original=fire(g),capacity=t.data.projectileConfig?.cap||6;
    t.projectiles=[];
    for(let i=0;i<capacity;i++)t.projectiles.push({...original,id:100+i,hitTargets:new Set(),reflectedOwnerId:t.id,projectile:{...original.projectile,spawnOrder:100+i,id:100+i}});
    const ammo=t.ammo;original.projectile.spawnOrder=999;const id=original.id;
    g.debug.projectileMagazine.reflect(original,1,{x:-1,y:0});assert.equal(controlled(g,0).length,0);assert.equal(controlled(g,1).length,capacity);assert(t.projectiles[0].projectile.removed);assert.equal(t.ammo,ammo);assert.equal(original.id,id);near(original.projectile.remainingLife,.4);
    g.debug.projectileMagazine.reflect(original,0,{x:1,y:0});near(original.projectile.remainingLife,.2);assert.equal(original.projectile.creatorId,f.id);assert.equal(f.ammo,2);
    g.debug.projectileMagazine.reflect(original,1,{x:-1,y:0});near(original.projectile.remainingLife,.1);
  }
});
check("owned Kickoff and ricochet grant native dash refills once but never ammunition or lifetime",()=>{
  const g=setup(),f=g.debug.fighters[0],a=fire(g),b=fire(g);place(b,900,100);
  Object.assign(f,{x:500,y:300,prevX:470,prevY:300,vx:900,vy:0,onGround:false,dashDir:{x:1,y:0},dashCarryTimer:.3,airDashes:0,dashReboundLockout:0,hitstun:0,hitstop:0,punchInputHeld:false});
  place(a,530);a.projectile.kickoffReady=true;const life=a.projectile.remainingLife,ammo=f.ammo;g.debug.updateProjectiles(0);assert.equal(f.airDashes,1);near(a.projectile.remainingLife,life);assert.equal(f.ammo,ammo);
  const generation=a.projectile.generation;g.debug.updateProjectiles(0);assert.equal(a.projectile.generation,generation);assert.equal(f.airDashes,1);
  f.x=200;f.dashCarryTimer=0;f.airDashes=0;place(a,600,300,1000);place(b,640,300,-600);g.debug.updateProjectiles(.04);
  assert.equal(f.airDashes,f.data.maxAirDashes);assert.equal(f.ammo,ammo);near(a.projectile.remainingLife,life-.04);
  f.airDashes=0;g.debug.updateProjectiles(0);assert.equal(f.airDashes,0);
});
check("world indicators are independent, upright and follow actual sprite bounds in all gravity directions",()=>{
  const g=setup("gunman","archer"),[a,b]=g.debug.fighters;a.x=350;b.x=850;
  for(const direction of [{axis:"y",sign:1},{axis:"y",sign:-1},{axis:"x",sign:1},{axis:"x",sign:-1}]){
    const saved=g.rb.save();saved.core.stageGravityAxis=direction.axis;saved.core.stageGravitySign=direction.sign;g.rb.restore(saved);
    const left=g.debug.projectileMagazine.indicator(0),right=g.debug.projectileMagazine.indicator(1);assert.equal(left.capacity,3);assert.equal(right.capacity,5);assert(left.x<right.x);assert(left.y< (a.y-g.debug.camera.state.y)*g.debug.camera.state.zoom+g.debug.camera.state.offset.y);
    const hash=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),hash);
  }
  for(const i of[0,1]){drain(g,i);near(g.debug.projectileMagazine.indicator(i).progress,0);g.debug.projectileMagazine.tick(i,g.debug.projectileMagazine.reloadTime(i)/2);near(g.debug.projectileMagazine.indicator(i).progress,.5);assert.equal(g.debug.projectileMagazine.indicator(i).ammo,0);}
});
check("magazines, pressure, ownership, expiration and all sports states survive replay and delayed rollback",()=>{
  for(const mode of ["versus","standard","elevated","elevated-open","target-break","golden-rush","brawl","scramble"]){
    const a=setup("gunman","archer"),b=setup("gunman","archer");
    for(const g of [a,b]){if(mode!=="versus"){
      const api=["brawl","scramble"].includes(mode)?g.debug.sandbag:g.debug.dashball;api.setup(["brawl","scramble"].includes(mode)?{ruleset:mode}:{arena:mode,ruleset:"battle"},{characters:["gunman","archer"]});
    }}
    const saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],inputs=[];
    for(let n=0;n<300;n++){
      const encoded=[R.encode({hasAim:true,aimX:1,aimY:-.2,punchHeld:n%8<2,dashHeld:n%60<4}),R.encode({hasAim:true,aimX:-1,aimY:-.1,punchHeld:n%24<8,dashHeld:n%80<5})];
      inputs.push(encoded.map(R.decode));pending.push({frame:n,input:encoded[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(encoded[0]));a.rb.step(inputs[n]);
    }
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),mode);assert(manager.rollbacks>0);
    const end=a.rb.hash();a.rb.restore(saved);for(const input of inputs)a.rb.step(input);assert.equal(a.rb.hash(),end);
    const peer=createGame();peer.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(peer.debug.fighters[0].ammo,a.debug.fighters[0].ammo);near(peer.debug.fighters[0].reloadRemaining,a.debug.fighters[0].reloadRemaining);
  }
});
console.log(`${groups} magazine/balance groups passed`);
