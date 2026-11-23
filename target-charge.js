"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashTargetCharge=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const STAGES=Object.freeze(["stationary","vertical","roaming"].map(kind=>Object.freeze({id:`target-charge-${kind}`,name:`Target Charge \u2014 ${kind[0].toUpperCase()+kind.slice(1)}`,kind})));
  const TUNING=Object.freeze({radius:80,centerY:700,verticalTop:350,verticalBottom:1020,verticalPeriod:8,roamAcceleration:260,roamSpeed:340,unitsPerPercent:60000,targets:Object.freeze([50,75,100,150,200])});
  const ANCHORS=Object.freeze([[0,0],[200,1],[400,3],[600,6],[800,10],[1000,14],[1400,21],[1800,27],[2200,32]].map(Object.freeze));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),isArena=id=>STAGES.some(s=>s.id===id);
  function chargeUnits(speed){
    if(!(speed>0))return 0;
    for(let i=1;i<ANCHORS.length;i++)if(speed<=ANCHORS[i][0]){
      const [a,x]=ANCHORS[i-1],[b,y]=ANCHORS[i];return Math.round((x+(y-x)*(speed-a)/(b-a))*TUNING.unitsPerPercent);
    }
    return ANCHORS.at(-1)[1]*TUNING.unitsPerPercent;
  }
  function create(stage){return {units:[0,0],pending:[0,0],serial:0,contacts:{},target:{x:stage.width/2,y:TUNING.centerY,prevX:stage.width/2,prevY:TUNING.centerY,vx:0,vy:0,r:TUNING.radius,phase:0,destination:null,destinationTime:0}};}
  function bounds(stage){return {left:stage.width*.15,right:stage.width*.85,top:270,bottom:Math.min(1020,stage.floorY-250)};}
  function predict(target,stage,ahead=.5){const b=bounds(stage);return {x:clamp(target.x+target.vx*ahead,b.left,b.right),y:clamp(target.y+target.vy*ahead,b.top,b.bottom)};}
  function advance(state,stage,dt,random){
    const t=state.targetCharge.target;t.prevX=t.x;t.prevY=t.y;
    if(stage.targetCharge==="stationary"){t.vx=t.vy=0;return;}
    if(stage.targetCharge==="vertical"){
      t.phase+=dt;const middle=(TUNING.verticalTop+TUNING.verticalBottom)/2,range=(TUNING.verticalBottom-TUNING.verticalTop)/2;
      // Start at the authored center without a first-frame positional jump.
      const start=Math.asin((TUNING.centerY-middle)/range);
      t.y=middle+Math.sin(start+t.phase*Math.PI*2/TUNING.verticalPeriod)*range;
    }else{
      const b=bounds(stage);t.destinationTime-=dt;
      if(!t.destination||t.destinationTime<=0||Math.hypot(t.x-t.destination.x,t.y-t.destination.y)<55){
        if(typeof random!=="function")throw Error("Roaming Target Charge requires the simulation RNG");
        t.destination={x:b.left+32+(b.right-b.left-64)*random(),y:b.top+32+(b.bottom-b.top-64)*random()};t.destinationTime=3+random()*2;
      }
      const dx=t.destination.x-t.x,dy=t.destination.y-t.y,d=Math.hypot(dx,dy)||1,speed=Math.min(TUNING.roamSpeed,Math.sqrt(2*TUNING.roamAcceleration*d));
      let ax=dx/d*speed-t.vx,ay=dy/d*speed-t.vy,change=Math.hypot(ax,ay),amount=Math.min(1,TUNING.roamAcceleration*dt/(change||1));
      t.vx+=ax*amount;t.vy+=ay*amount;
      // Brake before the safe region's edges rather than bouncing or teleporting.
      const safeSpeed=distance=>(Math.sqrt((TUNING.roamAcceleration*dt)**2+8*TUNING.roamAcceleration*Math.max(0,distance))-TUNING.roamAcceleration*dt)/2;
      t.vx=clamp(t.vx,-safeSpeed(t.x-b.left),safeSpeed(b.right-t.x));
      t.vy=clamp(t.vy,-safeSpeed(t.y-b.top),safeSpeed(b.bottom-t.y));
      t.x+=t.vx*dt;t.y+=t.vy*dt;
    }
    t.vx=(t.x-t.prevX)/dt;t.vy=(t.y-t.prevY)/dt;
  }
  function collide(state,ball,previous,targetBefore,world){
    if(ball.carrier)return;
    const c=state.targetCharge,t=c.target,r=t.r+ball.r,dx=ball.x-t.x,dy=ball.y-t.y,d=Math.hypot(dx,dy),oldX=previous.x-targetBefore.x,oldY=previous.y-targetBefore.y,oldDistance=Math.hypot(oldX,oldY);
    const key=ball.id,contact=c.contacts[key]||(c.contacts[key]={armed:oldDistance>=r-.00001});
    if(d>r+1)contact.armed=true;
    if(d>=r)return;
    let nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0;
    // Use the swept contact normal, before depenetration or restitution.
    const sx=dx-oldX,sy=dy-oldY,a=sx*sx+sy*sy,b=2*(oldX*sx+oldY*sy),disc=b*b-4*a*(oldDistance*oldDistance-r*r);
    if(oldDistance>=r-.00001&&a>1e-12&&disc>=0){const time=clamp((-b-Math.sqrt(disc))/(2*a),0,1);nx=(oldX+sx*time)/r;ny=(oldY+sy*time)/r;}
    const closing=Math.max(0,-((ball.vx-t.vx)*nx+(ball.vy-t.vy)*ny));
    if(contact.armed&&oldDistance>=r-.00001&&closing>1e-8){
      const units=chargeUnits(closing);c.pending[ball.scoringTeam]+=units;
      if(units){const event={team:ball.scoringTeam,units,serial:++c.serial,x:t.x,y:t.y,impact:closing};world.onChargeHit?.(event);}
    }
    contact.armed=false;
    ball.x=t.x+nx*(r+.01);ball.y=t.y+ny*(r+.01);
    if(closing>0){ball.vx+=(1+state.config.bounce)*closing*nx;ball.vy+=(1+state.config.bounce)*closing*ny;world.onBallImpact?.(ball,closing,{x:nx,y:ny});}
  }
  function collideBalls(a,b,bounce,onImpact){
    if(a.carrier||b.carrier)return false;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),r=a.r+b.r;if(d>=r)return false;
    const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,depth=(r-d+.01)/2;
    a.x-=nx*depth;a.y-=ny*depth;b.x+=nx*depth;b.y+=ny*depth;
    const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(closing<0){const impulse=-(1+bounce)*closing/2;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;onImpact?.(a,-closing,{x:-nx,y:-ny});onImpact?.(b,-closing,{x:nx,y:ny});}
    return true;
  }
  function resolve(state,finish){
    if(state.phase!=="playing")return;
    const c=state.targetCharge;
    for(const team of [0,1]){c.units[team]+=c.pending[team];c.pending[team]=0;state.scores[team]=c.units[team]/TUNING.unitsPerPercent;}
    if(c.units.some(n=>n>=state.config.winningScore*TUNING.unitsPerPercent)||state.overtime&&c.units[0]!==c.units[1]){
      if(c.units[0]===c.units[1]){state.overtime=true;state.announcement="SUDDEN DEATH";}
      else finish(state,c.units[0]>c.units[1]?0:1);
    }
  }
  function assignments(state,world,balls){
    const result={},t=state.targetCharge.target;
    for(const team of [0,1]){
      const own=balls.find(b=>b.scoringTeam===team),opponent=balls.find(b=>b.scoringTeam!==team);
      const peers=world.fighters.filter(f=>f.team===team&&!f.koScored),remaining=[...peers];
      const threat=(t.x-opponent.x)*opponent.vx+(t.y-opponent.y)*opponent.vy>0&&Math.hypot(t.x-opponent.x,t.y-opponent.y)<700;
      const urgent=threat&&(state.scores[1-team]>state.scores[team]+10||Math.hypot(t.x-opponent.x,t.y-opponent.y)<250);
      const tasks=threat&&(peers.length>1||urgent)?["defense","offense"]:["offense","defense"];
      if(peers.length>3)tasks.push("offense");
      for(const kind of tasks){if(!remaining.length)break;const ball=kind==="offense"?own:opponent;remaining.sort((a,b)=>Math.hypot(a.x-ball.x,a.y-ball.y)-Math.hypot(b.x-ball.x,b.y-ball.y)||a.playerIndex-b.playerIndex);const f=remaining.shift();result[f.id]={kind,ballId:ball.id};}
      for(const f of remaining)result[f.id]={kind:"support",ballId:own.id};
    }
    return result;
  }
  return {STAGES,TUNING,ANCHORS,isArena,chargeUnits,create,advance,collide,collideBalls,resolve,predict,bounds,assignments};
});
