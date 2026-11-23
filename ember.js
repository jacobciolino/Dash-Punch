"use strict";
(function(root,factory){const api=factory(typeof module!=="undefined"&&module.exports?require("./ice"):root.DashIce);if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashEmber=api;})(typeof globalThis!=="undefined"?globalThis:this,Ice=>{
  const TUNING=Object.freeze({life:.14,groundLife:.65,radius:10,spacing:14,damage:3,lift:16,push:12,shieldContact:2,maxFlames:40});
  const create=()=>({serial:0,events:[],flames:[],trail:null,shieldContacts:[]});
  const rect=c=>({x:Math.min(c.x,c.endX)-TUNING.radius,y:Math.min(c.y,c.endY)-TUNING.radius,
    w:Math.abs(c.endX-c.x)+TUNING.radius*2,h:Math.abs(c.endY-c.y)+TUNING.radius*2});
  function clean(state){
    state.flames=state.flames.filter(c=>!c.dead);
    const ids=new Set(state.flames.map(c=>c.event));if(state.trail)ids.add(state.trail.event);
    state.events=state.events.filter(e=>ids.has(e.id));
  }
  function emit(state,from,to=from,id,ground=null){
    if(id===undefined){id=++state.serial;state.events.push({id,hits:[],balls:[]});}
    state.flames.push({id:++state.serial,event:id,x:from.x,y:from.y,endX:to.x,endY:to.y,age:0,dead:false,...(ground?{ground}:{})});
    if(state.flames.length>TUNING.maxFlames)state.flames.shift();return id;
  }
  function start(state,point,duration,ground=null){
    const id=++state.serial;state.events.push({id,hits:[],balls:[]});state.trail={event:id,last:{...point},remaining:duration,...(ground?{ground}:{})};clean(state);
  }
  function sample(state,point,dt,offset,stop=false,normalize=p=>p,surface=null){
    const trail=state.trail;if(!trail)return;
    if(trail.ground&&(stop||!surface||surface.id!==trail.ground.id)){state.trail=null;clean(state);return;}
    const delta=offset(trail.last,point),distance=Math.hypot(delta.x,delta.y),count=Math.max(1,Math.ceil(distance/TUNING.spacing));
    // Recovery teleports are never interpreted as a damaging path across the arena.
    if(distance<500)for(let i=0;i<count;i++){
      const a=normalize({x:trail.last.x+delta.x*i/count,y:trail.last.y+delta.y*i/count});
      const end={x:a.x+delta.x/count,y:a.y+delta.y/count},g=trail.ground;
      const along=p=>Math.max(0,Math.min(g.axis==="y"?surface.w:surface.h,g.axis==="y"?p.x-surface.x:p.y-surface.y));
      emit(state,a,end,trail.event,g?{...g,start:along(a),end:along(end)}:null);
    }
    trail.last={...point};trail.remaining-=dt;
    if(stop||distance>=500||trail.remaining<=1e-9)state.trail=null;
    clean(state);
  }
  function attached(c,world){
    const g=c.ground;if(!g)return c;const r=world.surface?.(g.id);if(!r)return null;
    const plane=g.axis==="y"?(g.sign>0?r.y:r.y+r.h):(g.sign>0?r.x:r.x+r.w);
    return {...c,x:g.axis==="y"?r.x+g.start:plane,y:g.axis==="y"?plane:r.y+g.start,
      endX:g.axis==="y"?r.x+g.end:plane,endY:g.axis==="y"?plane:r.y+g.end};
  }
  function extinguish(c,world){if(c.dead)return;c.dead=true;world.extinguish?.(c);}
  function projectile(state,paths,radius,world){
    for(const c of state.flames){const p=attached(c,world);if(!p){c.dead=true;continue;}if(paths.some(s=>Ice.sweep({x:s.x1,y:s.y1},{x:s.x2,y:s.y2},world.relativeRect(rect(p),(s.x1+s.x2)/2,(s.y1+s.y2)/2),radius)!==null))extinguish(c,world);}
    clean(state);
  }
  function step(state,dt,world){
    const attacks=world.attacks();
    for(const c of state.flames){
      c.age+=dt;if(c.age>=(c.ground?TUNING.groundLife:TUNING.life)-1e-9){c.dead=true;continue;}
      const position=attached(c,world);if(!position){c.dead=true;continue;}Object.assign(c,{x:position.x,y:position.y,endX:position.endX,endY:position.endY});
      const area=rect(c),center={x:area.x+area.w/2,y:area.y+area.h/2};
      // Extinguishing always precedes body damage in a fixed step. A destroyed
      // segment cannot burn someone later in the same collision pass.
      if(attacks.some(a=>world.attackTouches(a,area))){extinguish(c,world);continue;}
      for(const shot of world.projectiles||[])if(shot.paths.some(path=>{
        const p=world.projectilePath(path,center);return Ice.sweep({x:p.x1,y:p.y1},{x:p.x2,y:p.y2},area,shot.radius)!==null;
      })){extinguish(c,world);break;}
      if(c.dead)continue;
      const e=state.events.find(e=>e.id===c.event);
      for(const b of world.balls){
        if(b.carrier)continue;const p=world.ball(b,center),previous=world.ballPrevious(b,p);
        const t=Ice.sweep(previous,p,area,p.r);
        if(t!==null){
          const key=b.id??world.balls.indexOf(b);
          if(e&&!e.balls.includes(key)){e.balls.push(key);world.deflect(b,c,t,previous,p);}
          extinguish(c,world);break;
        }
      }
      if(c.dead)continue;
      const contacts=[];
      for(const f of world.fighters){
        if(f===world.owner||!world.collidable(f))continue;
        const box=world.body(f,center),previous=world.previous(f,center),from={x:previous.x+box.w/2,y:previous.y+box.h/2},to={x:box.x+box.w/2,y:box.y+box.h/2};
        if(world.shielding(f)&&world.covers(f,center)&&Ice.sweep(from,to,area,box.w/2+world.padding(f),box.h/2+world.padding(f))!==null){contacts.push({f,shield:true});continue;}
        if(Ice.sweep(from,to,area,box.w/2,box.h/2)!==null)contacts.push({f,shield:false});
      }
      if(contacts.some(h=>h.shield)){for(const h of contacts)if(h.shield)world.block(h.f,c);extinguish(c,world);continue;}
      for(const {f} of contacts)if(e&&!e.hits.includes(f.id)&&world.canDamage(f)){e.hits.push(f.id);world.damage(f,TUNING.damage,c);}
    }
    clean(state);
  }
  return {TUNING,create,rect,emit,start,sample,attached,step,projectile};
});
