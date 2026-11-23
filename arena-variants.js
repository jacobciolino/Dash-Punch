"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashArenaVariants=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const WIDE=Object.freeze({"standard-wide":Object.freeze({base:"standard",name:"Soccer \u2014 Wide",scale:1.75}),"field-goal-wide":Object.freeze({base:"field-goal",name:"Field Goal \u2014 Wide",scale:1.75})});
  const deferredSport=id=>id==="gravity-golden-rush"||id.startsWith("sticky-ball")||id.startsWith("tri-ball")||Boolean(WIDE[id]);
  function widen(stage,id){
    const variant=WIDE[id],width=stage.width*variant.scale,delta=width-stage.width,oldWidth=stage.width;
    const rect=r=>({...r,...(r.w>=oldWidth-48?{w:r.w+delta}:r.x>=oldWidth/2?{x:r.x+delta}:{})});
    return {...stage,name:variant.name,dashballArena:id,wideArena:true,soccer:true,width,wrap:false,
      cameraZoom:Math.min(stage.cameraZoom,1248/width),
      terrain:stage.terrain.map(rect),ballOnly:stage.ballOnly.map(rect),...(stage.goalFrames?{goalFrames:stage.goalFrames.map(rect)}:{}),
      goals:stage.goals.map(g=>g.team?{...g,...Object.fromEntries(["line","left","right","outerLeft","outerRight"].filter(k=>g[k]!==undefined).map(k=>[k,g[k]+delta]))}:{...g}),
      teamSpawnLanes:Object.fromEntries(Object.entries(stage.teamSpawnLanes).map(([key,lane])=>[key,lane.map(x=>x*variant.scale)]))};
  }
  function rotorArena(chungusWidth=118){
    const width=1600,height=960,floorY=832,pitWidth=Math.ceil((chungusWidth+36)/8)*8,pitX=(width-pitWidth)/2;
    const rotor={x:width/2,y:464,radius:160,speed:.6,surfaceId:"whirlwell:rotor"},pitch=8,terrain=[
      {x:0,y:floorY,w:pitX,h:height-floorY,kind:"floor"},
      {x:pitX+pitWidth,y:floorY,w:width-pitX-pitWidth,h:height-floorY,kind:"floor"}];
    // Native-pixel stepped strips share the existing solid terrain, projectile,
    // wall and AI collision paths. One surface ID prevents wall-refill farming.
    for(let y=-rotor.radius;y<rotor.radius;y+=pitch){
      const half=Math.floor(Math.sqrt(rotor.radius**2-(y+pitch/2)**2)/4)*4;
      terrain.push({x:rotor.x-half,y:rotor.y+y,w:half*2,h:pitch,kind:"platform",rotorSurface:true,surfaceId:rotor.surfaceId});
    }
    return {name:"Whirlwell",width,height,floorY,wrap:true,wrapMargin:24,verticalWrap:false,cameraOpenTop:true,
      fixedCamera:true,cameraZoom:.6,cameraHeader:144,backgroundColor:"#35443f",hole:{x:pitX,width:pitWidth,bottomOnly:true},rotor,
      tag:"Rotating stone wheel · Pit return",description:"Ride the rotating center wheel. Drop through the narrow floor pit to return above it; the sides and sky stay open.",
      spawns:Object.fromEntries([[400,floorY-110],[1200,floorY-110],[220,floorY-110],[1380,floorY-110],[580,floorY-110],[1020,floorY-110],[80,floorY-110],[1520,floorY-110],[700,150],[900,150]].map(([x,y],i)=>[`p${i+1}`,{x,y,face:x<width/2?1:-1}])),terrain};
  }
  function rotorMotion(rotor,body,dt){
    const x=Math.max(body.x,Math.min(rotor.x,body.x+body.w))-rotor.x,y=Math.max(body.y,Math.min(rotor.y,body.y+body.h))-rotor.y;
    const length=Math.hypot(x,y)||1,px=x/length*rotor.radius,py=y/length*rotor.radius,angle=rotor.speed*dt,c=Math.cos(angle),s=Math.sin(angle);
    return {x:px*c-py*s-px,y:px*s+py*c-py};
  }
  return {WIDE,deferredSport,widen,rotorArena,rotorMotion};
});
