"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),prior=path.resolve("exports/Dash-Punch-Larger-Game-View-2026-11-15"),plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),dt=1/60;let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function setup(dir=root){const g=createGame(dir);g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["chungus","orbit"],seed:201});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:400+i*600,y:500,prevX:400+i*600,prevY:500,onGround:true,vx:0,vy:0,invulnerable:0}));return g;}
function release(g,charge=0,sign=1){const f=g.debug.fighters[0];Object.assign(f.controls,{hasAim:true,aim:{x:sign,y:0}});f.controls.actions.punchHeld=true;f.controls.buffers.punchPressed=.09;g.debug.updateHumanInput(0);f.punchCharge=f.data.punchChargeTime*charge;f.punchHoldTimer=f.punchCharge;f.controls.actions.punchHeld=false;f.controls.buffers.punchReleased=.09;g.debug.updateHumanInput(0);assert(f.attack);return f.attack;}
function canonical(g){const s=plain(g.rb.save().core);s.stageIndex=0;for(const f of s.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(s);}
check("only Chungus active-time data changes; Boomerangus and the other thirteen fighters retain their complete data",()=>{
  const a=setup(prior),b=setup();for(const key of a.rb.characterKeys){for(const g of[a,b])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:201});const old=plain(a.debug.fighters[0].data),now=plain(b.debug.fighters[0].data);if(key==="chungus"){assert.equal(old.punchActive,5);assert.equal(now.punchActive,.2);delete old.punchActive;delete now.punchActive;}assert.deepEqual(now,old,key);}
});
check("real release uses 0.20s base / 0.42s full-charge activity while preserving startup and recovery",()=>{
  for(const charge of[0,.5,1])for(const sign of[-1,1]){const now=setup(),old=setup(prior),a=release(now,charge,sign),b=release(old,charge,sign);near(a.active,.2+charge*.22);near(b.active,5+charge*.22);near(a.startup,b.startup);near(a.recovery,b.recovery);near(a.total,a.startup+a.active+a.recovery);assert.deepEqual(plain(a.dir),plain(b.dir));near(a.charge,b.charge);}
});
check("active strike pose, hitbox shape and normal retraction use the shortened shared timeline",()=>{
  for(const sign of[-1,1]){const now=setup(),old=setup(prior),f=now.debug.fighters[0],a=release(now,0,sign);release(old,0,sign);assert.deepEqual(plain(now.debug.getPunchHitbox(0,{x:sign,y:0})),plain(old.debug.getPunchHitbox(0,{x:sign,y:0})));
    a.age=a.startup-.001;assert.equal(now.debug.getAssetAnimation(0).frame,0);a.age=a.startup+.1;assert.equal(now.debug.getAssetAnimation(0).frame,1);const before=now.rb.hash();now.debug.stagePresentation.draw();assert.equal(now.rb.hash(),before);a.age=a.total-.001;now.debug.updateAttack(0,.002);assert.equal(f.attack,null);near(f.whiffLag,.92);near(f.punchLockout,.92);
  }
});
check("fighters take the same powerful hit inside the window and cannot be hit during recovery",()=>{
  for(const charge of[0,1])for(const sign of[-1,1])for(const active of[true,false]){const outcomes=[];for(const dir of[prior,root]){const g=setup(dir),[f,t]=g.debug.fighters,a=release(g,charge,sign);Object.assign(t,{x:f.x+sign*170,y:f.y,prevX:f.x+sign*170,prevY:f.y,health:1000,invulnerable:0,onGround:false});a.age=a.startup+(active?.1:a.active+.01);g.debug.arena.stepAI(0);outcomes.push({damage:1000-t.health,vx:t.vx,vy:t.vy,hitstun:t.hitstun});}
    assert.deepEqual(outcomes[0],outcomes[1]);assert.equal(outcomes[1].damage>0,active);if(active)assert(Math.hypot(outcomes[1].vx,outcomes[1].vy)>100);
  }
});
check("every sports mode uses the same short active window for its native ball/object attack list",()=>{
  const g=setup(),d=g.debug;for(const arena of g.sandbox.Dashball.ARENAS.map(a=>a.id))for(const charge of[0,1]){
    d.dashball.setup({arena},{characters:["chungus","orbit"]});const f=d.fighters[0];Object.assign(f,{x:600,y:900,prevX:600,prevY:900,onGround:true,invulnerable:0});const a=release(g,charge),world=d.dashball.world(0);
    for(const [age,expected]of[[a.startup-.001,false],[a.startup+.01,true],[a.startup+a.active+.001,false],[a.startup+1,false]]){a.age=age;assert.equal(world.attacks().some(e=>e.fighter===f),expected,`${arena}/${charge}/${age}`);}
  }
});
check("sports balls receive a real strike inside the window, never a lingering recovery hit",()=>{
  for(const arena of["standard","elevated","golden-rush","target-break","target-charge-stationary","boulder-control","total-rush"])for(const active of[true,false]){const g=setup(),d=g.debug;d.dashball.setup({arena},{characters:["chungus","orbit"]});const f=d.fighters[0],s=d.dashball.state,b=s.ball;Object.assign(f,{x:600,y:900,prevX:600,prevY:900,onGround:true,invulnerable:0});Object.assign(d.fighters[1],{x:2200,y:900,prevX:2200,prevY:900,invulnerable:0});const a=release(g);a.age=a.startup+(active?.1:a.active+.01);Object.assign(b,{x:f.x+b.r+100,y:f.y,vx:0,vy:0,contacts:{},attacks:{}});d.dashball.ballStep(0);assert.equal(b.attacks[`${f.id}:${a.id}`]!==undefined,active,arena);}
});
check("short punches survive snapshots, replay, delayed rollback and 30/60/120 Hz",()=>{
  for(const arena of[null,"golden-rush","target-charge-roaming"]){const games=[setup(),setup()];if(arena)for(const g of games)g.debug.dashball.setup({arena},{characters:["chungus","orbit"],seed:201});const[a,b]=games,start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let i=0;i<150;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:i%70<20?-.3:0,punchHeld:(i+n*11)%53<9,dashHeld:(i+n*7)%79<8}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());
    const hashes=[];for(const hz of[30,60,120]){const g=setup();if(arena)g.debug.dashball.setup({arena},{characters:["chungus","orbit"],seed:201});g.debug.matchFlow.begin({countdown:false});for(let i=1;i<=hz;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
  }
});
check("all other fighters replay identically and sports/weapon/art implementations stay byte-for-byte intact",()=>{
  const a=setup(prior),b=setup();for(const key of a.rb.characterKeys.filter(k=>k!=="chungus")){for(const g of[a,b])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:201});for(let i=0;i<90;i++){const row=[{aimX:1,punchHeld:i%31<9,dashHeld:i%43<7},{aimX:-1}];a.rb.step(row);b.rb.step(row);assert.equal(canonical(a),canonical(b),key);}}
  for(const file of["dashball.js","sports.js","sandbag.js","boomerang.js","target-charge.js","styles.css","index.html"]){const old=fs.readFileSync(path.join(prior,file)),now=fs.readFileSync(path.join(root,file));if(file==="index.html"&&root===process.cwd())continue;assert(old.equals(now),file);}
});
console.log(`${groups} Chungus punch-timing groups passed`);
