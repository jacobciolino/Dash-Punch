"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashMatchFlow=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const TUNING=Object.freeze({hz:60,toWin:2,fightingSeconds:120,sportsSeconds:300,roundEndTicks:120,countdownTicks:180});
  function create(sides,seconds,countdown=true){
    return {version:1,sides:sides.map(s=>({...s,members:[...s.members]})),wins:sides.map(()=>0),round:1,toWin:TUNING.toWin,
      limitTicks:Math.max(0,Math.round(seconds*TUNING.hz)),remainingTicks:Math.max(0,Math.round(seconds*TUNING.hz)),
      phase:countdown?"countdown":"playing",transitionTicks:countdown?TUNING.countdownTicks:0,
      overtime:false,roundWinner:null,winner:null,reason:"",goTicks:0,releaseLocks:{}};
  }
  function leader(values){
    let best=-Infinity,winner=null;
    for(let i=0;i<values.length;i++){
      if(values[i]>best+1e-9){best=values[i];winner=i;}
      else if(Math.abs(values[i]-best)<=1e-9)winner=null;
    }
    return winner;
  }
  function award(s,winner,reason){
    if(s.phase!=="playing"||!Number.isInteger(winner)||!s.sides[winner])return false;
    s.roundWinner=winner;s.reason=reason;s.wins[winner]++;
    if(s.wins[winner]>=s.toWin)s.winner=winner;
    s.phase="roundEnd";s.transitionTicks=TUNING.roundEndTicks;return true;
  }
  // Called once per deterministic simulation step, not per rendered frame.
  function before(s){
    if(s.phase==="finished")return {play:false};
    if(s.phase==="roundEnd"){
      if(--s.transitionTicks>0)return {play:false};
      if(s.winner!==null){s.phase="finished";return {play:false,finished:true};}
      s.round++;s.roundWinner=null;s.remainingTicks=s.limitTicks;s.overtime=false;
      s.phase="countdown";s.transitionTicks=TUNING.countdownTicks;s.releaseLocks={};
      return {play:false,reset:true};
    }
    if(s.phase==="countdown"){
      if(--s.transitionTicks>0)return {play:false};
      s.phase="playing";s.goTicks=24;return {play:true,go:true};
    }
    s.goTicks=Math.max(0,s.goTicks-1);return {play:true};
  }
  function after(s,{sports=false,active=true,winner=null,alive=[],health=[],scores=[]}={}){
    if(s.phase!=="playing")return;
    if(winner!==null){award(s,winner,sports?"OBJECTIVE":"KO");return;}
    if(!sports){
      const survivors=alive.map((n,i)=>n>0?i:-1).filter(i=>i>=0);
      if(survivors.length===1){award(s,survivors[0],"KO");return;}
      if(!survivors.length){
        s.overtime=true;s.remainingTicks=0;s.phase="countdown";s.transitionTicks=TUNING.countdownTicks;s.releaseLocks={};
        return {reset:true};
      }
    }
    if(active&&!s.overtime&&s.limitTicks>0)s.remainingTicks=Math.max(0,s.remainingTicks-1);
    if(!s.overtime&&(s.limitTicks===0||s.remainingTicks>0))return;
    const decisive=leader(sports?scores:health);
    if(decisive!==null){award(s,decisive,s.overtime?"SUDDEN DEATH":"TIME");return;}
    s.overtime=true;
  }
  function gate(s,id,input){
    const locks=s.releaseLocks[id]||(s.releaseLocks[id]={dash:true,punch:true,down:true}),out={...input};
    for(const action of["dash","punch","down"]){
      if(!locks[action])continue;
      if(!input[`${action}Held`])locks[action]=false;
      out[`${action}Held`]=false;out[`${action}Pressed`]=false;out[`${action}Released`]=false;
    }
    return out;
  }
  return {TUNING,create,leader,award,before,after,gate};
});
