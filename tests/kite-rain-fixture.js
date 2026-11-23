"use strict";
const {createGame}=require("./simulation-harness"),R=require("../rollback");
function sample(key){
  const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,"anchor"],seed:291});
  const data=JSON.parse(JSON.stringify(g.debug.fighters[0].data)),hashes=[];
  for(let frame=0;frame<120;frame++){
    const inputs=[0,1].map(i=>{const t=frame+i*19;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.13),aimY:Math.sin(t*.13),dashHeld:t%31<6,punchHeld:t%27<5}));});
    hashes.push(g.rb.step(inputs));
  }
  return {data,hashes};
}
if(require.main===module){
  const fs=require("node:fs"),file="artifacts/kite-rain/before-others.json";
  if(fs.existsSync(file))throw Error("The pre-change fixture already exists; do not overwrite it");
  const g=createGame(),keys=g.rb.characterKeys;
  fs.writeFileSync(file,JSON.stringify(Object.fromEntries(keys.map(key=>[key,sample(key)]))));
  console.log(`Captured all ${keys.length} fighters before Kite/Rain changes`);
}
module.exports={sample};
