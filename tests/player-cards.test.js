"use strict";
const assert=require("node:assert/strict"),C=require("../lobby-cards"),{createGame}=require("./simulation-harness");
let groups=0;function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
check("independent cursors, confirmation, review and explicit Ready fields",()=>{
  const a=C.create(0),b=C.create(4),roster=Array.from({length:14},(_,i)=>i);C.open(a,0,false);C.open(b,4,false);
  C.navigate(a,1,0,roster,false);assert.equal(a.cursor,1);assert.equal(b.cursor,4);assert.equal(a.view,"browse");
  a.view="review";a.focus="ready";C.back(a);assert.equal(a.view,"browse");assert.equal(a.cursor,1);
  C.close(a);assert(!a.open);C.open(a,0,false);assert.equal(a.cursor,1);
  C.open(a,1,true);assert.equal(a.focus,"unready");assert.deepEqual(C.fields(a,true),["unready","addCpu","settings","lobby","leave"]);C.back(a);assert.equal(a.view,"ready");
});
check("Start and Select are independent edges; held confirms never repeat",()=>{
  let state;const sample=(changes,dt=.016,blocked=false)=>{const out=C.sample({key:"pad",x:0,y:0,start:false,select:false,confirm:false,back:false,...changes},state,dt,blocked);state=out.state;return out.intent;};
  assert.equal(sample({start:true}).type,"open");assert.equal(sample({start:true}),null);sample({});
  assert.equal(sample({select:true,confirm:true}).type,"close");sample({});assert.equal(sample({confirm:true}).type,"confirm");assert.equal(sample({confirm:true},2),null);sample({});
  assert.equal(sample({confirm:true},.016,true),null);assert.equal(sample({confirm:true}),null);sample({});assert.equal(sample({back:true}).type,"back");
});
check("navigation repeat and controller-independent cooldowns",()=>{
  const input={x:1,y:0};let a=C.sample(input,null,.016),b=C.sample({...input,x:-1},null,.016);assert(a.intent&&b.intent);
  a=C.sample(input,a.state,.1);assert.equal(a.intent,null);a=C.sample(input,a.state,.1);assert(a.intent);assert.equal(b.state.x,-1);
});
check("roster grid rows move only the owning cursor and retain review controls",()=>{
  const roster=Array.from({length:14},(_,i)=>i),a=C.create(1),b=C.create(5);C.open(a,1,false);C.open(b,5,false);
  C.navigate(a,0,1,roster,false,7);assert.equal(a.cursor,8);assert.equal(b.cursor,5);assert.equal(a.focus,"fighter");
  C.navigate(a,0,-1,roster,false,7);assert.equal(a.cursor,1);C.navigate(a,0,1,roster,false,7);C.navigate(a,0,1,roster,false,7);assert.equal(a.focus,"confirm");
  a.view="review";a.focus="ready";C.navigate(a,0,1,roster,false,7);assert.equal(a.focus,"back");
});
check("sampled heavyweight, combo and aerial fighters preserve checkpoint simulation",()=>{
  const path=require("node:path"),old=path.resolve(process.env.REGRESSION_BEFORE_DIR||"exports/Dash-Punch-Rounds-Victory-Release-2026-11-14-v2");
  const current=createGame(),previous=createGame(old);
  const keys=current.rb.characterKeys||Object.keys(current.debug.characters||{});
  assert(!keys.length||keys.length>=14);
  for(const characters of[["boomerangus","kite"],["chungus","orbit"],["edgebert","rain"]]){
    for(const g of[current,previous])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:characters,seed:746});
    for(let i=0;i<120;i++){
      const inputs=[0,1].map(n=>({hasAim:true,aimX:n?-1:1,aimY:i%37<9?-.5:.1,dashHeld:i%53<9,punchHeld:(i+n*8)%43<15}));
      current.rb.step(inputs);previous.rb.step(inputs);
    }
    assert.equal(current.rb.hash(),previous.rb.hash(),characters.join("/"));
    assert(!JSON.stringify(current.rb.save()).includes('"cards"'));
  }
});
console.log(`${groups} player-card groups passed`);
