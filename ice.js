"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashIce=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const TUNING=Object.freeze({delay:.4,gravity:1700,fallCap:1450,life:4,radius:6,height:30,damage:6,
    coatingLife:.9,coatingTravel:.3,coatingSpan:150,friction:.995,traction:.3,maxIcicles:48,maxPatches:8});
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const create=()=>({serial:0,events:[],icicles:[],patches:[],trail:null,ground:null});
  const rect=c=>({x:c.x-TUNING.radius,y:c.y-TUNING.height/2,w:TUNING.radius*2,h:TUNING.height});
  function sweep(from,to,box,padX=0,padY=padX){
    let lo=0,hi=1;
    for(const[start,end,min,max]of[[from.x,to.x,box.x-padX,box.x+box.w+padX],[from.y,to.y,box.y-padY,box.y+box.h+padY]]){
      const delta=end-start;if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;continue;}
      const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;
    }
    return lo;
  }
  function event(state,source){const value={id:++state.serial,source,hits:[]};state.events.push(value);return value;}
  function emit(state,points,source="dash",id=event(state,source).id){
    for(const p of points)state.icicles.push({id:++state.serial,event:id,x:p.x,y:p.y,vy:0,age:0,dead:false});
    if(state.icicles.length>TUNING.maxIcicles)state.icicles.splice(0,state.icicles.length-TUNING.maxIcicles);
    return id;
  }
  function startAir(state,point,duration){finishAir(state);state.trail={event:event(state,"dash").id,remaining:duration,points:[{...point}],last:{...point}};}
  function sampleAir(state,point,dt,offset,stop=false,normalize=p=>p){
    const trail=state.trail;if(!trail)return;
    const delta=offset(trail.last,point),last=trail.points.at(-1);
    if(Math.hypot(delta.x,delta.y)<500)trail.points.push({x:last.x+delta.x,y:last.y+delta.y});
    else stop=true;
    trail.last={...point};trail.remaining-=dt;
    if(stop||trail.remaining<=1e-9)finishAir(state,normalize);
  }
  function finishAir(state,normalize=p=>p){
    const trail=state.trail;if(!trail)return;
    const points=trail.points,lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths[n-1]+Math.hypot(points[n].x-points[n-1].x,points[n].y-points[n-1].y));
    const total=lengths.at(-1),output=[1/6,.5,5/6].map(fraction=>{
      const distance=total*fraction;let n=1;while(n<lengths.length-1&&lengths[n]<distance)n++;
      const a=points[Math.max(0,n-1)],b=points[Math.min(n,points.length-1)],t=total>0?(distance-lengths[Math.max(0,n-1)])/Math.max(.001,lengths[n]-lengths[Math.max(0,n-1)]):0;
      return normalize({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    });
    emit(state,output,"dash",trail.event);state.trail=null;
  }
  function shatter(state,object,world){if(object.dead)return;object.dead=true;world.shatter?.(object);}
  function patchRect(patch,world){
    const surface=world.surface(patch.surface);if(!surface)return null;
    if(patch.axis==="y")return {x:surface.x+patch.start,y:(patch.sign>0?surface.y:surface.y+surface.h)-3,w:Math.max(1,patch.end-patch.start),h:6};
    return {x:(patch.sign>0?surface.x:surface.x+surface.w)-3,y:surface.y+patch.start,w:6,h:Math.max(1,patch.end-patch.start)};
  }
  function startGround(state,surface,axis,sign,along,half){
    if(!surface)return;
    const span=axis==="y"?surface.w:surface.h;
    const patch={id:++state.serial,surface:surface.id,axis,sign,start:clamp(along-half,0,span),end:clamp(along+half,0,span),age:0,dead:false};
    state.patches.push(patch);if(state.patches.length>TUNING.maxPatches)state.patches.shift();
    state.ground={patch:patch.id,remaining:TUNING.coatingTravel,origin:along};
  }
  function sampleGround(state,surface,along,dt){
    const trail=state.ground;if(!trail)return;
    trail.remaining-=dt;const patch=state.patches.find(p=>p.id===trail.patch);
    if(!patch||patch.dead||trail.remaining<=0){state.ground=null;return;}
    if(surface?.id!==patch.surface)return;
    const span=patch.axis==="y"?surface.w:surface.h,position=clamp(along,trail.origin-TUNING.coatingSpan/2,trail.origin+TUNING.coatingSpan/2);
    patch.start=clamp(Math.min(patch.start,position-12),0,span);patch.end=clamp(Math.max(patch.end,position+12),0,span);
  }
  function clean(state){
    state.icicles=state.icicles.filter(c=>!c.dead);state.patches=state.patches.filter(p=>!p.dead);
    const ids=new Set(state.icicles.map(c=>c.event));if(state.trail)ids.add(state.trail.event);state.events=state.events.filter(e=>ids.has(e.id));
  }
  // Resolve the earliest swept contact. Ties consistently favor attacks/shields
  // over bodies, then stable object IDs; list order cannot change the outcome.
  function step(state,dt,world,active=state.icicles.slice()){
    const attacks=world.attacks();
    for(const patch of state.patches){
      patch.age+=dt;const area=patchRect(patch,world);
      if(!area||patch.age>=TUNING.coatingLife-1e-9)patch.dead=true;
      else if(attacks.some(a=>world.attackTouches(a,area)))shatter(state,patch,world);
    }
    for(const c of active){
      if(c.dead)continue;
      const from={x:c.x,y:c.y},oldAge=c.age;c.age+=dt;
      if(c.age>=TUNING.life){c.dead=true;continue;}
      const fallDt=Math.max(0,c.age-TUNING.delay)-Math.max(0,oldAge-TUNING.delay);
      if(fallDt>0){c.vy=Math.min(TUNING.fallCap,c.vy+TUNING.gravity*fallDt);c.y+=c.vy*fallDt;}
      const hits=[],area=rect(c),motion={x:area.x,y:Math.min(from.y,c.y)-TUNING.height/2,w:area.w,h:Math.abs(c.y-from.y)+TUNING.height};
      for(const a of attacks)if(world.attackTouches(a,motion))hits.push({t:0,priority:0,id:a.id,kind:"attack"});
      for(const projectile of world.projectiles||[])for(const path of projectile.paths){
        const p=world.projectilePath?world.projectilePath(path,c):path;
        const box={x:-TUNING.radius-projectile.radius,y:-TUNING.height/2-projectile.radius,w:2*(TUNING.radius+projectile.radius),h:TUNING.height+2*projectile.radius};
        const t=sweep({x:p.x1-from.x,y:p.y1-from.y},{x:p.x2-c.x,y:p.y2-c.y},box);
        if(t!==null)hits.push({t,priority:0,id:projectile.id,kind:"projectile"});
      }
      for(const f of world.fighters){
        if(!world.collidable(f))continue;
        const box=world.body(f,c),previous=world.previous(f,c),delta={x:previous.x-box.x,y:previous.y-box.y};
        const bodyT=sweep({x:from.x-delta.x,y:from.y-delta.y},c,box,TUNING.radius,TUNING.height/2);
        if(c.vy>0&&bodyT!==null&&f.id!==world.owner.id)hits.push({t:bodyT,priority:4,id:f.id,kind:"fighter",fighter:f});
        if(world.shielding(f)&&world.covers(f,from)){
          const padding=world.padding(f),t=sweep(from,c,box,TUNING.radius+padding,TUNING.height/2+padding);
          if(t!==null)hits.push({t,priority:1,id:f.id,kind:"shield",fighter:f});
        }
      }
      for(const terrain of world.terrain){
        if(terrain.kind==="oneway"&&(c.vy<=0||from.y+TUNING.height/2>terrain.y+1))continue;
        const t=sweep(from,c,terrain,TUNING.radius,TUNING.height/2);if(t!==null)hits.push({t,priority:2,id:terrain.id,kind:"terrain"});
      }
      for(const ball of world.balls){
        if(ball.carrier)continue;
        const p=world.ball(ball,c),before=world.ballPrevious(ball,p),box={x:-TUNING.radius-p.r,y:-TUNING.height/2-p.r,w:TUNING.radius*2+p.r*2,h:TUNING.height+p.r*2};
        const t=sweep({x:before.x-from.x,y:before.y-from.y},{x:p.x-c.x,y:p.y-c.y},box);
        if(t!==null)hits.push({t,priority:3,id:ball.id,kind:"ball",ball});
      }
      hits.sort((a,b)=>a.t-b.t||a.priority-b.priority||(String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0));
      const hit=hits[0];if(!hit)continue;
      if(hit.kind==="shield")world.block(hit.fighter,c);
      if(hit.kind==="ball")world.deflect(hit.ball,c,hit.t,from);
      if(hit.kind==="fighter"){
        const e=state.events.find(e=>e.id===c.event);
        if(e&&!e.hits.includes(hit.fighter.id)&&world.canDamage(hit.fighter)){e.hits.push(hit.fighter.id);world.damage(hit.fighter,TUNING.damage,c);}
      }
      shatter(state,c,world);
    }
    clean(state);
  }
  function projectile(state,paths,radius,world){
    for(const object of [...state.icicles,...state.patches]){
      if(object.dead)continue;const area=object.event===undefined?patchRect(object,world):rect(object);if(!area)continue;
      if(paths.some(p=>sweep({x:p.x1,y:p.y1},{x:p.x2,y:p.y2},world.relativeRect(area,(p.x1+p.x2)/2,(p.y1+p.y2)/2),radius)!==null))shatter(state,object,world);
    }
    clean(state);
  }
  return {TUNING,create,rect,sweep,emit,startAir,sampleAir,finishAir,startGround,sampleGround,patchRect,step,projectile};
});
