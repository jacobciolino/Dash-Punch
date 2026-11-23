"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),D=require("../dashball"),G=require("../sports-guide"),{allowed,collect}=require("../tools/export-public-source.cjs");
const plain=x=>JSON.parse(JSON.stringify(x));
test("Ball Hell replaces both visible names while preserving internal arena IDs and settings",()=>{
  for(const [id,name]of[["tri-ball","Ball Hell"],["tri-ball-wrap","Ball Hell: Wraparound"]]){assert.equal(D.ARENAS.find(a=>a.id===id).name,name);assert.equal(D.arena(id).name,name);const scene=G.scene("dashball",D.options({arena:id}));assert.equal(scene.guide.name,name);assert.equal(scene.guide.mode,"Dashball · Ball Hell");assert.equal(scene.state.config.arena,id);assert.equal(scene.state.config.winningScore,33);}
});
test("card palette labels are Color 1 through Color 4, with unchanged palette offsets",()=>{
  const source=fs.readFileSync("game.js","utf8"),before=execFileSync("git",["show","3e24714:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  assert.deepEqual(JSON.parse(source.match(/const COSTUME_NAMES = (\[[^;]+\]);/)[1]),["Color 1","Color 2","Color 3","Color 4"]);
  assert.equal(source.match(/const COSTUME_HUES = [^;]+/)[0],before.match(/const COSTUME_HUES = [^;]+/)[0]);
});
test("renaming and turf correction preserve exact pre-change geometry and gameplay, including Phantom",()=>{
  const files=["game.js","dashball.js","team-objectives.js","sports-guide.js","presentation-assets.js"],old=createGame(process.cwd(),{sourceOverrides:Object.fromEntries(files.map(file=>[file,execFileSync("git",["show",`3e24714:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024})]))}),now=createGame();
  assert.deepEqual(plain(now.rb.stageNames).map(s=>s.replace("Ball Hell","Tri-Ball")),plain(old.rb.stageNames));
  for(const arena of["tri-ball","tri-ball-wrap","boulder-control","standard"]){for(const g of[old,now])g.debug.dashball.setup({arena},{characters:["phantom","icer"],seed:427});const before=plain(old.debug.dashball.arena),after=plain(now.debug.dashball.arena);before.name=after.name;assert.deepEqual(after,before);for(let n=0;n<90;n++){const row=[{hasAim:true,aimX:1,aimY:-.2,punchHeld:n%29<6,dashHeld:n%41<4},{}];old.rb.step(row);now.rb.step(row);assert.equal(now.rb.hash(),old.rb.hash(),`${arena}/${n}`);}}
});
test("public source export rejects asset/binary/hidden paths and contains no licensed asset history",()=>{
  for(const file of["assets/optional/seeker.png","assets/fonts/font.woff2","exports/release.js","artifacts/file.json",".env",".env.production",".git/config","file.png","file.wav","release.zip"])assert(!allowed(file),file);
  for(const file of["game.js","tests/tri-ball.test.js","README.md",".gitignore","tools/build-release.cjs"])assert(allowed(file),file);
  const bundle=collect();assert(bundle.files.length>300);assert(bundle.files.every(f=>!f.path.startsWith("assets/")));assert.match(bundle.files.find(f=>f.path==="README.md").content,/not a standalone playable game/);assert.match(bundle.files.find(f=>f.path===".gitignore").content,/\/assets\//);assert(!("history"in bundle));
});
