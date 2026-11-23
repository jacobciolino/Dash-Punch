"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashLobbyCards=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const REPEAT=.18;
  const MENU_BACK_HOLD_SECONDS=1.6;
  function createBackHolds(){
    const states=new Map();let context=null;
    function cancel(){for(const state of states.values()){state.since=null;state.latched=state.down;}}
    function sample(inputs,now,screen,blocked=false){
      if(screen!==context){cancel();context=screen;}
      const present=new Set(inputs.map(input=>input.key));
      for(const key of states.keys())if(!present.has(key))states.delete(key);
      let complete=false,progress=0;
      for(const input of inputs){
        const state=states.get(input.key)||{down:input.down,latched:input.down,since:null};
        if(!input.down){state.since=null;state.latched=false;}
        else if(blocked){state.since=null;state.latched=true;}
        else if(!state.latched){
          if(state.since===null)state.since=now;
          const value=Math.max(0,(now-state.since)/(MENU_BACK_HOLD_SECONDS*1000));
          progress=Math.max(progress,Math.min(1,value));if(value>=1)complete=true;
        }
        state.down=input.down;states.set(input.key,state);
      }
      // One shared transition; every held source must release before another.
      if(complete)cancel();
      return {complete,progress};
    }
    return {sample,cancel,get size(){return states.size;}};
  }
  function create(character){return {open:false,view:"browse",cursor:character,focus:"fighter",editFocus:"ready"};}
  function open(card,character,ready){card.open=true;if(ready){card.view="ready";card.focus="unready";}else if(card.view==="ready"){card.view="review";card.focus=card.editFocus;}else if(card.view!=="browse")card.cursor=character;return card;}
  function close(card){card.open=false;}
  function fields(card,teams){return card.view==="ready"?["unready","addCpu","settings","lobby","leave"]:card.view==="browse"?["fighter","confirm","close","leave"]:[...(teams?["team"]:[]),"costume","ready","back","addCpu","settings","lobby","leave"];}
  function navigate(card,x,y,roster,teams,columns=0){
    const options=fields(card,teams);if(!options.includes(card.focus))card.focus=options[0];
    if(x&&card.view==="browse"&&card.focus==="fighter"){
      const i=Math.max(0,roster.indexOf(card.cursor));card.cursor=roster[(i+x+roster.length)%roster.length];return null;
    }
    if(y&&columns&&card.view==="browse"&&card.focus==="fighter"){
      const next=Math.max(0,roster.indexOf(card.cursor))+y*columns;
      if(next>=0&&next<roster.length){card.cursor=roster[next];return null;}
    }
    if(x&&card.view==="review"&&["team","costume"].includes(card.focus))return {command:card.focus,delta:x};
    const delta=y||x;card.focus=options[(options.indexOf(card.focus)+delta+options.length)%options.length];return null;
  }
  function back(card){if(card.view==="review"){card.view="browse";card.focus="fighter";}}
  function sample(input,previous,dt,blocked=false){
    const old=previous||{start:false,select:false,confirm:false,back:false,x:0,y:0,cooldown:0};
    let cooldown=Math.max(0,old.cooldown-dt),intent=null;
    if(input.select&&!old.select)intent={type:"close"};
    else if(input.start&&!old.start)intent={type:"open"};
    else if(!blocked){
      if(input.back&&!old.back)intent={type:"back"};
      else if(input.confirm&&!old.confirm)intent={type:"confirm"};
      else if((input.x||input.y)&&(input.x!==old.x||input.y!==old.y||cooldown<=0)){intent={type:"move",x:input.x,y:input.y};cooldown=REPEAT;}
    }
    if(!input.x&&!input.y)cooldown=0;
    if(blocked)cooldown=REPEAT;
    return {state:{...input,cooldown},intent};
  }
  return {REPEAT,MENU_BACK_HOLD_SECONDS,createBackHolds,create,open,close,fields,navigate,back,sample};
});
