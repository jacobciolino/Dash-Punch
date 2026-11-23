"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),vm=require("node:vm"),P=require("../fighter-presentation");
const old={module:{exports:{}}};vm.runInNewContext(execFileSync("git",["show","2a97147:fighter-presentation.js"],{encoding:"utf8"}),old);const before=old.module.exports;
function fixture(name="idle",head=[15,3],anchor={pivotX:15,foot:28}){const pixels=new Uint8ClampedArray(40*40*4);for(let y=3;y<28;y++)for(let x=5;x<29;x++)pixels.set([100,55,130,255],(y*40+x)*4);for(const x of[17,21])pixels.set([0,240,60,255],(8*40+x)*4);return {pixels,original:pixels.slice(),frame:{x:0,y:0,w:40,h:40,name,frame:0,head,anchor}};}
function apply(key,f){P.derive(f.pixels,f.original,40,40,key,[f.frame]);return f;}
test("Booster's three repeating stripes point up; Lamer's point down",()=>{
  for(const[key,shade]of[["booster",[239,241,197]],["lamer",[223,178,215]]]){const f=apply(key,fixture());let count=0;for(const row of[13,17,21])for(let u=-8;u<=8;u++){const phase=((u%4)+4)%4;if(phase===2)continue;const y=3+row+(key==="booster"?phase===0?0:1:phase===0?1:0),i=(y*40+15+u)*4;assert.deepEqual([...f.pixels.slice(i,i+3)],shade,`${key}/${u}/${row}`);count++;}assert(count>=30);}
});
test("stripes preserve source art, alpha, face pixels, fabric gaps and pose alignment",()=>{
  for(const key of["booster","lamer"])for(const name of["idle","walk","dash","jump","attack1","attackUp","hurt","death"])for(const anchor of[{pivotX:15,foot:28},{pivotX:23,foot:28}]){
    const f=fixture(name,[15,3],anchor);for(let y=12;y<28;y++)for(let x=5;x<29;x++)if((x+y)%7===0)f.pixels[(y*40+x)*4+3]=0;f.original=f.pixels.slice();const original=f.original.slice(),legacy=f.pixels.slice();before.derive(legacy,f.original,40,40,key,[f.frame]);apply(key,f);assert.deepEqual(f.original,original);
    for(let i=0;i<f.pixels.length;i+=4){assert.equal(f.pixels[i+3],legacy[i+3]);const x=i/4%40,y=Math.floor(i/160);if(!f.original[i+3]||x>=10&&x<=22&&y>=6&&y<=14)assert.deepEqual(f.pixels.slice(i,i+4),legacy.slice(i,i+4));}
    const repeat=original.slice();P.derive(repeat,original,40,40,key,[f.frame]);assert.deepEqual(repeat,f.pixels);
  }
});
test("authored white hurt flashes and dissolving frames stay untouched",()=>{
  for(const key of["booster","lamer"]){const f=fixture("hurt");for(let i=0;i<f.pixels.length;i+=4)if(f.pixels[i+3])f.pixels.set([255,255,255,255],i);f.original=f.pixels.slice();apply(key,f);assert.deepEqual(f.pixels,f.original);const empty=fixture("death");empty.pixels.fill(0);empty.original=empty.pixels.slice();apply(key,empty);assert.deepEqual(empty.pixels,empty.original);}
});
test("all other fighter derivatives and aura frames remain byte-identical to the pre-change checkpoint",()=>{
  for(const key of P.KEYS)if(!["booster","lamer"].includes(key))for(const name of["idle","walk","attack1","hurt"]){const f=fixture(name),a=f.pixels.slice();before.derive(a,f.original,40,40,key,[f.frame]);apply(key,f);assert.deepEqual(f.pixels,a,`${key}/${name}`);}
  for(let n=0;n<8;n++)for(const fn of["electricAuraCells","frostAuraCells"])assert.equal(JSON.stringify(P[fn](n)),JSON.stringify(before[fn](n)));
});
test("gameplay, physics and licensed asset definitions are unchanged",()=>{
  const fs=require("node:fs");for(const file of["game.js","dashball.js","target-charge.js","presentation-assets.js"])assert.equal(fs.readFileSync(file,"utf8"),execFileSync("git",["show",`2a97147:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024}),file);
});
