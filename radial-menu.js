"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashRadialMenu=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const DEADZONE=.38,TAU=Math.PI*2;
  function angle(index,count){return -Math.PI/2+index*TAU/count;}
  function sector(x,y,count,previous=0){
    if(!count||Math.hypot(x,y)<DEADZONE)return previous;
    return ((Math.round((Math.atan2(y,x)+Math.PI/2)/TAU*count)%count)+count)%count;
  }
  function begin(target,now,{x=1,y=0,repeat=false,screen=false}={}){
    const length=Math.hypot(x,y)||1;
    return {target,startedAt:now,x:x/length,y:y/length,repeat,screen,impacted:false,committed:false};
  }
  function sample(state,now){
    const age=Math.max(0,(now-state.startedAt)/1000),impact=.095,commit=state.screen ? .25 : state.repeat ? .14 : .21;
    const duration=state.screen ? .38 : state.repeat ? .18 : .25;
    const reach=Math.min(1,age/impact),recoil=Math.max(0,1-(age-impact)/.12);
    return {age,reach,recoil:age<impact?0:recoil,flight:state.repeat?0:Math.min(1,Math.max(0,(age-.135)/(commit-.135))),impact:age>=impact,commit:age>=commit,done:age>=duration,
      cover:state.screen?age<commit?Math.min(1,Math.max(0,(age-.13)/.11)):Math.max(0,1-(age-commit)/.13):0};
  }
  // Fresh aim beats a held repeat. Conflicting simultaneous aims cancel rather
  // than granting a privileged controller the shared cursor.
  function arbitrate(inputs,previous){
    const candidates=inputs.filter(input=>input.sector!==null&&input.sector!==undefined);
    const fresh=candidates.filter(input=>input.sector!==previous.get(input.key));
    for(const input of inputs)previous.set(input.key,input.sector);
    const connected=new Set(inputs.map(input=>input.key));
    for(const key of previous.keys())if(!connected.has(key))previous.delete(key);
    const choices=fresh.length?fresh:[];
    return choices.length&&choices.every(input=>input.sector===choices[0].sector)?choices[0].sector:null;
  }
  return {DEADZONE,angle,sector,begin,sample,arbitrate};
});
