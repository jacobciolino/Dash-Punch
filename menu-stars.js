"use strict";
((root,factory)=>{const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.DashMenuStars=api;})(globalThis,()=>{
  const LIMIT=72,PALETTE=["#35bfff","#ff786b","#ffe393","#b9a0ee","#8be5b3"];
  const SHAPE=[[0,-2],[0,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[0,1],[0,2]];
  function create({seed=1741,palette=PALETTE}={}){
    let state=seed>>>0,width=0,height=0,frames=0;
    const pool=[];
    function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
    function spawn(particle){
      const angle=random()*Math.PI*2,speed=5+random()*19;
      Object.assign(particle,{x:random()*width,y:random()*height,dx:Math.cos(angle),dy:Math.sin(angle),speed,
        life:2+random()*4,age:0,streakAt:random()<.15?.3+random()*1.1:Infinity,color:palette[Math.floor(random()*palette.length)],small:random()<.65});
      return particle;
    }
    function resize(w,h){
      width=Math.max(1,Math.floor(w));height=Math.max(1,Math.floor(h));
      const count=Math.min(LIMIT,Math.max(16,Math.round(width*height/6000)));
      pool.length=Math.min(pool.length,count);while(pool.length<count)pool.push({});for(const p of pool)spawn(p);
    }
    function update(dt,{visible=true,reducedMotion=false}={}){
      if(!visible||reducedMotion)return;
      const step=Math.max(0,Math.min(.05,dt));frames++;
      for(const p of pool){
        p.age+=step;if(p.age>=p.life){spawn(p);continue;}
        const speed=p.speed*(p.age>=p.streakAt?4.5:1);
        p.x+=p.dx*speed*step;p.y+=p.dy*speed*step;
        if(p.x < -6)p.x=width+6;else if(p.x>width+6)p.x=-6;
        if(p.y < -6)p.y=height+6;else if(p.y>height+6)p.y=-6;
      }
    }
    function draw(paint,exclusions=[],reducedMotion=false){
      paint.save();paint.imageSmoothingEnabled=false;paint.fillStyle="#000";paint.fillRect(0,0,width,height);
      for(const p of pool){
        const fade=reducedMotion?.65:Math.min(1,p.age/.2,(p.life-p.age)/.4),streak=!reducedMotion&&p.age>=p.streakAt;
        paint.fillStyle=p.color;
        if(streak)for(let i=1;i<=3;i++){paint.globalAlpha=fade*(.5-i*.1);paint.fillRect(Math.round(p.x-p.dx*i*3),Math.round(p.y-p.dy*i*3),1,1);}
        paint.globalAlpha=fade*.85;
        const x=Math.round(p.x),y=Math.round(p.y);
        if(p.small)paint.fillRect(x-1,y,3,1),paint.fillRect(x,y-1,1,3);
        else for(const [dx,dy]of SHAPE)paint.fillRect(x+dx,y+dy,1,1);
      }
      paint.globalAlpha=1;paint.fillStyle="#000";
      for(const rect of exclusions)paint.fillRect(Math.floor(rect.x)-3,Math.floor(rect.y)-3,Math.ceil(rect.w)+6,Math.ceil(rect.h)+6);
      paint.restore();
    }
    return {resize,update,draw,get stats(){return {count:pool.length,limit:LIMIT,width,height,frames};},
      snapshot(){return pool.map(p=>({...p}));}};
  }
  return {create,LIMIT,PALETTE,SHAPE};
});
