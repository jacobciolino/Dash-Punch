"use strict";
(function(root,factory){const api=factory(typeof module!=="undefined"&&module.exports?require("./dashball"):root.Dashball,typeof module!=="undefined"&&module.exports?require("./sandbag"):root.DashSandbag);if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashSportsGuide=api;})(typeof globalThis!=="undefined"?globalThis:this,(D,S)=>{
  const clock=n=>n?`${Math.floor(n/60)}:${String(n%60).padStart(2,"0")} rounds`:"No time limit";
  function dashballConfig(config,id){
    const preset=arena=>D.pong.isArena(arena)?{...D.DEFAULTS,...D.pong.defaults}:D.objectives.isTri(arena)?{...D.DEFAULTS,...D.objectives.TRI_DEFAULTS}:D.objectives.isSticky(arena)?{...D.DEFAULTS,...D.objectives.STICKY_DEFAULTS}:arena==="volleyball"?{...D.DEFAULTS,...D.VOLLEYBALL_DEFAULTS}:D.targetCharge.isArena(arena)?D.CHARGE_DEFAULTS:arena==="target-break"?{...D.DEFAULTS,...D.FLOAT_BALL_DEFAULTS}:arena==="total-rush"?D.TOTAL_DEFAULTS:D.isGoldenArena(arena)?D.GOLDEN_DEFAULTS:arena==="gravity-boulder"?D.GRAVITY_BOULDER_DEFAULTS:arena==="boulder-control"?D.BOULDER_DEFAULTS:null;
    const sameCharge=D.targetCharge.isArena(id)&&D.targetCharge.isArena(config.arena);
    const sameFamily=sameCharge||D.pong.isArena(id)&&D.pong.isArena(config.arena)||D.objectives.isTri(id)&&D.objectives.isTri(config.arena)||D.objectives.isSticky(id)&&D.objectives.isSticky(config.arena);
    const defaults=id!==config.arena&&!sameFamily?preset(id)||(preset(config.arena)?D.DEFAULTS:{}):{};
    return D.options({...config,...defaults,duration:(D.pong.isArena(id)||D.objectives.isSticky(id))&&id!==config.arena&&!sameFamily?300:config.duration,teamSize:config.teamSize,arena:id});
  }
  function describe(stage,c){
    const battle=c.ruleset!=="court",limit=`First to ${c.winningScore}`,time=clock(c.duration),rules=battle?"Battle":"Court";
    let family="Soccer",objective="Send the ball into the opposing goal.",twist=battle?"Fight for possession; knockouts create chances, not points.":"Stay on your half and strike the ball; player combat is off.",scoring=`1 per goal · ${limit} · ${time}`;
    switch(stage.dashballArena){
      case "dash-pong":case "dash-pong-track":
        family="Dash Pong";objective="Volley the gravity-free ball into the enemy wall goal.";
        twist="Pong meets platform fighting! Each hit speeds up the rally; goals never stop combat.";
        if(stage.pongTrack){objective="Volley the gravity-free ball into the enemy's moving goal.";twist="Mirrored goals slide along floor, wall and ceiling on a slow 72-second track. Fighters keep solid footing.";}
        scoring=`1 per goal · ${limit} or most in ${Math.floor(c.duration/60)}:${String(c.duration%60).padStart(2,"0")} · Best of three · Battle`;break;
      case "tri-ball":case "tri-ball-wrap":
        family="Ball Hell";objective="Score through soccer goals, baskets and uprights on the opposing side.";
        twist=stage.triWrap?"Drop through the floor to wrap above the field. Every ball stays in continuous play.":"Ride the giant lift; extra balls arrive on a timer and at combined-score milestones.";
        scoring=`Basket ${c.basketPoints} / Soccer ${c.soccerPoints} / Field ${c.fieldPoints} · ${c.winningScore?limit:"No score limit"} · ${time}`;break;
      case "sticky-ball":case "sticky-ball-flip":
        family="Sticky Ball";objective="Carry into the enemy end zone or kick the loose ball above their crossbar.";
        twist=stage.gravitySoccer?"Hit the switch to flip gravity. Low-health carriers fumble more easily.":"Touch to collect; protect your slowed carrier and combine hits to force fumbles.";
        scoring=`Touchdown 6 / Field goal 3 · ${limit} or highest at ${Math.floor(c.duration/60)}:${String(c.duration%60).padStart(2,"0")} · Battle only`;break;
      case "volleyball":
        family="Volleyball";objective="Keep the ball off your floor and send it over the net.";
        twist=battle?"Volleyball, but you can beat up the other team. Both teams stay on their own half.":"Pure volleyball chaos: defend your half, pass and strike together. No player damage.";
        scoring=`Opponent floor = 1 point · Alternating serves · ${limit} · ${time}`;break;
      case "standard-wide":twist="A closed field with 1.75x the width: more room for passing and long approaches.";break;
      case "standard-open":twist="Loop through the sides and loft shots above the open arena.";break;
      case "gravity-soccer":case "gravity-soccer-open":
        family="Gravity Flip Soccer";twist=stage.openSoccer?"Flip gravity and chase moving goals, with open skies and wrapping sides.":"Hit the central switch to reverse gravity and move both live goals.";break;
      case "elevated":case "elevated-open":
        family="Basketball";objective="Drop the ball into the opposing basket from above.";
        twist=stage.cameraOpenTop?"Wrap around the sides and use open air to find a new shooting angle.":"Ride the rising center platform; fighters cannot stand inside the baskets.";
        scoring=`1 per basket · ${limit} · ${time}`;break;
      case "field-goal":case "field-goal-wide":
        family="Field Goal";objective="Fire the ball past the opponent's uprights above the crossbar.";
        twist=stage.wideArena?"Play on a 1.75x-wider closed field; goals keep play moving with a fresh top drop.":"Play never stops after a goal; a fresh ball drops from above.";scoring=`1 per crossing · Most goals at ${Math.floor(c.duration/60)}:${String(c.duration%60).padStart(2,"0")} · Keeper perches`;break;
      case "target-break":
        family="Target Break";objective="Break all six targets on the opponent's wall with the ball.";
        twist="Hard impacts shatter targets; soft shots bounce back into play.";scoring=`6 targets to break · ${time} · Tied overtime: next target`;break;
      case "golden-rush":
        family="Golden Rush";objective="Score through enemy hoops and defeat the flying golden target.";
        twist="Wrap between platforms, launch the snitch, and chain follow-up hits.";scoring=`Hoops 1 / 3 / 5 · Golden target ${c.goldenReward} · ${limit}`;break;
      case "gravity-golden-rush":
        family="Golden Rush";objective="Score through enemy hoops and defeat the flying golden target.";
        twist="Hit the four-way switch; land and walk on the floor, ceiling or either wall.";
        scoring=`Hoops 1 / 3 / 5 · Golden target ${c.goldenReward} · ${limit}`;break;
      case "boulder-control":
        family="Boulder Control";objective="Keep the giant boulder inside your own colored scoring zone.";
        twist="Ride and juggle it for bonus income; overshoots wrap through dead zones.";scoring=`Own zone 1 pt/sec · Above platform 2 pt/sec · ${limit}`;break;
      case "gravity-boulder":
        family="Boulder Control";objective="Keep the boulder inside your team's moving scoring window.";
        twist="Hit the switch to move scoring windows and platforms between floor and ceiling.";scoring=`Window 1 pt/sec · Bonus side 2 pt/sec · ${limit}`;break;
      case "total-rush":
        family="Total Rush";objective="Combine boulder control, hoop shots and snitch hits on one scoreboard.";
        twist=`${c.ballCount} small balls collide with one heavy boulder while both teams fight for control.`;
        scoring=`Boulder ${c.boulderTerritoryRate} / ${c.boulderBonusRate} per sec · Hoops ${c.middleRingPoints} / ${c.highRingPoints} · Golden ${c.goldenReward} · ${limit}`;break;
      default:
        if(stage.targetCharge){
          family="Target Charge";objective="Strike your permanently team-colored ball into the shared target.";
          twist={stationary:"Either team can hit either ball; harder target impacts earn more charge.",vertical:"Time shots for the target's vertical sweep; its motion changes impact strength.",roaming:"Lead the roaming target; rebounds and opponent assists still count for the ball's team."}[stage.targetCharge];
          scoring=`First to ${c.winningScore}% charge · Harder impacts earn more · ${time}`;
        }
    }
    return {name:stage.name,mode:`Dashball · ${family}`,rules,objective,twist,scoring};
  }
  function sandbagDescription(c){
    const name=S.RULESETS.find(r=>r.id===c.ruleset).name;
    return {name,mode:"Sandbag Showdown",rules:c.ruleset==="race"?"Race":"Battle",
      objective:"Deal more sandbag damage than the other team before time runs out.",
      twist:{race:"Stay on your own half; your team's heavy bag still bounces and moves.",brawl:"Roam and fight, but only hits on your own team's bag earn points.",scramble:"Fight over one shared bag; every hit adds damage to the hitter's team."}[c.ruleset],
      scoring:`Damage = points · ${clock(c.duration)} · First to 2 round wins`};
  }
  function scene(type,config,chungusHeight=154){
    const sandbag=type==="sandbag",c=sandbag?S.options(config):D.options(config),stage=sandbag?S.arena(c.ruleset==="scramble"):D.arena(c.arena,chungusHeight,c);
    const state=sandbag?S.create(c,stage):D.create(c,stage);
    return {type,stage,state,guide:sandbag?sandbagDescription(c):describe(stage,c),key:JSON.stringify([type,stage,c])};
  }
  function terrain(scene,rect){
    if(rect.gravityPlatform!==undefined&&scene.state.movingPlatforms)return D.platformTerrain(scene.state,scene.stage,rect);
    if(rect.flipGoalTeam!==undefined&&scene.state.movingGoals)return D.goalTerrain(scene.state,scene.stage,rect);
    if(!rect.move)return rect;
    const offset=Math.sin(rect.move.phase||0)*rect.move.amplitude;
    return {...rect,[rect.move.axis]:rect[rect.move.axis]+offset};
  }
  function createCache(makeCanvas,paint,max=20){
    const entries=new Map();let renders=0;
    return {get(scene,cacheable=true){
      if(entries.has(scene.key)){const image=entries.get(scene.key);entries.delete(scene.key);entries.set(scene.key,image);return image;}
      const image=makeCanvas();image.width=640;image.height=360;const ctx=image.getContext("2d"),stage=scene.stage;
      ctx.imageSmoothingEnabled=false;ctx.fillStyle="#151e24";ctx.fillRect(0,0,640,360);
      const scale=Math.min(616/stage.width,336/stage.height),x=Math.round((640-stage.width*scale)/2),y=Math.round((360-stage.height*scale)/2);
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=scene.type==="sandbag"?"#292f39":"#222c32";ctx.fillRect(0,0,stage.width,stage.height);
      paint(ctx,scene,scale);ctx.restore();renders++;
      if(cacheable){entries.set(scene.key,image);if(entries.size>max)entries.delete(entries.keys().next().value);}return image;
    },clear(){entries.clear();},get stats(){return {entries:entries.size,renders,maximum:max,maximumBytes:max*640*360*4};}};
  }
  return {dashballConfig,describe,sandbagDescription,scene,terrain,createCache};
});
