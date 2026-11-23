"use strict";
const assert=require('node:assert/strict');
const {createGame}=require('./simulation-harness');
const {debug,rb}=createGame();
function setup(key='gunman',stage='Flat') {
  rb.setup({stageIndex:rb.stageNames.indexOf(stage),characterKeys:[key,'anchor'],seed:42});
  const [a,b]=debug.fighters;
  Object.assign(a,{x:400,y:300});Object.assign(b,{x:580,y:300,invulnerable:0});
  const attack={id:999,age:.1,startup:0,active:10,total:10,recovery:0,charge:.3,dir:{x:1,y:0},hitTargets:new Set(),
    projectile:{x:555,y:300,radius:8,speed:600,spawned:true,damage:10,knockback:500,hitstun:.4}};
  a.projectiles=[attack];return {a,b,attack};
}
const impacts=()=>rb.save().presentation.effects.filter(effect=>effect.sprite);
for(const blocked of [false,true]) {
  const {a,b}=setup();if(blocked)Object.assign(b,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0}});
  debug.updateProjectiles(0);assert.equal(a.projectiles.length,0);assert.equal(impacts().length,1);
  const effect=impacts()[0];assert.equal(effect.maxLife,.35);assert(effect.sprite.src.includes('Basic_Impact'));
  const snapshot=rb.save(),hash=rb.hash();debug.presentationEffects.step(.1);
  assert.equal(impacts()[0].x,effect.x);assert.equal(impacts()[0].y,effect.y);
  assert.equal(rb.hash(),hash,'impact visuals changed core state');
  rb.restore(snapshot);assert.equal(impacts().length,1);debug.presentationEffects.step(.36);assert.equal(impacts().length,0);
}
{
  const {a,attack}=setup();attack.projectile.x=300;attack.projectile.y=600;
  debug.updateProjectiles(0);assert.equal(a.projectiles.length,0);assert.equal(impacts().length,1,'terrain must burst');
}
{
  const {a,attack}=setup('gunman','Flip Chamber');Object.assign(attack.projectile,{x:640,y:360});
  debug.updateProjectiles(0);assert.equal(a.projectiles.length,0);assert.equal(impacts().length,1,'switch must burst');
}
{
  const {a,b,attack}=setup();Object.assign(b,{hitstun:.7,comboHits:2,comboGrace:1,lastAttacker:a,hitstunParryActive:.1,hitstunParryMissPending:true});
  debug.updateProjectiles(0);assert.equal(a.projectiles.length,1);assert.equal(attack.reflectedOwnerId,b.id);
  assert.equal(impacts().length,0,'reflected spells must survive, not explode');
}
{
  setup('goodergunman');debug.updateProjectiles(0);assert.equal(impacts().length,0,'experimental bullets changed');
}
{
  debug.ai.configure({characters:['gunman','anchor','orbit'],teams:[0,1,2],positions:[{x:400,y:300},{x:580,y:300},{x:580,y:330}]});
  const [a,b,c]=debug.fighters,hp=c.health;
  a.projectiles=[{id:1,age:.1,startup:0,active:10,total:10,charge:1,dir:{x:1,y:0},hitTargets:new Set(),projectile:{x:555,y:300,radius:8,speed:600,spawned:true,damage:10,knockback:500,hitstun:.4}}];
  const before=b.health;debug.updateProjectiles(0);assert(b.health<before);assert.equal(c.health,hp,'cosmetic explosion did splash damage');
}
console.log('Spell impacts: hit/shield/terrain/switch burst, stationary lifetime, rollback, no splash damage, reflection retained, Gooder unchanged passed.');
