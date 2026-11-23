"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),audio=require("../sports-audio");
(async()=>{
  let plays=0;const original=global.fetch,context={state:"running",currentTime:1,destination:{},decodeAudioData:async data=>({bytes:data.byteLength}),createBufferSource:()=>({connect(){},start(){plays++;}}),createGain:()=>({gain:{value:0},connect(){}})};
  try{
    global.fetch=async file=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(file);assert.equal(b.toString("ascii",0,4),"RIFF");assert.equal(b.readUInt32LE(24),22050);assert.equal(b.readUInt16LE(22),1);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
    await audio.prepare(context);assert(audio.play("soccerKick",context));assert.equal(plays,1);audio.play("soccerKick",context);assert.equal(plays,1);context.currentTime+=.1;audio.play("soccerKick",context);assert.equal(plays,2);audio.play("soccerGoal",context);assert.equal(plays,3);assert(!audio.play("unknown",context));
    const bytes=Object.values(audio.CLIPS).reduce((n,file)=>n+fs.statSync(file).size,0);assert(bytes<220000);console.log(JSON.stringify({tests:"passed",clips:3,bytes,decode:true,duplicateSuppression:true}));
  }finally{global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
