"use strict";
(() => {
  const idle=()=>({hasAim:false,aimX:0,aimY:0,dashHeld:false,punchHeld:false});
  const aim=(x,y,dash=false,punch=false)=>({hasAim:true,aimX:x,aimY:y,dashHeld:dash,punchHeld:punch,downHeld:y>0.6,upHeld:y<-.6});
  const hold=(punch=false,dash=false)=>({...idle(),punchHeld:punch,dashHeld:dash});
  const ground=c=>{c.place(0,480,571);c.place(1,900,571);};
  const air=c=>{c.place(0,480,290,{onGround:false});c.place(1,1000,571);};
  const combo=c=>{
    c.place(0,540,400,{hitstun:.8,comboHits:2,comboGrace:1,escapeWindow:0,onGround:false});
    c.place(1,630,400,{onGround:false,vy:-150});const f=c.fighters[0];f.lastAttacker=c.fighters[1];f.lastHitDir={x:-.4,y:-.9};
  };
  const incoming=(c,which)=>{
    const a=c.fighters[1].attack;
    if(a&&a.age>=a.startup-.06&&!c.memory.defense){c.memory.defense=which;c.memory.at=c.time;}
    const active=c.memory.defense===which&&c.time-c.memory.at<.035;
    const dir=a?c.launch(1):{x:-.4,y:-.9};
    return aim(-dir.x,-dir.y,which==="dash"&&active,which==="punch"&&active);
  };
  const tech=(surface)=>c=>{
    if(surface==="floor")c.place(0,530,460,{vx:100,vy:450});
    if(surface==="wall")c.place(0,248,342,{vx:-600,vy:0});
    if(surface==="ceiling")c.place(0,600,140,{vx:0,vy:-650});
    c.place(1,980,500);Object.assign(c.fighters[0],{onGround:false,hitstun:1,stunType:"knockdown",comboHits:2,comboGrace:1,
      knockdownTimer:1,knockdownImpactPending:true,surfaceBounceSource:"kickoff",lastAttacker:c.fighters[1],knockdownSource:c.fighters[1]});
  };
  const scenes=[
    {id:"welcome",title:"Two commands. A lot of possibilities.",section:"START HERE",seconds:4,
      caption:"ORBIT + SPIKE  /  Aim with a stick or D-pad. Everything else is DASH and PUNCH.",setup:ground,
      inputs:(t)=>[idle(),idle()]},
    {id:"dash",title:"Tap Dash to launch",section:"MOVEMENT",seconds:5,focus:[0],setup:ground,expect:["dash"],
      caption:"Point where you want to go, then tap DASH. Ground dashes are freely cancellable.",
      inputs:t=>[t<.6?idle():aim(t<1.7?1:-1,0,t>.6&&t<.65||t>1.7&&t<1.75),idle()]},
    {id:"charged-dash",title:"Hold for a longer dash",section:"MOVEMENT",seconds:6,focus:[0],setup:ground,expect:["dash"],
      caption:"Hold DASH to build charge. Release to commit. Charge leaves you vulnerable to harder launches.",
      inputs:t=>[t<.4?idle():aim(1,0,t<1.55),idle()]},
    {id:"air-aim",title:"Aim in any direction",section:"MOVEMENT",seconds:6,focus:[0],setup:air,expect:["dash"],
      caption:"Analog aim is a full circle. D-pad diagonals work too; no action requires an analog stick.",
      inputs:t=>[aim(t<.8?1:-1,-.65,t<.05||t>.8&&t<.85),idle()]},
    {id:"steer",title:"Steer, then brake",section:"MOVEMENT",seconds:6,focus:[0],rate:.65,setup:air,expect:["dash"],
      caption:"Keep aiming during an air dash to bend it. Opposite input brakes your momentum.",
      inputs:t=>[aim(t<.25?1:t<.5?.3:-1,t<.25?-.3:t<.5?-1:0,t<.045),idle()]},
    {id:"air-resource",title:"Air dashes are a resource",section:"MOVEMENT",seconds:6,focus:[0],setup:air,expect:["dash"],
      caption:"Orbit has four. Watch the pips: spend them in the air, then land to refill.",
      inputs:t=>[t<1.4?aim(Math.floor(t/.32)%2?-1:1,-.6,t% .32<.04):idle(),idle()]},
    {id:"stall",title:"Air charge is also a brake",section:"MOVEMENT",seconds:7,focus:[0],setup:air,expect:["dash"],
      caption:"Holding DASH stalls airborne motion. At full charge, you drift down slowly. Release to burst away.",
      inputs:t=>[t<.2?idle():aim(1,-.2,t<2.1),idle()]},
    {id:"super-jump",title:"Tippy toes → super jump",section:"MOVEMENT",seconds:7,focus:[0],stage:"High Perch",expect:["dash"],
      caption:"Hold mostly UP while grounded for one second. DASH while still on tippy toes. Charge goes even higher.",
      setup:c=>{c.place(0,540,1007);c.place(1,1000,1007);},
      inputs:t=>[aim(0,-1,t>1.15&&t<2.1),idle()],check:s=>s.flags.superJump},
    {id:"drop",title:"Crouch + Dash drops through",section:"MOVEMENT",seconds:6,focus:[0],stage:"Perch",
      caption:"Hold DOWN, then DASH on a pass-through platform. Solid floors and walls stay solid.",
      setup:c=>{c.seat(0,1,620);c.place(1,1000,571);},
      inputs:t=>[t<.4?idle():aim(0,1,t>1&&t<1.4),idle()],check:s=>s.flags.platformDrop},
    {id:"wall",title:"Cling, refill, sling away",section:"MOVEMENT",seconds:8,focus:[0],rate:.5,freezeAfterCling:true,stage:"High Perch Drift",expect:["wallLaunch"],
      caption:"Dash intentionally into a wall and keep holding toward it. Fresh clings refill air dashes. DASH away to sling.",
      setup:c=>{c.place(0,260,338,{onGround:false,airDashes:1});c.place(1,900,1007);},
      inputs:(t,c)=>{
        const f=c.fighters[0];
        if(f.wallSliding&&!c.memory.launched){c.memory.launched=true;return[{...aim(1,-.6),dashPressed:true,dashReleased:true},idle()];}
        return[c.memory.launched?aim(1,-.6):aim(-1,0,t<.04),idle()];
      },check:s=>s.flags.cling},
    {id:"punch",title:"Tap Punch to strike",section:"OFFENSE",seconds:6,rate:.65,expect:["punchImpact"],
      caption:"Aim, then press and release PUNCH. Strike direction and a character's launch direction are separate.",
      setup:c=>{c.place(0,520,571);c.place(1,615,571);},
      inputs:t=>[t<.3?idle():hold(t<.35),idle()]},
    {id:"charge-punch",title:"Charge, aim, release",section:"OFFENSE",seconds:7,rate:.8,expect:["punchImpact"],
      caption:"Holding PUNCH previews your reach. More charge means longer reach, a longer hitbox, and more hitstun.",
      setup:c=>{c.place(0,500,571);c.place(1,630,571);},
      inputs:t=>[hold(t<1.15),idle()]},
    {id:"whiff",title:"A miss still has a cost",section:"OFFENSE",seconds:6,focus:[0],expect:["punchWhiff"],
      caption:"A missed Punch has recovery. You can start charging again, but the next strike waits for that recovery.",setup:ground,
      inputs:t=>[hold(t<.08||t>.28&&t<1.2),idle()]},
    {id:"active-aim",title:"Steer an active Punch",section:"OFFENSE",seconds:7,focus:[0],rate:.45,setup:ground,expect:["punchSwing"],
      caption:"Keep aiming while the hitbox is active. It turns at a limited rate and still cancels when it connects.",
      inputs:t=>[t<.7?hold(true):aim(Math.cos(-(t-.7)*4),Math.sin(-(t-.7)*4)),idle()]},
    {id:"confirm",title:"Confirm a hit. Keep going.",section:"OFFENSE",seconds:7,rate:.65,focus:[0,1],expect:["punchImpact"],
      caption:"Hits cancel the hitbox and recovery and refill air dashes. Spike also follows the victim's launch for another punch.",
      setup:c=>{c.place(0,610,571);c.place(1,520,571);},
      inputs:(t,c)=>{const d=c.offset(1,0);return[idle(),t<2.8?aim(d.x,d.y,false,t% .26<.12):idle()];},check:s=>s.maxCombo>=2},
    {id:"shield",title:"Your Punch charge is your shield",section:"DEFENSE",seconds:7,
      caption:"Hold PUNCH and aim the barrier at the attack. Shielding is directional: your back is exposed.",
      setup:c=>{c.place(0,520,571);c.place(1,900,571);},
      inputs:t=>[aim(Math.cos(t*2),Math.sin(t*2),false,t<3.5),idle()],check:s=>s.flags.shield},
    {id:"pressure",title:"Blocking costs initiative",section:"DEFENSE",seconds:7,rate:.65,expect:["shieldHit"],
      caption:"A blocked Punch cancels the attack but pins the shield briefly. Aim still works; attacks and escapes must wait.",
      setup:c=>{c.place(0,520,571);c.place(1,645,571);},
      inputs:t=>[hold(t<3),hold(t<.9)],check:s=>s.flags.blockstun},
    {id:"both",title:"Hold both. Release separately.",section:"DEFENSE",seconds:7,focus:[0],setup:air,expect:["dash"],
      caption:"Keep PUNCH held while charging DASH. Release DASH first; release PUNCH later to throw the stored strike.",
      inputs:t=>[aim(1,-.1,t>.4&&t<1.6,t<2.4),idle()]},
    {id:"dodge",title:"Shield + double-tap Down",section:"DEFENSE",seconds:7,focus:[0],rate:.65,setup:ground,
      caption:"Settle into your shield, then double-tap DOWN for a spot dodge. A single DOWN still aims your Punch.",
      inputs:t=>[aim(0,t>.55&&t<.62||t>.72&&t<.8?1:0,false,t<1.6),idle()],check:s=>s.flags.dodge},
    {id:"break",title:"Shields can break",section:"DEFENSE",seconds:7,rate:.65,expect:["shieldBreak"],fixture:true,
      caption:"A depleted shield breaks into a punishable stun. This example starts with a nearly empty shield.",
      setup:c=>{c.place(0,520,571,{shieldHealth:3});c.place(1,645,571);},
      inputs:t=>[hold(true),hold(t<.8)]},
    {id:"exhaust",title:"Do not hold charge forever",section:"DEFENSE",seconds:7,focus:[0],setup:ground,
      caption:"Overholding drains the shield and fizzles the charge into a weak light hit. Fizzling is not a shield-break stun.",
      inputs:t=>[hold(t<5),idle()],check:s=>s.flags.exhaust},
    {id:"clash",title:"Punches can clash",section:"CONTACT",seconds:7,rate:.65,expect:["clash"],
      caption:"Meet an attack with your own hitbox. Both hitboxes cancel, and both fighters build Fired Up reserve.",
      setup:c=>{c.place(0,520,571);c.place(1,640,571);},inputs:t=>[hold(t<.65),hold(t<.65)]},
    {id:"kickoff",title:"Air Dash through for a Kickoff",section:"CONTACT",seconds:7,rate:.65,expect:["dashReboundHit"],
      caption:"An airborne DASH aimed through the opponent can Kickoff: low damage, a big rebound, and one air dash back.",
      setup:c=>{c.place(0,480,380,{onGround:false});c.place(1,610,430,{onGround:false});},
      inputs:t=>[aim(1,.35,t<.04),idle()]},
    {id:"di",title:"Bend your launch with DI",section:"COMBO DEFENSE",seconds:6,focus:[0],rate:.65,fixture:true,
      caption:"While launched, hold a direction to influence your path. Kickoff victims get extra DI and keep their air dashes.",
      setup:c=>{c.place(0,480,300,{onGround:false,vx:650,vy:-400,hitstun:1.5,comboHits:2,comboGrace:2});c.place(1,300,571);c.fighters[0].lastAttacker=c.fighters[1];},
      inputs:t=>[aim(-1,-.15),idle()]},
    {id:"escape",title:"Read the next hit: Dash Escape",section:"COMBO DEFENSE",seconds:7,rate:.45,setup:combo,fixture:true,expect:["dashEscapeSuccess"],
      caption:"During a combo, DASH opposite the incoming launch just BEFORE impact. It spends a resource and restores one air dash.",
      inputs:(t,c)=>[incoming(c,"dash"),hold(t<.12)]},
    {id:"parry",title:"The tighter read: Punch Parry",section:"COMBO DEFENSE",seconds:7,rate:.45,setup:combo,fixture:true,expect:["parrySuccess"],
      caption:"During combo hitstun, press PUNCH to parry the next hit. The tighter read gives a much bigger attacker stun.",
      inputs:(t,c)=>[incoming(c,"punch"),hold(t<.12)]},
    {id:"floor-tech",title:"Dash just before landing: Tech",section:"RECOVERY",seconds:7,focus:[0],rate:.45,setup:tech("floor"),fixture:true,expect:["floorTechRoll","floorTech"],any:true,
      caption:"In a techable launch, aim DOWN and press DASH just before floor contact. Add LEFT or RIGHT to tech roll.",
      inputs:t=>[aim(.8,1,t>.04&&t<.09),idle()]},
    {id:"wall-tech",title:"Tech a wall impact",section:"RECOVERY",seconds:6,focus:[0],stage:"High Perch Drift",rate:.45,setup:tech("wall"),fixture:true,expect:["wallTech"],
      caption:"The same timed DASH can recover off a wall. Punch-launch surface bounces are not techable.",
      inputs:t=>[aim(0,-1,t>.035&&t<.09),idle()]},
    {id:"ceiling-tech",title:"Tech a ceiling impact",section:"RECOVERY",seconds:6,focus:[0],stage:"Vault",rate:.45,setup:tech("ceiling"),fixture:true,expect:["ceilingTech"],
      caption:"Aim UP toward the ceiling and DASH just before contact. A missed tech leaves downtime, so do not spam DASH.",
      inputs:t=>[aim(.8,-.6,t>.035&&t<.09),idle()]},
    {id:"missed-tech",title:"Miss the timing, lose your turn",section:"RECOVERY",seconds:6,focus:[0],rate:.6,setup:tech("floor"),fixture:true,
      caption:"No tech here: Orbit takes the impact and vulnerable recovery. Techs reward timing, not button mashing.",inputs:t=>[idle(),idle()],check:s=>s.flags.techMiss},
    {id:"refill",title:"Land to reset your options",section:"RECOVERY",seconds:6,focus:[0],stage:"Perch",fixture:true,
      caption:"Landing refills air dashes. After a combo, grounded recovery lets spent escape options recharge again.",
      setup:c=>{c.place(0,620,300,{onGround:false,airDashes:0,escapeAvailable:false,punchParryAvailable:false,defenseGroundRefillPending:true,resourceSpentOrder:["dash","punch"]});c.place(1,1000,571);},
      inputs:t=>[idle(),idle()],check:s=>s.flags.landedRefill},
    {id:"fire",title:"Fired Up is temporary health",section:"POWER",seconds:8,fixture:true,
      caption:"Clashes and landed Kickoffs build gold reserve: up to 40 health and +25% damage. Six quiet seconds starts the fade.",
      setup:c=>{ground(c);c.debug.firedUp.build(0,32);},inputs:t=>[idle(),idle()],check:s=>s.flags.heatExpired},
    {id:"spike",title:"Spike: do not Kickoff his shield",section:"CHARACTER SPECIAL",seconds:7,rate:.65,expect:["shieldHit"],
      caption:"Spike's huge directional shield hurts and stuns a Kickoff attacker. His upward punches also carry him into follow-ups.",
      setup:c=>{c.place(0,480,400,{onGround:false});c.place(1,625,450,{onGround:false});},
      inputs:t=>[aim(1,.3,t>.2&&t<.24),hold(true)],check:s=>s.flags.spiked},
    {id:"gravity",title:"Gravity can change the floor",section:"STAGE PLAY",seconds:7,stage:"Crosswire",expect:["punchImpact","clash"],any:true,
      caption:"Punch the switch on gravity stages. Your feet rotate toward gravity; aiming still follows your directional input.",
      setup:c=>{c.place(0,552,360,{onGround:false});c.place(1,850,500);},
      inputs:t=>[hold(t<.06),idle()],check:s=>s.flags.gravityChanged},
    {id:"warp",title:"Use the screen edges",section:"STAGE PLAY",seconds:6,wide:true,setup:c=>{c.place(0,1200,450,{onGround:false});c.place(1,500,571);},expect:["dash"],
      caption:"On open stages, crossing an edge wraps you around. Some stages also wrap top-to-bottom through openings.",
      inputs:t=>[aim(1,0,t<.04),idle()],check:s=>s.flags.warped},
    {id:"finish",title:"Move. Read. Confirm. Repeat.",section:"YOUR TURN",seconds:5,
      caption:"Two commands. Different properties. Start with Orbit, learn Spike's shield, then make the combo your own.",
      setup:ground,inputs:t=>[idle(),idle()]},
  ];
  if(typeof module!=="undefined")module.exports=scenes;
  else window.TUTORIAL_SCENES=scenes;
})();
