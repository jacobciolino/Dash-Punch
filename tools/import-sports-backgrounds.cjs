"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),{execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,".."),downloads=path.join(require("node:os").homedir(),"Downloads"),output=path.join(root,"assets/stages/sports");
const castle="Free-Castle-Interior-Pixel-Game-Backgrounds.zip",temple="free-ancient-temple-pixel-game-backgrounds.zip",sky="free-sky-with-clouds-background-pixel-art-set.zip";
const packs=[
  {theme:"sky",archive:sky,source:"Clouds/Clouds 1",members:[1,2,3,4].map(i=>[`${i}.png`,`layer-${i}.png`])},
  ...[["temple",temple,1,5],["hall",castle,4,3],["courtyard",castle,1,3],["citadel",castle,3,4]].map(([theme,archive,number,count])=>({
    theme,archive,source:`PNG/background ${number}`,members:[[`background ${number}.png`,"scene.png"],...Array.from({length:count},(_,i)=>[`Plan ${i+1}.png`,`layer-${i+1}.png`])],
  })),
];
function importBackgrounds(){
  const files=[];for(const pack of packs){
    const archive=path.join(downloads,pack.archive);for(const [member,name]of pack.members){
      const source=`${pack.source}/${member}`,bytes=execFileSync("unzip",["-p",archive,source],{maxBuffer:4*1024*1024});
      if(bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error(`Not a PNG: ${source}`);
      const file=`${pack.theme}/${name}`,destination=path.join(output,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
      files.push({file,archive:pack.archive,member:source,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:crypto.createHash("sha256").update(bytes).digest("hex")});
    }
  }
  fs.writeFileSync(path.join(output,"LICENSE.txt"),execFileSync("unzip",["-p",path.join(downloads,castle),"License.txt"]));
  fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify({source:"Owner-supplied CraftPix freebie archives; original PNG bytes, no resampling",files},null,2)+"\n");
  return files;
}
if(require.main===module)console.log(JSON.stringify({imported:importBackgrounds().length,output}));
module.exports={packs,importBackgrounds};
