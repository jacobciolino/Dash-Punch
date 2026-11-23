"use strict";
const {createGame}=require("./simulation-harness");
function dashFixture({ground=false,charge=0,input=null,side=1,arc=true}={}) {
  const game=createGame(),{debug:d,rb}=game;rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:["orbit","anchor"],seed:72});
  const f=d.fighters[0],floor=d.terrainArt.rects.find(t=>t.kind==="floor");
  if(!arc)delete f.data.airDashArc;
  Object.assign(f,{x:side>0?200:1000,y:ground?floor.y-f.data.height/2:-5000,vx:0,vy:0,onGround:ground,hasLiveAim:false});
  d.gravity.dash(0,{x:side,y:0},charge*f.data.dashChargeTime);
  const duration=ground?.38:f.dashCarryTimer,initial={vx:f.vx,vy:f.vy,duration},points=[];let previousX=f.x,travel=0;
  for(let frame=0;frame<(ground?90:Math.ceil(duration*60));frame++) {
    if(input){f.hasLiveAim=true;f.aim=typeof input==="function"?input(frame):input;}
    d.gravity.physics(0);let dx=f.x-previousX;const span=floor.w+f.data.width;dx-=Math.round(dx/span)*span;travel+=dx;previousX=f.x;points.push([f.x,f.y,f.vx,f.vy]);
  }
  const range=Math.abs(travel),seconds=points.length/60;
  return {game,initial,range,averageSpeed:range/seconds,seconds,points};
}
module.exports={dashFixture};
