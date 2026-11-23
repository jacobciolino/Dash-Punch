"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{createGame}=require("./simulation-harness"),{setup}=require("./feedback-harness"),D=require("../dashball");
test("turf follows outdoor scenery and never changes walls, floors or goal fixtures",()=>{
  const g=createGame(),t=g.debug.terrainArt;
  for(const name of["Perch","Battlefield","High Perch","High Perch Drift","Smash Vile"]){assert(!t.turf({name},{kind:"oneway"}),name);assert(!t.turf({name},{kind:"wall"}));assert(!t.turf({name},{kind:"floor"}));assert(!t.turf({name},{kind:"platform",goalTeam:0}));}
  for(const id of["standard","field-goal","volleyball","tri-ball","sticky-ball","golden-rush","target-charge-stationary"]){assert(t.turf(D.arena(id),{kind:"platform"}),id);}
  for(const name of["Flip Chamber","Castle Dungeon"]){assert(!t.turf({name},{kind:"platform"}),name);}
  assert(!t.turf(D.arena("elevated"),{kind:"oneway"}));
  for(const id of["boulder-control","gravity-boulder","total-rush"])assert(!t.turf(D.arena(id),{kind:"platform"}),id);
});
test("four-unit native-pixel fixture stamps are bounded, cached and presentation-only",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard"},{characters:["anchor","icer"],seed:42});const hash=g.rb.hash(),rect={x:200,y:400,w:320,h:24,kind:"oneway"};
  assert.equal(d.terrainArt.pixelSize,4);
  for(const kind of["turf","soccer","basket","upright","frame"]){const a=d.terrainArt.stamp(kind,rect);assert.equal(a.width,80);assert.equal(a.height,6);assert.equal(a,d.terrainArt.stamp(kind,rect));}
  for(let w=1;w<100;w++)d.terrainArt.stamp("soccer",{...rect,w:w*4});assert(d.terrainArt.cacheSize<=64);assert.equal(g.rb.hash(),hash);
});
function win(g){const d=g.debug;d.matchFlow.begin({countdown:false});for(let r=0;r<2;r++){d.matchFlow.knockout(1);d.matchFlow.step();for(let n=0;n<120;n++)d.matchFlow.step();if(!r)for(let n=0;n<180;n++)d.matchFlow.step();}assert.equal(d.matchFlow.state.phase,"finished");return d;}
test("match completion fades the final frame to black, swooshes once and reveals victory without changing state",()=>{
  const g=setup(),d=win(g),fade=d.matchFlow.fade,state=fade.state,layer=g.elements.get("matchEndFade"),frame=g.elements.get("matchEndFrame"),hash=g.rb.hash();
  assert(state);assert.equal(g.events("matchSwoosh").length,1);assert.equal(layer.hidden,false);
  fade.tick(state.startedAt+160);assert.equal(Number(frame.style.opacity),.5);assert.equal(Number(layer.style.opacity),1);
  fade.tick(state.startedAt+370);assert.equal(Number(frame.style.opacity),0);assert.equal(Number(layer.style.opacity),1);
  fade.tick(state.startedAt+550);assert(Number(layer.style.opacity)>0&&Number(layer.style.opacity)<1);
  for(let n=0;n<4;n++)d.matchFlow.present();assert.equal(g.events("matchSwoosh").length,1);assert.equal(fade.state.startedAt,state.startedAt);
  fade.tick(state.startedAt+681);assert.equal(layer.hidden,true);assert.equal(fade.state,null);assert.equal(g.rb.hash(),hash);
  assert(!JSON.stringify(g.rb.save().core).includes("matchEndTransition"));
});
test("round ends do not swoosh; rematches cancel old fades and permit a fresh match-end cue",()=>{
  const g=setup(),d=g.debug;d.matchFlow.begin({countdown:false});d.matchFlow.knockout(1);d.matchFlow.step();assert.equal(g.events("matchSwoosh").length,0);assert.equal(d.matchFlow.fade.state,null);
  win(g);assert.equal(g.events("matchSwoosh").length,1);d.matchFlow.begin({countdown:false});assert.equal(d.matchFlow.fade.state,null);assert(g.elements.get("matchEndFade").hidden);win(g);assert.equal(g.events("matchSwoosh").length,2);
});
test("match-end cue is a short original synthesized whoosh and reduced motion avoids the animated capture",()=>{
  const g=setup();g.sandbox.window.matchMedia=()=>({matches:true});const d=win(g),s=d.matchFlow.fade.state;assert(s.reduced);d.matchFlow.fade.tick(s.startedAt+10);assert.equal(g.elements.get("matchEndFrame").style.opacity,"0");
  const context=g.audio.context,tones=context.tones.length,noises=context.noises.length;d.combatAudio.play("matchSwoosh");assert.equal(context.tones.length-tones,1);assert.equal(context.noises.length-noises,2);const pitch=context.tones.at(-1).frequency.events;assert(pitch[0].value>pitch.at(-1).value);assert(pitch.at(-1).time-pitch[0].time<=.42);
});
