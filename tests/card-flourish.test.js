"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),Cards=require("../lobby-cards");
const keys=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"];
test("normal core fighters play exactly two native uncharged attack cycles",()=>{
  const g=createGame(),d=g.debug;
  for(const key of keys.filter(k=>!["spike","reflektor","phantom"].includes(k))){
    const plan=d.cardFlourish.plan(key);assert.equal(plan.kind,"attack");assert.equal(plan.duration,plan.cycle*2);
    const first=d.cardFlourish.sample(key,plan.stages[0].startup+.001),second=d.cardFlourish.sample(key,plan.cycle+plan.stages[0].startup+.001);
    assert.equal(first.loop,0);assert.equal(second.loop,1);assert.equal(first.active,true);assert.deepEqual(first.animation,second.animation);assert.equal(first.attack.charge,0);
    assert.equal(d.cardFlourish.sample(key,plan.duration-.001).done,false);const end=d.cardFlourish.sample(key,plan.duration);assert(end.done);assert(!end.attack);assert.equal(end.animation.clip,"idle");
  }
  assert(Math.abs(d.cardFlourish.plan("anchor").cycle-.425)<1e-9);
  assert(Math.abs(d.cardFlourish.plan("edgebert").cycle-.425)<1e-9);
});
test("Edgebert's individual native combo poses occur in both cycles",()=>{
  const d=createGame().debug,plan=d.cardFlourish.plan("edgebert");for(let loop=0;loop<2;loop++){
    let start=loop*plan.cycle;for(let i=0;i<3;i++){const pose=d.cardFlourish.sample("edgebert",start+plan.stages[i].startup+.001);assert.equal(pose.animation.clip,`attack${i+1}`);assert.equal(pose.attack.sequenceStage,i);start+=plan.stages[i].total;}
  }
});
test("Spike and Reflektor show shields; Phantom remains centered and translucent for its native dash duration",()=>{
  const d=createGame().debug;for(const key of["spike","reflektor"]){const p=d.cardFlourish.plan(key);assert.equal(p.kind,"shield");assert.equal(p.duration,.7);const s=d.cardFlourish.sample(key,.3);assert.equal(s.animation.clip,"idle");assert(!s.attack);}
  const p=d.cardFlourish.plan("phantom");assert.equal(p.kind,"phase");assert.equal(p.duration,1.25);
  for(const t of[0,.2,.6,1.2]){const s=d.cardFlourish.sample("phantom",t);assert.equal(s.x,0);assert.equal(s.y,0);assert.equal(s.alpha,.4);assert.equal(s.animation.clip,"dash");assert(!s.attack);}
  assert.equal(d.cardFlourish.sample("phantom",p.duration).alpha,1);
});
test("successful lock-in is independent of Ready and does not retrigger from repeated confirmation",()=>{
  const g=createGame(),d=g.debug,action=d.cardFlourish.action;assert(action(0,"open"));const hash=g.rb.hash();assert(action(0,"confirm"));
  const state=d.cardFlourish.active;assert.equal(state.length,1);assert.equal(d.lobby.slots[0].ready,false);assert.equal(d.lobby.cards[0].view,"review");assert(d.lobby.cards[0].open);
  assert.equal(action(0,"confirm"),false);assert.deepEqual(d.cardFlourish.active,state);assert.equal(g.rb.hash(),hash);
  const core=JSON.stringify(g.rb.save().core);assert(!core.includes("cardFlourish"));assert(!core.includes("startedAt"));
});
test("closing, backing out, changing costume, Ready and leaving cancel only the owner's flourish",()=>{
  for(const command of["close","back","costume","ready","leave"]){const d=createGame().debug,act=d.cardFlourish.action;if(d.lobby.slots[1].cpu)assert(act(1,"human"));
    for(const i of[0,1]){act(i,"open");act(i,"confirm");}assert.equal(d.cardFlourish.active.length,2);assert(act(0,command));assert.deepEqual([...d.cardFlourish.active.map(s=>s.index)],[1]);
    if(command==="ready")assert(d.lobby.slots[0].ready);
    if(command==="back")assert.equal(d.lobby.cards.find(c=>c.index===0).view,"browse");
  }
});
test("existing controller input edges still allow simultaneous owners without repeated confirms",()=>{
  const neutral={x:0,y:0,start:false,select:false,back:false,confirm:false};
  const states=Array.from({length:10},()=>Cards.sample(neutral,null,1/60).state);
  for(const state of states){const held=Cards.sample({...neutral,confirm:true},state,1/60);assert.equal(held.intent.type,"confirm");assert.equal(Cards.sample({...neutral,confirm:true},held.state,2).intent,null);assert.equal(Cards.sample({...neutral,select:true},held.state,1/60).intent.type,"close");}
});
test("all core fighters retain exact preceding-checkpoint combat and sports simulation",()=>{
  const source=execFileSync("git",["show","fd02b02:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  const old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=createGame();
  for(const key of keys){for(const g of[old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"anchor"],seed:88});
    for(let frame=0;frame<80;frame++){const input=[{hasAim:true,aimX:1,aimY:-.2,punchHeld:frame%27<9,dashHeld:frame%43<7},{hasAim:true,aimX:-1,punchHeld:frame%47<30}];old.rb.step(input);now.rb.step(input);assert.equal(now.rb.hash(),old.rb.hash(),`${key}/${frame}`);}
  }
  for(const arena of["standard","golden-rush","boulder-control"]){for(const g of[old,now])g.debug.dashball.setup({arena,ruleset:"battle"},{characters:["boomerangus","lancer"],seed:88});for(let frame=0;frame<60;frame++){old.rb.step([]);now.rb.step([]);assert.equal(now.rb.hash(),old.rb.hash(),`${arena}/${frame}`);}}
});
