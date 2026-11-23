"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),fs=require("node:fs"),crypto=require("node:crypto"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),D=require("../dashball"),{create}=require("../stage-renderer"),{selectStageArtwork,assetPaths}=require("../tools/build-core-release.cjs");
const plain=x=>JSON.parse(JSON.stringify(x)),source=file=>execFileSync("git",["show",`d642e37:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024});
test("all implemented requested sports share five real themes; unlisted arenas and stage registrations stay intact",()=>{
  const g=createGame(),art=g.sandbox.window.DASH_PUNCH_ART,ids=new Set(D.ARENAS.map(a=>a.id));assert.equal(Object.keys(art.sportsScenery).length,20);
  for(const[id,name]of Object.entries(art.sportsScenery)){assert(ids.has(id),id);assert(art.backdrops[name]);assert(art.stageThemes[name]);assert.equal(art.stageThemes[name].pixelArt,true);assert.equal(art.stageThemes[name].layers.length,3);}
  assert.equal(new Set(Object.values(art.sportsScenery)).size,5);assert(!Object.keys(art.sportsScenery).some(id=>id.includes("pendulum")));
  for(const arena of["boulder-control","gravity-boulder","total-rush"]){g.debug.dashball.setup({arena},{characters:["anchor","spike"]});assert.equal(g.debug.stagePresentation.snapshot().profile.id,"strange-world");}
});
test("imported PNG bytes match recorded source hashes and include only used assets and notices",()=>{
  const g=createGame(),art=g.sandbox.window.DASH_PUNCH_ART,provenance=JSON.parse(fs.readFileSync("assets/stages/sports/provenance.json"));assert.equal(provenance.files.length,23);
  const used=assetPaths({profiles:Object.fromEntries(Object.entries(art.stageThemes).filter(([name])=>name.startsWith("sports-"))),backdrops:Object.fromEntries(Object.entries(art.backdrops).filter(([name])=>name.startsWith("sports-")))});
  for(const row of provenance.files){const file=`assets/stages/sports/${row.file}`,bytes=fs.readFileSync(file);assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),row.sha256);assert.equal(bytes.length,row.bytes);assert.equal(bytes.readUInt32BE(16),576);assert.equal(bytes.readUInt32BE(20),324);assert(used.has(file),`Unused imported art: ${file}`);}
  for(const file of used)assert(fs.existsSync(file),file);assert(fs.readFileSync("assets/stages/sports/LICENSE.txt","utf8").includes("craftpix.net/file-licenses"));assert(fs.existsSync("assets/stages/sports/NOTICES.md"));
});
function rendererFixture(){
  const calls=[],makeCanvas=()=>{const paint=new Proxy({drawImage(...args){calls.push(args);},createLinearGradient(){throw Error("Smooth gradients forbidden for new pixel themes");},createRadialGradient(){throw Error("Bloom forbidden for new pixel themes");}}, {get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});return {width:0,height:0,getContext:()=>paint};};
  const getImage=src=>({src,complete:true,naturalWidth:576,naturalHeight:324});return {renderer:create({getImage,makeCanvas}),paint:makeCanvas().getContext("2d"),makeCanvas,calls};
}
test("new profiles stay crisp, cache layers, drift on integer pixels without tracking fighters and remain static in Classic",()=>{
  const art=createGame().sandbox.window.DASH_PUNCH_ART,{renderer,paint}=rendererFixture(),state={profile:art.stageThemes["sports-sky"],quality:"enhanced",view:{x:0,y:0,w:1280,h:720},focus:{x:0,y:0},camera:{x:0,y:0},time:0};
  assert(renderer.draw(paint,state));const before=plain(renderer.stats);for(let n=0;n<30;n++)renderer.draw(paint,{...state,focus:{x:n%2?-1:1,y:1},camera:{x:10000*n,y:10000*n}});
  assert.equal(renderer.stats.builds,1);assert.equal(renderer.stats.filterPasses,0);assert.equal(renderer.stats.composites,before.composites);assert.deepEqual(plain(renderer.stats.lastOffsets),before.lastOffsets);
  renderer.draw(paint,{...state,time:90});assert.notDeepEqual(plain(renderer.stats.lastOffsets),before.lastOffsets);assert(renderer.stats.lastOffsets.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&Math.abs(p.x)<40&&Math.abs(p.y)<24));
  assert(renderer.draw(paint,{...state,quality:"classic",time:90}));const classic=plain(renderer.stats.lastOffsets);renderer.draw(paint,{...state,quality:"classic",time:500});assert.deepEqual(plain(renderer.stats.lastOffsets),classic);assert.equal(paint.imageSmoothingEnabled,false);
  for(const[name,profile]of Object.entries(art.stageThemes))if(name.startsWith("sports-"))renderer.draw(paint,{...state,profile});assert(renderer.stats.entries<=4);assert(renderer.stats.pixels<16e6);
});
test("missing layers fail safely and do not allocate incomplete cache entries",()=>{
  const art=createGame().sandbox.window.DASH_PUNCH_ART,{paint,makeCanvas}=rendererFixture(),renderer=create({getImage:()=>null,makeCanvas});
  assert.equal(renderer.draw(paint,{profile:art.stageThemes["sports-hall"],quality:"classic",view:{x:0,y:0,w:1280,h:720},focus:{x:0,y:0},camera:{x:0,y:0}}),false);assert.equal(renderer.stats.entries,0);
});
test("core artwork selection keeps all used themes and excludes fictitious/experimental registrations without building a release",()=>{
  const art=createGame().sandbox.window.DASH_PUNCH_ART,ids=new Set(D.ARENAS.map(a=>a.id));art.sportsScenery["not-a-real-stage"]="missing";
  const selected=selectStageArtwork(art,["Crosswire","Whirlwell","High Perch Drift"],ids);assert(!selected.sportsScenery["not-a-real-stage"]);assert.equal(Object.keys(selected.sportsScenery).length,20);
  for(const name of new Set(Object.values(selected.sportsScenery))){assert(selected.backdrops[name]);assert(selected.stageThemes[name]);assert(selected.stageAtmospheres[name]);}
  for(const file of assetPaths(selected))assert(fs.existsSync(file),file);assert(!Object.keys(selected.backdrops).includes("Castle 64"));
});
test("every sports arena's geometry, spawn, camera, scoring, fixed-step state and restoration match the preceding checkpoint",()=>{
  const old=createGame(process.cwd(),{sourceOverrides:Object.fromEntries(["game.js","presentation-assets.js","stage-renderer.js"].map(file=>[file,source(file)]))}),now=createGame();
  for(const {id}of D.ARENAS){for(const g of[old,now])g.debug.dashball.setup({arena:id,ruleset:"battle"},{characters:["rain","boomerangus"],seed:73});
    assert.equal(now.rb.hash(),old.rb.hash(),`${id} initialization`);const before=now.rb.hash(),camera=plain(now.debug.camera.state);now.debug.stagePresentation.draw();assert.equal(now.rb.hash(),before);assert.deepEqual(plain(now.debug.camera.state),camera);
    for(let frame=0;frame<36;frame++){const row=[{hasAim:true,aimX:1,aimY:-.2,punchHeld:frame%21<7,dashHeld:frame%31<10},{hasAim:true,aimX:-1,punchHeld:frame%41<30}];old.rb.step(row);now.rb.step(row);assert.equal(now.rb.hash(),old.rb.hash(),`${id}/${frame}`);}
    const saved=now.rb.save();now.rb.step([]);now.rb.restore(saved);assert.equal(now.rb.hash(),old.rb.hash(),`${id} restored`);
  }
});
