"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashSandbag=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const Sports=typeof module!=="undefined"&&module.exports?require("./sports.js"):globalThis.DashSports;
  const RULESETS=[{id:"race",name:"Damage Race"},{id:"brawl",name:"Damage Brawl"},{id:"scramble",name:"Sandbag Scramble"}];
  const DURATIONS=[30,60,90,120,180,300];
  const DEFAULTS={ruleset:"brawl",teamSize:1,duration:90,...Sports.battle(),friendlyFire:true,
    thresholds:[120,450,1000,2200],gravity:1800,maxSpeed:1100,mass:2,bounce:.38,wallBounce:.5,drag:.3,friction:3};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finite=(v,f,a,b)=>Number.isFinite(Number(v))?clamp(Number(v),a,b):f;
  function options(input={}){
    const c={...DEFAULTS,thresholds:[...DEFAULTS.thresholds]};
    c.ruleset=RULESETS.some(r=>r.id===input.ruleset)?input.ruleset:"brawl";
    for(const [key,a,b] of [["teamSize",1,5],["duration",30,300],
      ["gravity",400,2000],["maxSpeed",500,1800],["mass",1,3],["bounce",.1,.8],["wallBounce",.1,.8],["drag",0,3],["friction",.1,8]])c[key]=finite(input[key],c[key],a,b);
    c.teamSize=Math.round(c.teamSize);c.duration=DURATIONS.includes(c.duration)?c.duration:90;c.friendlyFire=input.friendlyFire!==false;
    if(Array.isArray(input.thresholds)&&input.thresholds.length===4&&input.thresholds.every((n,i)=>Number.isFinite(n)&&n>0&&(!i||n>input.thresholds[i-1])))c.thresholds=[...input.thresholds];
    Object.assign(c,Sports.battle(input));return c;
  }
  function arena(scramble=false){
    const width=2400,height=1320,floorY=1160,wall=24;
    return {name:scramble?"Sandbag Scramble":"Sandbag Team Arena",sandbagArena:scramble?"shared":"teams",width,height,floorY,
      wrap:false,verticalWrap:false,hole:null,fixedCamera:true,cameraZoom:.43,cameraHeader:160,backgroundColor:"#252a32",
      teamSpawnLanes:{left:[200,480],crowded:[200,480]},terrain:[
        {x:0,y:floorY,w:width,h:height-floorY,kind:"floor"},{x:0,y:0,w:wall,h:height,kind:"wall"},
        {x:width-wall,y:0,w:wall,h:height,kind:"wall"},{x:wall,y:0,w:width-wall*2,h:wall,kind:"wall"}]};
  }
  function create(config,stage){
    const c=options(config),shared=c.ruleset==="scramble";
    const bag=(id,team,x)=>({id,team,x,y:stage.floorY-84,w:90,h:168,vx:0,vy:0,damage:0,anchored:false,hits:{},electricLatch:null,lastHitTime:-10});
    return {config:c,time:0,tick:0,elapsed:0,remaining:c.duration,scores:[0,0],phase:"playing",pause:0,overtime:false,winner:null,
      announcement:"",respawns:{},eventSerial:0,events:[],bags:shared?[bag("shared",null,stage.width/2)]:[bag("blue",0,stage.width*.25),bag("red",1,stage.width*.75)]};
  }
  function finish(s,team){s.phase="finished";s.winner=team;s.announcement=`${team===0?"BLUE":"RED"} WINS`;}
  function clock(s,dt,externalClock=false){
    if(s.phase==="finished")return {play:false};
    if(s.phase==="countdown"){
      s.pause=Math.max(0,s.pause-dt);if(s.pause>1e-9)return {play:false};
      s.phase="playing";return {play:true,go:true};
    }
    s.time+=dt;s.elapsed+=dt;s.tick++;
    if(!externalClock&&!s.overtime){s.remaining=Math.max(0,s.remaining-dt);if(s.remaining<1e-8){
      if(s.scores[0]!==s.scores[1])finish(s,s.scores[0]>s.scores[1]?0:1);
      else {s.overtime=true;s.announcement="SUDDEN DEATH · NEXT HIT WINS";}
    }}
    return {play:s.phase==="playing"};
  }
  const body=b=>({x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h});
  const accepts=(s,f,b)=>s.phase==="playing"&&!f.koScored&&(f.team===0||f.team===1)&&(b.team===null||b.team===f.team);
  function condition(b,c=DEFAULTS){return c.thresholds.reduce((stage,n)=>stage+(b.damage>=n?1:0),0);}
  function shares(s){const total=s.scores[0]+s.scores[1];return total?s.scores.map(n=>n/total):[0,0];}
  function constrain(s,f,stage){
    if(s.config.ruleset!=="race")return;
    const half=f.data.width/2,mid=stage.width/2;
    if(f.team===0&&f.x>mid-half){f.x=mid-half;f.vx=Math.min(0,f.vx);}
    if(f.team===1&&f.x<mid+half){f.x=mid+half;f.vx=Math.max(0,f.vx);}
  }
  function limit(b,c){const speed=Math.hypot(b.vx,b.vy);if(speed>c.maxSpeed){b.vx*=c.maxSpeed/speed;b.vy*=c.maxSpeed/speed;}}
  function hit(s,f,a,b,w,kick=false){
    if(w.canInteract?.(f)===false)return false;
    if(!accepts(s,f,b))return false;
    const key=`${f.id}:${kick?"dash":"punch"}:${a.contactId??a.id}`;
    if(b.hits[key]!==undefined||a.hitTargets?.has(`__sandbag__:${b.id}`))return false;
    if(!kick&&w.prepareStrike?.(f,a,b)===false)return false;
    const damage=w.attackDamage(f,a,kick);
    if(!Number.isFinite(damage)||damage<=0)return false;
    b.hits[key]=s.time;b.damage+=damage;b.lastHitTime=s.time;s.scores[f.team]+=damage;
    const event={serial:++s.eventSerial,tick:s.tick,attacker:f.id,team:f.team,damage,bag:b.id,kick,electric:Boolean(a.electricTick)};
    s.events.push(event);if(s.events.length>64)s.events.shift();
    if(!b.anchored){const impulse=w.launch(f,a,kick);b.vx=(a.materialization?b.vx:0)+impulse.x/s.config.mass;b.vy=(a.materialization?b.vy:0)+impulse.y/s.config.mass;limit(b,s.config);}
    if(!kick&&!a.electricTick)b.electricLatch=f.data.electricPunch?{
      ownerId:f.id,remaining:w.electric.count,timer:w.electric.interval,dir:{...a.dir},charge:a.charge,grounded:a.grounded}:null;
    a.hitTargets?.add(`__sandbag__:${b.id}`);
    w.onHit(f,a,kick,b,event);
    if(s.overtime)finish(s,f.team);
    return true;
  }
  function projectile(s,f,a,paths,w){
    for(const b of s.bags){
      const rect=body(b),r=a.projectile.radius;
      if(accepts(s,f,b)&&paths.some(p=>w.segment(p.x1,p.y1,p.x2,p.y2,{x:rect.x-r,y:rect.y-r,w:rect.w+2*r,h:rect.h+2*r}))&&hit(s,f,a,b,w))return true;
    }
    return false;
  }
  function pulses(s,dt,w){
    for(const b of s.bags){
      const latch=b.electricLatch;if(!latch)continue;
      const f=w.fighters.find(f=>f.id===latch.ownerId);
      if(!f||f.koScored){b.electricLatch=null;continue;}
      if(f.hitstop>0)continue;
      latch.timer-=dt;if(latch.timer>1e-9)continue;
      const a={id:w.nextAttackId(),dir:{...latch.dir},charge:latch.charge,grounded:latch.grounded,electricTick:true,hitTargets:new Set(),active:.01,startup:0,age:0,recovery:0,total:.01};
      hit(s,f,a,b,w);latch.remaining--;latch.timer=w.electric.interval;
      if(latch.remaining<=0)b.electricLatch=null;
      if(s.phase!=="playing")break;
    }
  }
  function physics(s,b,dt,w){
    if(b.anchored)return;
    const c=s.config,stage=w.stage;
    if(![b.x,b.y,b.vx,b.vy].every(Number.isFinite)){b.x=stage.width/2;b.y=stage.floorY-b.h/2;b.vx=b.vy=0;}
    b.vy+=c.gravity*dt;b.vx*=Math.exp(-c.drag*dt);limit(b,c);
    const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/(Math.min(b.w,b.h)*.2))),part=dt/steps;
    for(let i=0;i<steps;i++){
      const previous={x:b.x,y:b.y},prevBottom=b.y+b.h/2;b.x+=b.vx*part;b.y+=b.vy*part;w.rigidContact?.(b,previous);
      for(const rect of w.terrain((i+1)/steps)){
        if(rect.kind==="oneway"&&(b.vy<0||prevBottom>rect.y+2))continue;
        const collision=w.collision(body(b),rect);if(!collision)continue;
        const {nx,ny,penetration}=collision;
        b.x+=nx*(penetration+.001);b.y+=ny*(penetration+.001);
        if(nx&&b.vx*nx<0)b.vx=-b.vx*c.wallBounce;
        if(ny&&b.vy*ny<0){b.vy=Math.abs(b.vy)<150?0:-b.vy*c.bounce;if(ny<0)b.vx*=Math.exp(-c.friction*part);}
      }
    }
    // Safety boundaries preserve the bag's score/condition, including after unusual corner contacts.
    b.x=clamp(b.x,24+b.w/2,stage.width-24-b.w/2);b.y=clamp(b.y,24+b.h/2,stage.floorY-b.h/2);
    // Race fighters cannot cross midfield; keep their movable bag reachable.
    if(c.ruleset==="race"){
      const edge=stage.width/2+(b.team===0?-b.w/2:b.w/2);
      if(b.team===0?b.x>edge:b.x<edge){b.x=edge;b.vx=(b.team===0?-1:1)*Math.abs(b.vx)*c.wallBounce;}
    }
    for(const f of w.fighters){if(f.koScored)continue;if(w.mirrorShield?.(f,b))continue;const contact=w.collision(body(b),w.body(f));
      if(contact&&contact.nx)b.vx+=contact.nx*Math.min(80,Math.abs(f.vx)*.08)*dt*8;
    }
    limit(b,c);
  }
  function step(s,dt,w){
    if(s.phase!=="playing")return;
    for(const entry of w.attacks()){
      for(const b of s.bags){if(w.attackTouches(entry,body(b))&&hit(s,entry.fighter,entry.attack,b,w))break;}
      if(s.phase!=="playing")return;
    }
    for(const f of w.fighters){if(!w.kicking(f))continue;
      const a={id:f.sandbagDashSerial,dir:{...f.dashDir},charge:f.lastDashCharge||0,grounded:false};
      for(const b of s.bags){if(w.kickTouches(f,body(b))&&hit(s,f,a,b,w,true))break;}
      if(s.phase!=="playing")return;
    }
    pulses(s,dt,w);
    if(s.phase!=="playing")return;
    for(const b of s.bags){physics(s,b,dt,w);for(const key of Object.keys(b.hits))if(s.time-b.hits[key]>15)delete b.hits[key];}
  }
  return {RULESETS,DURATIONS,DEFAULTS,options,arena,create,clock,body,condition,shares,constrain,hit,projectile,step};
});
