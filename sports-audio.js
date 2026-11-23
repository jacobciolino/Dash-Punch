"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashSportsAudio=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const CLIPS={soccerKick:"assets/audio/soccer/kick.wav",soccerGoal:"assets/audio/soccer/goal.wav",soccerStart:"assets/audio/soccer/start.wav"};
  const caches=new WeakMap();
  function cache(context){if(!caches.has(context))caches.set(context,{buffers:new Map(),pending:new Map(),last:new Map()});return caches.get(context);}
  function load(context,name){
    if(!context||!CLIPS[name]||typeof fetch!=="function")return Promise.resolve();
    const c=cache(context);if(c.buffers.has(name))return Promise.resolve();if(c.pending.has(name))return c.pending.get(name);
    const pending=fetch(globalThis.DASH_PUNCH_AUDIO?.[name]||CLIPS[name]).then(r=>{if(!r.ok)throw Error("Sample unavailable");return r.arrayBuffer();})
      .then(data=>context.decodeAudioData(data)).then(buffer=>{c.buffers.set(name,buffer);}).catch(()=>{});
    c.pending.set(name,pending);return pending;
  }
  function prepare(context){return Promise.all(Object.keys(CLIPS).map(name=>load(context,name)));}
  function play(name,context,intensity=1){
    if(!context||!CLIPS[name]||context.state!=="running")return false;
    const c=cache(context),buffer=c.buffers.get(name);if(!buffer){load(context,name);return false;}
    const now=context.currentTime;if(now-(c.last.get(name)??-10)<(name==="soccerKick"?.055:.3))return true;
    const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffer;
    gain.gain.value=(name==="soccerKick"?.24:.17)*Math.min(1.3,Math.max(.3,intensity));node.connect(gain);gain.connect(context.destination);node.start(now);c.last.set(name,now);return true;
  }
  return {CLIPS,prepare,play};
});
