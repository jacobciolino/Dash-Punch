"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto"),{createGame}=require("./simulation-harness");
const T=require("../typography"),source=fs.readFileSync("game.js","utf8");let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
check("official unmodified WOFF2 and license notices",()=>{
 const font=fs.readFileSync("assets/fonts/backout/BackOut.woff2");assert.equal(font.toString("ascii",0,4),"wOF2");assert.equal(font.length,41696);
 assert.equal(crypto.createHash("sha256").update(font).digest("hex"),"f0f2e44bcd3b3fd2ec96c58745519e818741e72ceb3f41aab62bbb7dd28ea94a");
 for(const name of["LICENSE.txt","FONTLOG.txt","TRADEMARKS.md","NOTICES.txt"])assert(fs.statSync("assets/fonts/backout/"+name).size>30);
 assert.match(fs.readFileSync("assets/fonts/backout/LICENSE.txt","utf8"),/SIL Open Font License v1.1/);
 assert.match(fs.readFileSync("assets/fonts/backout/NOTICES.txt","utf8"),/Reserved Font Name Backout/);
});
check("all production CSS and Canvas font declarations share one family",()=>{
 assert.equal((source.match(/\.font\s*=\s*Typography\.canvas\(/g)||[]).length,46);
 assert(!/\.font\s*=\s*["`]/.test(source));assert(!/system-ui|ui-monospace|sans-serif/.test(fs.readFileSync("styles.css","utf8")));
 assert.equal(T.canvas(24,800),'800 24px "BackOut", system-ui, sans-serif');assert.equal(T.status,"unavailable");
 assert(source.includes('if(Typography.status==="loading")Typography.ready.then(startPresentation)'));
});
check("core release embeds identical bytes and retains licensing",()=>{
 const root=path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),css=fs.readFileSync(path.join(root,"typography.css"),"utf8"),data=css.match(/data:font\/woff2;base64,([^"')]+)/)[1];
 assert(Buffer.from(data,"base64").equals(fs.readFileSync("assets/fonts/backout/BackOut.woff2")));
 assert(!/https?:\/\//.test(css));for(const name of["BackOut.woff2","LICENSE.txt","FONTLOG.txt","TRADEMARKS.md","NOTICES.txt"])assert(fs.readFileSync(path.join(root,"assets/fonts/backout",name)).equals(fs.readFileSync("assets/fonts/backout/"+name)));
 assert.match(fs.readFileSync(path.join(root,"CREDITS.txt"),"utf8"),/Typeface: BackOut/);
 const old=JSON.parse(fs.readFileSync("exports/Dash-Punch-Player-Cards-Release-2026-11-14-v2/build-manifest.json")),current=JSON.parse(fs.readFileSync(path.join(root,"build-manifest.json")));
 assert.deepEqual(current.assets.filter(a=>!a.file.startsWith("assets/fonts/")),old.assets);assert.deepEqual(current.embeddedAssets,old.embeddedAssets);
});
check("all fourteen fighters and existing sports preserve pre-font gameplay hashes",()=>{
 const root=path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),a=createGame(root),b=createGame(path.resolve("exports/Dash-Punch-Player-Cards-Release-2026-11-14-v2"));let frames=0;
 for(const key of a.rb.characterKeys){for(const g of[a,b])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Perch"),characterKeys:[key,"orbit"],seed:431});for(let i=0;i<60;i++){const inputs=[0,1].map(n=>({hasAim:true,aimX:n?-1:1,aimY:-.4,dashHeld:i%23<7,punchHeld:(i+n*8)%29<10}));for(const g of[a,b])g.rb.step(inputs);assert.equal(a.rb.hash(),b.rb.hash(),key);frames++;}}
 for(const arena of a.sandbox.Dashball.ARENAS){for(const g of[a,b])g.debug.dashball.setup({arena:arena.id},{characters:["edgebert","boomerangus"],seed:43});for(let i=0;i<30;i++){for(const g of[a,b])g.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash(),arena.id);frames++;}}
 for(const ruleset of["race","brawl","scramble"]){for(const g of[a,b])g.debug.sandbag.setup({ruleset},{characters:["rain","chungus"],seed:76});for(let i=0;i<30;i++){for(const g of[a,b])g.debug.sandbag.step();assert.equal(a.rb.hash(),b.rb.hash(),ruleset);frames++;}}
 console.log(`${frames} exact pre-font gameplay frames`);
});
check("presentation readiness is absent from snapshots and fixed-step simulation",()=>{
 const hashes=[];for(const hz of[30,60,120]){const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["orbit","kite"],seed:83});g.debug.matchFlow.begin({countdown:false});g.sandbox.DashTypography.status=hz===30?"fallback":hz===60?"ready":"loading";for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());assert(!/fontStatus|DashTypography|BackOut/.test(JSON.stringify(g.rb.save())));}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[1],hashes[2]);
});
(async()=>{
 for(const success of[true,false]){
  const notes=[],root={dataset:{},classList:{toggle(){}}},document={documentElement:root,fonts:{load:()=>success?Promise.resolve([{}]):Promise.reject(Error("Test missing font"))},body:{appendChild:note=>notes.push(note)},getElementById:()=>null,createElement:()=>({setAttribute(){}})};
  const context={document,console:{warn(){}},setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(fs.readFileSync("typography.js","utf8"),context);assert.equal(context.DashTypography.status,"loading");assert.equal(await context.DashTypography.ready,success);assert.equal(context.DashTypography.status,success?"ready":"fallback");assert.equal(notes.length,success?0:1);
 }
 console.log(`ok asynchronous readiness and explicit failure recovery`);console.log(`${groups+1} typography groups passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
