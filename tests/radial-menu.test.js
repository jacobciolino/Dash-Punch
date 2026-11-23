"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../radial-menu"),{createGame}=require("./simulation-harness");
test("six equal sectors, deadzone, and neutral retain the last selection",()=>{
  for(let i=0;i<6;i++){const angle=M.angle(i,6);assert.equal(M.sector(Math.cos(angle),Math.sin(angle),6),i);}
  for(let i=0;i<6;i++)assert.equal(M.sector(.1,.1,6,i),i);
});
test("five-option solo cards keep every option reachable",()=>{
  for(let i=0;i<5;i++)assert.equal(M.sector(Math.cos(M.angle(i,5)),Math.sin(M.angle(i,5)),5),i);
});
test("confirm locks an independent target, impacts before committing, then finishes",()=>{
  const target={action:"goSettings"},state=M.begin(target,1000,{x:-1,y:-1,screen:true});
  assert.equal(M.sample(state,1094).impact,false);assert(M.sample(state,1095).impact);
  assert.equal(M.sample(state,1249).commit,false);assert(M.sample(state,1250).commit);
  assert.equal(M.sample(state,1250).cover,1);assert(M.sample(state,1380).done);
  assert.equal(state.target,target);assert.equal(state.x,state.y);
});
test("repeatable choices use a shorter feedback sequence with no screen wipe",()=>{
  const state=M.begin("costume",0,{repeat:true});assert.equal(M.sample(state,139).commit,false);
  assert(M.sample(state,140).commit);assert(M.sample(state,180).done);assert.equal(M.sample(state,100).cover,0);
});
test("shared fresh aim wins held aim, simultaneous conflicts cancel without seat priority",()=>{
  for(const reverse of[false,true]){
    const old=new Map(),rows=[{key:"p1",sector:null},{key:"p4",sector:null}];if(reverse)rows.reverse();
    assert.equal(M.arbitrate(rows,old),null);
    assert.equal(M.arbitrate(rows.map(r=>({...r,sector:r.key==="p1"?0:3})),old),null);
    assert.equal(M.arbitrate(rows.map(r=>({...r,sector:r.key==="p1"?0:2})),old),2);
    assert.equal(M.arbitrate(rows.map(r=>({...r,sector:r.key==="p1"?0:2})),old),null);
    M.arbitrate([],old);assert.equal(old.size,0);
  }
});
test("existing card and shared input polling do not add radial state to snapshots",()=>{
  const game=createGame(),before=game.rb.hash();for(let i=0;i<60;i++)game.debug.sharedMenu.poll(1/60);
  assert.equal(game.rb.hash(),before);assert(!JSON.stringify(game.rb.save().core).includes("radial"));
});
test("all core fighter simulations match the immediate pre-radial checkpoint",{skip:!process.env.REGRESSION_BEFORE_DIR},()=>{
  const before=process.env.REGRESSION_BEFORE_DIR;
  const current=createGame(),old=createGame(before);
  for(const key of current.rb.characterKeys.filter(key=>current.debug.cardFlourish.plan(key)?.key)){
    for(const game of[current,old])game.rb.setup({stageIndex:0,characterKeys:[key,"anchor"],seed:649});
    for(let frame=0;frame<80;frame++){
      const inputs=[0,1].map(n=>({hasAim:true,aimX:n?-1:1,aimY:frame%17<8?-.4:.2,punchHeld:frame%31<8,dashHeld:frame%47<9}));
      current.rb.step(inputs);old.rb.step(inputs);assert.equal(current.rb.hash(),old.rb.hash(),`${key}/${frame}`);
    }
  }
});
