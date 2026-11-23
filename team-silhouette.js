"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.DashTeamSilhouette=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  function create({makeCanvas,maxEntries=320,maxPixels=1200000}={}){
    const frames=new Map(),ids=new WeakMap();let serial=0,pixels=0,builds=0,hits=0,mask=null,spread=null;
    function canvas(w,h){const c=makeCanvas();c.width=w;c.height=h;return c;}
    function frame(image,sx,sy,sw,sh,color,step=1){
      if(!ids.has(image))ids.set(image,++serial);
      const w=Math.max(1,Math.round(sw/step)),h=Math.max(1,Math.round(sh/step)),pad=6;
      const key=`${ids.get(image)}:${sx}:${sy}:${sw}:${sh}:${w}:${h}:${color}`;
      if(frames.has(key)){const cached=frames.get(key);frames.delete(key);frames.set(key,cached);hits++;return cached;}
      if(!mask){mask=canvas(1,1);spread=canvas(1,1);}
      mask.width=spread.width=w+pad*2;mask.height=spread.height=h+pad*2;
      const m=mask.getContext("2d"),s=spread.getContext("2d");m.imageSmoothingEnabled=false;s.imageSmoothingEnabled=false;
      m.drawImage(image,sx,sy,sw,sh,pad,pad,w,h);
      // Native-pixel dilation minus the source alpha preserves holes and artwork.
      for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x*x+y*y<=4)s.drawImage(mask,x,y);
      s.globalCompositeOperation="destination-out";s.drawImage(mask,0,0);s.globalCompositeOperation="source-in";s.fillStyle=color;s.fillRect(0,0,spread.width,spread.height);
      const outline=canvas(spread.width,spread.height),o=outline.getContext("2d");o.drawImage(spread,0,0);
      const glow=canvas(spread.width,spread.height),g=glow.getContext("2d");g.shadowColor=color;g.shadowBlur=3;g.drawImage(outline,0,0);g.shadowBlur=0;
      g.globalCompositeOperation="destination-out";g.drawImage(mask,0,0);g.drawImage(outline,0,0);
      const size=outline.width*outline.height*2;
      while(frames.size&&(frames.size>=maxEntries||pixels+size>maxPixels)){const oldest=frames.keys().next().value;pixels-=frames.get(oldest).pixels;frames.delete(oldest);}
      const result={outline,glow,width:w,height:h,pad,pixels:size};
      if(size<=maxPixels){frames.set(key,result);pixels+=size;}
      builds++;return result;
    }
    function draw(ctx,image,sx,sy,sw,sh,dx,dy,dw,dh,{color,step=1,outlines=true,glow=true,drawArt=true}={}){
      const cached=frame(image,sx,sy,sw,sh,color,step),scaleX=dw/cached.width,scaleY=dh/cached.height;
      const x=Math.round(dx)-cached.pad*scaleX,y=Math.round(dy)-cached.pad*scaleY,w=cached.outline.width*scaleX,h=cached.outline.height*scaleY;
      ctx.save();ctx.imageSmoothingEnabled=false;
      if(glow){ctx.save();ctx.globalAlpha*=.32;ctx.drawImage(cached.glow,x,y,w,h);ctx.restore();}
      if(outlines)ctx.drawImage(cached.outline,x,y,w,h);
      if(drawArt)ctx.drawImage(image,sx,sy,sw,sh,Math.round(dx),Math.round(dy),dw,dh);ctx.restore();
    }
    return {draw,frame,clear(){frames.clear();pixels=0;},get stats(){return {entries:frames.size,pixels,builds,hits,maxEntries,maxPixels};}};
  }
  return {create};
});
