"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {buildCoreRelease}=require("../tools/build-core-release.cjs"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const root=process.env.CORE_RELEASE_DIR||path.join(fs.mkdtempSync(path.join(os.tmpdir(),"dash-core-unit-")),"Dash-Punch-Core");
if(!process.env.CORE_RELEASE_DIR)buildCoreRelease(root);
const manifest=JSON.parse(fs.readFileSync(path.join(root,"build-manifest.json"),"utf8"));
const full=createGame(),core=createGame(root),clone=value=>JSON.parse(JSON.stringify(value));
assert.deepEqual(manifest.fighters,["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"]);
assert.equal(manifest.stages.length,12);assert(manifest.stages.includes("Whirlwell"));
assert(manifest.embeddedAssets.some(a=>a.file==="assets/boomerangus/boomerang-spin.png"),"Offline pixel processing requires the embedded weapon sheet");
assert.deepEqual(clone(core.rb.characterKeys),manifest.fighters);assert.deepEqual(clone(core.rb.stageNames),manifest.stageOrder||[...manifest.stages,...manifest.dashballArenas||[],...manifest.sandbagArenas||[]]);
assert(!core.elements.get("menuLayer").innerHTML.includes("experimental-toggle"));
assert(!core.elements.get("menuLayer").innerHTML.includes('data-menu-action="goExtras"'));
for(const key of manifest.fighters) {
  for(const game of [full,core])game.rb.setup({stageIndex:game.rb.stageNames.indexOf("Perch"),characterKeys:[key,"orbit"],seed:42});
  assert.deepEqual(clone(core.debug.fighters[0].data),clone(full.debug.fighters[0].data),`${key} balance/animation data changed`);
}
const canonicalState=game=>{
  const state=clone(game.rb.save().core);state.stageIndex=0;
  // Pruning stages renumbers their IDs, not their geometry or contact behavior.
  for(const fighter of state.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])
    if(typeof fighter[key]==="string")fighter[key]=fighter[key].replace(/^\d+:/,"stage:");
  return state;
};
const canonical=game=>R.hash(canonicalState(game));
let framesChecked=0;
for(const [stageIndex,stage] of manifest.stages.entries()) {
  const characters=[manifest.fighters[stageIndex%manifest.fighters.length],manifest.fighters[(stageIndex+5)%manifest.fighters.length]];
  for(const game of [full,core])game.rb.setup({stageIndex:game.rb.stageNames.indexOf(stage),characterKeys:characters,seed:518});
  assert.deepEqual(clone(core.debug.terrainArt.rects),clone(full.debug.terrainArt.rects),`${stage} geometry changed`);
  let saved;const inputs=[];
  for(let frame=0;frame<90;frame++) {
    const input=[0,1].map(i=>{const t=frame+i*11;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.13),aimY:Math.sin(t*.13),dashHeld:t%29<11,punchHeld:t%23<8}));});inputs.push(input);
    full.rb.step(input);core.rb.step(input);
    if(canonical(core)!==canonical(full)) {
      assert.deepEqual(canonicalState(core),canonicalState(full),`${stage}, frame ${frame}: core gameplay differs`);
    }
    framesChecked++;
    if(frame===39)saved=core.rb.save();
  }
  const end=core.rb.hash();core.rb.restore(saved);for(let frame=40;frame<90;frame++)core.rb.step(inputs[frame]);assert.equal(core.rb.hash(),end,"core replay drifted");
}
for(const stage of ["Enchanted Forest","Castle Dungeon"]) {
  for(const game of [full,core])game.debug.arena.setup(stage,{ai:false,seed:714});
  assert.equal(core.debug.fighters.length,10);
  for(let frame=0;frame<90;frame++) {
    const inputs=Array.from({length:10},(_,i)=>{const t=frame+i*7;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.16),aimY:Math.sin(t*.16),dashHeld:t%31<12,punchHeld:t%19<7}));});
    full.rb.step(inputs);core.rb.step(inputs);assert.equal(canonical(core),canonical(full),`${stage}: ten-fighter gameplay changed`);framesChecked++;
  }
}
// Exercise the new float path explicitly, well above platforms, rather than
// relying on the generic stage sample to happen to leave the ground.
for(const game of [full,core]) {
  game.rb.setup({stageIndex:game.rb.stageNames.indexOf("High Perch"),characterKeys:["kite","rain"],seed:79});
  for(const [i,f] of game.debug.fighters.entries())Object.assign(f,{x:400+400*i,y:-5000,onGround:false});
}
for(let frame=0;frame<240;frame++) {
  const inputs=[0,1].map(i=>R.decode(R.encode({hasAim:true,aimX:Math.cos(frame*.07+i),aimY:Math.sin(frame*.07+i),
    dashHeld:(frame+i*9)%61<24,punchHeld:(frame+i*9)%43<12})));
  full.rb.step(inputs);core.rb.step(inputs);assert.equal(canonical(core),canonical(full),`Kite/Rain core parity ${frame}`);framesChecked++;
}
const files=[];
for(const [arena,ruleset,overrides={}] of [["gravity-boulder","battle"],["total-rush","battle"],["field-goal","court"],["field-goal","battle"],
  ["total-rush","battle",{balancePreset:"original"}],
  ["standard-open","court"],["standard-open","battle"],["gravity-soccer-open","court"],["gravity-soccer-open","battle"],
  ["target-charge-stationary","battle"],["target-charge-vertical","battle"],["target-charge-roaming","battle"],
  ["total-rush","battle",{boulderTerritoryRate:.25,boulderBonusRate:4,middleRingPoints:0,highRingPoints:25,goldenReward:60,goldenHealth:240,goldenRespawn:90,ballCount:5}]]){
for(const game of [full,core]){game.debug.dashball.setup({arena,ruleset,...overrides},{characters:["chungus","orbit"],seed:42});if(arena==="total-rush")Object.assign(game.debug.dashball.state.ball,{x:738,y:1900});}
for(let frame=0;frame<90;frame++){
  const inputs=[{aimX:0,aimY:-1,dashHeld:frame<65},{aimX:-1,aimY:.2,punchHeld:frame%23<8}];
  full.rb.step(inputs);core.rb.step(inputs);assert.equal(canonical(core),canonical(full),`${arena}/${ruleset} core parity ${frame}`);framesChecked++;
}
}
for(const [mode,config] of [["dashball",{arena:"standard",ruleset:"battle"}],["dashball",{arena:"elevated",ruleset:"court"}],["dashball",{arena:"target-break",ruleset:"battle"}],["dashball",{arena:"golden-rush"}],["dashball",{arena:"gravity-soccer"}],["dashball",{arena:"boulder-control"}],["sandbag",{ruleset:"race"}],["sandbag",{ruleset:"brawl"}],["sandbag",{ruleset:"scramble"}]]){
  for(const game of [full,core])game.debug[mode].setup(config,{characters:["edgebert","chungus"],seed:42});
  for(let frame=0;frame<90;frame++){
    const inputs=[0,1].map(i=>R.decode(R.encode({hasAim:true,aimX:i?-1:1,punchHeld:frame%24<4,dashHeld:frame%37<5})));
    full.rb.step(inputs);core.rb.step(inputs);assert.equal(canonical(core),canonical(full),`${mode} ${JSON.stringify(config)} core parity ${frame}`);framesChecked++;
  }
}
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else files.push(path.relative(root,file));}}
visit(root);
assert(!files.some(file=>/^(artifacts|tests|node_modules)[/\\]/.test(file)));
assert(!files.some(file=>/assets[/\\](legacy|runway|knight|tinyrpg|archer|demons)[/\\]/.test(file)));
assert(!files.some(file=>/assets[/\\]optional[/\\](?!seeker-pro[/\\])/.test(file)));
assert(!files.some(file=>file.includes("orc-arena")),"removed Orc scenery must not be packaged");
assert(!JSON.stringify(core.sandbox.window.DASH_PUNCH_ART).includes("orc-arena"));
for(const item of manifest.assets) {
  const bytes=fs.readFileSync(path.join(root,item.file));assert.equal(bytes.length,item.bytes);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),item.sha256);
}
const embeddedSources=new Set();
for(const src of Object.values(core.sandbox.window.DASH_PUNCH_ART.images||{}))embeddedSources.add(src);
assert(core.sandbox.window.DASH_PUNCH_ART.images["assets/dashball/rush-ball.png"].startsWith("data:image/png;base64,"),"Tri-Ball recoloring must be origin-clean in file:// play");
for(const set of Object.values(core.sandbox.window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips)) {
  assert(clip.src.startsWith("data:image/png;base64,"),"offline sprite sheet is not self-contained");embeddedSources.add(clip.src);if(clip.unarmedSrc)embeddedSources.add(clip.unarmedSrc);
}
for(const set of Object.values(core.sandbox.window.DASH_PUNCH_ART.spriteSets))if(set.boomerangSprite){assert(set.boomerangSprite.src.startsWith("data:image/png;base64,"));embeddedSources.add(set.boomerangSprite.src);}
for(const item of manifest.embeddedAssets)assert([...embeddedSources].some(src=>crypto.createHash("sha256").update(Buffer.from(src.split(",")[1],"base64")).digest("hex")===item.sha256),item.file);
const source=fs.readFileSync(path.join(root,"game.js"),"utf8"),html=fs.readFileSync(path.join(root,"index.html"),"utf8");
assert(!/CHARACTER_DATA\.(paul|needle|bront|vesper|nowhiff|swordkun|goodergunman|dragon)\b/.test(source));
assert(!html.includes('id="stageBuilderLayer"'));assert(source.includes(manifest.networkBuild));
console.log(JSON.stringify({tests:"passed",root,fighters:manifest.fighters.length,stages:manifest.stages.length,unchangedSimulationFrames:framesChecked,replays:manifest.stages.length,tenFighterArenas:2,assetFiles:manifest.assets.length,embeddedSheets:manifest.embeddedAssets.length,files:files.length}));
