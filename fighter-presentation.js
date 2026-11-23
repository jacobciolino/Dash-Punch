"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashFighterPresentation=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const KEYS=new Set(["edgebert","rain","reverso","booster","lamer","phantom","gunman","archer","whipado","lancer","microusb","icer","ember"]);
  const CLEAN_SWORD=new Set(["rain","reverso","booster","lamer","whipado","archer","lancer","icer","ember"]);
  const CLOUD=["....####.....","..##aaaa##...",".#aabbbbaa#..","#abbbbbbbba#.","#bbbbbbbbbb#.",".##########.."];
  const PLUS=["..g..","..g..","ggggg","..g..","..g.."],THUMB=["gggg.","ggggg","ggg.g",".g..g",".g...",".g..."];
  const cloth=(r,g,b,a)=>a>100&&b>g*1.15&&r>g*1.1&&(r+b)*.5>40;
  const green=(r,g,b,a)=>a>100&&g>r*1.45&&g>b*1.15;
  const rgba=hex=>hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)).concat(255);
  const colorCache=new Map();
  const ELECTRIC_AURA=Object.freeze({width:34,height:36,frames:8,fps:12});
  function electricAuraCells(frame=0){
    const phase=((Math.floor(frame)%8)+8)%8,cells=[],bolt=["00100","01100","01000","01110","00010","00110","00100"];
    const origins=[[-13+phase%2,-8+phase%3],[8-phase%2,-4-(phase+1)%3],[-3+phase%3,-15]];
    for(const[i,[ox,oy]]of origins.entries())for(let y=0;y<bolt.length;y++)for(let x=0;x<5;x++)if(bolt[y][x]==="1"){
      const px=ox+(i===1?4-x:x),py=oy+y;
      cells.push({x:px+18,y:py+18,color:"#23677e"},{x:px+17,y:py+18,color:(x+y+phase)%4===0?"#efffff":"#70e9f2"});
    }
    const x=11-phase%3,y=11+(phase%2);cells.push({x:x+17,y:y+18,color:"#efffff"},{x:x+16,y:y+18,color:"#70e9f2"},{x:x+17,y:y+17,color:"#70e9f2"});
    return cells;
  }
  const FROST_AURA=Object.freeze({width:34,height:36,frames:8,fps:8});
  function frostAuraCells(frame=0){
    const phase=((Math.floor(frame)%8)+8)%8,cells=[];
    const put=(x,y,color)=>cells.push({x,y,color});
    for(let n=0;n<6;n++){
      const side=n%2?1:-1,x=17+side*(12+(n+phase)%2),y=3+((n*5-phase*2+32)%28);
      put(x+side,y+1,"#507c9b");put(x,y,"#e8ffff");
      put(x,y+1,"#8bcbdc");put(x-side,y,"#8bcbdc");
      if(n%3===0){put(x,y-1,"#8bcbdc");put(x+side,y,"#8bcbdc");}
    }
    // Short stepped vapor ribbons stay outside the body, not over the face.
    for(const side of[-1,1])for(let n=0;n<3;n++){
      const y=24-n*7-(phase+n)%3,x=17+side*(10+(phase+n)%2);
      for(let k=0;k<3;k++)put(x+side*k,y-(k===2?1:0),k===0?"#507c9b":"#8bcbdc");
    }
    return cells;
  }
  function color(value){if(!colorCache.has(value))colorCache.set(value,rgba(value));return colorCache.get(value);}
  function basis(head,anchor){
    const dx=anchor.pivotX-head[0],dy=anchor.foot-12-head[1],length=Math.hypot(dx,dy)||1;
    return {x:dy/length,y:-dx/length,downX:dx/length,downY:dy/length};
  }
  function guessHead(original,width,frame,hint){
    const target=hint||[frame.anchor.pivotX,frame.anchor.foot-24];let nearest=null,best=90;
    for(let y=Math.max(0,Math.floor(target[1]));y<Math.min(frame.h,target[1]+13);y++)for(let x=Math.max(0,Math.floor(target[0]-5));x<Math.min(frame.w,target[0]+11);x++){
      const i=((frame.y+y)*width+frame.x+x)*4;
      if(green(...original.subarray(i,i+4))){const distance=(x-target[0]-3)**2+(y-target[1]-6)**2;if(distance<best){best=distance;nearest=[x-3,y-6];}}
    }
    return hint||nearest;
  }
  function derive(pixels,original,width,height,key,frames,{weaponHeld=false}={}){
    if(!KEYS.has(key))return {changed:0,removed:0,frames:[]};
    let changed=0,removed=0;const poses=[];
    for(const frame of frames){
      if(frame.head===null){poses.push(null);continue;}
      const head=guessHead(original,width,frame,frame.head);if(!head){poses.push(null);continue;}
      const dir=basis(head,frame.anchor),local=(x,y)=>[Math.round(head[0]+dir.x*x+dir.downX*y),Math.round(head[1]+dir.y*x+dir.downY*y)];
      const index=(x,y)=>((frame.y+y)*width+frame.x+x)*4;
      const inside=(x,y)=>x>=0&&y>=0&&x<frame.w&&y<frame.h&&frame.x+x<width&&frame.y+y<height;
      const at=(x,y)=>inside(x,y)?index(x,y):-1;
      const put=(x,y,hex,mask="")=>{const i=at(x,y);if(i<0||mask==="behind"&&pixels[i+3]||mask==="cloth"&&!cloth(...original.subarray(i,i+4))||mask==="face"&&(!original[i+3]||cloth(...original.subarray(i,i+4))))return;pixels.set(color(hex),i);changed++;};
      const dot=(x,y,hex,mask)=>put(...local(x,y),hex,mask);
      // The hood stays upright while the torso leans in attack frames. Protect
      // its native opening, not a box rotated with the shoulder attachment.
      const isFace=(x,y)=>x-head[0]>=-5&&x-head[0]<=7&&y-head[1]>=3&&y-head[1]<=11;
      let eyePixels=0,bodyPixels=0;
      for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
        const i=index(x,y);if(cloth(...original.subarray(i,i+4)))bodyPixels++;
        if(isFace(x,y)&&green(...original.subarray(i,i+4)))eyePixels++;
      }
      // White hit flashes and authored death dissolution remain untouched.
      if(bodyPixels<5){poses.push(null);continue;}
      if(CLEAN_SWORD.has(key)&&(frame.name.startsWith("attack")||frame.name==="melee")){
        for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
          const i=index(x,y),[r,g,b,a]=original.subarray(i,i+4);
          const blade=green(r,g,b,a)||(g>r*1.08&&g>b*1.02)||(r>55&&Math.abs(r-g)<15&&Math.abs(g-b)<20);
          const dx=x-head[0],dy=y-head[1],u=dx*dir.x+dy*dir.y,v=dx*dir.downX+dy*dir.downY;
          // The blade shares the coat palette. Keep the authored torso, hood
          // and reaching forearm, not its thin diagonal weapon beyond the hand.
          const outsideBody=u>16||u>11&&v<13||u<-12||v<-3||v<0&&Math.abs(u)>8||v>28;
          if(a&&(blade||outsideBody)&&!isFace(x,y)){pixels[i+3]=0;changed++;removed++;}
        }
      }
      if(key==="edgebert"){
        for(const x of[-4,3]){dot(x,1,"#926c7e");dot(x,0,"#d3b8c3");dot(x+1,-1,"#f0e2d9");}
        if(eyePixels){dot(-3,3,"#49283c");dot(-2,4,"#49283c");dot(2,4,"#49283c");dot(3,3,"#49283c");dot(4,9,"#fff2d6");dot(4,10,"#fff2d6");}
      }
      if(key==="booster"||key==="lamer"){
        const pattern=key==="booster"?PLUS:THUMB;
        for(let y=0;y<pattern.length;y++)for(let x=0;x<pattern[y].length;x++)dot(x-6,y+1,pattern[y][x]==="g"?(key==="booster"?"#fff1bf":"#f6b26c"):key==="booster"?"#40563e":"#34344c","cloth");
        for(const side of[-1,1])for(let n=0;n<5;n++){
          if(key==="booster"){dot(side*5,13+n,"#eff1c5","cloth");dot(side*6,13+n,"#e17c72","cloth");}
          else{dot(side*(4+n*.5),13+n*.5,"#dfb2d7","cloth");dot(side*(4+n*.5),17+n*.5,"#dfb2d7","cloth");}
        }
        // Repeating two-pixel chevrons follow the torso basis, clipped to fabric.
        for(const row of[13,17,21])for(let u=-10;u<=10;u++){
          const phase=((u%4)+4)%4;if(phase===2)continue;
          const point=phase===0?0:1,v=row+(key==="lamer"?1-point:point),[x,y]=local(u,v),i=at(x,y);
          if(i<0||!pixels[i+3]||isFace(x,y))continue;
          const light=original[i]+original[i+2]>160,alpha=pixels[i+3];
          put(x,y,key==="booster"?(light?"#eff1c5":"#a7ba91"):(light?"#dfb2d7":"#957ca9"),"cloth");
          pixels[i+3]=alpha;
        }
      }
      if(key==="reverso"&&eyePixels){
        for(const offset of[-3,2]){
          for(let y=0;y<4;y++)for(let x=0;x<4;x++)dot(offset+x,4+y,"#09251b","face");
          for(const [x,y]of[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[1,2]])dot(offset+x,4+y,(x+y)%3?"#43ef88":"#158b52","face");
        }
      }
      if(key==="microusb"){
        for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
          const i=index(x,y);if(!cloth(...original.subarray(i,i+4)))continue;
          const u=Math.round(x-head[0]),v=Math.round(y-head[1]);let noise=Math.imul(u+71,73856093)^Math.imul(v+31,19349663)^Math.imul(frame.frame+1,83492791);noise=(noise^(noise>>>13))>>>0;
          const factor=noise%11<3?.48:noise%11>7?1.3:.9,scan=(v+frame.frame)%6===0?.72:1;
          for(let channel=0;channel<3;channel++)pixels[i+channel]=Math.min(255,Math.round(pixels[i+channel]*factor*scan));changed++;
        }
      }
      if(key==="ember"){
        for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
          const i=index(x,y),u=x-head[0],v=y-head[1];
          if(isFace(x,y)&&green(...original.subarray(i,i+4))){
            put(x,y,(x+y+frame.frame)%3?"#ffc552":"#ff783c");
            if((x+frame.frame)%2===0)put(x,y-1,"#e56836","face");
          }
          if(!cloth(...original.subarray(i,i+4)))continue;
          const seed=((u+31)*17+(v+9)*13)%47;
          if(v>=2&&seed<3)put(x,y,(frame.frame+seed*3)%9<3?"#ffd273":seed%2?"#d95732":"#8c392e","cloth");
        }
      }
      if(key==="icer"){
        for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){
          const i=index(x,y),u=x-head[0],v=y-head[1];
          if(isFace(x,y)&&green(...original.subarray(i,i+4))&&original[i+1]>45)put(x,y,original[i+1]>100?"#c1faff":"#5ba7bf");
          if(!cloth(...original.subarray(i,i+4)))continue;
          if((Math.abs(u)>=5&&v>=3&&v<11)||(v>=1&&v<=2&&u>=-3&&u<=5))put(x,y,(x+y)%3?"#d6e8e8":"#9dbacb","cloth");
          else if(v>=12&&v<25&&((u+17)*7+v*11)%29===0){
            put(x,y,(frame.frame%6<3)?"#c7f9ff":"#7ba4bc","cloth");
            if(frame.frame%6<3)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])put(x+dx,y+dy,"#97c7db","cloth");
          }
        }
      }
      if(key==="phantom"){
        for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++){const i=index(x,y);if(isFace(x,y)&&green(...original.subarray(i,i+4)))put(x,y,"#131b22");}
        const length=Math.min(27,Math.hypot(frame.anchor.pivotX-head[0],frame.anchor.foot-head[1])+1),sway=Math.round(Math.sin(frame.frame*.7));
        for(let y=14;y<=length;y++){
          const half=4+Math.floor((y-14)/5);
          for(let x=-half;x<=half;x++)if(y<length-1||((x+frame.frame)%4+4)%4!==0)dot(x+sway*.35,y,Math.abs(x)===half?"#344b50":x<0?"#8daaa2":x%3===0?"#76958f":"#a6c5ba");
        }
      }
      if(key==="archer"){
        for(let y=8;y<20;y++)for(let x=-10;x<=-6;x++)dot(x,y,x===-10?"#282936":x===-6?"#b28b54":"#76553e","behind");
        for(const x of[-10,-8,-6])for(let y=2;y<12;y++){dot(x,y,"#b7a47c","behind");if(y===2||y===3)dot(x-1,y,"#dce2c2","behind");}
      }
      let carriedSpear=null;
      if(key==="lancer"&&!weaponHeld&&!frame.name.startsWith("attack")){
        const grip=[-3,13],cells=[];
        for(let n=0;n<14;n++){
          cells.push([grip[0]-n*.62,grip[1]-n*.69,"#293d48"]);
          cells.push([grip[0]-n*.62+1,grip[1]-n*.69,"#a6c3ba"]);
        }
        const tip=["a....","aba..",".bccb",".aba.","..a.."],palette={a:"#759eab",b:"#e5f0df",c:"#a6c3ba"};
        for(let y=0;y<tip.length;y++)for(let x=0;x<tip[y].length;x++)if(tip[y][x]!==".")cells.push([-13+x,1+y,palette[tip[y][x]]]);
        const hand=local(...grip),native=cells.map(([x,y,color])=>[...local(x,y),color]);let fit=1;
        // Keep the grip attached while foreshortening a leaning pose's weapon
        // into its authored frame, rather than clipping the tip off the sheet.
        for(const [x,y]of native)for(const [a,b,limit]of[[hand[0],x,frame.w],[hand[1],y,frame.h]]){
          if(b<1)fit=Math.min(fit,(a-1)/Math.max(1,a-b));
          if(b>limit-2)fit=Math.min(fit,(limit-2-a)/Math.max(1,b-a));
        }
        fit=Math.max(0,fit);
        const place=(x,y)=>[Math.round(hand[0]+(x-hand[0])*fit),Math.round(hand[1]+(y-hand[1])*fit)];
        for(const [x,y,color]of native){const p=place(x,y);if(!isFace(...p))put(...p,color);}
        carriedSpear={hand,tip:place(...local(-13,1)),fit};
      }
      if(key==="gunman"){
        const chest=(u,v,hex)=>{
          const [x,y]=local(u,v),i=at(x,y);
          if(i>=0&&original[i+3]===255&&pixels[i+3]===255&&!isFace(x,y))put(x,y,hex);
        };
        for(let n=0;n<11;n++){
          chest(-5+n,12+n*.8,"#503b35");chest(-5+n,13+n*.8,"#947049");
        }
        for(const [u,v,tip]of[[-3,13,"#b9f2ed"],[0,15,"#f4e4ad"],[3,17,"#cebae9"]]){
          for(let n=0;n<5;n++){
            chest(u,v+n,n===0?tip:n===4?"#a88050":"#4b3545");
            chest(u+1,v+n,n===0?tip:n===4?"#bc9561":"#947049");
          }
        }
        let hand=local(7,14),score=Infinity;
        for(let v=9;v<=17;v++)for(let u=4;u<=17;u++){
          const [x,y]=local(u,v),i=at(x,y);if(i<0||!cloth(...original.subarray(i,i+4)))continue;
          const s=(u-9)**2+(v-13)**2;if(s<score){score=s;hand=[x,y];}
        }
        for(let n=0;n<7;n++)put(Math.round(hand[0]+dir.x*n*.55-dir.downX*n*.75),Math.round(hand[1]+dir.y*n*.55-dir.downY*n*.75),n<2?"#a77a48":"#46334b");
        const tx=hand[0]+dir.x*3.5-dir.downX*4.7,ty=hand[1]+dir.y*3.5-dir.downY*4.7;
        put(Math.round(tx),Math.round(ty),"#a6e5f0");put(Math.round(tx-dir.downX),Math.round(ty-dir.downY),"#e5f5e6");
      }
      if(key==="whipado")for(const side of[-1,1]){
        const phase=frame.frame*.65+side;
        for(let n=0;n<9;n++){const x=side*(5+n*.6)+Math.sin(phase+n*.8)*1.4,y=16+n*.75+Math.cos(phase+n*.5);
          dot(x,y,"#3d3657","behind");dot(x,y-1,n>6?"#b5a2df":"#8673bd","behind");}
      }
      poses.push({head,hand:key==="gunman"?local(7,14):null,backSpear:key==="lancer"&&!weaponHeld&&!frame.name.startsWith("attack"),eyePixels,...(key==="lancer"?{carriedSpear}:{})});
    }
    return {changed,removed,frames:poses};
  }
  function tether(previous,center,target,delta,dt){
    const lag=Math.exp(-dt*6),offset={...target};
    if(previous&&Math.hypot(delta.x,delta.y)<256){offset.x+=(previous.offset.x-delta.x-offset.x)*lag;offset.y+=(previous.offset.y-delta.y-offset.y)*lag;}
    const span=Math.hypot(offset.x,offset.y),limit=85;if(span>limit){offset.x*=limit/span;offset.y*=limit/span;}
    return {x:center.x,y:center.y,offset,age:(previous?.age||0)+dt};
  }
  return {KEYS,CLEAN_SWORD,CLOUD,PLUS,THUMB,ELECTRIC_AURA,electricAuraCells,FROST_AURA,frostAuraCells,derive,guessHead,tether};
});
