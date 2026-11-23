"use strict";
const fs=require("node:fs"),{createGame}=require("./simulation-harness");
function instrument(source){
  return source.replace("const variant = chooseAudioVariant(options.family || name, options.variantCount || AUDIO_VARIATION_COUNT);",
    "(window.__audioEvents ||= []).push({name, fighter:options.fighter?.id, charge:options.charge, sequenceStage:options.sequenceStage, projectileExecuted:options.projectileExecuted, upwardSpeed:options.upwardSpeed});\n    const variant = chooseAudioVariant(options.family || name, options.variantCount || AUDIO_VARIATION_COUNT);");
}
function installAudio(g){
  const contexts=[];
  class Param{constructor(){this.events=[];}setValueAtTime(value,time){this.events.push({value,time});}exponentialRampToValueAtTime(value,time){this.events.push({value,time});}}
  class Context{
    constructor(){this.state="running";this.currentTime=1;this.sampleRate=8000;this.destination={};this.tones=[];this.noises=[];this.gains=[];contexts.push(this);}
    resume(){return Promise.resolve();}
    createOscillator(){const node={frequency:new Param(),connect(){},start(){},stop(){}};this.tones.push(node);return node;}
    createGain(){const node={gain:new Param(),connect(){}};this.gains.push(node);return node;}
    createBuffer(channels,size){return {getChannelData:()=>new Float32Array(size)};}
    createBufferSource(){const node={connect(){},start(){},stop(){}};this.noises.push(node);return node;}
    createBiquadFilter(){return {frequency:new Param(),Q:new Param(),connect(){}};}
  }
  g.sandbox.window.AudioContext=Context;
  return {contexts,get context(){return contexts[0];}};
}
function setup(key="anchor",arena=null,sound=true){
  const g=createGame(process.cwd(),{sourceOverrides:{"game.js":instrument(fs.readFileSync("game.js","utf8"))}});
  if(arena)g.debug.dashball.setup({arena,ruleset:"battle"},{characters:[key,"anchor"],seed:44});
  else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:44});
  g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:400+i*600,y:450,prevX:400+i*600,prevY:450,onGround:true,invulnerable:0,vx:0,vy:0}));
  g.audio=sound?installAudio(g):null;
  g.events=name=>(g.sandbox.window.__audioEvents||[]).filter(e=>!name||e.name===name);
  return g;
}
module.exports={instrument,installAudio,setup};
