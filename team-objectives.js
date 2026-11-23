"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashTeamObjectives=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const STICKY_DEFAULTS=Object.freeze({duration:300,winningScore:33,retentionWindow:.8});
  const STICKY_TUNING=Object.freeze({width:4480,height:1600,floorY:1440,endWidth:350,pickupDelay:.35,
    touchdownPoints:6,fieldGoalPoints:3,platformY:1100,platformWidth:320,platformCount:3,platformYardLine:.3,
    crossbarHeightInChungus:3.4,uprightWidth:224,uprightHeight:264,postThickness:16,
    walk:.5,groundDash:.55,airDash:.55,airDistance:.6,retentionBase:18,retentionHealth:60,damagePressure:1,knockbackPressure:.02});
  const isSticky=id=>id==="sticky-ball"||id==="sticky-ball-flip";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function stickyArena(id,chungusHeight=154){
    const t=STICKY_TUNING,flip=id==="sticky-ball-flip",w=t.width,h=t.height,f=t.floorY;
    const bar=f-Math.ceil(chungusHeight*t.crossbarHeightInChungus/2)*2,goals=[],goalFrames=[];
    for(const team of[0,1]){
      const line=team?w-t.endWidth:t.endWidth,left=line-t.uprightWidth/2,right=line+t.uprightWidth/2,postTop=bar-t.uprightHeight;
      goals.push({team,kind:"field",line,top:24,bottom:bar,postTop,left:left+t.postThickness,right:right-t.postThickness});
      goalFrames.push({x:left,y:postTop,w:t.postThickness,h:t.uprightHeight,fieldGoalPart:"post"},
        {x:right-t.postThickness,y:postTop,w:t.postThickness,h:t.uprightHeight,fieldGoalPart:"post"},
        {x:left,y:bar,w:t.uprightWidth,h:t.postThickness,fieldGoalPart:"bar"},
        {x:line-t.postThickness/2,y:bar+t.postThickness,w:t.postThickness,h:f-bar-t.postThickness,fieldGoalPart:"support"});
    }
    const rowLeft=t.endWidth+(w-2*t.endWidth)*t.platformYardLine,rowRight=w-rowLeft;
    return {name:flip?"Sticky Ball - Gravity Flip":"Sticky Ball - Standard",dashballArena:id,stickyBall:true,leftTeam:0,width:w,height:h,floorY:f,
      wrap:false,verticalWrap:false,hole:null,fixedCamera:true,cameraZoom:.26,cameraHeader:160,backgroundColor:"#243737",
      teamSpawnLanes:{left:[600,1500],crowded:[500,1600]},endZones:[{team:0,left:24,right:t.endWidth},{team:1,left:w-t.endWidth,right:w-24}],goals,goalFrames,ballOnly:[],
      terrain:[{x:0,y:f,w,h:h-f,kind:"floor"},{x:0,y:0,w:24,h,kind:"wall"},{x:w-24,y:0,w:24,h,kind:"wall"},{x:0,y:0,w,h:24,kind:"wall"},
        ...Array.from({length:t.platformCount},(_,i)=>({x:rowLeft+i*(rowRight-rowLeft-t.platformWidth)/(t.platformCount-1),y:t.platformY,w:t.platformWidth,h:24,kind:"oneway"}))],
      ...(flip?{gravitySoccer:true,gravitySwitch:{x:w/2,y:690,radius:32,noCooldown:true}}:{})};
  }
  function stickyCreate(){return {pressure:[],pickupUntil:{},fumbles:0,pickups:0,carrierSince:0};}
  function live(f){return f&&f.health>0&&!f.koScored&&!f.koCorpseGone;}
  function carrier(state,world){return (world.carriers||world.fighters).find(f=>f.id===state.ball.carrier);}
  function attach(state,f,world){
    const s=state.sticky,b=state.ball;if(!s||b.carrier||!live(f)||state.phase!=="playing"||state.time<(s.pickupUntil[f.id]||0))return false;
    b.carrier=f.id;b.pendingLaunch=null;b.ownerId=f.id;b.ownerTeam=f.team;b.launched=0;b.entry=-1;s.pressure=[];s.carrierSince=state.time;s.pickups++;
    world.onCarrierChange?.(f,true);follow(state,world);return true;
  }
  function follow(state,world){
    const b=state.ball;if(!b.carrier)return false;const f=carrier(state,world);
    if(!live(f)){drop(state,world,{x:0,y:-1},220,"inactive");return false;}
    const gravity=world.gravity||{x:0,y:1},face=f.face||{x:f.team?-1:1,y:0};
    b.x=f.x+face.x*(f.data.width*.45+b.r*.35)-gravity.x*f.data.height*.1;
    b.y=f.y+face.y*(f.data.height*.3)-gravity.y*f.data.height*.1;b.prevX=b.x;b.prevY=b.y;b.vx=f.vx;b.vy=f.vy;
    b.entry=-1;return true;
  }
  function drop(state,world,dir={x:0,y:-1},strength=220,reason="hit"){
    const b=state.ball,s=state.sticky;if(!s||!b.carrier)return false;const id=b.carrier,f=carrier(state,world),size=Math.hypot(dir.x,dir.y)||1;
    const normal={x:dir.x/size,y:dir.y/size},force=clamp(strength,180,1250);
    if(f){b.x=f.x+normal.x*(f.data.width/2+b.r+3);b.y=f.y+normal.y*(f.data.height/2+b.r+3);}
    b.x=clamp(b.x,24+b.r,world.stage.width-24-b.r);b.y=clamp(b.y,24+b.r,world.stage.floorY-b.r);
    b.prevX=b.x;b.prevY=b.y;b.vx=(f?.vx||0)*.25+normal.x*force;b.vy=(f?.vy||0)*.25+normal.y*force;
    b.carrier=null;b.pendingLaunch=null;b.entry=-1;s.pressure=[];s.pickupUntil[id]=state.time+STICKY_TUNING.pickupDelay;s.fumbles++;
    if(f)world.onCarrierChange?.(f,false);world.onFumble?.(f,reason);return true;
  }
  function hitCarrier(state,f,hit,world){
    if(!state.sticky||state.ball.carrier!==f.id||state.phase!=="playing")return false;
    if(!live(f))return drop(state,world,hit.dir,hit.knockback,"ko");
    const s=state.sticky,window=state.config.retentionWindow??STICKY_DEFAULTS.retentionWindow;
    s.pressure=s.pressure.filter(e=>e.time>=state.time-window);
    if(s.pressure.some(e=>e.id===hit.id))return false;
    s.pressure.push({id:hit.id,time:state.time,force:Math.max(0,hit.damage)*STICKY_TUNING.damagePressure+Math.max(0,hit.knockback)*STICKY_TUNING.knockbackPressure});
    const threshold=STICKY_TUNING.retentionBase+STICKY_TUNING.retentionHealth*clamp(f.health/(world.maxHealth?.(f)||f.data.maxHealth),0,1);
    return s.pressure.reduce((sum,e)=>sum+e.force,0)>=threshold?drop(state,world,hit.dir,hit.knockback,"pressure"):false;
  }
  function touchdown(state,world,goal){
    if(!state.sticky||state.phase!=="playing"||!state.ball.carrier)return false;const f=carrier(state,world);
    if(!live(f)){drop(state,world,{x:0,y:-1},220,"ko");return false;}
    if(world.canInteract?.(f)===false)return false;
    const end=world.stage.endZones.find(z=>z.team!==f.team);if(!end||f.x<end.left||f.x>end.right)return false;
    if(!goal(state,end.team,world,true))return false;
    state.ball.carrier=null;state.sticky.pressure=[];world.onCarrierChange?.(f,false);return true;
  }
  const TRI_DEFAULTS=Object.freeze({duration:300,winningScore:33,winningScoreCustom:false,ruleset:"battle",timedSpawn:90,scoreSpawn:3,startingBalls:1,maxBalls:0,basketPoints:5,soccerPoints:3,fieldPoints:1,
    ballRadius:16,ballMass:1,gravity:900,bounce:.84,groundFriction:.95,maxSpeed:2050});
  const TRI_CHOICES=Object.freeze({duration:Array.from({length:19},(_,i)=>60+i*30),winningScore:[0,...Array.from({length:91},(_,i)=>10+i)],
    timedSpawn:[0,30,60,90,120,150,180],scoreSpawn:[0,3,6,9,12,15],startingBalls:[1,2,3,4,5],maxBalls:[0,5,10,15,20],
    basketPoints:[1,2,3,4,5,6,7,8,9,10],soccerPoints:[1,2,3,4,5,6,7,8,9,10],fieldPoints:[1,2,3,4,5,6,7,8,9,10]});
  const isTri=id=>id==="tri-ball"||id==="tri-ball-wrap";
  function triOptions(input={}){
    const c={...TRI_DEFAULTS};for(const[key,values]of Object.entries(TRI_CHOICES)){
      const n=Number(input[key]);if(Number.isFinite(n))c[key]=values.reduce((best,value)=>Math.abs(value-n)<Math.abs(best-n)?value:best,values[0]);
    }
    c.ruleset=input.ruleset==="court"?"court":"battle";
    c.triSingleBall=c.startingBalls===1&&c.timedSpawn===0&&c.scoreSpawn===0;
    c.winningScoreCustom=typeof input.winningScoreCustom==="boolean"?input.winningScoreCustom:
      input.winningScore!==undefined&&Number(input.winningScore)!==(input.triSingleBall?10:33);
    if(!c.winningScoreCustom)c.winningScore=c.triSingleBall?10:33;
    if(c.triSingleBall){c.ballRadius*=1.15;c.ballMass=1.5;c.groundFriction*=.8;}
    return c;
  }
  function triAdjust(config,key,direction){
    const c=triOptions(config),values=TRI_CHOICES[key];if(!values)return c;
    const value=values[clamp(values.indexOf(c[key])+Math.sign(direction),0,values.length-1)];
    return triOptions({...c,[key]:value,...(key==="winningScore"?{winningScoreCustom:true}:{})});
  }
  function triArena(id,chungusHeight){
    const width=4480,height=1800,floorY=1640,wrap=id==="tri-ball-wrap",terrain=[{x:0,y:floorY,w:width,h:wrap?24:height-floorY,kind:wrap?"oneway":"floor",triFloor:true},
      {x:0,y:0,w:24,h:height,kind:"wall"},{x:width-24,y:0,w:24,h:height,kind:"wall"}],goals=[],frames=[];
    for(const team of[0,1]){
      const soccer={team,kind:"soccer",line:team?width-192:192,top:floorY-430,bottom:floorY,depth:168};goals.push(soccer);
      terrain.push({x:team?width-212:24,y:soccer.top-24,w:188,h:24,kind:"platform",goalTeam:team});
      const basket={team,kind:"basket",left:team?width-320:112,right:team?width-112:320,top:780,bottom:950};goals.push(basket);
      for(const x of[basket.left-18,basket.right])terrain.push({x,y:basket.top,w:18,h:170,kind:"wall",goalTeam:team});
      terrain.push({x:basket.left-18,y:basket.bottom,w:244,h:18,kind:"platform",goalTeam:team});
      const line=team?width-340:340,bar=560,field={team,kind:"field",line,top:0,bottom:bar,postTop:280};goals.push(field);
      frames.push({x:line-112,y:280,w:16,h:280,fieldGoalPart:"post"},{x:line+96,y:280,w:16,h:280,fieldGoalPart:"post"},
        {x:line-112,y:bar,w:224,h:16,fieldGoalPart:"crossbar"},{x:line-8,y:bar+16,w:16,h:64,fieldGoalPart:"support"});
      terrain.push({x:team?width-650:490,y:600,w:160,h:24,kind:"oneway",fieldGoalPerch:team});
    }
    const high=chungusHeight*1.18,low=1160;
    terrain.push({x:width/2-280,y:(high+low)/2,w:560,h:24,kind:"oneway",dashballMover:true,triMover:true,
      move:{axis:"y",amplitude:(low-high)/2,speed:Math.PI*2/14,phase:Math.PI/2}});
    return {name:wrap?"Ball Hell: Wraparound":"Ball Hell",dashballArena:id,triBall:true,triWrap:wrap,leftTeam:0,width,height,floorY,wrap:false,verticalWrap:wrap,
      hole:null,cameraOpenTop:true,fixedCamera:true,cameraZoom:.26,cameraHeader:160,backgroundColor:"#243238",
      teamSpawnLanes:{left:[600,1450],crowded:[500,1600]},terrain,goals,goalFrames:frames,ballOnly:[]};
  }
  function triCreate(config){return {serial:0,nextTimed:config.timedSpawn,scoreThreshold:0,pending:[0,0],events:[],eventSerial:0,maxObserved:0,suppressed:0};}
  function triAward(state,team,kind,ball,world,recycle){
    if(!state.tri||state.phase!=="playing"||ball.resetFrame===state.time)return false;
    const points=state.config[{basket:"basketPoints",soccer:"soccerPoints",field:"fieldPoints"}[kind]];
    state.tri.pending[team]+=points;state.tri.events.push({serial:++state.tri.eventSerial,team,kind,points,x:ball.x,y:ball.y,life:.9});
    if(state.tri.events.length>24)state.tri.events.shift();world.onTriScore?.({team,kind,points,x:ball.x,y:ball.y});recycle(ball);return true;
  }
  function triResolve(state,dt,spawn,finish){
    const t=state.tri;if(!t||state.phase!=="playing")return;
    for(const team of[0,1]){state.scores[team]+=t.pending[team];t.pending[team]=0;}
    if(state.config.scoreSpawn){const threshold=Math.floor((state.scores[0]+state.scores[1])/state.config.scoreSpawn),count=threshold-t.scoreThreshold;t.scoreThreshold=threshold;for(let i=0;i<count;i++)spawn();}
    if(state.config.timedSpawn)while(t.nextTimed<=state.time+1e-8){spawn();t.nextTimed+=state.config.timedSpawn;}
    for(const e of t.events)e.life=Math.max(0,e.life-dt);
    if(state.overtime||state.config.winningScore>0&&Math.max(...state.scores)>=state.config.winningScore){
      if(state.scores[0]!==state.scores[1])finish(state,state.scores[0]>state.scores[1]?0:1);
      else {state.overtime=true;state.announcement="SUDDEN DEATH";}
    }
  }
  function wrapVertical(object,stage,previous){
    if(!stage.triWrap)return false;const old=object.y;object.y=((object.y%stage.height)+stage.height)%stage.height;const shift=object.y-old;
    if(Math.abs(shift)<1e-8)return false;
    if(object.prevY!==undefined)object.prevY+=shift;if(previous)previous.y+=shift;
    if("entry" in object)object.entry=-1;return true;
  }
  function verticalPaths(previous,end,height){
    const dy=end.y-previous.y,paths=[];let start={x:previous.x,y:((previous.y%height)+height)%height},remaining={x:end.x-previous.x,y:dy};
    for(let i=0;i<8;i++){
      const target={x:start.x+remaining.x,y:start.y+remaining.y};if(target.y>=0&&target.y<height){paths.push({x1:start.x,y1:start.y,x2:target.x,y2:target.y});break;}
      const edge=remaining.y<0?0:height,t=(edge-start.y)/remaining.y,x=start.x+remaining.x*t;
      paths.push({x1:start.x,y1:start.y,x2:x,y2:edge});start={x,y:edge===0?height:0};remaining={x:remaining.x*(1-t),y:remaining.y*(1-t)};
    }
    return paths;
  }
  return {isSticky,STICKY_DEFAULTS,STICKY_TUNING,stickyArena,stickyCreate,attach,follow,drop,hitCarrier,touchdown,live,
    isTri,TRI_DEFAULTS,TRI_CHOICES,triOptions,triAdjust,triArena,triCreate,triAward,triResolve,wrapVertical,verticalPaths};
});
