"use strict";
const R=require("../rollback"),{createGame}=require("./simulation-harness");
function hashes(name,count,root=process.cwd(),{originalTotal=false}={}){
  const g=createGame(root),d=g.debug,ai=name.endsWith(":ai");
  if(name==="versus")g.rb.setup({stageIndex:d.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:42});
  else if(["race","brawl","scramble"].includes(name))d.sandbag.setup({ruleset:name});
  else {const [arena,ruleset]=name.split(":");d.dashball.setup({arena,...(ai?{teamSize:3}:{ruleset}),...(originalTotal&&arena==="total-rush"?{balancePreset:"original"}:{})},{ai,seed:ai?733:42});if(arena==="gravity-soccer"||arena==="gravity-boulder")d.gravity.setDirection("y",-1);}
  const rows=[];
  for(let i=0;i<count;i++){
    if(ai)d.dashball.step();else g.rb.step(d.fighters.map((f,n)=>({aimX:n?-1:1,aimY:-.3,dashHeld:i%37<8,punchHeld:i%29<10})));
    const c=JSON.parse(JSON.stringify(g.rb.save().core));c.stageIndex=0;
    // Historical Total Rush frames used Original rates, before these three
    // configuration keys existed. Retain every gameplay field and old fixture.
    if(originalTotal&&c.dashball?.totalRush)for(const key of ["balancePreset","boulderTerritoryRate","boulderBonusRate"])delete c.dashball.config[key];
    for(const f of c.fighters)for(const field of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[field]==="string")f[field]=f[field].replace(/^\d+:/,"stage:");
    rows.push(R.hash(c));
  }
  return rows;
}
// The sports-refinement request intentionally changes body impacts in these
// three boulder sports and Field Goal's geometry/flow. The floatier-ball request
// also changes Golden Rush and target sports. Keep their historical files;
// focused tests cover requested changes, and other modes retain strict parity.
const unchangedSportsFixture=name=>{const id=name.split(":")[0];return !["field-goal","boulder-control","gravity-boulder","total-rush"].includes(id)&&!require("../dashball").isFloatBallArena(id);};
module.exports={hashes,unchangedSportsFixture};
