"use strict";
const fs=require("node:fs"),path=require("node:path");
const source=process.argv[2]||"/tmp/dash-soccer-audio/Soccer UI SFX Pack (FREE LITE)/one shot";
const root=path.resolve(__dirname,"../assets/audio/soccer");fs.mkdirSync(root,{recursive:true});
for(const [name,file] of [["kick","kick"],["melody-1","goal"],["stab","start"]]){
  const raw=fs.readFileSync(path.join(source,`Game soccer one shot ${name} 16bit.wav`));let fmt,data;
  for(let at=12;at+8<=raw.length;){const id=raw.toString("ascii",at,at+4),size=raw.readUInt32LE(at+4);
    if(id==="fmt ")fmt={type:raw.readUInt16LE(at+8),channels:raw.readUInt16LE(at+10),rate:raw.readUInt32LE(at+12),bits:raw.readUInt16LE(at+22)};
    if(id==="data")data=raw.subarray(at+8,at+8+size);at+=8+size+(size%2);
  }
  if(!fmt||!data||fmt.type!==1||fmt.bits!==16)throw Error("Expected supplied 16-bit PCM WAV");
  const frames=data.length/(2*fmt.channels);let first=frames,last=0;
  for(let i=0;i<frames;i++)for(let channel=0;channel<fmt.channels;channel++)if(Math.abs(data.readInt16LE((i*fmt.channels+channel)*2))>180){first=Math.min(first,i);last=Math.max(last,i);}
  first=Math.max(0,first-Math.round(fmt.rate*.005));last=Math.min(frames,last+Math.round(fmt.rate*.06));
  const rate=22050,length=Math.ceil((last-first)*rate/fmt.rate),pcm=Buffer.alloc(length*2);let peak=0;const samples=[];
  for(let i=0;i<length;i++){const pos=Math.min(frames-1,first+Math.round(i*fmt.rate/rate));let sum=0;for(let c=0;c<fmt.channels;c++)sum+=data.readInt16LE((pos*fmt.channels+c)*2);const value=sum/fmt.channels;samples.push(value);peak=Math.max(peak,Math.abs(value));}
  const gain=Math.min(1.5,24000/Math.max(1,peak));
  samples.forEach((value,i)=>{const fade=Math.min(1,i/(rate*.003),(length-1-i)/(rate*.02));pcm.writeInt16LE(Math.round(value*gain*Math.max(0,fade)),i*2);});
  const header=Buffer.alloc(44);header.write("RIFF");header.writeUInt32LE(pcm.length+36,4);header.write("WAVEfmt ",8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write("data",36);header.writeUInt32LE(pcm.length,40);
  fs.writeFileSync(path.join(root,file+".wav"),Buffer.concat([header,pcm]));console.log(JSON.stringify({file:file+".wav",seconds:length/rate,bytes:pcm.length+44}));
}
