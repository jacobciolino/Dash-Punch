"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.Dashball=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const Sports=typeof module!=="undefined"&&module.exports?require("./sports.js"):globalThis.DashSports;
  const TargetCharge=typeof module!=="undefined"&&module.exports?require("./target-charge.js"):globalThis.DashTargetCharge;
  const Variants=typeof module!=="undefined"&&module.exports?require("./arena-variants.js"):globalThis.DashArenaVariants;
  const Objectives=typeof module!=="undefined"&&module.exports?require("./team-objectives.js"):globalThis.DashTeamObjectives;
  const ARENAS=[{id:"standard",name:"Soccer"},{id:"standard-open",name:"Soccer \u2014 Open Arena"},{id:"elevated",name:"Basketball"},{id:"elevated-open",name:"Wrap Around Basketball"},{id:"target-break",name:"Target Break"},{id:"golden-rush",name:"Golden Rush"},{id:"gravity-soccer",name:"Gravity Flip Soccer"},{id:"gravity-soccer-open",name:"Gravity Flip Soccer \u2014 Open Arena"},{id:"boulder-control",name:"Boulder Control"},{id:"gravity-boulder",name:"Gravity Flip Boulder Control"},{id:"total-rush",name:"Total Rush"},{id:"field-goal",name:"Field Goal"}];
  const OPEN_SOCCER_BASES=Object.freeze({"standard-open":"standard","gravity-soccer-open":"gravity-soccer"});
  ARENAS.push(...TargetCharge.STAGES.map(({id,name})=>({id,name})));
  ARENAS.push({id:"gravity-golden-rush",name:"Golden Rush \u2014 Four-Way Gravity"});
  ARENAS.push(...Object.entries(Variants.WIDE).map(([id,v])=>({id,name:v.name})));
  ARENAS.push({id:"volleyball",name:"Volleyball"});
  ARENAS.push({id:"sticky-ball",name:"Sticky Ball - Standard"},{id:"sticky-ball-flip",name:"Sticky Ball - Gravity Flip"});
  ARENAS.push({id:"tri-ball",name:"Ball Hell"},{id:"tri-ball-wrap",name:"Ball Hell: Wraparound"});
  ARENAS.push({id:"dash-pong",name:"Dash Pong"});
  ARENAS.push({id:"dash-pong-track",name:"Dash Pong - Moving Goals"});
  const isPongArena=id=>id==="dash-pong"||id==="dash-pong-track";
  const PONG_TRACK_TUNING=Object.freeze({cycle:72,pause:2,midfieldGap:44});
  const PONG_TUNING=Object.freeze({width:2240,height:1280,wall:44,goalHeight:440,cameraZoom:.5,
    goalPlatformInset:136,goalPlatformWidth:176,goalPlatformY:820,goalPlatformHeight:20,
    ballRadius:34,startSpeed:520,contactAcceleration:55,maxSpeed:1600,minMaxSpeed:800,maxMaxSpeed:2200});
  const PONG_DEFAULTS=Object.freeze({ruleset:"battle",duration:300,winningScore:10,pongMaxSpeed:PONG_TUNING.maxSpeed,
    ballRadius:PONG_TUNING.ballRadius,gravity:0,bounce:1,groundFriction:0,maxSpeed:PONG_TUNING.maxSpeed,overtime:true});
  const VOLLEYBALL_DEFAULTS=Object.freeze({duration:300,winningScore:11,ballRadius:26,gravity:1850,maxSpeed:2300,bounce:.76,groundFriction:1.2});
  const VOLLEYBALL_TUNING=Object.freeze({width:2880,height:1440,floorY:1280,netHeight:420,netWidth:20,liftMin:1350,liftMax:1850,horizontalScale:.78});
  const FLOAT_BALL_DEFAULTS=Object.freeze({gravity:900,bounce:.84,groundFriction:.95});
  const CHARGE_DEFAULTS={ruleset:"battle",duration:180,winningScore:100,ballRadius:24,...FLOAT_BALL_DEFAULTS,maxSpeed:2050,knockdownSpeed:650,...Sports.battle()};
  const OPEN_RECOVERY=Object.freeze({top:-2400,entryY:420});
  const BOULDER_DEFAULTS={duration:0,winningScore:100,...Sports.battle(),boulderDiameter:540,boulderMass:3.8,boulderBounce:.46,zoneWidth:.23,bonusHeight:900,
    gravity:760,maxSpeed:1100,groundFriction:.65};
  const FLIP_DEFAULTS={goalHeightScale:.75,goalGravity:720,goalMaxSpeed:620};
  const GRAVITY_BOULDER_DEFAULTS={...BOULDER_DEFAULTS,bonusHeight:630,zoneAcceleration:720,zoneMaxSpeed:620,scoringWindowHeight:1100};
  const isBoulderArena=id=>id==="boulder-control"||id==="gravity-boulder"||id==="total-rush";
  const isGoldenArena=id=>id==="golden-rush"||id==="gravity-golden-rush";
  const GOLDEN_DEFAULTS={ruleset:"battle",duration:0,winningScore:100,...Sports.battle(),...FLOAT_BALL_DEFAULTS,maxSpeed:2050,ballRadius:16,ballCount:10,goldenReward:15,goldenRespawn:20};
  const isFloatBallArena=id=>isGoldenArena(id)||TargetCharge.isArena(id)||id==="target-break";
  const TOTAL_BALANCE_CHOICES=Object.freeze(Object.fromEntries(Object.entries({
    boulderTerritoryRate:[0,.25,.5,.75,1,1.5,2],boulderBonusRate:[0,.5,1,1.5,2,3,4],
    middleRingPoints:[0,1,3,5,10,15],highRingPoints:[0,5,10,15,20,25],goldenReward:[0,10,20,30,40,50,60],
    goldenHealth:[48,96,144,192,240],goldenRespawn:[10,20,30,45,60,90],ballCount:[1,2,3,4,5],
  }).map(([key,values])=>[key,Object.freeze(values)])));
  const TOTAL_BALANCED=Object.freeze({boulderTerritoryRate:.5,boulderBonusRate:1,middleRingPoints:5,highRingPoints:10,goldenReward:30,goldenHealth:144,goldenRespawn:45,ballCount:3});
  const TOTAL_PRESETS=Object.freeze({balanced:TOTAL_BALANCED,original:Object.freeze({...TOTAL_BALANCED,boulderTerritoryRate:1,boulderBonusRate:2})});
  const TOTAL_DEFAULTS={...BOULDER_DEFAULTS,winningScore:300,...TOTAL_BALANCED,balancePreset:"balanced"};
  const TOTAL_COLLISION_MASS_SCALE=24;
  const COMBO_BALL_IMPULSE=Object.freeze([580,720,1040]);
  const SNITCH=Object.freeze({radius:36,hitstun:.45,gravity:360,drag:1.1,maxSpeed:1500,acceleration:520,patrolSpeed:500,evade:35,comboReset:.9,comboLimit:6,recovery:.35});
  const BOULDER_PHYSICS=Object.freeze({kickScale:.45,resistanceSpeed:600,minimumTransfer:.2,wallBounce:.35,rollingGrip:12,airSpinDrag:.08,maxSpin:6,safeClingSpeed:360});
  const BOULDER_IMPACT=Object.freeze({minimumSpeed:110,groundStun:.85,airStun:.65,airDamageMin:8,airDamageMax:18,launchMin:340,launchMax:1100});
  const FIELD_GOAL_TUNING=Object.freeze({heightInChungus:3.4,lineInset:192,width:224,postThickness:16,postHeight:264,supportHeight:64,perchWidth:92,perchThickness:20,perchGap:264,perchOffset:102});
  const TARGET_RULES={impactSpeed:300,continuation:.94,recoveryTime:4};
  const DEFAULTS={ruleset:"battle",arena:"standard",teamSize:1,duration:180,winningScore:5,...Sports.battle(),overtime:true,
    ballRadius:24,gravity:1050,maxSpeed:2050,bounce:.73,groundFriction:1.35,knockdownSpeed:650,
    platformWidth:360,platformTravel:400,platformSpeed:.75};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const number=(value,fallback,a,b)=>Number.isFinite(Number(value))?clamp(Number(value),a,b):fallback;
  const unit=v=>{const size=Math.hypot(v.x,v.y);return size>1e-8?{x:v.x/size,y:v.y/size}:{x:1,y:0};};
  function options(input={}) {
    const total=input.arena==="total-rush",rush=isGoldenArena(input.arena)||total,flipBoulder=input.arena==="gravity-boulder",boulder=isBoulderArena(input.arena),c={...DEFAULTS,...(input.arena==="volleyball"?VOLLEYBALL_DEFAULTS:total?TOTAL_DEFAULTS:rush?GOLDEN_DEFAULTS:flipBoulder?GRAVITY_BOULDER_DEFAULTS:boulder?BOULDER_DEFAULTS:TargetCharge.isArena(input.arena)?CHARGE_DEFAULTS:input.arena==="target-break"?FLOAT_BALL_DEFAULTS:{})};c.ruleset=input.ruleset==="court"?"court":"battle";c.arena=ARENAS.some(arena=>arena.id===input.arena)?input.arena:"standard";
    // Court does not use Battle health/respawns; retain its legacy snapshot values.
    if(c.ruleset==="court"){c.healthMult=.55;c.respawn=3;}
    for(const [key,min,max] of [["teamSize",1,5],["duration",15,3600],["winningScore",1,99],["healthMult",.2,1],["respawn",1,12],
      ["ballRadius",12,32],["gravity",400,2000],["maxSpeed",700,2600],["bounce",.2,.95],["groundFriction",.2,4],["knockdownSpeed",300,1800],
      ["platformWidth",240,540],["platformTravel",100,450],["platformSpeed",.2,1.2]])c[key]=number(input[key],c[key],min,max);
    c.teamSize=Math.round(c.teamSize);c.winningScore=Math.round(c.winningScore);c.overtime=input.overtime!==false;
    if(c.arena==="target-break")c.targetImpactSpeed=number(input.targetImpactSpeed,TARGET_RULES.impactSpeed,120,700);
    if((OPEN_SOCCER_BASES[c.arena]||c.arena)==="gravity-soccer")for(const [key,min,max] of [["goalHeightScale",.5,1],["goalGravity",200,1400],["goalMaxSpeed",200,1000]])c[key]=number(input[key],FLIP_DEFAULTS[key],min,max);
    if(rush){
      c.ruleset="battle";c.duration=number(input.duration,0,0,3600);c.winningScore=Math.round(number(input.winningScore,total?300:100,10,500));
      if(total){
        const preset=TOTAL_PRESETS[input.balancePreset]||TOTAL_BALANCED;
        for(const [key,values] of Object.entries(TOTAL_BALANCE_CHOICES)){
          const requested=number(input[key],preset[key],values[0],values.at(-1));
          c[key]=values.reduce((best,value)=>Math.abs(value-requested)<Math.abs(best-requested)?value:best,values[0]);
        }
        const matches=Object.keys(TOTAL_PRESETS).find(name=>Object.keys(TOTAL_BALANCE_CHOICES).every(key=>c[key]===TOTAL_PRESETS[name][key]));
        c.balancePreset=input.balancePreset==="custom"?"custom":matches||"custom";
      }else for(const [key,min,max] of [["ballCount",1,12],["goldenReward",1,100],["goldenRespawn",5,60]])c[key]=Math.round(number(input[key],GOLDEN_DEFAULTS[key],min,max));
    }
    if(boulder){
      c.ruleset="battle";
      c.maxSpeed=number(input.maxSpeed,BOULDER_DEFAULTS.maxSpeed,700,1400);
      c.duration=number(input.duration,0,0,3600);c.winningScore=Math.round(number(input.winningScore,total?300:100,10,500));
      for(const [key,min,max] of [["boulderDiameter",462,616],["boulderMass",2.5,7],["boulderBounce",.35,.8],["zoneWidth",.20,.27],["bonusHeight",flipBoulder?620:800,flipBoulder?780:1200]])c[key]=number(input[key],(flipBoulder?GRAVITY_BOULDER_DEFAULTS:BOULDER_DEFAULTS)[key],min,max);
      c.boulderDiameter=Math.floor(c.boulderDiameter/6)*6;c.ballRadius=c.boulderDiameter/2;c.bounce=c.boulderBounce;
      if(flipBoulder){
        for(const [key,min,max] of [["zoneAcceleration",200,1400],["zoneMaxSpeed",200,900],["scoringWindowHeight",800,1280]])c[key]=number(input[key],GRAVITY_BOULDER_DEFAULTS[key],min,max);
        c.bonusHeight=Math.max(c.bonusHeight,c.boulderDiameter+60,c.scoringWindowHeight/2+14);
      }else c.bonusHeight=Math.max(c.bonusHeight,c.boulderDiameter*1.35+32);
    }
    if(TargetCharge.isArena(c.arena)){
      c.ruleset="battle";c.overtime=true;c.winningScore=TargetCharge.TUNING.targets.includes(Number(input.winningScore))?Number(input.winningScore):100;
      c.duration=number(input.duration,180,0,3600);
    }
    if(Objectives.isTri(c.arena))Object.assign(c,Objectives.triOptions(input));
    if(isPongArena(c.arena)){
      Object.assign(c,PONG_DEFAULTS);
      c.duration=number(input.duration,300,15,3600);c.winningScore=Math.round(number(input.winningScore,10,1,99));
      c.pongMaxSpeed=number(input.pongMaxSpeed,PONG_TUNING.maxSpeed,PONG_TUNING.minMaxSpeed,PONG_TUNING.maxMaxSpeed);c.maxSpeed=c.pongMaxSpeed;
    }
    if(Objectives.isSticky(c.arena)){
      c.ruleset="battle";c.duration=number(input.duration,Objectives.STICKY_DEFAULTS.duration,60,600);
      c.winningScore=Math.round(number(input.winningScore,Objectives.STICKY_DEFAULTS.winningScore,1,99));c.retentionWindow=number(input.retentionWindow,.8,.25,2);c.overtime=true;
    }
    if(c.ruleset==="battle")Object.assign(c,Sports.battle(input));
    return c;
  }
  function savedOptions(input){
    const next={...input};
    // Upgrade untouched old menu defaults only. Snapshots, online settings and
    // explicitly tuned physics still pass through options without migration.
    if(isFloatBallArena(next.arena))for(const key of Object.keys(FLOAT_BALL_DEFAULTS))if(Number(next[key])===DEFAULTS[key])delete next[key];
    if(Objectives.isSticky(next.arena)&&Number(next.winningScore)===7)delete next.winningScore;
    return options(next);
  }
  function totalPreset(config,name){return options({...config,...TOTAL_PRESETS[name],balancePreset:TOTAL_PRESETS[name]?name:"custom",arena:"total-rush"});}
  function totalBalanceStep(config,key,direction){
    const c=options({...config,arena:"total-rush"}),values=TOTAL_BALANCE_CHOICES[key];
    return values?options({...c,[key]:values[clamp(values.indexOf(c[key])+Math.sign(direction),0,values.length-1)],balancePreset:"custom"}):c;
  }
  function totalValidation(config){return config.arena==="total-rush"&&!["boulderTerritoryRate","boulderBonusRate","middleRingPoints","highRingPoints","goldenReward"].some(key=>config[key]>0)?"Enable at least one scoring objective to start Total Rush.":"";}
  function boulderRate(state,multiplier){return state.totalRush?(multiplier===2?state.config.boulderBonusRate:state.config.boulderTerritoryRate):multiplier;}
  function arena(kind="standard",chungusHeight=154,settings={}) {
    if(isPongArena(kind))return pongArena(kind);
    if(Objectives.isTri(kind))return Objectives.triArena(kind,chungusHeight);
    if(Objectives.isSticky(kind))return Objectives.stickyArena(kind,chungusHeight);
    if(kind==="volleyball")return volleyballArena();
    if(Variants.WIDE[kind])return Variants.widen(arena(Variants.WIDE[kind].base,chungusHeight,settings),kind);
    if(TargetCharge.isArena(kind)){
      const stage=arena("standard",chungusHeight,settings);stage.terrain=stage.terrain.filter(r=>r.goalTeam===undefined);stage.goals=[];
      return {...stage,name:ARENAS.find(a=>a.id===kind).name,dashballArena:kind,targetCharge:TargetCharge.STAGES.find(s=>s.id===kind).kind};
    }
    if(OPEN_SOCCER_BASES[kind])return openSoccerArena(kind,chungusHeight,settings);
    if(kind==="field-goal")return fieldGoalArena(chungusHeight,settings);
    if(kind==="total-rush")return totalArena(options({...settings,arena:kind}));
    if(isBoulderArena(kind)){const c=options({...settings,arena:kind}),stage=boulderArena(c);return kind==="gravity-boulder"?gravityBoulderArena(stage,c):stage;}
    if(isGoldenArena(kind))return goldenArena(kind);
    const c=options({...settings,arena:kind}),width=2560,height=c.arena==="gravity-soccer"?1800:c.arena==="target-break"?1340:1440,floorY=height-160,wall=24;
    kind=c.arena;const open=kind==="elevated-open",flip=kind==="gravity-soccer",soccer=kind==="standard"||flip;
    const terrain=[{x:0,y:floorY,w:width,h:height-floorY,kind:"floor"}];
    if(!open)terrain.push({x:0,y:0,w:wall,h:height,kind:"wall"},
      {x:width-wall,y:0,w:wall,h:height,kind:"wall"},{x:wall,y:0,w:width-wall*2,h:wall,kind:"wall"});
    const goalHeight=Math.ceil(chungusHeight*2.8/2)*2*(flip?c.goalHeightScale:1);
    const goals=kind==="target-break"?[]:soccer ? [0,1].map(team=>({team,line:team?width-192:192,top:floorY-goalHeight,bottom:floorY,depth:168}))
      :[0,1].map(team=>({team,left:team?width-320:112,right:team?width-112:320,top:630,bottom:800}));
    const ballOnly=[];
    for(const goal of goals) {
      if(flip)for(const part of ["top","bottom","back"])terrain.push({...goalPartRect(goal,width,part),kind:part==="back"?"wall":"platform",goalTeam:goal.team,flipGoalTeam:goal.team,goalPart:part});
      else if(kind==="standard")terrain.push({x:goal.team?goal.line-20:wall,y:goal.top-24,w:goal.depth+20,h:24,kind:"platform",goalTeam:goal.team});
      else {
        for(const [x,normal] of [[goal.left-24,-1],[goal.right,1]])terrain.push({x,y:goal.top,w:24,h:goal.bottom-goal.top,kind:"wall",dashballExterior:normal,goalTeam:goal.team});
        ballOnly.push({x:goal.left-24,y:goal.bottom,w:goal.right-goal.left+48,h:24,kind:"ballGoal",goalTeam:goal.team});
      }
    }
    if(kind==="elevated"||open)terrain.push({x:(width-c.platformWidth)/2,y:820,w:c.platformWidth,h:24,kind:"oneway",dashballMover:true,
      move:{axis:"y",amplitude:c.platformTravel/2,speed:c.platformSpeed,phase:0}});
    return {name:ARENAS.find(arena=>arena.id===kind).name,dashballArena:kind,width,height,floorY,
      wrap:open,verticalWrap:false,hole:null,fixedCamera:!open,cameraZoom:.38,cameraHeader:160,backgroundColor:"#222c32",
      ...(open?{wrapMargin:0,cameraOpenTop:true,cameraMinZoom:.12}:{}),
      ...(flip?{gravitySoccer:true,soccer:true,cameraZoom:.30,gravitySwitch:{x:width/2,y:(24+floorY)/2,radius:32,noCooldown:true}}:{}),
      ...(kind==="target-break"?{targetBreak:true,targets:targetLayout(width,floorY,chungusHeight)}:{}),
      teamSpawnLanes:{left:[400,1000],crowded:[350,1120]},terrain,ballOnly,goals};
  }
  function volleyballArena(){
    const {width,height,floorY,netWidth,netHeight}=VOLLEYBALL_TUNING;
    return {name:"Volleyball",dashballArena:"volleyball",volleyball:true,leftTeam:0,width,height,floorY,wrap:false,verticalWrap:false,hole:null,
      fixedCamera:true,cameraOpenTop:true,cameraZoom:.38,cameraHeader:160,backgroundColor:"#222c32",
      teamSpawnLanes:{left:[400,1000],crowded:[350,1120]},goals:[],ballOnly:[],net:{x:width/2-netWidth/2,y:floorY-netHeight,w:netWidth,h:netHeight},
      terrain:[{x:0,y:floorY,w:width,h:height-floorY,kind:"floor"},{x:0,y:0,w:24,h:height,kind:"wall"},
        {x:width-24,y:0,w:24,h:height,kind:"wall"},{x:width/2-netWidth/2,y:floorY-netHeight,w:netWidth,h:netHeight,kind:"wall",volleyballNet:true}]};
  }
  function pongArena(kind="dash-pong"){
    const {width,height,wall,goalHeight,cameraZoom}=PONG_TUNING,top=(height-goalHeight)/2,bottom=top+goalHeight;
    const stage={name:"Dash Pong",dashballArena:"dash-pong",pong:true,leftTeam:1,width,height,floorY:height-wall,
      wrap:false,verticalWrap:false,hole:null,fixedCamera:true,cameraZoom,cameraHeader:72,backgroundColor:"#231e29",
      teamSpawnLanes:{left:[340,820],crowded:[280,900]},ballOnly:[],
      goals:[{team:1,line:wall,sign:-1,top,bottom},{team:0,line:width-wall,sign:1,top,bottom}],
      terrain:[{x:0,y:0,w:width,h:wall,kind:"wall"},{x:0,y:height-wall,w:width,h:wall,kind:"floor"},
        ...[0,width-wall].flatMap(x=>[{x,y:wall,w:wall,h:top-wall,kind:"wall"},{x,y:bottom,w:wall,h:height-wall-bottom,kind:"wall"}])]};
    if(kind==="dash-pong-track")Object.assign(stage,{name:"Dash Pong - Moving Goals",dashballArena:kind,pongTrack:true,
      terrain:[{x:0,y:0,w:width,h:wall,kind:"wall"},{x:0,y:height-wall,w:width,h:wall,kind:"floor"},
        {x:0,y:wall,w:wall,h:height-wall*2,kind:"wall"},{x:width-wall,y:wall,w:wall,h:height-wall*2,kind:"wall"}]});
    const t=PONG_TUNING;
    for(const team of[stage.leftTeam,1-stage.leftTeam])stage.terrain.push({
      x:team===stage.leftTeam?t.goalPlatformInset:width-t.goalPlatformInset-t.goalPlatformWidth,
      y:t.goalPlatformY,w:t.goalPlatformWidth,h:t.goalPlatformHeight,kind:"oneway",pongPerch:team});
    return stage;
  }
  function pongTrack(stage,team){
    const w=PONG_TUNING.wall,mid=stage.width/2-PONG_TRACK_TUNING.midfieldGap,left=team===stage.leftTeam;
    const points=[{x:mid,y:stage.floorY},{x:w,y:stage.floorY},{x:w,y:w},{x:mid,y:w}].map(p=>({...p,x:left?p.x:stage.width-p.x}));
    let start=0;return points.slice(0,-1).map((a,i)=>{const b=points[i+1],length=Math.hypot(b.x-a.x,b.y-a.y),edge=["floor","wall","ceiling"][i],axis=i===1?"x":"y",sign=i===0?1:i===2?-1:left?-1:1;
      const segment={a,b,length,start,edge,axis,sign,line:a[axis]};start+=length;return segment;});
  }
  function pongTrackPosition(stage,time){
    const track=pongTrack(stage,stage.leftTeam),length=track.reduce((n,s)=>n+s.length,0),half=PONG_TUNING.goalHeight/2;
    const leg=PONG_TRACK_TUNING.cycle/4,phase=((time%PONG_TRACK_TUNING.cycle)+PONG_TRACK_TUNING.cycle)%PONG_TRACK_TUNING.cycle,index=Math.floor(phase/leg),local=phase-index*leg;
    const stops=[length/2,length-half,length/2,half,length/2],u=clamp((local-PONG_TRACK_TUNING.pause)/(leg-PONG_TRACK_TUNING.pause),0,1),ease=u*u*(3-2*u);
    return {distance:stops[index]+(stops[index+1]-stops[index])*ease,direction:Math.sign(stops[index+1]-stops[index]),paused:local<PONG_TRACK_TUNING.pause};
  }
  function pongTrackGoals(state,stage,alpha=1,ahead=0){
    const clock=state?.pongTrack,time=clock?clock.previous+(clock.time-clock.previous)*clamp(alpha,0,1)+ahead:ahead;
    const position=pongTrackPosition(stage,time),half=PONG_TUNING.goalHeight/2;
    return stage.goals.map(g=>{
      const track=pongTrack(stage,g.team),segments=[];let center=null;
      for(const s of track){
        const point=d=>({x:s.a.x+(s.b.x-s.a.x)*d/s.length,y:s.a.y+(s.b.y-s.a.y)*d/s.length});
        if(position.distance>=s.start&&position.distance<=s.start+s.length)center=point(position.distance-s.start);
        const lo=Math.max(0,position.distance-half-s.start),hi=Math.min(s.length,position.distance+half-s.start);if(hi<=lo)continue;
        const a=point(lo),b=point(hi),cross=s.axis==="x"?"y":"x";
        segments.push({axis:s.axis,line:s.line,sign:s.sign,edge:s.edge,low:Math.min(a[cross],b[cross]),high:Math.max(a[cross],b[cross]),a,b});
      }
      return {...g,...center,segments,direction:position.direction,paused:position.paused};
    });
  }
  function pongTerrain(state,stage,alpha=1){
    if(!stage.pongTrack)return stage.terrain;
    const goals=pongTrackGoals(state,stage,alpha),w=PONG_TUNING.wall,result=[];
    for(const boundary of stage.terrain){
      const axis=boundary.w>boundary.h?"x":"y",lo=boundary[axis],hi=lo+(axis==="x"?boundary.w:boundary.h),cuts=[];
      for(const g of goals)for(const s of g.segments){
        const matches=s.edge==="floor"?boundary.y===stage.floorY:s.edge==="ceiling"?boundary.y===0:s.sign<0?boundary.x===0:boundary.x===stage.width-w;
        if(matches&&s.axis!==axis)cuts.push([s.low,s.high]);
      }
      let cursor=lo;for(const[a,b]of cuts.sort((a,b)=>a[0]-b[0])){if(a>cursor)result.push({...boundary,[axis]:cursor,[axis==="x"?"w":"h"]:a-cursor});cursor=Math.max(cursor,b);}
      if(cursor<hi)result.push({...boundary,[axis]:cursor,[axis==="x"?"w":"h"]:hi-cursor});
    }
    return result;
  }
  function pongGoalPoint(goal){
    if(!goal.segments)return {x:goal.line,y:(goal.top+goal.bottom)/2,nx:goal.sign,ny:0};
    const s=goal.segments.reduce((a,b)=>a.high-a.low>=b.high-b.low?a:b),cross=(s.low+s.high)/2;
    return {x:s.axis==="x"?s.line:cross,y:s.axis==="y"?s.line:cross,nx:s.axis==="x"?s.sign:0,ny:s.axis==="y"?s.sign:0};
  }
  function pongSpawn(state,stage){
    const b=newBall(stage,state.config);
    return Object.assign(b,{id:state.goalSerial,x:stage.width/2,y:stage.height/2,prevX:stage.width/2,prevY:stage.height/2,
      resetFrame:state.time,pongSpeed:0,pongHits:0,pongTouches:{}});
  }
  function pongMomentum(state,b){
    // Rally speed belongs to this ball, not to wall bounces or visual feedback.
    if(!state.pong||b.carrier||b.pongSpeed<=0)return;
    const speed=Math.hypot(b.vx,b.vy);
    if(speed>1e-8){const scale=Math.min(b.pongSpeed,state.config.maxSpeed)/speed;b.vx*=scale;b.vy*=scale;}
  }
  function pongContact(state,b,world,fighter,attack=null){
    if(!state.pong||b.carrier||Math.hypot(b.vx,b.vy)<1e-8)return;
    b.pongSpeed=Math.min(state.config.maxSpeed,b.pongHits?b.pongSpeed+PONG_TUNING.contactAcceleration:PONG_TUNING.startSpeed);
    b.pongHits++;pongMomentum(state,b);world.onPongContact?.(b,fighter,attack);
  }
  function pongPlan(state,stage,fighter,world){
    const b=state.ball,left=fighter.team===stage.leftTeam,sign=left?1:-1;
    const peers=world.fighters.filter(f=>!f.koScored&&f.team===fighter.team).sort((a,z)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(z.x-b.x,z.y-b.y)||a.playerIndex-z.playerIndex);
    const rank=peers.indexOf(fighter),time=clamp(Math.hypot(b.x-fighter.x,b.y-fighter.y)/1200,0,.5),r=b.r;
    const fold=(n,lo,hi)=>{const length=hi-lo,t=((n-lo)%(length*2)+length*2)%(length*2);return lo+(t>length?length*2-t:t);};
    const forecast={x:fold(b.x+b.vx*time,PONG_TUNING.wall+r,stage.width-PONG_TUNING.wall-r),
      y:fold(b.y+b.vy*time,PONG_TUNING.wall+r,stage.floorY-r)};
    if(stage.pongTrack){
      const current=goalTransforms(state,stage).find(g=>g.team!==fighter.team),point=pongGoalPoint(current),ahead=clamp(Math.hypot(point.x-b.x,point.y-b.y)/Math.max(PONG_TUNING.startSpeed,b.pongSpeed),0,1.2);
      const attack=pongGoalPoint(pongTrackGoals(state,stage,1,ahead).find(g=>g.team!==fighter.team)),defend=pongGoalPoint(goalTransforms(state,stage).find(g=>g.team===fighter.team)),aim=unit({x:attack.x-b.x,y:attack.y-b.y});
      const target=rank===0?{x:forecast.x-aim.x*85,y:forecast.y-aim.y*85}:{x:clamp(defend.x-defend.nx*150+(rank-1)*defend.ny*100,PONG_TUNING.wall+60,stage.width-PONG_TUNING.wall-60),y:clamp(defend.y-defend.ny*150-(rank-1)*defend.nx*100,PONG_TUNING.wall+60,stage.floorY-60)};
      return {rank,aim,target,forecast};
    }
    const goal=stage.goals.find(g=>g.team!==fighter.team),aim=unit({x:goal.line-b.x,y:(goal.top+goal.bottom)/2-b.y});
    const target=rank===0?{x:forecast.x-sign*85,y:forecast.y}:rank===1?{x:left?220:stage.width-220,y:forecast.y}:
      {x:stage.width*(left?.30:.70)+sign*(rank-2)*130,y:stage.floorY-fighter.data.height/2};
    return {rank,aim,target,forecast};
  }
  function volleyballServe(state,stage){
    const ball=newBall(stage,state.config),left=state.volleyball.serveTeam===(stage.leftTeam??0);
    ball.x=ball.prevX=stage.width*(left?.25:.75);ball.y=ball.prevY=stage.floorY-260;ball.vy=-220;
    return ball;
  }
  function volleyballFloor(state,stage,previous,ball,world){
    if(!stage.volleyball||state.phase!=="playing"||ball.y+ball.r<stage.floorY-1e-7)return false;
    const dy=ball.y-previous.y,t=dy>1e-8?clamp((stage.floorY-ball.r-previous.y)/dy,0,1):1;
    const x=previous.x+(ball.x-previous.x)*t,left=stage.leftTeam??0;
    return goal(state,x<stage.width/2?left:1-left,world,true);
  }
  function volleyballPlan(state,stage,fighter,world){
    const ball=state.ball,left=fighter.team===(stage.leftTeam??0),lo=24+fighter.data.width/2,hi=stage.width/2-VOLLEYBALL_TUNING.netWidth/2-fighter.data.width/2-4;
    const gravity=state.config.gravity,height=world.body(fighter).h;
    const time=clamp((-ball.vy+Math.sqrt(Math.max(0,ball.vy*ball.vy+2*gravity*(stage.floorY-ball.r-ball.y))))/gravity,0,4);
    // Fold the ballistic landing forecast against the actual closed side walls.
    const min=24+ball.r,span=stage.width-48-2*ball.r,raw=ball.x+ball.vx*time-min,period=span*2;
    const folded=((raw%period)+period)%period,landing=min+(folded<=span?folded:period-folded);
    const peers=world.fighters.filter(f=>f.team===fighter.team&&!f.koScored).sort((a,b)=>String(a.id).localeCompare(String(b.id))),rank=Math.max(0,peers.indexOf(fighter));
    const own=left?ball.x<=stage.width/2+ball.r:ball.x>=stage.width/2-ball.r;
    const candidates=peers.map(f=>({f,cost:Math.abs(f.x-landing)+Math.abs(f.y-ball.y)*.12})).sort((a,b)=>a.cost-b.cost||String(a.f.id).localeCompare(String(b.f.id)));
    const receiver=candidates[0]?.f===fighter;
    const home=left?stage.width*(.12+.29*(rank+1)/(peers.length+1)):stage.width*(.88-.29*(rank+1)/(peers.length+1));
    const minX=left?lo:stage.width-hi,maxX=left?hi:stage.width-lo;
    const targetX=clamp(own&&receiver?ball.x+ball.vx*Math.min(time,.25)-(left?35:-35):home,minX,maxX);
    return {receiver,own,landing,time,target:{x:targetX,y:own&&receiver?Math.min(stage.floorY-height/2,Math.max(stage.net.y-100,ball.y+30)):stage.floorY-height/2},aim:unit({x:left?1:-1,y:ball.y<stage.net.y-100&&ball.x>(left?stage.width*.35:0)&&ball.x<(left?stage.width:stage.width*.65)?-.35:-1})};
  }
  function openSoccerArena(kind,chungusHeight,settings){
    const stage=arena(OPEN_SOCCER_BASES[kind],chungusHeight,settings);
    stage.name=ARENAS.find(a=>a.id===kind).name;stage.dashballArena=kind;stage.openSoccer=true;stage.soccer=true;
    stage.wrap=true;stage.wrapMargin=0;stage.cameraOpenTop=true;stage.fixedCamera=true;
    stage.terrain=stage.terrain.filter(r=>!(r.y===0&&(r.h===stage.height||r.h===24&&r.w>=stage.width-48)));
    if(stage.gravitySoccer)stage.upperRecovery={...OPEN_RECOVERY};
    return stage;
  }
  function wrapOpenX(object,stage,half=0,previous=null){
    let shift=0;
    if(object.x< -half)shift=Math.ceil((-half-object.x)/stage.width)*stage.width;
    else if(object.x>stage.width+half)shift=-Math.ceil((object.x-stage.width-half)/stage.width)*stage.width;
    if(!shift)return false;
    object.x+=shift;if(object.prevX!==undefined)object.prevX+=shift;if(previous)previous.x+=shift;
    if("entry" in object)object.entry=-1;return true;
  }
  function upperRecovering(state,object,time=state.time){return object?.upperRecoveryAt!==undefined&&object.upperRecoveryAt===time;}
  function recoverUpper(state,world,object,halfX,halfY=halfX){
    const stage=world.stage,rule=stage.upperRecovery;
    if(!rule||(world.gravity?.y??1)>=0||object.y+halfY>=rule.top)return false;
    const radius=Math.max(halfX,halfY),terrain=world.terrain(1),goals=goalTransforms(state,stage);
    let entry=null;
    for(let y=rule.entryY;y<stage.floorY-halfY-30;y+=120){
      const probe={x:object.x,y,r:radius};
      if(terrain.some(r=>circleRect(probe,r)))continue;
      const clearance={...probe,r:radius+36};
      if(world.fighters.some(f=>f!==object&&!f.koScored&&circleRect(clearance,world.body(f))))continue;
      if(balls(state).some(b=>b!==object&&!b.carrier&&Math.hypot(b.x-probe.x,b.y-y)<clearance.r+b.r))continue;
      if(goals.some(g=>circleRect(probe,{x:g.team?g.line:0,y:g.top,w:g.team?stage.width-g.line:g.line,h:g.bottom-g.top})))continue;
      const c=stage.gravitySwitch;if(c&&Math.hypot(probe.x-c.x,y-c.y)<radius+c.radius+80)continue;
      entry=y;break;
    }
    if(entry===null)return false;
    const shift=entry-object.y;object.y=entry;if(object.prevY!==undefined)object.prevY+=shift;
    object.upperRecoveryAt=world.recoveryTime??state.time;
    if("entry" in object)object.entry=-1;return true;
  }
  function newBall(stage,c) {return {x:stage.width/2,y:stage.floorY-c.ballRadius-2,vx:0,vy:0,r:c.ballRadius,spin:0,
    ownerId:null,ownerTeam:-1,launched:0,carrier:null,entry:-1,noCapture:{},contacts:{},attacks:{},pendingLaunch:null,prevX:stage.width/2,prevY:stage.floorY-c.ballRadius-2};}
  function create(config,stage) {const c=options(config),state={config:c,time:0,remaining:c.duration,scores:[0,0],phase:"playing",pause:0,
    overtime:false,winner:null,announcement:"",goalSerial:0,ball:newBall(stage,c),respawns:{},rewardUntil:{},
    ...(stage.targetBreak?{targets:stage.targets.map(t=>({...t,destroyed:false})),targetEvents:[],targetSerial:0,elapsed:0,recovery:{timer:0,x:stage.width/2,y:stage.floorY-c.ballRadius-2,serial:0}}:{})};
    if(stage.goldenRush){
      if(!stage.totalRush)state.ball=rushBall(stage,c,0);
      state.extraBalls=Array.from({length:c.ballCount-(stage.totalRush?0:1)},(_,i)=>rushBall(stage,stage.totalRush?{...smallBallConfig(),ballCount:c.ballCount}:c,i+(stage.totalRush?0:1)));
      state.golden=newGolden(stage,1,c);state.ringPoints=[0,0];state.captures=[0,0];state.elapsed=0;state.rushSerial=0;state.rushNotice=null;}
    if(stage.fieldGoal)state.fieldGoal={dropSerial:0};
    if(stage.stickyBall)state.sticky=Objectives.stickyCreate();
    if(stage.triBall){state.tri=Objectives.triCreate(c);state.extraBalls=[];spawnTriBall(state,stage,null,state.ball);for(let i=1;i<c.startingBalls;i++)spawnTriBall(state,stage);}
    if(stage.volleyball){state.volleyball={serveTeam:stage.leftTeam??0,rallies:0};state.ball=volleyballServe(state,stage);}
    if(stage.pong){state.pong=true;state.ball=pongSpawn(state,stage);}
    if(stage.pongTrack)state.pongTrack={time:0,previous:0};
    if(stage.gravitySoccer&&!stage.stickyBall)resetMovingGoals(state,stage);
    if(stage.boulderControl){state.boulder={scoreUnits:[0,0],remainders:[0,0],activeTeam:null,multiplier:0,changeTime:0,launchSerial:0,stunContacts:{}};state.ball.angularVelocity=0;state.elapsed=0;}
    if(stage.gravityBoulder){state.movingPlatforms=stage.gravityPlatforms.map(p=>({y:p.downY,prevY:p.downY,vy:0,targetY:p.downY}));state.platformStep=0;state.lastGravityFlip=-1;}
    if(stage.totalRush){state.ball.boulderObject=true;state.totalRush={scoreUnits:[0,0],pendingUnits:[0,0],notices:[]};}
    if(stage.targetCharge){
      state.targetCharge=TargetCharge.create(stage);state.elapsed=0;
      state.extraBalls=[newBall(stage,c)];
      balls(state).forEach((b,i)=>Object.assign(b,{id:i,scoringTeam:i,x:stage.width*(i?.56:.44),prevX:stage.width*(i?.56:.44)}));
    }
    return state;
  }
  function resetMovingGoals(state,stage) {
    state.movingGoals=stage.goals.map(g=>({y:(g.top+g.bottom)/2,prevY:(g.top+g.bottom)/2,vy:0}));
    state.goalStep=0;state.lastGravityFlip=-1;
  }
  function advanceGoals(state,stage,dt,gravity) {
    if(!state.movingGoals||state.phase!=="playing")return;
    state.goalStep=dt;
    for(const [i,body] of state.movingGoals.entries()) {
      const half=(stage.goals[i].bottom-stage.goals[i].top)/2;
      integrateGravityBody(body,dt,gravity.y,state.config.goalGravity,state.config.goalMaxSpeed,24+half,stage.floorY-half);
    }
  }
  function integrateGravityBody(body,dt,sign,acceleration,maxSpeed,minY,maxY) {
    body.prevY=body.y;body.vy=clamp(body.vy+sign*acceleration*dt,-maxSpeed,maxSpeed);body.y+=body.vy*dt;
    const bounded=clamp(body.y,minY,maxY);if(bounded!==body.y){body.y=bounded;body.vy=0;}
  }
  function setPlatformTargets(state,stage,gravity) {
    if(!state.movingPlatforms)return;
    for(const [i,body] of state.movingPlatforms.entries())body.targetY=gravity.y<0?stage.gravityPlatforms[i].upY:stage.gravityPlatforms[i].downY;
  }
  function advancePlatforms(state,stage,dt,gravity) {
    if(!state.movingPlatforms||state.phase!=="playing")return;
    state.platformStep=dt;setPlatformTargets(state,stage,gravity);
    for(const [i,body] of state.movingPlatforms.entries()){
      const p=stage.gravityPlatforms[i];integrateGravityBody(body,dt,gravity.y,state.config.zoneAcceleration,state.config.zoneMaxSpeed,p.upY,p.downY);
    }
  }
  function platformTransform(state,stage,index,alpha=1,ahead=0,gravity={x:0,y:1}) {
    const body=state.movingPlatforms[index],p=stage.gravityPlatforms[index];
    let y=body.prevY+(body.y-body.prevY)*clamp(alpha,0,1);
    if(ahead)y=clamp(y+clamp(body.vy+gravity.y*state.config.zoneAcceleration*ahead*.5,-state.config.zoneMaxSpeed,state.config.zoneMaxSpeed)*ahead,p.upY,p.downY);
    return {y,vy:state.platformStep>0?(body.y-body.prevY)/state.platformStep:0};
  }
  function platformTerrain(state,stage,terrain,alpha=1) {
    const p=platformTransform(state,stage,terrain.gravityPlatform,alpha);
    return {...terrain,y:p.y-terrain.h/2,vx:0,vy:p.vy};
  }
  // One transform supplies rendering, fighter/ball collision, AI and scoring.
  function goalTransforms(state,stage,alpha=1) {
    if(stage.pongTrack)return pongTrackGoals(state,stage,alpha);
    return stage.goals.map((g,i)=>{
      const body=state?.movingGoals?.[i];if(!body)return g;
      const half=(g.bottom-g.top)/2,y=body.prevY+(body.y-body.prevY)*clamp(alpha,0,1);
      return {...g,top:y-half,bottom:y+half,vy:state.goalStep>0?(body.y-body.prevY)/state.goalStep:0};
    });
  }
  function goalPartRect(g,width,part) {
    const left=g.team?g.line-20:24,right=g.team?width-24:g.line+20;
    if(part==="back")return {x:g.team?right-20:left,y:g.top,w:20,h:g.bottom-g.top};
    return {x:left,y:part==="top"?g.top-24:g.bottom,w:right-left,h:24};
  }
  function goalTerrain(state,stage,terrain,alpha=1) {
    const g=goalTransforms(state,stage,alpha)[terrain.flipGoalTeam];
    return {...terrain,...goalPartRect(g,stage.width,terrain.goalPart),vx:0,vy:g.vy||0};
  }
  function finish(state,winner) {state.phase="finished";state.winner=winner;state.announcement=winner===null?"DRAW":`${winner===0?"RED":"BLUE"} WINS`;}
  function clock(state,dt,stage,externalClock=false) {
    if(state.phase==="finished")return {play:false};
    if((state.golden||state.targetCharge)&&state.phase==="playing"){
      state.elapsed+=dt;
      if(state.rushNotice)state.rushNotice.life=Math.max(0,state.rushNotice.life-dt);
      if(!externalClock&&state.config.duration>0&&!state.overtime){state.remaining=Math.max(0,state.remaining-dt);if(state.remaining<1e-8){
        if(state.scores[0]!==state.scores[1])finish(state,state.scores[0]>state.scores[1]?0:1);
        else {state.overtime=true;state.announcement="SUDDEN DEATH";}
      }}
      return {play:state.phase!=="finished"};
    }
    if(state.phase==="goal"||state.phase==="countdown") {
      state.pause=Math.max(0,state.pause-dt);
      if(state.pause>1e-9)return {play:false};
      if(state.phase==="goal") {state.ball=stage.volleyball?volleyballServe(state,stage):newBall(stage,state.config);if(state.sticky)state.sticky=Objectives.stickyCreate();state.respawns={};if(stage.gravitySoccer&&!stage.stickyBall)resetMovingGoals(state,stage);state.phase="countdown";state.pause=2;return {play:false,reset:true};}
      state.phase="playing";state.announcement=state.overtime?"NEXT GOAL WINS":"";return {play:true,go:true};
    }
    if(state.boulder){
      state.elapsed+=dt;
      if(!externalClock&&state.config.duration>0&&!state.overtime){
        state.remaining=Math.max(0,state.remaining-dt);
        if(state.remaining<1e-8){if(state.scores[0]!==state.scores[1])finish(state,state.scores[0]>state.scores[1]?0:1);else {state.overtime=true;state.announcement="SUDDEN DEATH";}}
      }
      return {play:state.phase!=="finished"};
    }
    if(!externalClock&&!state.overtime) {
      if(state.targets)state.elapsed+=dt;
      state.remaining=Math.max(0,state.remaining-dt);
      if(state.remaining<1e-8) {
        if(state.scores[0]!==state.scores[1])finish(state,state.scores[0]>state.scores[1]?0:1);
        else if(state.targets||state.config.overtime){state.overtime=true;state.announcement="SUDDEN DEATH";}
        else finish(state,null);
      }
    } else if(state.targets)state.elapsed+=dt;
    return {play:state.phase!=="finished"};
  }
  function goal(state,defendingTeam,world=null,insideGoal=false) {
    if(state.targetCharge||state.golden||state.targets||state.boulder||state.phase!=="playing"||state.ball.carrier&&!insideGoal)return false;
    const team=1-defendingTeam,points=state.sticky?Objectives.STICKY_TUNING[insideGoal?"touchdownPoints":"fieldGoalPoints"]:1;
    state.scores[team]+=points;state.goalSerial++;state.ball.entry=-1;
    state.announcement=`${team===0?"RED":"BLUE"} ${state.sticky?`${insideGoal?"TOUCHDOWN":"FIELD GOAL"} +${points}`:"GOAL"}`;
    if(state.volleyball){state.volleyball.rallies++;state.volleyball.serveTeam=1-state.volleyball.serveTeam;state.announcement=`${team===0?"RED":"BLUE"} POINT`;}
    world?.onGoal?.(team,state.sticky?{kind:insideGoal?"touchdown":"field",points}:undefined);
    if(state.pong){
      if(state.overtime||state.scores[team]>=state.config.winningScore)finish(state,team);
      else state.ball=pongSpawn(state,world?.stage||pongArena());
      return true;
    }
    if(state.fieldGoal){
      if(state.overtime)finish(state,team);
      else {
        const ball=newBall(world?.stage||arena("field-goal",154,state.config),state.config);ball.id=++state.fieldGoal.dropSerial;
        ball.y=24+ball.r+30;ball.prevY=ball.y;ball.resetFrame=state.time;state.ball=ball;
      }
      return true;
    }
    if(state.overtime||state.scores[team]>=state.config.winningScore)finish(state,team);
    else {state.phase="goal";state.pause=1.2;}
    return true;
  }
  function limit(ball,c) {const v=Math.hypot(ball.vx,ball.vy);if(v>c.maxSpeed){ball.vx*=c.maxSpeed/v;ball.vy*=c.maxSpeed/v;}}
  function targetLayout(width,floorY,chungusHeight) {
    const radius=48,top=108,bottom=floorY-64,step=(bottom-top)/5;
    if(step<chungusHeight+32)throw Error("Target wall needs more vertical clearance");
    return [0,1].flatMap(team=>Array.from({length:6},(_,row)=>({id:`target-${team}-${row}`,team,row,
      x:team?width-24-radius:24+radius,y:Math.round((top+row*step)/3)*3,r:radius})));
  }
  function remainingTargets(state,team) {return state.targets.filter(t=>t.team===team&&!t.destroyed).length;}
  function destroyTarget(state,target,impact,world) {
    if(target.destroyed||state.phase!=="playing"||state.ball.carrier)return false;
    target.destroyed=true;
    const event={serial:++state.targetSerial,id:target.id,team:target.team,x:target.x,y:target.y,time:state.time,impact};
    state.targetEvents.push(event);const scorer=1-target.team;state.scores[scorer]++;
    if(state.overtime||remainingTargets(state,target.team)===0)finish(state,scorer);
    world.onTargetBreak?.(target,event);return true;
  }
  function collideTargets(state,world) {
    const b=state.ball;if(!state.targets||b.carrier||state.phase!=="playing")return;
    for(const target of state.targets) {
      if(target.destroyed)continue;
      const dx=b.x-target.x,dy=b.y-target.y,d=Math.hypot(dx,dy),radius=target.r+b.r;
      if(d>=radius)continue;
      let nx=d>1e-8?dx/d:target.team?-1:1,ny=d>1e-8?dy/d:0,depth=radius-d;
      const impact=Math.max(0,-(b.vx*nx+b.vy*ny));
      if(impact>0)world.onBallImpact?.(b,impact,{x:nx,y:ny});
      if(impact>=state.config.targetImpactSpeed) {
        if(destroyTarget(state,target,impact,world)){b.vx*=TARGET_RULES.continuation;b.vy*=TARGET_RULES.continuation;}
        if(state.phase==="finished")break;
        continue;
      }
      // A wall-mounted disc must not wedge a slow ball into the wall/floor.
      const x=b.x+nx*depth,y=b.y+ny*depth;
      if(x<24+b.r||x>world.stage.width-24-b.r||y<24+b.r||y>world.stage.floorY-b.r) {
        nx=target.team?-1:1;ny=0;
        const face=target.x+nx*Math.sqrt(Math.max(0,radius*radius-dy*dy));
        depth=Math.max(0,(face-b.x)*nx);
        if(b.vx*nx<=0)b.vx=nx*Math.max(80,Math.abs(b.vx)*state.config.bounce);
      }
      b.x+=nx*(depth+.01);b.y+=ny*(depth+.01);
      const normal=b.vx*nx+b.vy*ny;
      if(normal<0){b.vx-=(1+state.config.bounce)*normal*nx;b.vy-=(1+state.config.bounce)*normal*ny;}
      if(impact>80)world.onTargetImpact?.(target,impact);
    }
  }
  function targetFighterContact(target,body) {
    if(target.destroyed)return null;
    const dy=clamp(target.y,body.y,body.y+body.h)-target.y;
    if(Math.abs(dy)>=target.r)return null;
    const normal=target.team?-1:1,face=target.x+normal*Math.sqrt(target.r*target.r-dy*dy);
    const penetration=normal>0?face-body.x:body.x+body.w-face;
    return penetration>0?{nx:normal,ny:0,penetration}:null;
  }
  function recoverTargetBall(state,world,dt,invalidOnly=false) {
    if(!state.targets||state.ball.carrier)return false;
    const b=state.ball,stage=world.stage,r=state.recovery;
    const invalid=![b.x,b.y,b.vx,b.vy].every(Number.isFinite)||b.x< -b.r*2||b.x>stage.width+b.r*2||b.y< -b.r*2||b.y>stage.height+b.r*2;
    if(!invalid) {
      if(invalidOnly)return false;
      const stuck=world.terrain(1).some(rect=>(circleRect(b,rect)?.depth||0)>b.r*.25)||state.targets.some(t=>!t.destroyed&&Math.hypot(b.x-t.x,b.y-t.y)<t.r+b.r-6);
      if(stuck&&Math.hypot(b.vx,b.vy)<80&&Math.hypot(b.x-r.x,b.y-r.y)<24)r.timer+=dt;
      else {r.timer=0;r.x=b.x;r.y=b.y;}
      if(r.timer<TARGET_RULES.recoveryTime)return false;
    }
    state.ball=newBall(stage,state.config);r.timer=0;r.x=state.ball.x;r.y=state.ball.y;r.serial++;
    world.onBallReset?.();return true;
  }
  // Shot planning only: analytical arcs/banks do not advance the real ball.
  function estimateShotY(ball,velocity,time,stage,config,gravityY=1) {
    let y=ball.y,vy=velocity.y,left=time;const g=config.gravity*gravityY,top=24+ball.r,bottom=stage.floorY-ball.r;
    for(let bounce=0;bounce<4&&left>1e-6;bounce++) {
      if(y>=bottom-.1&&vy>=0){y=bottom;vy=-vy*config.bounce;if(Math.abs(vy)<60&&g>=0)return bottom;}
      if(y<=top+.1&&vy<0){y=top;vy=-vy*config.bounce;}
      let hit=left,plane=null;
      for(const [boundary,sign] of [[top,-1],[bottom,1]]) {
        if(Math.abs(g)<1e-8){const t=(boundary-y)/vy;if(t>1e-6&&t<hit&&vy*sign>0){hit=t;plane=boundary;}continue;}
        const disc=vy*vy+2*g*(boundary-y);if(disc<0)continue;
        for(const t of [(-vy-Math.sqrt(disc))/g,(-vy+Math.sqrt(disc))/g])if(t>1e-6&&t<hit&&(vy+g*t)*sign>0){hit=t;plane=boundary;}
      }
      y+=vy*hit+.5*g*hit*hit;vy+=g*hit;left-=hit;
      if(plane!==null){y=plane;vy=-vy*config.bounce;}
    }
    return y;
  }
  function acceleratedFlightTime(distance,velocity,acceleration){
    if(Math.abs(acceleration)<1e-8)return Math.abs(velocity)<1e-8?Infinity:distance/velocity;
    const discriminant=velocity*velocity+2*acceleration*distance;
    if(discriminant<0)return Infinity;
    const root=Math.sqrt(discriminant),times=[(-velocity-root)/acceleration,(-velocity+root)/acceleration].filter(t=>t>1e-6);
    return times.length?Math.min(...times):Infinity;
  }
  function targetPlan(state,fighter,world) {
    const b=state.ball,enemies=state.targets.filter(t=>!t.destroyed&&t.team!==fighter.team);
    if(!enemies.length)return null;
    let best=null;const held=b.carrier===fighter.id;
    for(const kick of held||world.canKick?.(fighter)===false?[false]:[false,true])for(const charge of kick?[.3]:world.shotCharges|| (held?[.4,.85]:[.15,.4,.85]))for(let i=0;i<40;i++) {
      const angle=i*Math.PI/20,aim={x:Math.cos(angle),y:Math.sin(angle)};
      const preview=Object.create(fighter);preview.aim=aim;
      const velocity=shotVelocity(preview,{dir:aim,charge,grounded:fighter.onGround},world,kick,!kick&&b.carrier===fighter.id);
      const speed=Math.hypot(velocity.x,velocity.y),scale=Math.min(1,ballConfig(state,b).maxSpeed/(speed||1));velocity.x*=scale;velocity.y*=scale;
      if(Math.abs(velocity.x)<50&&!world.stage.gravityRush)continue;
      const spacing=kick?Math.abs(aim.x)*fighter.data.width/2+Math.abs(aim.y)*fighter.data.height/2+b.r+18:
        fighter.data.width/2+b.r+Math.min(60,fighter.data.punchReach*.45);
      const approach={x:b.x-aim.x*spacing,y:b.y-aim.y*spacing};
      if(world.validApproach&&!world.validApproach(approach))continue;
      const half=fighter.data.width/2,center=world.stage.width/2;
      if(state.config.ruleset==="court"&&(fighter.team===0?approach.x>center-half-3:approach.x<center+half+3))continue;
      for(const target of enemies) {
        const face=target.x+(target.team?-1:1)*(target.r+b.r),time=world.stage.gravityRush?acceleratedFlightTime(face-b.x,velocity.x,(world.gravity?.x||0)*ballConfig(state,b).gravity):(face-b.x)/velocity.x;
        if(time<=0||time>4)continue;
        const error=Math.abs(estimateShotY(b,velocity,time,world.stage,ballConfig(state,b),world.stage.gravityRush?world.gravity?.y??1:1)-target.y);
        const cost=error+time*8+Math.hypot(approach.x-fighter.x,approach.y-fighter.y)*.08+(kick?18:charge*12)+(world.shotPenalty?.(velocity,target,time)||0);
        if(!best||cost<best.cost)best={id:target.id,aim,charge,kick,error,cost,approach};
      }
    }
    if(!best){const target=enemies.sort((a,other)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(other.x-b.x,other.y-b.y))[0];return {id:target.id,aim:unit({x:target.x-b.x,y:target.y-b.y}),charge:.4,kick:false,error:1000,cost:1000,approach:{x:b.x+(fighter.team?75:-75),y:b.y-20}};}
    return best;
  }
  function threatenedTarget(state,team,stage) {
    const b=state.ball;if(b.carrier||Math.abs(b.vx)<120)return null;
    let best=null;
    for(const target of state.targets) {
      if(target.destroyed||target.team!==team)continue;
      const time=(target.x-b.x)/b.vx;if(time<0||time>1.6)continue;
      const error=Math.abs(estimateShotY(b,{x:b.vx,y:b.vy},time,stage,state.config)-target.y);
      if(error<target.r+b.r+90&&(!best||time<best.time||time===best.time&&error<best.error))best={...target,time,error};
    }
    return best;
  }
  function ballRect(ball) {return {x:ball.x-ball.r,y:ball.y-ball.r,w:ball.r*2,h:ball.r*2};}
  function relativeBall(ball,x,stage,y=ball.y) {
    if(stage.triWrap)return {...ball,y:ball.y-Math.round((ball.y-y)/stage.height)*stage.height};
    if(!stage.wrap)return ball;
    const dx=ball.x-x,offset=Math.round(dx/stage.width)*stage.width;
    return {x:ball.x-offset,y:ball.y,r:ball.r};
  }
  function wrapBall(ball,stage,previous=null) {
    if(stage.openSoccer){wrapOpenX(ball,stage,ball.r,previous);return;}
    if(!stage.wrap||ball.x>=0&&ball.x<stage.width)return;
    const x=((ball.x%stage.width)+stage.width)%stage.width,shift=x-ball.x;
    if(!shift)return;
    ball.x=x;ball.prevX+=shift;if(previous)previous.x+=shift;ball.entry=-1;
  }
  function circleRect(ball,rect) {
    const x=clamp(ball.x,rect.x,rect.x+rect.w),y=clamp(ball.y,rect.y,rect.y+rect.h),dx=ball.x-x,dy=ball.y-y,d=Math.hypot(dx,dy);
    if(d>=ball.r-1e-8)return null;
    if(d>1e-8)return {x:dx/d,y:dy/d,depth:ball.r-d};
    const sides=[{x:-1,y:0,depth:ball.x-rect.x+ball.r},{x:1,y:0,depth:rect.x+rect.w-ball.x+ball.r},
      {x:0,y:-1,depth:ball.y-rect.y+ball.r},{x:0,y:1,depth:rect.y+rect.h-ball.y+ball.r}];
    return sides.sort((a,b)=>a.depth-b.depth)[0];
  }
  function sweepCircle(x1,y1,x2,y2,ball,padding=0) {
    const dx=x2-x1,dy=y2-y1,t=clamp(((ball.x-x1)*dx+(ball.y-y1)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x1+dx*t-ball.x,y1+dy*t-ball.y)<=ball.r+padding;
  }
  function release(state,fighter,b=state.ball) {
    b.carrier=null;b.entry=-1;b.vx=clamp(fighter?.vx||0,-450,450)*.45;b.vy=clamp(fighter?.vy||0,-450,450)*.45;
    if(fighter)b.noCapture[fighter.id]=state.time+.4;b.launched=0;b.pendingLaunch=null;
  }
  function shieldSurface(f,dir,world,rect=world.body(f)) {
    const pad=world.shieldPadding(f)||0,rx=rect.w/2+pad,ry=rect.h/2+pad;
    return {x:rect.x+rect.w/2,y:rect.y+rect.h/2,radius:1/Math.sqrt((dir.x/rx)**2+(dir.y/ry)**2)};
  }
  function shotVelocity(fighter,attack,world,kick=false,boosted=false) {
    const profile=world.punchProfile?.(fighter,attack)||fighter.data;
    const direction=unit(boosted||kick?attack.dir:(world.launchDirection?.(fighter,attack)||attack.dir));
    const hitPower=world.hitPowerScale?.(fighter)??1;
    if(attack.materialization)return {x:direction.x*attack.materialization.impulse*hitPower,y:direction.y*attack.materialization.impulse*hitPower};
    const charge=clamp(attack.charge||0,0,1),ground=attack.grounded?fighter.data.groundPunchLaunchMult||1:1;
    const power=fighter.data.punchSequence&&!attack.projectile?profile.punchBallImpulse??Math.max(profile.punchKnockback,COMBO_BALL_IMPULSE[attack.sequenceStage??0]):attack.projectile?.knockback??profile.punchKnockback;
    const force=kick?clamp((fighter.data.dashBase+fighter.data.dashMax*.4)*1.35,750,1900)
      :((world.attackKnockback?.(fighter,attack)??power*(1+charge*(profile.punchKnockbackCharge??.9)))*ground*1.15+profile.punchDamage*6)*(boosted?1.35:1);
    const velocity={x:direction.x*force*hitPower,y:direction.y*force*hitPower};
    if(world.stage.volleyball){
      velocity.x*=VOLLEYBALL_TUNING.horizontalScale;
      if(direction.y<=.45)velocity.y=Math.min(velocity.y,-clamp(900+force*.45,VOLLEYBALL_TUNING.liftMin,VOLLEYBALL_TUNING.liftMax)*(profile.punchBallLiftScale??1));
    }
    return velocity;
  }
  function shot(state,fighter,attack,world,kick=false,b=state.ball) {
    if(world.canInteract?.(fighter)===false)return false;
    if(world.stage.openSoccer&&(upperRecovering(state,b,world.recoveryTime)||upperRecovering(state,fighter,world.recoveryTime)))return false;
    const key=`${fighter.id}:${attack.contactId??attack.id}`;
    if(b.attacks[key]!==undefined||state.phase!=="playing"||fighter.koScored)return false;
    if(b.carrier&&b.carrier!==fighter.id)return false;
    if(state.sticky&&b.carrier)return false;
    if(!kick&&world.prepareStrike?.(fighter,attack,b)===false)return false;
    const boosted=b.pendingLaunch?.id===attack.id&&b.pendingLaunch.owner===fighter.id&&b.pendingLaunch.until>=state.time;
    const velocity=shotVelocity(fighter,attack,world,kick,boosted);
    const incoming={x:b.vx,y:b.vy};
    b.carrier=null;b.pendingLaunch=null;b.entry=-1;b.attacks[key]=state.time;
    if(isBoulderBall(state,b)){
      const impulse=boulderImpulse(b,velocity,state.config,kick,attack.electricTick?.22:1);b.vx+=impulse.x;b.vy+=impulse.y;state.boulder.launchSerial++;
    }
    else if(attack.materialization){b.vx+=velocity.x;b.vy+=velocity.y;}
    else if(state.tri&&state.config.triSingleBall){b.vx+=(velocity.x-b.vx)/state.config.ballMass;b.vy+=(velocity.y-b.vy)/state.config.ballMass;}
    else {b.vx=velocity.x;b.vy=velocity.y;}
    b.ownerId=fighter.id;b.ownerTeam=fighter.team;b.launched=2.5;
    b.contacts[fighter.id]=state.time+.2;b.noCapture[fighter.id]=state.time+.35;limit(b,ballConfig(state,b));
    pongContact(state,b,world,fighter,attack);
    if(!isBoulderBall(state,b))world.onBallImpact?.(b,Math.hypot(b.vx-incoming.x,b.vy-incoming.y),unit({x:b.vx,y:b.vy}));
    const reward=state.time>=(state.rewardUntil[fighter.id]||0);
    world.onShot?.(fighter,attack,kick,reward,b);if(reward)state.rewardUntil[fighter.id]=state.time+.22;
    return true;
  }
  function possession(state,world,b=state.ball) {
    if(state.sticky)return Objectives.follow(state,world);
    if(!b.carrier)return false;
    const f=world.fighters.find(f=>f.id===b.carrier);
    if(!f||f.koScored||!world.shielding(f)) {
      const attack=f?.attack;release(state,f,b);
      if(attack?.fromShieldRelease&&attack.charge>0)b.pendingLaunch={owner:f.id,id:attack.id,until:state.time+attack.startup+.15};
      return false;
    }
    const before=world.stage.openSoccer?{x:b.x,y:b.y}:null;
    const d=unit(world.shieldAim(f)),surface=shieldSurface(f,d,world),extent=surface.radius+b.r;
    b.x=world.stage.wrap?surface.x+d.x*extent:clamp(surface.x+d.x*extent,24+b.r,world.stage.width-24-b.r);
    b.y=world.stage.triWrap?surface.y+d.y*extent:Math.min(world.stage.floorY-b.r,world.stage.cameraOpenTop?surface.y+d.y*extent:Math.max(24+b.r,surface.y+d.y*extent));
    Objectives.wrapVertical(b,world.stage);
    if(before){b.prevX+=b.x-before.x;b.prevY+=b.y-before.y;if(upperRecovering(state,f,world.recoveryTime))b.upperRecoveryAt=f.upperRecoveryAt;}
    wrapBall(b,world.stage);b.vx=b.vy=0;b.entry=-1;return true;
  }
  function contact(state,f,rect,normal,world,b=state.ball) {
    if(world.stage.openSoccer&&(upperRecovering(state,b,world.recoveryTime)||upperRecovering(state,f,world.recoveryTime)))return;
    if(isBoulderBall(state,b)){boulderContact(state,f,rect,normal,world,b);return;}
    const c=ballConfig(state,b),now=state.time;
    if(f.koScored||f.invulnerable>0)return;
    if(state.sticky&&!b.carrier&&circleRect(relativeBall(b,f.x,world.stage),world.body(f))&&Objectives.attach(state,f,world))return;
    const local=relativeBall(b,f.x,world.stage,f.y),previous={x:local.x,y:local.y};
    const incoming={x:b.vx,y:b.vy};
    const pushing=normal.depth>0&&(f.x-f.prevX)*normal.x+(f.y-f.prevY)*normal.y>1e-8;
    // A center spawn may overlap an idle fighter. Repair alone is not a serve.
    if(state.pong&&!b.pongHits&&Math.hypot(b.vx,b.vy)<1e-8&&!pushing&&!world.shielding(f)&&!world.kicking(f))return;
    if(world.mirrorShield?.(f,b,"ball")){
      b.carrier=null;b.pendingLaunch=null;b.ownerId=f.id;b.ownerTeam=f.team;b.launched=0;b.entry=-1;
      if(state.pong&&!b.pongTouches[f.id]){b.pongTouches[f.id]=true;pongContact(state,b,world,f);}
      world.onBallImpact?.(b,Math.hypot(b.vx-incoming.x,b.vy-incoming.y),unit({x:b.vx,y:b.vy}));
      return previous;
    }
    if(now<(b.contacts[f.id]||0)){
      if(normal.depth>0){b.x+=normal.x*(normal.depth+.02);b.y+=normal.y*(normal.depth+.02);}
      return pushing?previous:undefined;
    }
    const shield=world.shielding(f)&&world.shieldCovers(f,{x:local.x-f.x,y:local.y-f.y});
    if(shield) {
      if(f.data.shieldThornsDamage&&now>=(b.noCapture[f.id]||0)&&!balls(state).some(other=>other!==b&&other.carrier===f.id)) {
        b.carrier=f.id;b.ownerId=f.id;b.ownerTeam=f.team;b.entry=-1;b.launched=0;b.pendingLaunch=null;
        possession(state,world,b);world.onShield?.(f,true,b);return;
      }
      const dir=unit(world.shieldAim(f)),speed=clamp(Math.hypot(b.vx,b.vy)*.65,260,950),surface=shieldSurface(f,dir,world);
      b.x=surface.x+dir.x*(surface.radius+b.r+2);
      b.y=surface.y+dir.y*(surface.radius+b.r+2);
      b.vx=dir.x*speed;b.vy=dir.y*speed;b.ownerId=f.id;b.ownerTeam=f.team;b.launched=0;b.entry=-1;b.contacts[f.id]=now+.18;world.onShield?.(f,false,b);
      world.onBallImpact?.(b,Math.hypot(b.vx-incoming.x,b.vy-incoming.y),dir);
      if(state.pong&&!b.pongTouches[f.id]){b.pongTouches[f.id]=true;pongContact(state,b,world,f);}return previous;
    }
    if(world.kicking(f)&&!f.punchInputHeld&&!f.attack&&Math.hypot(f.vx,f.vy)>180&&f.dashReboundLockout<=0) {
      const dir=unit(f.dashDir),toward=unit({x:local.x-f.x,y:local.y-f.y});
      if(dir.x*toward.x+dir.y*toward.y>.1) {
        const attack={id:`kick-${Math.floor(now*60)}`,dir,charge:f.lastDashCharge||0,grounded:false};
        if(shot(state,f,attack,world,true,b)){b.x+=toward.x*3;b.y+=toward.y*3;return previous;}
      }
    }
    const speed=Math.hypot(b.vx,b.vy),closing=(b.vx-(f.vx||0))*normal.x+(b.vy-(f.vy||0))*normal.y<-.01,
      danger=b.launched>0&&speed>=c.knockdownSpeed&&b.ownerId!==f.id&&(b.ownerTeam!==f.team||world.friendlyFire);
    if(danger) {
      const incoming=unit({x:b.vx,y:b.vy});world.onKnockdown?.(f,incoming,b.ownerId);
      b.vx=normal.x*240;b.vy=Math.min(-100,normal.y*240);b.launched=0;b.entry=-1;
      if(world.stage.gravityRush){const g=world.gravity||{x:0,y:1};b.vx=normal.x*240;b.vy=normal.y*240;const fall=b.vx*g.x+b.vy*g.y+100;if(fall>0){b.vx-=fall*g.x;b.vy-=fall*g.y;}}
    } else {
      // Body contact is a soft dribble, even during a very fast ground dash.
      const vn=b.vx*normal.x+b.vy*normal.y;
      if(vn<0){b.vx-=vn*normal.x*1.25;b.vy-=vn*normal.y*1.25;}
      b.vx+=clamp(f.vx*.12,-130,130);b.vy+=clamp(f.vy*.08,-90,90);
      if(speed<300){b.vx=clamp(b.vx,-280,280);b.vy=clamp(b.vy,-220,220);}
    }
    b.x+=normal.x*(normal.depth+.02);b.y+=normal.y*(normal.depth+.02);b.contacts[f.id]=now+.28;
    if(state.pong&&closing&&!b.pongTouches[f.id]){b.pongTouches[f.id]=true;pongContact(state,b,world,f);}
    pongMomentum(state,b);
    if(closing)world.onBallImpact?.(b,Math.hypot(b.vx-incoming.x,b.vy-incoming.y),normal);
    return pushing?previous:undefined;
  }
  function planeCrossing(previous,end,r,axis,line,sign,low,high,oldLow=low,oldHigh=high,epsilon=1e-8){
    const a=(previous[axis]-line)*sign,z=(end[axis]-line)*sign;
    if(a>=-epsilon||z<0||z<=a)return null;
    const t=-a/(z-a),cross=axis==="x"?"y":"x",center=previous[cross]+(end[cross]-previous[cross])*t;
    const bottom=Number.isFinite(high)?oldHigh+(high-oldHigh)*t:high,top=Number.isFinite(low)?oldLow+(low-oldLow)*t:low;
    return center-r>=top-1e-7&&center+r<=bottom+1e-7?t:null;
  }
  function scoreGoalInterior(state,stage,point,b,world,alpha=1) {
    if(state.pong||state.tri||state.sticky||state.phase!=="playing"||b!==state.ball||stage.fieldGoal||!stage.goals.length||
      stage.openSoccer&&upperRecovering(state,b,world?.recoveryTime))return false;
    for(const g of goalTransforms(state,stage,alpha)) {
      const left=g.line===undefined?g.left:g.team?g.line:g.line-g.depth;
      const right=g.line===undefined?g.right:g.team?g.line+g.depth:g.line;
      if(point.x>=left&&point.x<=right&&point.y>=g.top&&point.y<=g.bottom)return goal(state,g.team,world,true);
    }
    return false;
  }
  function goals(state,stage,previous,b=state.ball,world=null,alpha=1,previousAlpha=0,blocked=null,end=b) {
    if(state.tri)return triCrossings(state,stage,previous,b,world,end);
    if(b.carrier||state.phase!=="playing"||stage.openSoccer&&upperRecovering(state,b,world?.recoveryTime))return;
    if(state.pong){
      if(b!==state.ball||b.resetFrame===state.time)return;
      if(stage.pongTrack){
        const before=goalTransforms(state,stage,previousAlpha);
        for(const g of goalTransforms(state,stage,alpha))for(const s of g.segments){
          const old=before.find(old=>old.team===g.team).segments.find(old=>old.edge===s.edge)||s;
          if(planeCrossing(previous,end,b.r,s.axis,s.line,s.sign,s.low,s.high,old.low,old.high)!==null){goal(state,g.team,world);return;}
        }
        return;
      }
      for(const g of stage.goals)if(planeCrossing(previous,end,b.r,"x",g.line,g.sign,g.top,g.bottom)!==null){goal(state,g.team,world);return;}
      return;
    }
    if(state.golden){ringCrossings(state,stage,previous,b,world,end);return;}
    if(stage.fieldGoal||stage.stickyBall){fieldGoalEntries(state,stage,previous,b,world,blocked,end);return;}
    if(scoreGoalInterior(state,stage,end,b,world,alpha))return;
    if(stage.gravitySoccer){movingGoalEntries(state,stage,previous,b,world,alpha,previousAlpha,blocked,end);return;}
    for(const g of stage.goals) {
      if(stage.dashballArena==="standard"||stage.soccer||stage.openSoccer) {
        if(planeCrossing(previous,end,0,"x",g.line,g.team?1:-1,g.top,g.bottom)!==null){goal(state,g.team,world);return;}
      } else if(planeCrossing(previous,end,0,"y",g.top,1,g.left,g.right)!==null){
        goal(state,g.team,world);return;
      }
    }
  }
  function fieldGoalEntries(state,stage,previous,b,world,blocked,end=b){
    for(const g of stage.goals){
      if(b.r*2>g.right-g.left)continue;
      // Slow Sticky Ball shots can land a fraction short of the plane at a
      // substep boundary. Keep strict direction without discarding that travel.
      if(planeCrossing(previous,end,b.r,"x",g.line,g.team?1:-1,-Infinity,g.bottom,-Infinity,g.bottom,stage.stickyBall?0:1e-8)!==null){goal(state,g.team,world);return;}
    }
  }
  function movingGoalEntries(state,stage,previous,b,world,alpha,previousAlpha,blocked,end=b) {
    const before=goalTransforms(state,stage,previousAlpha),after=goalTransforms(state,stage,alpha);
    for(const g of after) {
      const old=before[g.team];
      if(planeCrossing(previous,end,0,"x",g.line,g.team?1:-1,g.top,g.bottom,old.top,old.bottom)!==null){goal(state,g.team,world);return;}
    }
  }
  function contactGoalEntries(state,world,previous,b,surfaces,alpha) {
    if(state.tri)return;
    if(!world.stage.goals.length||state.golden)return;
    const start=previous,end={x:b.x,y:b.y},count=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y)/(b.r*.25)));
    // Real shields, Kickoffs and moving-body pushes can cross an opening during
    // contact placement. Sweep those paths, but never stationary overlap repair.
    for(let i=1;i<=count;i++){
      const next={...b,x:start.x+(end.x-start.x)*i/count,y:start.y+(end.y-start.y)*i/count};
      if(surfaces.some(rect=>ballTerrainContact(next,rect,previous,0)))return;
      goals(state,world.stage,previous,b,world,alpha,alpha,null,next);
      if(state.phase!=="playing"||(state.fieldGoal||state.pong)&&state.ball!==b)return;
      previous=next;
    }
  }
  function step(state,dt,world) {
    if(state.phase!=="playing")return;
    if(recoverTargetBall(state,world,0,true))return;
    state.time+=dt;
    if(state.pongTrack){state.pongTrack.previous=state.pongTrack.time;state.pongTrack.time+=dt;}
    if(state.tri){stepTri(state,dt,world);return;}
    if(state.targetCharge){stepCharge(state,dt,world);return;}
    if(state.totalRush){stepTotal(state,dt,world);return;}
    for(const b of balls(state)){
      if(state.phase!=="playing")break;
      if(state.golden&&![b.x,b.y,b.vx,b.vy].every(Number.isFinite))Object.assign(b,rushBall(world.stage,state.config,b.id));
      stepBall(state,dt,world,b);
    }
    if(state.golden&&state.phase==="playing")stepGolden(state,dt,world);
  }
  function spawnTriBall(state,stage,world=null,existing=null){
    if(!existing&&state.config.maxBalls&&balls(state).length>=state.config.maxBalls){state.tri.suppressed++;return false;}
    const ball=newBall(stage,state.config),serial=++state.tri.serial,terrain=world?.terrain(1)||stage.terrain.map(t=>t.move?{...t,[t.move.axis]:t[t.move.axis]+Math.sin(state.time*t.move.speed+t.move.phase)*t.move.amplitude}:t);
    let point=null;
    for(let i=0;i<800;i++){
      const x=stage.width*.22+((serial*13+i*17)%41)/40*stage.width*.56,y=96+Math.floor(i/41)*72;
      if(y+ball.r>stage.floorY-30)break;const probe={x,y,r:ball.r+6};
      if(terrain.some(t=>circleRect(probe,t)))continue;
      if(balls(state).some(b=>b!==existing&&Math.hypot(b.x-x,b.y-y)<b.r+probe.r+6))continue;
      if(world?.fighters.some(f=>!f.koScored&&circleRect(probe,world.body(f))))continue;
      point={x,y};break;
    }
    if(!point){state.tri.suppressed++;return false;}
    Object.assign(ball,point,{id:serial,prevX:point.x,prevY:point.y,resetFrame:state.time});
    if(existing)Object.assign(existing,ball);else state.extraBalls.push(ball);
    state.tri.maxObserved=Math.max(state.tri.maxObserved,balls(state).length);return true;
  }
  function triCrossings(state,stage,previous,ball,world,end=ball){
    if(state.phase!=="playing"||ball.resetFrame===state.time)return false;const crossings=[];
    for(const g of stage.goals){
      const t=g.kind==="basket"?planeCrossing(previous,end,0,"y",g.top,1,g.left,g.right):
        planeCrossing(previous,end,g.kind==="field"?ball.r:0,"x",g.line,g.team?1:-1,g.kind==="field"?-Infinity:g.top,g.bottom);
      if(t!==null)crossings.push({t,g});
    }
    crossings.sort((a,b)=>a.t-b.t||a.g.team-b.g.team);
    const first=crossings[0];return first?Objectives.triAward(state,1-first.g.team,first.g.kind,ball,world,b=>spawnTriBall(state,stage,world,b)):false;
  }
  function stepTri(state,dt,world){
    const objects=balls(state),count=Math.min(24,Math.max(1,Math.ceil(state.config.maxSpeed*2*dt/(state.config.ballRadius*.4)))),h=dt/count;
    for(let i=0;i<count;i++){
      for(const b of objects)if(b.resetFrame!==state.time)stepBall(state,h,world,b,i/count,1/count);
      for(let a=0;a<objects.length;a++)for(let z=a+1;z<objects.length;z++){
        const first=objects[a],second=objects[z];if(first.resetFrame===state.time||second.resetFrame===state.time)continue;
        const local={...relativeBall(second,first.x,world.stage,first.y)},before={x:local.x,y:local.y};
        if(!TargetCharge.collideBalls(first,local,state.config.bounce,world.onBallImpact))continue;
        second.x+=local.x-before.x;second.y+=local.y-before.y;second.vx=local.vx;second.vy=local.vy;
        for(const b of[first,second]){Objectives.wrapVertical(b,world.stage);for(const rect of world.terrain((i+1)/count)){
          const n=ballTerrainContact(b,rect,{x:b.prevX,y:b.prevY},h);if(!n)continue;
          b.x+=n.x*(n.depth+.01);b.y+=n.y*(n.depth+.01);const vn=(b.vx-(rect.vx||0))*n.x+(b.vy-(rect.vy||0))*n.y;
          if(vn<0){b.vx-=(1+state.config.bounce)*vn*n.x;b.vy-=(1+state.config.bounce)*vn*n.y;world.onBallImpact?.(b,-vn,n);}
        }limit(b,state.config);}
      }
    }
    Objectives.triResolve(state,dt,()=>spawnTriBall(state,world.stage,world),finish);
  }
  function stepBall(state,dt,world,b,start=0,span=1) {
    const heavy=isBoulderBall(state,b),config=ballConfig(state,b);
    b.prevX=b.x;b.prevY=b.y;
    if(state.pong)for(const id of Object.keys(b.pongTouches)){
      const f=world.fighters.find(f=>f.id===id),rect=f&&world.body(f);
      const pad=f&&world.shielding(f)?world.shieldPadding(f)||0:0;
      if(!rect||!circleRect({...b,r:b.r+pad+6},rect))delete b.pongTouches[id];
    }
    for(const map of [b.contacts,b.noCapture])for(const [id,until] of Object.entries(map))if(until<state.time-1)delete map[id];
    const live=heavy?new Set(world.fighters.flatMap(f=>[f.attack,...(f.projectiles||[])].filter(Boolean).map(a=>`${f.id}:${a.contactId??a.id}`))):null;
    if(heavy)for(const id of Object.keys(state.boulder.stunContacts)){
      const f=world.fighters.find(f=>f.id===id);
      if(!f||!circleRect({...relativeBall(b,f.x,world.stage),r:b.r+4},world.body(f)))delete state.boulder.stunContacts[id];
    }
    for(const [id,time] of Object.entries(b.attacks))if(time<state.time-8&&(!live||!live.has(id)))delete b.attacks[id];
    if(b.pendingLaunch&&b.pendingLaunch.until<state.time)b.pendingLaunch=null;
    const beforePossession={x:b.x,y:b.y};
    if(possession(state,world,b)){
      if(world.stage.triWrap)beforePossession.y+=Math.round((b.y-beforePossession.y)/world.stage.height)*world.stage.height;
      if(state.tri)triCrossings(state,world.stage,beforePossession,b,world);else if(!volleyballFloor(state,world.stage,b,b,world))scoreGoalInterior(state,world.stage,b,b,world,start);return;
    }
    if(world.stage.openSoccer&&(recoverUpper(state,world,b,b.r)||upperRecovering(state,b,world.recoveryTime)))return;
    // Score a ball already inside before an attack or collision can move it out.
    if(scoreGoalInterior(state,world.stage,b,b,world,start))return;
    const strikes=world.attacks();
    interceptBall(state,world,b,strikes);
    b.launched=Math.max(0,b.launched-dt);pongMomentum(state,b);limit(b,config);
    if(state.tri){const drag=Math.exp(-(config.triSingleBall?.025:.04)*dt);b.vx*=drag;b.vy*=drag;}
    const moving=world.stage.gravitySoccer,gravity=moving||heavy||world.stage.gravityRush?(world.gravity||{x:0,y:1}):{x:0,y:1};
    const goalSpeed=moving&&state.movingGoals?Math.max(0,...goalTransforms(state,world.stage).map(g=>Math.abs(g.vy))):state.movingPlatforms?Math.max(0,...state.movingPlatforms.map((p,i)=>Math.abs(platformTransform(state,world.stage,i).vy))):0;
    const count=Math.min(heavy?64:moving?40:20,Math.max(1,Math.ceil((Math.hypot(b.vx,b.vy)+500+goalSpeed)*dt/(heavy?8:b.r*.3)))),h=dt/count;
    for(let i=0;i<count&&state.phase==="playing"&&!b.carrier;i++) {
      let grounded=false;
      const previous={x:b.x,y:b.y},blocked=moving||world.stage.fieldGoal||world.stage.openSoccer?new Set():null;if(heavy||world.stage.gravityRush)b.vx+=config.gravity*gravity.x*h;b.vy+=config.gravity*gravity.y*h;limit(b,config);b.x+=b.vx*h;b.y+=b.vy*h;
      wrapBall(b,world.stage,previous);
      Objectives.wrapVertical(b,world.stage,previous);
      if(volleyballFloor(state,world.stage,previous,b,world))return;
      if(state.targetCharge){
        const t=state.targetCharge.target,alpha=i/count;
        TargetCharge.collide(state,b,previous,{x:t.prevX+(t.x-t.prevX)*alpha,y:t.prevY+(t.y-t.prevY)*alpha},world);
      }
      if(world.stage.openSoccer&&recoverUpper(state,world,b,b.r))return;
      const uncorrected={x:b.x,y:b.y};
      const surfaces=world.terrain(start+span*(i+1)/count);
      for(let pass=0;pass<3;pass++)for(const rect of surfaces) {
        const local=heavy||world.stage.openSoccer?relativeBall(b,rect.x+rect.w/2,world.stage):b;
        if(heavy&&local.x>=rect.x&&local.x<=rect.x+rect.w){
          const gap=gravity.y>0?rect.y-(b.y+b.r):b.y-b.r-(rect.y+rect.h);
          if(Math.abs(gap)<=.05&&Math.abs(b.vy-(rect.vy||0))<60){grounded=true;b.vy=rect.vy||0;}
        }
        const n=ballTerrainContact(local,rect,previous,h);if(!n)continue;b.x+=n.x*(n.depth+.01);b.y+=n.y*(n.depth+.01);
        const vn=(b.vx-(rect.vx||0))*n.x+(b.vy-(rect.vy||0))*n.y;
        const bounce=heavy&&Math.abs(n.x)>.5?Math.min(config.bounce,BOULDER_PHYSICS.wallBounce):config.bounce;
        if(vn<0) {b.vx-=(1+bounce)*vn*n.x;b.vy-=(1+bounce)*vn*n.y;if(!heavy)world.onBallImpact?.(b,-vn,n);if(state.pong)world.onPongWall?.(b,n);}
        if(n.y*gravity.y<-.5){grounded=true;if(!heavy)b.vx*=Math.exp(-config.groundFriction*h);if(!state.pong&&Math.abs(b.vy-(rect.vy||0))<60)b.vy=rect.vy||0;}
        if(world.stage.gravityRush&&n.x*gravity.x<-.5){grounded=true;b.vy*=Math.exp(-config.groundFriction*h);if(Math.abs(b.vx-(rect.vx||0))<60)b.vx=rect.vx||0;}
        if(rect.goalTeam!==undefined){b.entry=-1;blocked?.add(rect.goalTeam);}
      }
      if(heavy)world.onBoulderMotion?.(previous,b,h);
      const carriedPosition={x:b.x,y:b.y};
      // Intercept inside the same microsteps as ball/body collisions. Brief,
      // narrow attacks (including Edgebert's) must not miss a ball between frames.
      interceptBall(state,world,b,strikes,previous,start+span*i/count,start+span*(i+1)/count);
      for(const f of world.fighters) {
        if(f.koScored)continue;
        const body=world.body(f),alpha=start+span*(i+1)/count;
        const rect={...body,x:body.x+(f.prevX-f.x)*(1-alpha),y:body.y+(f.prevY-f.y)*(1-alpha)};
        const local=relativeBall(b,rect.x+rect.w/2,world.stage,rect.y+rect.h/2);
        const n=circleRect(local,rect),direction=unit({x:local.x-rect.x-rect.w/2,y:local.y-rect.y-rect.h/2});
        const surface=world.shielding(f)?shieldSurface(f,direction,world,rect):null;
        const shieldNear=surface&&Math.hypot(local.x-surface.x,local.y-surface.y)<=surface.radius+b.r;
        if(n||shieldNear&&world.shieldCovers(f,{x:local.x-f.x,y:local.y-f.y})){
          const redirected=contact(state,f,rect,n||{x:0,y:-1,depth:0},world,b);
          if(redirected){
            contactGoalEntries(state,world,redirected,b,surfaces,start+span*(i+1)/count);
            if(state.phase!=="playing"||(state.fieldGoal||state.pong)&&state.ball!==b)return;
          }
        }
        if(b.carrier)break;
      }
      if(b.carrier){scoreGoalInterior(state,world.stage,b,b,world,start+span*(i+1)/count);break;}
      world.rigidContact?.(b,previous);
      if(volleyballFloor(state,world.stage,previous,b,world))return;
      // A body or shield must not push the ball through a goal wall after the
      // first terrain pass. Recheck surfaces before validating any entry.
      const beforeWrap=previous.x;wrapBall(b,world.stage,previous);uncorrected.x+=previous.x-beforeWrap;
      if(world.stage.triWrap){
        Objectives.wrapVertical(b,world.stage);const shift=Math.round((b.y-previous.y)/world.stage.height)*world.stage.height;
        previous.y+=shift;uncorrected.y+=shift;
      }
      for(const rect of surfaces) {
        const local=heavy||world.stage.openSoccer?relativeBall(b,rect.x+rect.w/2,world.stage):b;
        const n=ballTerrainContact(local,rect,previous,h);if(!n)continue;
        b.x+=n.x*(n.depth+.01);b.y+=n.y*(n.depth+.01);
        const vn=(b.vx-(rect.vx||0))*n.x+(b.vy-(rect.vy||0))*n.y;
        const bounce=heavy&&Math.abs(n.x)>.5?Math.min(config.bounce,BOULDER_PHYSICS.wallBounce):config.bounce;
        if(vn<0){b.vx-=(1+bounce)*vn*n.x;b.vy-=(1+bounce)*vn*n.y;if(!heavy)world.onBallImpact?.(b,-vn,n);}
        if(n.y*gravity.y<-.5)grounded=true;
        if(rect.goalTeam!==undefined){b.entry=-1;blocked?.add(rect.goalTeam);}
      }
      collideTargets(state,world);
      const x=world.stage.wrap||state.pong?b.x:clamp(b.x,24+b.r,world.stage.width-24-b.r);
      const y=world.stage.triWrap||world.stage.pongTrack?b.y:Math.min(world.stage.floorY-b.r,world.stage.cameraOpenTop?b.y:Math.max(24+b.r,b.y));
      if(x!==b.x){if(!heavy)world.onBallImpact?.(b,Math.abs(b.vx),{x:b.x<x?1:-1,y:0});b.vx=(b.x<x?1:-1)*Math.abs(b.vx)*config.bounce;b.x=x;b.entry=-1;}
      if(y!==b.y){if(!heavy)world.onBallImpact?.(b,Math.abs(b.vy),{x:0,y:b.y<y?1:-1});b.vy=(b.y<y?1:-1)*Math.abs(b.vy)*config.bounce;b.y=y;b.entry=-1;}
      pongMomentum(state,b);limit(b,config);
      if(heavy){
        if(grounded){b.vx*=Math.exp(-config.groundFriction*h);const target=b.vx/b.r*gravity.y;b.angularVelocity=(b.angularVelocity||0)+(target-(b.angularVelocity||0))*(1-Math.exp(-BOULDER_PHYSICS.rollingGrip*h));}
        else b.angularVelocity=(b.angularVelocity||0)*Math.exp(-BOULDER_PHYSICS.airSpinDrag*h);
        b.angularVelocity=clamp(b.angularVelocity,-BOULDER_PHYSICS.maxSpin,BOULDER_PHYSICS.maxSpin);b.spin=(b.spin+b.angularVelocity*h)%(Math.PI*2);
        world.onBoulderMotion?.(carriedPosition,b,0);
      }else b.spin+=b.vx*h/48;
      // Corrections may stop or retreat a shot, never invent travel through a
      // scoring plane. A grounded shot can still roll across the goal line.
      const scoringEnd={x:clamp(b.x,Math.min(previous.x,uncorrected.x),Math.max(previous.x,uncorrected.x)),y:clamp(b.y,Math.min(previous.y,uncorrected.y),Math.max(previous.y,uncorrected.y))};
      if(heavy)scoreBoulder(state,world.stage,h,gravity,start+span*(i+1)/count);
      else if(!scoreGoalInterior(state,world.stage,b,b,world,start+span*(i+1)/count))goals(state,world.stage,previous,b,world,(i+1)/count,i/count,blocked,scoringEnd);
      if((world.stage.fieldGoal||state.pong)&&state.ball!==b)break;
      if((state.golden||state.tri)&&b.resetFrame===state.time)break;
    }
    if(state.phase==="playing")recoverTargetBall(state,world,dt);
  }
  function ballTerrainContact(ball,rect,previous,dt){
    if(rect.kind!=="oneway")return circleRect(ball,rect);
    const vy=rect.vy||0,previousTop=rect.y-vy*dt;
    if(ball.vy-vy<0||previous.y+ball.r>previousTop+1)return null;
    // Only the top face is solid. Relative motion includes platform travel.
    if(ball.x+ball.r<=rect.x||ball.x-ball.r>=rect.x+rect.w||ball.y+ball.r<rect.y)return null;
    const contact=circleRect(ball,rect);
    return contact?{x:0,y:-1,depth:ball.y+ball.r-rect.y}:null;
  }
  function interceptBall(state,world,ball,strikes,previous=ball,from=1,to=1){
    for(const entry of strikes){
      if(entry.fighter.koScored||entry.attack.selfCancelled||entry.attack.clashed||world.attackValid?.(entry)===false)continue;
      const f=entry.fighter,dx=(f.prevX??f.x)-f.x,dy=(f.prevY??f.y)-f.y;
      const samples=Math.min(12,Math.max(1,Math.ceil(Math.hypot(ball.x-previous.x+dx*(to-from),ball.y-previous.y+dy*(to-from))/Math.max(6,ball.r*.5))));
      for(let i=0;i<=samples;i++){
        const t=i/samples,alpha=from+(to-from)*t;
        const probe={...ball,x:previous.x+(ball.x-previous.x)*t-dx*(1-alpha),y:previous.y+(ball.y-previous.y)*t-dy*(1-alpha)},local=relativeBall(probe,f.x,world.stage,f.y);
        if(isBoulderBall(state,ball)?world.attackTouchesCircle?.(entry,local)??circleAttackContact(entry.box,local):world.attackTouches(entry,ballRect(local))){shot(state,f,entry.attack,world,false,ball);break;}
      }
    }
  }
  function exteriorContact(f,terrain,body) {
    if(body.y+body.h<=terrain.y||body.y>=terrain.y+terrain.h)return null;
    const n=terrain.dashballExterior,edge=n<0?terrain.x:terrain.x+terrain.w;
    const before=n<0?f.prevX+f.data.width/2:f.prevX-f.data.width/2,now=n<0?body.x+body.w:body.x;
    if(n<0?before>edge+2||now<=edge:before<edge-2||now>=edge)return null;
    return {nx:n,ny:0,penetration:Math.abs(now-edge)};
  }
  function constrain(state,f,stage) {
    if(f.koScored)return;
    const half=f.data.width/2;
    if(!stage.wrap||state.config.ruleset==="court")f.x=clamp(f.x,(stage.wrap?0:24)+half,stage.width-(stage.wrap?0:24)-half);
    if(stage.triWrap)Objectives.wrapVertical(f,stage);
    else f.y=Math.min(stage.floorY-f.data.height/2,stage.cameraOpenTop?f.y:Math.max(24+f.data.height/2,f.y));
    if(state.config.ruleset==="court"||stage.volleyball) {
      const left=f.team===(stage.leftTeam??0),gap=stage.volleyball?VOLLEYBALL_TUNING.netWidth/2+3:3,edge=stage.width/2+(left?-half-gap:half+gap);
      if(left&&f.x>edge){f.x=edge;if(f.vx>0)f.vx=0;}
      if(!left&&f.x<edge){f.x=edge;if(f.vx<0)f.vx=0;}
    }
  }
  function balls(state){return state.extraBalls?[state.ball,...state.extraBalls]:[state.ball];}
  function isBoulderBall(state,b){return Boolean(state.boulder)&&(!state.totalRush||b.boulderObject===true);}
  const SMALL_BALL_CONFIG=Object.freeze({...DEFAULTS,...GOLDEN_DEFAULTS});
  function smallBallConfig(){return SMALL_BALL_CONFIG;}
  function ballConfig(state,b){return state.totalRush&&!isBoulderBall(state,b)?SMALL_BALL_CONFIG:state.config;}
  function boulderArena(c) {
    const width=Math.ceil(Math.max(3000,c.boulderDiameter*1.22/c.zoneWidth)/6)*6,height=1980,floorY=1820;
    const zones=[{team:1,left:width*.09,right:width*(.09+c.zoneWidth)},
      {team:0,left:width*(.91-c.zoneWidth),right:width*.91}].map(z=>({...z,left:Math.round(z.left),right:Math.round(z.right),top:floorY-c.bonusHeight}));
    const terrain=[{x:0,y:floorY,w:width,h:height-floorY,kind:"floor"},{x:0,y:0,w:width,h:24,kind:"wall"}];
    for(const z of zones)terrain.push({x:(z.left+z.right)/2-54,y:z.top,w:108,h:28,kind:"platform",boulderBonus:z.team});
    terrain.push({x:width/2-66,y:floorY-c.bonusHeight-280,w:132,h:28,kind:"platform",boulderPerch:true});
    return {name:"Boulder Control",dashballArena:"boulder-control",boulderControl:true,width,height,floorY,zones,leftTeam:1,
      wrap:true,wrapMargin:0,verticalWrap:false,hole:null,fixedCamera:true,cameraZoom:Math.min(.28,1240/width),cameraHeader:160,
      backgroundColor:"#202b32",teamSpawnLanes:{left:[width*.12,width*.30],crowded:[width*.10,width*.31]},terrain,ballOnly:[],goals:[]};
  }
  function gravityBoulderArena(stage,c) {
    stage.name="Gravity Flip Boulder Control";stage.dashballArena="gravity-boulder";stage.gravityBoulder=true;
    stage.gravitySwitch={x:stage.width/2,y:(24+stage.floorY)/2,radius:32,noCooldown:true};
    const midpoint=(24+stage.floorY)/2,bonusY=stage.floorY-c.bonusHeight+14;
    const perch=stage.terrain.find(t=>t.boulderPerch);perch.x=stage.width/2-perch.w/2;perch.y=bonusY-Math.min(140,(bonusY-midpoint)/2)-perch.h/2;
    perch.dashballMover=true;perch.move={axis:"x",amplitude:Math.min(520,stage.width*.12),speed:Math.PI*2/10,phase:0};
    stage.gravityPlatforms=stage.terrain.filter(t=>t.boulderBonus!==undefined).map((t,i)=>{
      t.gravityPlatform=i;const downY=t.y+t.h/2;return {downY,upY:24+stage.floorY-downY};
    });
    return stage;
  }
  function boulderZones(state,stage,gravity={x:0,y:1},alpha=1,ahead=0) {
    if(!stage.gravityBoulder)return stage.zones;
    return stage.zones.map((z,i)=>{
      const p=platformTransform(state,stage,i,alpha,ahead,gravity),half=state.config.scoringWindowHeight/2;
      return {...z,top:p.y-half,bottom:p.y+half,threshold:p.y-gravity.y*14,vy:p.vy};
    });
  }
  function boulderRegion(stage,ball,state=null,gravity={x:0,y:1},alpha=1) {
    if(ball.x<0||ball.x>=stage.width)return {team:null,multiplier:0};
    if(stage.gravityBoulder){
      const z=boulderZones(state,stage,gravity,alpha).find(z=>ball.x>=z.left&&ball.x<z.right&&ball.y>=z.top&&ball.y<z.bottom);
      return z?{team:z.team,multiplier:(ball.y-z.threshold)*gravity.y<0?2:1}:{team:null,multiplier:0};
    }
    const z=stage.zones.find(z=>ball.x>=z.left&&ball.x<z.right);
    return z?{team:z.team,multiplier:ball.y<z.top?2:1}:{team:null,multiplier:0};
  }
  function scoreBoulder(state,stage,dt,gravity={x:0,y:1},alpha=1) {
    if(state.phase!=="playing")return;
    const region=boulderRegion(stage,state.ball,state,gravity,alpha),meter=state.boulder;
    if(region.team!==meter.activeTeam||region.multiplier!==meter.multiplier){meter.activeTeam=region.team;meter.multiplier=region.multiplier;meter.changeTime=state.time;}
    if(region.team===null)return;
    // 60,000 integer units per point, with carried sub-unit fractions. A normal
    // 60Hz step is exactly 1,000 units; collision substeps cannot duplicate time.
    const team=region.team,raw=dt*60000*boulderRate(state,region.multiplier)+meter.remainders[team],whole=Math.floor(raw+1e-8);
    meter.remainders[team]=Math.max(0,raw-whole);
    if(state.totalRush){meter.scoreUnits[team]+=whole;state.totalRush.pendingUnits[team]+=whole;return;}
    meter.scoreUnits[team]=Math.min(state.config.winningScore*60000,meter.scoreUnits[team]+whole);
    state.scores[team]=meter.scoreUnits[team]/60000;
    if(meter.scoreUnits[team]>=state.config.winningScore*60000||state.overtime&&whole>0)finish(state,team);
  }
  function circleAttackContact(box,b) {
    if(!box)return false;
    if(!box.points)return Boolean(circleRect(b,box));
    let inside=true,sign=0;
    for(let i=0;i<box.points.length;i++){
      const a=box.points[i],next=box.points[(i+1)%box.points.length],cross=(next.x-a.x)*(b.y-a.y)-(next.y-a.y)*(b.x-a.x);
      if(Math.abs(cross)>1e-8){if(sign&&Math.sign(cross)!==sign)inside=false;else if(!sign)sign=Math.sign(cross);}
      if(sweepCircle(a.x,a.y,next.x,next.y,b))return true;
    }
    return inside;
  }
  function boulderContact(state,f,rect,normal,world,b) {
    const now=state.time,local=relativeBall(b,f.x,world.stage),direction=unit({x:local.x-f.x,y:b.y-f.y});
    const available=now>=(b.contacts[f.id]||0)&&f.invulnerable<=0;
    if(f.invulnerable<=0&&world.mirrorShield?.(f,b,"boulder")){
      b.ownerId=f.id;b.ownerTeam=f.team;b.launched=0;
    }else if(available&&world.shielding(f)&&world.shieldCovers(f,direction)){
      const aim=unit(world.shieldAim(f)),vn=b.vx*aim.x+b.vy*aim.y;
      if(vn<0){b.vx-=(1+state.config.bounce)*vn*aim.x;b.vy-=(1+state.config.bounce)*vn*aim.y;}
      b.vx+=aim.x*60/state.config.boulderMass;b.vy+=aim.y*60/state.config.boulderMass;
      b.ownerId=f.id;b.ownerTeam=f.team;b.launched=0;b.contacts[f.id]=now+.18;world.onShield?.(f,false,b);
    }else if(available&&world.kicking(f)&&!f.punchInputHeld&&!f.attack&&Math.hypot(f.vx,f.vy)>180&&f.dashReboundLockout<=0&&
      f.dashDir.x*direction.x+f.dashDir.y*direction.y>.1){
      if(shot(state,f,{id:`kick-${Math.floor(now*60)}`,dir:unit(f.dashDir),charge:f.lastDashCharge||0,grounded:false},world,true,b))return;
    }else if(available&&!world.dashing?.(f)&&!world.boulderSurface?.(f,b)){
      const speed=Math.max(0,-b.vx*normal.x-b.vy*normal.y),friendly=b.ownerTeam===f.team&&!world.friendlyFire;
      if(speed>=BOULDER_IMPACT.minimumSpeed&&!friendly&&!state.boulder.stunContacts[f.id]){
        world.onBoulderImpact?.(f,{speed,dir:unit({x:b.vx,y:b.vy}),grounded:Boolean(f.onGround),ownerId:b.ownerId});
        state.boulder.stunContacts[f.id]=true;b.contacts[f.id]=now+.28;
      }
    }
    // Separate on every contact, but impulses/rewards are discrete. Never move a
    // 540-unit boulder by an entire fighter penetration depth as Soccer does.
    if(normal.depth>0)world.onBoulderBody?.(f,b,normal);
  }
  function boulderImpulse(ball,velocity,config,kick=false,strength=1){
    const dir=unit(velocity),along=Math.max(0,ball.vx*dir.x+ball.vy*dir.y);
    const resistance=Math.max(BOULDER_PHYSICS.minimumTransfer,1/(1+(along/BOULDER_PHYSICS.resistanceSpeed)**2));
    const scale=(kick?BOULDER_PHYSICS.kickScale:1)*strength*resistance/config.boulderMass;
    return {x:velocity.x*scale,y:velocity.y*scale};
  }
  function boulderPlan(state,f,world) {
    const stage=world.stage,b=state.ball,gravity=stage.gravityBoulder?(world.gravity||{x:0,y:1}):{x:0,y:1};
    const z=boulderZones(state,stage,gravity,1,.65).find(z=>z.team===f.team),region=boulderRegion(stage,b,state,gravity),center=(z.left+z.right)/2;
    const dx=center-b.x,wrapDx=dx-Math.round(dx/stage.width)*stage.width;
    const predicted=((b.x+b.vx*.65)%stage.width+stage.width)%stage.width;
    const futureY=b.y+b.vy*.65+gravity.y*state.config.gravity*.65*.65*.5;
    const secure=region.team===f.team&&predicted>z.left+35&&predicted<z.right-35&&Math.abs(b.vx)<300&&(!stage.gravityBoulder||futureY>=z.top&&futureY<z.bottom);
    const bonusUseful=!state.totalRush||state.config.boulderBonusRate>state.config.boulderTerritoryRate;
    const lift=secure&&region.multiplier===1&&bonusUseful&&(state.totalRush&&state.config.boulderTerritoryRate===0||Math.floor(state.time/5+f.team)%3===1);
    const vx=secure?clamp(wrapDx*.4,-90,90):clamp(wrapDx*.9,-560,560);
    const vy=stage.gravityBoulder?clamp((z.threshold-gravity.y*Math.min(250,b.r*.7)-b.y)*1.3-gravity.y*state.config.gravity*.35,-850,850):lift?-850:region.multiplier===2&&bonusUseful?-100:Math.abs(wrapDx)>400?-450:0;
    let best=null;
    for(const kick of world.canKick?.(f)===false?[false]:[false,true])for(const charge of kick?[0]:[.1,.55,1])for(let i=0;i<16;i++){
      const aim={x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)},a={dir:aim,charge,grounded:f.onGround};
      const impulse=boulderImpulse(b,shotVelocity(f,a,world,kick),state.config,kick),speed={x:b.vx+impulse.x,y:b.vy+impulse.y};
      const reach=f.data.punchReach||70,distance=b.r+(kick?18:Math.min(80,reach*.6));
      const approach={x:b.x-aim.x*distance,y:b.y-aim.y*distance};
      approach.x=((approach.x%stage.width)+stage.width)%stage.width;approach.y=clamp(approach.y,24+f.data.height/2,stage.floorY-f.data.height/2);
      if(circleRect(b,{x:approach.x-f.data.width/2,y:approach.y-f.data.height/2,w:f.data.width,h:f.data.height}))continue;
      const cost=Math.abs(speed.x-vx)*1.3+Math.abs(speed.y-vy)*.65+Math.hypot(approach.x-f.x,approach.y-f.y)*.16+charge*12+(kick?35:0);
      if(!best||cost<best.cost)best={aim,charge,kick,approach,cost,secure,lift};
    }
    return best;
  }
  function goldenArena(kind="golden-rush"){
    const width=2800,height=2400,floorY=2240,wall=24;
    const terrain=[{x:0,y:floorY,w:width,h:height-floorY,kind:"floor"},
      {x:0,y:0,w:width,h:wall,kind:"wall"}];
    for(const team of [0,1])for(const y of [1720,1240,760])terrain.push({x:team?width-900:480,y,w:420,h:24,kind:"oneway"});
    terrain.push({x:width/2-210,y:1480,w:420,h:24,kind:"oneway"});
    const rings=[0,1].flatMap(team=>[1980,1320,620].map((y,row)=>({id:`ring-${team}-${row}`,team,row,line:team?width-180:180,top:y-(row===2?190:210),bottom:y+(row===2?190:210),points:[1,3,5][row]})));
    const ballOnly=rings.flatMap(g=>[{x:g.line-18,y:g.top-18,w:36,h:18,goalTeam:g.team},{x:g.line-18,y:g.bottom,w:36,h:18,goalTeam:g.team}]);
    const stage={name:"Golden Rush",dashballArena:"golden-rush",goldenRush:true,width,height,floorY,wrap:true,wrapMargin:0,verticalWrap:false,hole:null,
      fixedCamera:false,dynamicCameraZoom:true,cameraZoom:.42,cameraMinZoom:.25,cameraMaxZoom:.48,cameraPaddingX:240,cameraPaddingY:220,cameraHeader:160,
      teamSpawnLanes:{left:[400,1080],crowded:[350,1120]},backgroundColor:"#202b35",terrain,ballOnly,goals:[],rings};
    if(kind==="gravity-golden-rush"){
      Object.assign(stage,{name:ARENAS.find(a=>a.id===kind).name,dashballArena:kind,gravityRush:true,wrap:false,fixedCamera:true,dynamicCameraZoom:false,cameraZoom:.22,cameraHeader:192,
        gravitySwitch:{x:width/2,y:(24+floorY)/2,radius:48,fourWay:true,noCooldown:true}});
      terrain.push({x:0,y:24,w:wall,h:floorY-24,kind:"wall"},{x:width-wall,y:24,w:wall,h:floorY-24,kind:"wall"});
    }
    return stage;
  }
  function rushBall(stage,c,id){
    const spacing=stage.totalRush?220:80,y=stage.floorY-(stage.totalRush?750:300)-(id%2)*100;
    const b=newBall(stage,c);
    let position={x:stage.width/2+(id-(c.ballCount-1)/2)*spacing,y};
    if(!stage.totalRush){
      const ledges=stage.terrain.filter(t=>t.kind==="oneway"&&t.x!==stage.width/2-210).map(t=>({x:t.x+t.w/2,y:t.y-c.ballRadius-6}));
      const center=stage.terrain.find(t=>t.kind==="oneway"&&t.x===stage.width/2-210);
      ledges.sort((a,b)=>b.y-a.y||a.x-b.x);
      if(center)ledges.push({x:stage.width/2,y:center.y-c.ballRadius-6});
      for(const fraction of [.3,.7,.5,.18,.82])ledges.push({x:stage.width*fraction,y:stage.floorY-c.ballRadius-6});
      position=c.ballCount===1?{x:stage.width/2,y:stage.floorY-300}:ledges[id%ledges.length];
    }
    return {...b,id,...position,prevX:position.x,prevY:position.y,resetFrame:-1};
  }
  function newGolden(stage,serial,config){const hp=stage.totalRush?config.goldenHealth:48;return {goldenTarget:true,serial,active:true,x:stage.width/2,y:stage.height*.19,vx:0,vy:0,r:SNITCH.radius,
    health:hp,maxHealth:hp,respawn:0,flight:0,flash:0,hitstun:0,comboHits:0,comboGrace:0,stunGrace:0,hits:{},kickContacts:{}};}
  function rushAward(state,team,points,kind,world,location){
    if(state.phase!=="playing")return false;
    if(state.totalRush)state.totalRush.pendingUnits[team]+=points*60000;else state.scores[team]+=points;
    if(kind==="ring")state.ringPoints[team]+=points;else state.captures[team]++;
    state.rushNotice={kind,team,points,life:kind==="golden"?2.4:1.2,serial:++state.rushSerial};
    if(state.totalRush){state.totalRush.notices.push({...state.rushNotice});state.totalRush.notices=state.totalRush.notices.slice(-3);}
    world?.onRushScore?.(state.rushNotice,location);
    if(!state.totalRush&&(state.overtime||state.scores[team]>=state.config.winningScore))finish(state,team);
    return true;
  }
  function ringCrossings(state,stage,previous,b,world,end=b){
    for(const ring of stage.rings){
      const right=(ring.direction??(ring.team?1:-1))>0;
      if(planeCrossing(previous,end,b.r,"x",ring.line,right?1:-1,ring.top,ring.bottom)!==null){
        if(rushAward(state,1-ring.team,ring.points,"ring",world,{x:ring.line,y:(ring.top+ring.bottom)/2})){
          Object.assign(b,rushBall(stage,state.totalRush?{...smallBallConfig(),ballCount:state.config.ballCount}:state.config,b.id));b.resetFrame=state.time;
        }
        return;
      }
    }
  }
  function hitGolden(state,f,attack,world,kick=false){
    if(world.canInteract?.(f)===false)return false;
    const g=state.golden;if(!g?.active||state.phase!=="playing"||f.koScored)return false;
    if(!kick&&world.prepareStrike?.(f,attack,g)===false)return false;
    const key=`${f.id}:${attack.contactId??attack.id}`;if(g.hits[key]!==undefined)return false;g.hits[key]=state.time;
    const damage=world.attackDamage?world.attackDamage(f,attack,kick):Math.max(1,Math.round((kick?f.data.dashReboundDamage||4:attack.projectile?.damage??f.data.punchDamage)*(1+(attack.charge||0)*.8)));
    g.health=Math.max(0,g.health-damage);g.flash=.16;
    const impulse=shotVelocity(f,attack,world,kick);
    g.vx+=impulse.x*.55;g.vy+=impulse.y*.55;limit(g,{maxSpeed:SNITCH.maxSpeed});
    g.comboHits=(g.comboGrace>0?g.comboHits:0)+1;g.comboGrace=SNITCH.comboReset;
    if(g.comboHits>=SNITCH.comboLimit){g.hitstun=0;g.stunGrace=SNITCH.recovery;g.comboHits=0;}
    else if(g.stunGrace<=0)g.hitstun=Math.max(g.hitstun,(SNITCH.hitstun+(attack.charge||0)*.1)*Math.pow(.75,g.comboHits-1));
    const reward=state.time>=(state.rewardUntil[f.id]||0);world.onShot?.(f,attack,kick,reward,g);if(reward)state.rewardUntil[f.id]=state.time+.22;
    world.onGoldenHit?.(g,damage,f);
    if(g.health<=0){g.active=false;g.respawn=state.config.goldenRespawn;rushAward(state,f.team,state.config.goldenReward,"golden",world,g);}
    return true;
  }
  function stepGolden(state,dt,world){
    let g=state.golden;
    if(!g.active){g.respawn=Math.max(0,g.respawn-dt);if(g.respawn<=1e-8)state.golden=newGolden(world.stage,g.serial+1,state.config);return;}
    g.flight+=dt;g.flash=Math.max(0,g.flash-dt);g.comboGrace=Math.max(0,g.comboGrace-dt);g.stunGrace=Math.max(0,g.stunGrace-dt);
    if(g.comboGrace<=0)g.comboHits=0;
    for(const [key,time] of Object.entries(g.hits))if(time<state.time-12)delete g.hits[key];
    // Authored continuous patrol with damped steering/evades; no wall clock or RNG.
    const t=g.flight,stage=world.stage,dive=((1+Math.sin(t*.19))*.5)**8*(stage.floorY-800);
    const desired={x:stage.width/2+Math.sin(t*.35)*stage.width*.44,y:stage.height*.19+Math.sin(t*.55)*240+Math.sin(t*.24)*120+dive};
    let evadeX=0,evadeY=0;
    if(g.hitstun<=0&&Math.sin(t*1.3)>.65)for(const f of world.fighters){if(f.koScored)continue;const dx=g.x-f.x,dy=g.y-f.y,d=Math.hypot(dx,dy);if(d>1&&d<190){evadeX+=dx/d*SNITCH.evade;evadeY+=dy/d*SNITCH.evade;}}
    if(g.hitstun>0){g.hitstun=Math.max(0,g.hitstun-dt);g.vx*=Math.exp(-SNITCH.drag*dt);g.vy=g.vy*Math.exp(-SNITCH.drag*dt)+SNITCH.gravity*dt*(stage.gravityRush?world.gravity?.y??1:1);if(stage.gravityRush)g.vx+=SNITCH.gravity*dt*(world.gravity?.x||0);}
    else{
      const vx=clamp((desired.x-g.x)*1.3+evadeX,-SNITCH.patrolSpeed,SNITCH.patrolSpeed),vy=clamp((desired.y-g.y)*1.3+evadeY,-SNITCH.patrolSpeed,SNITCH.patrolSpeed);
      const delta=unit({x:vx-g.vx,y:vy-g.vy}),change=Math.min(Math.hypot(vx-g.vx,vy-g.vy),SNITCH.acceleration*dt);
      g.vx+=delta.x*change;g.vy+=delta.y*change;
    }
    const count=Math.max(1,Math.ceil(Math.hypot(g.vx,g.vy)*dt/12)),h=dt/count;
    for(let i=0;i<count;i++){
      const previous={x:g.x,y:g.y};g.x+=g.vx*h;g.y+=g.vy*h;
      for(const rect of world.terrain(1)){const n=ballTerrainContact(g,rect,previous,h);if(!n)continue;g.x+=n.x*(n.depth+.01);g.y+=n.y*(n.depth+.01);const into=g.vx*n.x+g.vy*n.y;if(into<0){g.vx-=1.45*into*n.x;g.vy-=1.45*into*n.y;}}
      for(const axis of ["x","y"]){const low=24+g.r,high=axis==="x"?stage.width-24-g.r:stage.floorY-g.r,bounded=clamp(g[axis],low,high);if(bounded!==g[axis]){g[axis]=bounded;g["v"+axis]*=-.45;}}
    }
    if(![g.x,g.y,g.vx,g.vy].every(Number.isFinite)){state.golden=newGolden(stage,g.serial,state.config);g=state.golden;}
    for(const id of Object.keys(g.kickContacts)){const f=world.fighters.find(f=>f.id===id);if(!f||!circleRect({...g,r:g.r+8},world.body(f)))delete g.kickContacts[id];}
    const box=ballRect(g);
    for(const entry of world.attacks())if(world.attackTouches(entry,box))hitGolden(state,entry.fighter,entry.attack,world);
    for(const f of world.fighters){
      if(!g.active||state.phase!=="playing")break;
      if(f.koScored||f.punchInputHeld||f.attack||f.dashReboundLockout>0||!world.kicking(f)||Math.hypot(f.vx,f.vy)<180)continue;
      if(g.kickContacts[f.id]||!circleRect(g,world.body(f)))continue;
      const dir=unit(f.dashDir),toward=unit({x:g.x-f.x,y:g.y-f.y});if(dir.x*toward.x+dir.y*toward.y<=.1)continue;
      if(hitGolden(state,f,{id:`gold-kick-${Math.floor(state.time*60)}`,dir,charge:f.lastDashCharge||0,grounded:false},world,true))g.kickContacts[f.id]=true;
    }
  }
  function goldenProjectile(state,f,attack,paths,world){
    const g=state.golden;if(!g?.active||!paths.some(p=>sweepCircle(p.x1,p.y1,p.x2,p.y2,g,attack.projectile.radius)))return false;
    const contacts=attack.projectile.boomerang?.contacts,key=`golden:${g.serial}`;if(contacts?.[key])return false;
    const hit=hitGolden(state,f,attack,world);if(hit&&contacts)contacts[key]=true;return hit;
  }
  function ringPlan(state,f,world,b){
    const targets=world.stage.rings.filter(r=>!state.totalRush||r.points>0).map(r=>({id:r.id,team:r.team,x:r.line,y:(r.top+r.bottom)/2,r:(r.bottom-r.top)/2,destroyed:false}));
    return targetPlan({...state,ball:b,targets},f,{...world,validApproach:p=>p.y<=world.stage.floorY-f.data.height/2+8&&p.y>=24+f.data.height/2});
  }
  function totalArena(c){
    const stage=boulderArena(c),width=Math.max(3600,stage.width),height=2400,floorY=2240,dy=floorY-stage.floorY;
    const ratio=width/stage.width;
    stage.width=width;stage.height=height;stage.floorY=floorY;
    for(const z of stage.zones){z.left=Math.round(z.left*ratio);z.right=Math.round(z.right*ratio);z.top+=dy;}
    for(const t of stage.terrain){
      if(t.kind==="floor"){t.y=floorY;t.w=width;t.h=160;}
      else if(t.y===0)t.w=width;
      else {t.x=(t.x+t.w/2)*ratio-t.w/2;t.y+=dy;}
    }
    for(const sign of [-1,1])stage.terrain.push({x:width/2+sign*(width*.32)-110,y:900,w:220,h:24,kind:"oneway"});
    stage.name="Total Rush";stage.dashballArena="total-rush";stage.totalRush=true;stage.goldenRush=true;
    stage.cameraZoom=Math.min(.23,1240/width);stage.cameraHeader=160;
    stage.teamSpawnLanes={left:[width*.12,width*.30],crowded:[width*.10,width*.31]};
    stage.rings=[1,0].flatMap(team=>[1180,600].map((y,row)=>({id:`total-ring-${team}-${row}`,team,row:row+1,direction:team===1?-1:1,line:team===1?180:width-180,top:y-145,bottom:y+145,points:row?c.highRingPoints:c.middleRingPoints})));
    stage.ballOnly=stage.rings.flatMap(r=>[{x:r.line-18,y:r.top-18,w:36,h:18,goalTeam:r.team},{x:r.line-18,y:r.bottom,w:36,h:18,goalTeam:r.team}]);
    return stage;
  }
  function fieldGoalArena(chungusHeight,settings){
    const stage=arena("standard",chungusHeight,settings),t=FIELD_GOAL_TUNING,barY=stage.floorY-Math.ceil(chungusHeight*t.heightInChungus/2)*2;
    stage.name="Field Goal";stage.dashballArena="field-goal";stage.fieldGoal=true;stage.soccer=true;
    stage.terrain=stage.terrain.filter(r=>r.goalTeam===undefined);
    stage.goalFrames=[];
    stage.goals=[0,1].map(team=>{
      const line=team?stage.width-t.lineInset:t.lineInset,outerLeft=line-t.width/2,outerRight=line+t.width/2;
      const g={team,line,top:24,bottom:barY,left:outerLeft+t.postThickness,right:outerRight-t.postThickness,outerLeft,outerRight,postTop:barY-t.postHeight};
      stage.goalFrames.push({x:outerLeft,y:g.postTop,w:t.postThickness,h:t.postHeight,kind:"wall",goalTeam:team,fieldGoalPart:"post"},
        {x:outerRight-t.postThickness,y:g.postTop,w:t.postThickness,h:t.postHeight,kind:"wall",goalTeam:team,fieldGoalPart:"post"},
        {x:outerLeft,y:barY,w:t.width,h:t.postThickness,kind:"platform",goalTeam:team,fieldGoalPart:"bar"},
        {x:line-t.postThickness/2,y:barY+t.postThickness,w:t.postThickness,h:t.supportHeight,kind:"wall",goalTeam:team,fieldGoalPart:"support"});
      stage.terrain.push({x:line+(team?-1:1)*t.perchOffset-t.perchWidth/2,y:barY+t.perchGap,w:t.perchWidth,h:t.perchThickness,kind:"platform",fieldGoalPerch:team});
      return g;
    });
    return stage;
  }
  function fieldGoalPlan(state,f,world){
    const stage=world.stage,b=state.ball,targets=stage.goals.map(g=>({id:g.team,team:g.team,x:g.line,y:(24+g.bottom)/2,r:0,destroyed:false}));
    return targetPlan({...state,targets},f,{...world,
      shotCharges:[.15,.45,.85,1],
      validApproach:p=>p.y>=24+f.data.height/2&&p.y<=stage.floorY-f.data.height/2+8});
  }
  function fieldGoalThreat(state,team,stage){
    const b=state.ball,g=stage.goals[team],sign=team?1:-1;if(b.carrier||b.vx*sign<=0)return null;
    const time=(g.line-b.x)/b.vx;if(time<0||time>2.5)return null;
    const y=estimateShotY(b,{x:b.vx,y:b.vy},time,stage,state.config);
    return y+b.r<g.bottom&&y-b.r>=24?{x:g.line,y,time}:null;
  }
  function resolveTotalScore(state){
    if(!state.totalRush||state.phase!=="playing")return;
    const ledger=state.totalRush;
    for(const team of [0,1]){ledger.scoreUnits[team]+=ledger.pendingUnits[team];ledger.pendingUnits[team]=0;state.scores[team]=ledger.scoreUnits[team]/60000;}
    const reached=ledger.scoreUnits.map(n=>n>=state.config.winningScore*60000);
    // Resolve the complete fixed step, not whichever ball happened to iterate first.
    if(reached[0]||reached[1]||state.overtime&&ledger.scoreUnits[0]!==ledger.scoreUnits[1]){
      if(ledger.scoreUnits[0]===ledger.scoreUnits[1]){state.overtime=true;state.announcement="SUDDEN DEATH";}
      else finish(state,ledger.scoreUnits[0]>ledger.scoreUnits[1]?0:1);
    }
  }
  function collideTotalBalls(state,world,alpha=1){
    const big=state.ball,stage=world.stage,invBig=1/(state.config.boulderMass*TOTAL_COLLISION_MASS_SCALE),bounce=Math.min(state.config.bounce,smallBallConfig().bounce);
    for(const small of state.extraBalls){
      if(small.carrier||small.resetFrame===state.time)continue;
      const local=relativeBall(big,small.x,stage),dx=small.x-local.x,dy=small.y-big.y,r=big.r+small.r,d=Math.hypot(dx,dy);
      if(d>=r-.00001)continue;
      let nx=d>1e-8?dx/d:(small.id%2?1:-1),ny=d>1e-8?dy/d:0;
      const depth=r-d+.02,share=1/(1+invBig),nextY=small.y+ny*depth*share;
      if(nextY<24+small.r||nextY>stage.floorY-small.r){
        nx=Math.sign(dx)||(small.id%2?1:-1);ny=0;small.x=local.x+nx*(Math.sqrt(Math.max(0,r*r-dy*dy))+.02);
      }else {big.x-=nx*depth*(1-share);big.y-=ny*depth*(1-share);small.x+=nx*depth*share;small.y+=ny*depth*share;}
      const speed=(small.vx-big.vx)*nx+(small.vy-big.vy)*ny;
      if(speed<0){const impulse=-(1+bounce)*speed/(1+invBig);small.vx+=impulse*nx;small.vy+=impulse*ny;big.vx-=impulse*invBig*nx;big.vy-=impulse*invBig*ny;}
      small.entry=-1;
      for(const ball of [big,small]){
        const config=ballConfig(state,ball);wrapBall(ball,stage);
        for(let pass=0;pass<3;pass++)for(const rect of world.terrain(alpha)){
          const n=ballTerrainContact(relativeBall(ball,rect.x+rect.w/2,stage),rect,{x:ball.x,y:ball.y},0);if(!n)continue;
          ball.x+=n.x*(n.depth+.01);ball.y+=n.y*(n.depth+.01);const vn=ball.vx*n.x+ball.vy*n.y;
          if(vn<0){ball.vx-=(1+config.bounce)*vn*n.x;ball.vy-=(1+config.bounce)*vn*n.y;}
        }
        ball.y=clamp(ball.y,24+ball.r,stage.floorY-ball.r);wrapBall(ball,stage);limit(ball,config);
      }
    }
  }
  function stepTotal(state,dt,world){
    const objects=balls(state),previous=objects.map(b=>({x:b.x,y:b.y}));
    const count=Math.min(16,Math.max(1,Math.ceil((state.config.maxSpeed+smallBallConfig().maxSpeed)*dt/8))),h=dt/count;
    for(let i=0;i<count;i++){
      for(const b of objects){
        if(b.resetFrame===state.time)continue;
        stepBall(state,h,world,b,i/count,1/count);
      }
      collideTotalBalls(state,world,(i+1)/count);
    }
    objects.forEach((b,i)=>{if(b.resetFrame!==state.time){b.prevX=previous[i].x-Math.round((previous[i].x-b.x)/world.stage.width)*world.stage.width;b.prevY=previous[i].y;}});
    for(const notice of state.totalRush.notices)notice.life=Math.max(0,notice.life-dt);
    stepGolden(state,dt,world);resolveTotalScore(state);
  }
  function stepCharge(state,dt,world){
    const objects=balls(state),previous=objects.map(b=>({x:b.x,y:b.y}));
    const count=Math.min(32,Math.max(1,Math.ceil((state.config.maxSpeed+TargetCharge.TUNING.roamSpeed)*dt/6))),h=dt/count;
    for(let i=0;i<count;i++){
      TargetCharge.advance(state,world.stage,h,world.random);
      for(const b of objects)stepBall(state,h,world,b,i/count,1/count);
      TargetCharge.collideBalls(objects[0],objects[1],state.config.bounce,world.onBallImpact);
      for(const f of world.fighters){
        if(f.koScored)continue;
        const normal=circleRect(state.targetCharge.target,world.body(f));
        if(normal)world.onChargeBody?.(f,state.targetCharge.target,normal);
      }
    }
    objects.forEach((b,i)=>{b.prevX=previous[i].x;b.prevY=previous[i].y;});
    TargetCharge.resolve(state,finish);
  }
  function chargePlan(state,f,world,b){
    const target=TargetCharge.predict(state.targetCharge.target,world.stage);
    // Reuse the authored attack/ballistic planner, never scripted shot impulses.
    return targetPlan({...state,ball:b,targets:[{...target,id:"charge",team:target.x>b.x?1:0,r:TargetCharge.TUNING.radius,destroyed:false}]},{...f,team:target.x>b.x?0:1},{...world,
      validApproach:p=>p.y>=24+f.data.height/2&&p.y<=world.stage.floorY-f.data.height/2+8});
  }
  function totalAssignments(state,world){
    const result={},stage=world.stage,b=state.ball,region=boulderRegion(stage,b,state);
    for(const team of [0,1]){
      const peers=world.fighters.filter(f=>f.team===team&&!f.koScored),enemyCount=world.fighters.filter(f=>f.team!==team&&!f.koScored).length,needed=state.config.winningScore-state.scores[team];
      const income=Math.max(state.config.boulderTerritoryRate,state.config.boulderBonusRate/2),tasks=[];
      if(income>0)tasks.push({kind:"boulder",target:b,priority:(region.team===1-team?100:region.team===team?28:65)*income});
      if(income>0&&peers.length>3&&region.team===1-team)tasks.push({kind:"boulder",target:b,priority:72*income});
      const rings=stage.rings.filter(r=>r.team!==team&&r.points>0),ringValue=Math.max(0,...rings.map(r=>r.points))/10;
      for(const ball of state.extraBalls){
        if(!rings.length)break;
        if(ball.carrier&& !peers.some(f=>f.id===ball.carrier))continue;
        const win=rings.some(r=>r.points>=needed&&Math.hypot(ball.x-r.line,ball.y-(r.top+r.bottom)/2)<850);
        tasks.push({kind:"ring",ballId:ball.id,target:ball,priority:win?155:(55+(peers.length>enemyCount?12:0))*ringValue});
      }
      if(state.golden.active&&state.config.goldenReward>0){
        const opportunity=state.config.goldenReward/30*Math.sqrt(144/state.golden.maxHealth)*Math.sqrt(45/state.config.goldenRespawn);
        tasks.push({kind:"golden",target:state.golden,priority:(state.golden.health<state.golden.maxHealth*.3?(needed<=state.config.goldenReward?170:115):52)*opportunity});
      }
      const available=[...peers];
      while(available.length&&tasks.length){
        let best=null;
        for(const [ti,task] of tasks.entries())for(const [fi,f] of available.entries()){
          const target=relativeBall(task.target,f.x,stage),distance=Math.max(0,Math.hypot(target.x-f.x,target.y-f.y)-(task.kind==="boulder"?b.r:0));
          const strength=task.kind==="boulder"?Math.min(12,f.data.punchKnockback/100):Math.min(10,f.data.maxAirDashes||0);
          const value=task.priority-distance*.035+strength+(task.target.carrier===f.id?90:0);
          if(!best||value>best.value)best={ti,fi,value};
        }
        const task=tasks.splice(best.ti,1)[0],f=available.splice(best.fi,1)[0];result[f.id]={kind:task.kind,...(task.ballId===undefined?{}:{ballId:task.ballId})};
      }
      for(const f of available)result[f.id]={kind:income>0?"boulder":"support"};
    }
    return result;
  }
  return {objectives:Objectives,ARENAS,DEFAULTS,VOLLEYBALL_DEFAULTS,volleyball:{tuning:VOLLEYBALL_TUNING,serve:volleyballServe,plan:volleyballPlan},FLOAT_BALL_DEFAULTS,GOLDEN_DEFAULTS,FLIP_DEFAULTS,BOULDER_DEFAULTS,GRAVITY_BOULDER_DEFAULTS,TOTAL_DEFAULTS,CHARGE_DEFAULTS,targetCharge:{...TargetCharge,plan:chargePlan},isBoulderArena,isGoldenArena,isFloatBallArena,isBoulderBall,ballConfig,options,savedOptions,arena,create,clock,goal,step,shot,release,possession,balls,ballRect,relativeBall,circleRect,sweepCircle,exteriorContact,constrain,finish,
    pong:{tuning:PONG_TUNING,defaults:PONG_DEFAULTS,isArena:isPongArena,spawn:pongSpawn,plan:pongPlan,trackTuning:PONG_TRACK_TUNING,track:pongTrack,position:pongTrackPosition,goals:pongTrackGoals,terrain:pongTerrain,point:pongGoalPoint},
    triBall:{spawn:spawnTriBall,crossings:triCrossings},
    openSoccer:{bases:OPEN_SOCCER_BASES,recovery:OPEN_RECOVERY,wrap:wrapOpenX,recover:recoverUpper,quarantined:upperRecovering},
    fieldGoal:{TUNING:FIELD_GOAL_TUNING,plan:fieldGoalPlan,threat:fieldGoalThreat,predict:estimateShotY},
    totalRush:{resolveScore:resolveTotalScore,collide:collideTotalBalls,assign:totalAssignments,balanceChoices:TOTAL_BALANCE_CHOICES,presets:TOTAL_PRESETS,preset:totalPreset,adjust:totalBalanceStep,validation:totalValidation,boulderRate},
    advanceGoals,goalTransforms,goalTerrain,advancePlatforms,setPlatformTargets,platformTransform,platformTerrain,
    boulderControl:{region:boulderRegion,score:scoreBoulder,zones:boulderZones,circleAttackContact,plan:boulderPlan,contact:boulderContact,impact:BOULDER_IMPACT,physics:BOULDER_PHYSICS,impulse:boulderImpulse},
    goldenRush:{hit:hitGolden,projectile:goldenProjectile,plan:ringPlan,tuning:SNITCH},
    targets:{RULES:TARGET_RULES,remaining:remainingTargets,collide:collideTargets,fighterContact:targetFighterContact,recover:recoverTargetBall,plan:targetPlan,threat:threatenedTarget}};
});
