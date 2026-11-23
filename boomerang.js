"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashBoomerang=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const TUNING=Object.freeze({outboundTime:.8,returnSpeed:1100,returnAcceleration:2400,turnRate:4.8,life:8,radius:38,recallMax:1.2,recallDecay:2,wallPause:.06,spinBoost:1});
  const RECALL_SPEEDS=Object.freeze([[0,1100],[.3,1300],[.6,1550],[.9,1800],[1.2,2000]].map(Object.freeze));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),angle=n=>((n+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  function create(speed,dir,ownerId=null){return {phase:"outbound",phaseTime:0,flightTime:0,spinTime:0,recallCharge:0,recallOwnerId:ownerId,wallPause:0,launchSpeed:speed,heading:Math.atan2(dir.y,dir.x),contacts:{}};}
  function resetRecall(shot,ownerId=null){const b=shot.boomerang;b.recallCharge=0;b.recallOwnerId=ownerId;}
  function recallSpeed(charge){
    for(let i=1;i<RECALL_SPEEDS.length;i++){const [t,s]=RECALL_SPEEDS[i],[previous,base]=RECALL_SPEEDS[i-1];if(charge<=t)return base+(s-base)*clamp((charge-previous)/(t-previous),0,1);}
    return RECALL_SPEEDS[RECALL_SPEEDS.length-1][1];
  }
  function chargeRecall(shot,dt,held,ownerId){
    const b=shot.boomerang;if(b.recallOwnerId!==ownerId)resetRecall(shot,ownerId);
    b.recallCharge=clamp((b.recallCharge||0)+dt*(held?1:-TUNING.recallDecay),0,TUNING.recallMax);
  }
  function redirect(shot,dir){const b=shot.boomerang;b.phase="outbound";b.phaseTime=0;b.wallPause=0;b.launchSpeed=Math.max(120,shot.speed);b.heading=Math.atan2(dir.y,dir.x);}
  function returning(shot,offset){
    const b=shot.boomerang;b.phase="return";b.phaseTime=0;b.heading=Math.atan2(offset.y,offset.x);shot.speed=0;
  }
  function wallTurn(shot,offset,normal){
    const b=shot.boomerang,into=Math.min(0,shot.vx*normal.x+shot.vy*normal.y);
    const vx=shot.vx-into*normal.x,vy=shot.vy-into*normal.y,speed=Math.hypot(vx,vy);
    b.phase="return";b.phaseTime=0;b.wallPause=TUNING.wallPause;
    // Stop only the blocked component; ease back into homing instead of reflecting velocity.
    const aim=offset.x*normal.x+offset.y*normal.y>=0?offset:normal;
    b.heading=speed>1?Math.atan2(vy,vx):Math.atan2(aim.y,aim.x);
    shot.speed=speed;shot.vx=vx;shot.vy=vy;
  }
  function steer(shot,dt,offset){
    const b=shot.boomerang;b.flightTime+=dt;b.phaseTime+=dt;
    b.spinTime=(b.spinTime||0)+dt*(1+TUNING.spinBoost*(b.recallCharge||0)/TUNING.recallMax);let transitioned=false;
    if(b.phase==="outbound"){
      shot.speed=b.launchSpeed*Math.cos(clamp(b.phaseTime/TUNING.outboundTime,0,1)*Math.PI/2);
      if(b.phaseTime>=TUNING.outboundTime-1e-9){returning(shot,offset);transitioned=true;}
    }else{
      const desired=Math.atan2(offset.y,offset.x);b.heading+=clamp(angle(desired-b.heading),-TUNING.turnRate*dt,TUNING.turnRate*dt);
      const speed=recallSpeed(b.recallCharge||0),acceleration=TUNING.returnAcceleration*speed/TUNING.returnSpeed;
      const pause=Math.min(dt,b.wallPause||0);b.wallPause=Math.max(0,(b.wallPause||0)-dt);
      const delta=clamp(speed-shot.speed,-acceleration*dt,acceleration*(dt-pause));shot.speed+=delta;
    }
    shot.vx=Math.cos(b.heading)*shot.speed;shot.vy=Math.sin(b.heading)*shot.speed;
    return {dir:{x:Math.cos(b.heading),y:Math.sin(b.heading)},transitioned};
  }
  return {TUNING,RECALL_SPEEDS,create,redirect,returning,wallTurn,resetRecall,chargeRecall,recallSpeed,steer};
});
