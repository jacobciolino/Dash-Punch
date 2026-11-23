"use strict";

// Canvas-only presentation adapter. Inputs are snapshots, never live combat objects.
(() => {
  function create({getImage,makeCanvas=()=>document.createElement("canvas")}) {
    const cache=new Map();
    let builds=0,filterPasses=0,composites=0,lastOffsets=[];
    const W=1056,H=600;
    function canvas(w=W,h=H) {const c=makeCanvas();c.width=w;c.height=h;return c;}
    function sources(profile) {return [...new Set(profile.layers.flatMap(layer=>layer.sources||[]).concat((profile.objects||[]).map(object=>object.src)))];}
    function prepare(profile) {return profile ? sources(profile).map(getImage).filter(Boolean) : [];}
    function cover(ctx,image) {
      const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      ctx.drawImage(image,Math.round((W-w)/2),Math.round((H-h)/2),Math.round(w),Math.round(h));
    }
    function atlasStamp(image,crop) {
      const [x,y,w,h]=crop,c=canvas(w,h),paint=c.getContext("2d");
      paint.drawImage(image,x,y,w,h,0,0,w,h);
      let pixels;
      try {pixels=paint.getImageData(0,0,w,h);} catch {return c;}
      if(!pixels?.data)return c;
      const data=pixels.data,corners=[0,w-1,(h-1)*w,w*h-1].filter(index=>data[index*4+3]>200)
        .map(index=>Array.from(data.slice(index*4,index*4+3)));
      const visited=new Uint8Array(w*h),queue=[];
      for(let i=0;i<w;i++)queue.push(i,(h-1)*w+i);
      for(let i=0;i<h;i++)queue.push(i*w,i*w+w-1);
      // Atlas panels contain a flat matte, not a rectangular in-world object.
      // Remove only border-connected matte pixels; preserve enclosed art detail.
      for(let cursor=0;cursor<queue.length;cursor++) {
        const index=queue[cursor];if(visited[index])continue;visited[index]=1;
        const p=index*4;
        if(data[p+3] && !corners.some(color=>color.every((value,channel)=>Math.abs(value-data[p+channel])<=4)))continue;
        data[p+3]=0;
        const col=index%w,row=Math.floor(index/w);
        if(col>0)queue.push(index-1);if(col<w-1)queue.push(index+1);
        if(row>0)queue.push(index-w);if(row<h-1)queue.push(index+w);
      }
      paint.putImageData(pixels,0,0);return c;
    }
    function build(profile,quality) {
      const key=profile.id+":"+quality;
      if(cache.has(key))return cache.get(key);
      if(sources(profile).map(getImage).some(image=>!image?.complete||!image.naturalWidth))return null;
      const layers=profile.layers.map((layer,index)=>{
        let c=canvas();const paint=c.getContext("2d");paint.imageSmoothingEnabled=false;
        if(index===0){paint.fillStyle=profile.base;paint.fillRect(0,0,W,H);}
        for(const src of layer.sources||[])cover(paint,getImage(src));
        if(layer.atlas) {
          const image=getImage(layer.sources[0]);paint.clearRect(0,0,W,H);
          if(index===0) {
            paint.fillStyle=profile.base;paint.fillRect(0,0,W,H);
            for(let y=0;y<H;y+=160)for(let x=0;x<W;x+=256)paint.drawImage(image,144,16,128,80,x,y,256,160);
          } else if(index===1) {
            const stamp=atlasStamp(image,[240,416,96,96]);
            for(let x=-64;x<W;x+=288)paint.drawImage(stamp,x,190,192,192);
          } else {
            const stamp=atlasStamp(image,[144,304,64,96]);
            for(let x=120;x<W;x+=320)paint.drawImage(stamp,x,0,128,192);
          }
        }
        // Grade only scenery pixels, not transparent padding or actors/surfaces.
        paint.globalCompositeOperation="source-atop";paint.fillStyle=layer.tint||profile.grade;
        paint.globalAlpha=layer.grade ?? .10;paint.fillRect(0,0,W,H);paint.globalAlpha=1;paint.globalCompositeOperation="source-over";
        if(quality==="enhanced" && layer.blur>0) {
          const blurred=canvas(),blur=blurred.getContext("2d");
          blur.filter=`blur(${layer.blur}px)`;blur.drawImage(c,0,0);c=blurred;filterPasses++;
        }
        return c;
      });
      const atmosphere=canvas(),paint=atmosphere.getContext("2d");
      if(profile.pixelArt){paint.fillStyle=profile.shade;paint.fillRect(0,0,W,H);}
      else {
        const fog=paint.createLinearGradient(0,H*.22,0,H);
        fog.addColorStop(0,"transparent");fog.addColorStop(.6,profile.fog);fog.addColorStop(1,profile.fogBottom);
        paint.fillStyle=fog;paint.fillRect(0,0,W,H);
        const ambient=paint.createLinearGradient(0,0,W,H);
        ambient.addColorStop(0,profile.ambient);ambient.addColorStop(.6,"transparent");ambient.addColorStop(1,profile.shade);
        paint.fillStyle=ambient;paint.fillRect(0,0,W,H);
      }
      const objects=profile.objects?.length ? canvas() : null,objectPaint=objects?.getContext("2d");
      if(objectPaint)objectPaint.imageSmoothingEnabled=false;
      for(const object of profile.objects||[])objectPaint.drawImage(atlasStamp(getImage(object.src),object.crop),object.x,object.y,object.w,object.h);
      let bloom=null;
      if(quality==="enhanced" && profile.objects?.some(object=>object.luminous)) {
        bloom=canvas();
        const mask=canvas(),maskPaint=mask.getContext("2d");
        for(const object of profile.objects)if(object.luminous)maskPaint.drawImage(atlasStamp(getImage(object.src),object.crop),object.x,object.y,object.w,object.h);
        let pixels;
        try {pixels=maskPaint.getImageData(0,0,W,H);} catch {}
        if(pixels?.data) {
          for(let i=0;i<pixels.data.length;i+=4) {
            const brightness=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);
            pixels.data[i+3]*=Math.max(0,Math.min(1,(brightness-140)/60));
          }
          maskPaint.putImageData(pixels,0,0);
        }
        const light=bloom.getContext("2d");light.filter="blur(7px)";light.drawImage(mask,0,0);filterPasses++;
      }
      const light=profile.pixelArt?null:canvas(256,256);
      if(light){const lightPaint=light.getContext("2d"),glow=lightPaint.createRadialGradient(128,128,0,128,128,128);
        glow.addColorStop(0,profile.light);glow.addColorStop(.35,profile.lightSoft);glow.addColorStop(1,"transparent");
        lightPaint.fillStyle=glow;lightPaint.fillRect(0,0,256,256);}
      const entry={layers,atmosphere,objects,bloom,light,composite:canvas(960,540),compositeKey:null};
      // Four active themes; quality changes clear caches in the settings hook.
      if(cache.size>=4)cache.delete(cache.keys().next().value);
      cache.set(key,entry);builds++;return entry;
    }
    function draw(ctx,{profile,quality="enhanced",view,focus,camera,mood={},time=0}) {
      if(!profile||quality==="classic"&&!profile.pixelArt)return false;
      const entry=build(profile,quality);if(!entry)return false;
      const dx=Math.max(-1,Math.min(1,focus.x)),dy=Math.max(-1,Math.min(1,focus.y));
      lastOffsets=entry.layers.map((layer,index)=>{
        const depth=profile.layers[index].parallax*(mood.parallaxScale ?? 1);
        const drift=quality==="classic"?0:profile.layers[index].drift||0,t=Number.isFinite(time)?time:0;
        const x=Math.round(Math.max(-40,Math.min(40,(profile.fixedView?0:-dx*depth-camera.x*depth*.004)+Math.sin(t/(38+index*13))*drift)));
        const y=Math.round(Math.max(-24,Math.min(24,(profile.fixedView?0:-dy*depth*.5-camera.y*depth*.003)+Math.sin(t/(53+index*17))*drift*.2)));
        return {x,y};
      });
      const haze=Math.max(.5,Math.min(1.3,mood.hazeScale ?? 1));
      const key=haze+":"+lastOffsets.map(point=>`${point.x},${point.y}`).join(";");
      if(entry.compositeKey!==key) {
        const paint=entry.composite.getContext("2d");paint.clearRect(0,0,960,540);paint.imageSmoothingEnabled=false;
        entry.layers.forEach((layer,index)=>paint.drawImage(layer,-48+lastOffsets[index].x,-30+lastOffsets[index].y));
        if(entry.objects)paint.drawImage(entry.objects,-48,-30);
        paint.save();paint.globalAlpha=Math.min(1,haze);paint.drawImage(entry.atmosphere,-48,-30);paint.restore();
        if(haze>1){paint.save();paint.globalAlpha=haze-1;paint.drawImage(entry.atmosphere,-48,-30);paint.restore();}
        if(entry.bloom){paint.save();paint.globalCompositeOperation="screen";paint.globalAlpha=.22;paint.drawImage(entry.bloom,-48,-30);paint.restore();}
        entry.compositeKey=key;composites++;
      }
      ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.drawImage(entry.composite,view.x,view.y,view.w,view.h);
      ctx.restore();return true;
    }
    function illuminate(ctx,{profile,quality,lights,view}) {
      if(quality!=="enhanced"||!profile||profile.pixelArt)return;
      const entry=cache.get(profile.id+":"+quality);if(!entry)return;
      ctx.save();ctx.globalCompositeOperation="screen";ctx.imageSmoothingEnabled=true;
      for(const light of lights.slice(0,3)) {
        ctx.globalAlpha=Math.min(.22,Math.max(0,light.strength));
        const radius=Math.min(view.w*.32,light.radius);
        ctx.drawImage(entry.light,light.x-radius,light.y-radius,radius*2,radius*2);
      }
      ctx.restore();
    }
    return {prepare,draw,illuminate,warm:profile=>profile ? build(profile,"enhanced") : null,clear:()=>cache.clear(),get stats(){return {entries:cache.size,builds,filterPasses,composites,lastOffsets,
      pixels:[...cache.values()].reduce((total,entry)=>total+(entry.layers.length+1+Number(Boolean(entry.objects))+Number(Boolean(entry.bloom)))*W*H+256*256+960*540,0)};}};
  }
  const api={create};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else window.DashStageRenderer=api;
})();
