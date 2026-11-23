"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashSports=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const RESPAWN_DELAYS=Object.freeze([10,15,20]);
  const BATTLE_DEFAULTS=Object.freeze({healthMult:.5,respawn:15,protection:2});
  function battle(input={}){
    const health=Number(input.healthMult);
    return {healthMult:Number.isFinite(health)?Math.max(.2,Math.min(1,health)):.5,
      respawn:RESPAWN_DELAYS.includes(Number(input.respawn))?Number(input.respawn):15};
  }
  function isBattle(state){return Boolean(state&&["battle","brawl","scramble"].includes(state.config.ruleset));}
  function maxHealth(normal,state){return isBattle(state)?Math.max(1,Math.round(normal*state.config.healthMult)):normal;}
  function respawnProgress(state,id){
    const remaining=state?.respawns?.[id];
    if(!isBattle(state)||!Number.isFinite(remaining)||remaining<=0)return null;
    const elapsed=Math.max(0,state.config.respawn-remaining);
    return {remaining,elapsed,fraction:Math.min(1,elapsed/state.config.respawn)};
  }
  function nextRespawn(value,direction){return RESPAWN_DELAYS[Math.max(0,Math.min(2,RESPAWN_DELAYS.indexOf(value)+direction))];}
  return {BATTLE_DEFAULTS,RESPAWN_DELAYS,battle,isBattle,maxHealth,respawnProgress,nextRespawn};
});
