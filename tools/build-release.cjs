"use strict";
const fs=require("node:fs"),path=require("node:path"),{buildCoreRelease}=require("./build-core-release.cjs");
// Distribution builds are core-only. The full development checkout is retained.
const output=path.resolve(process.argv[2]||path.join(__dirname,"../exports",`Dash-Punch-Core-${Date.now()}`));
const result=buildCoreRelease(output);
const root=path.resolve(__dirname,".."),relative=path.relative(root,output);
if(relative&&!relative.startsWith("..")&&!path.isAbsolute(relative))fs.writeFileSync(path.join(root,"playtest-release.json"),JSON.stringify({directory:relative,edition:"core"},null,2)+"\n");
console.log(JSON.stringify({output,edition:"core",experimentalContent:false,fighters:result.manifest.fighters.length,localPlayers:10,onlinePlayers:2},null,2));
