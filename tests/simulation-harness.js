"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function createGame(root=process.cwd(),visual={}) {
  const noop = () => {};
  const context = new Proxy({ measureText: value => ({width:String(value).length * 8}) }, {
    get:(target,key) => key in target ? target[key] : noop,
    set:(target,key,value) => (target[key] = value, true),
  });
  const listeners = new Map();
  const elements = new Map();
  const element = (id = "") => {const target={ id, width:1280, height:720, style:{}, dataset:{},
    classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, appendChild:noop,remove:noop,
    addEventListener:noop,setAttribute:noop,removeAttribute:noop,focus:noop,scrollIntoView:noop,
    contains:()=>false,querySelector:()=>null,querySelectorAll:()=>[],
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:30}),getContext:()=>context,closest:()=>null,
    innerHTML:"",textContent:"",disabled:false,hidden:false };
    if(visual.makeCanvas&&["game","canvas","stageBuilderCanvas"].includes(id)){
      const surface=visual.makeCanvas();for(const [key,value] of Object.entries(target))if(key!=="getContext")surface[key]=value;
      return surface;
    }
    return target;
  };
  const document = { body:element("body"),activeElement:null,createElement:element,
    getElementById(id) { if (!elements.has(id)) elements.set(id,element(id)); return elements.get(id); } };
  let raf = null;
  let clock = 1000;
  const window = { location:{protocol:"http:",host:"localhost:8080",href:"http://localhost:8080/?debugHitboxes=1",search:"?debugHitboxes=1"},
    addEventListener:(name,fn)=>listeners.set(name,fn),localStorage:{getItem:()=>null,setItem:noop,removeItem:noop} };
  const sandbox = { console,document,window,navigator:{getGamepads:()=>[]},performance:{now:()=>clock},
    requestAnimationFrame:fn=>(raf=fn),URL,URLSearchParams,setTimeout,clearTimeout };
  if(visual.Image)sandbox.Image=visual.Image;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of ["typography.js","presentation-assets.js","rollback.js","match-flow.js","lobby-cards.js","sports.js","target-charge.js","arena-variants.js","team-objectives.js","dashball.js","sandbag.js","sports-guide.js","stage-renderer.js","team-silhouette.js","boomerang.js","game.js"]) {
    if(["team-objectives.js","arena-variants.js","sports-guide.js","typography.js","lobby-cards.js","match-flow.js","boomerang.js","target-charge.js","dashball.js","sandbag.js","team-silhouette.js"].includes(file)&&!fs.existsSync(path.join(root,file)))continue;
    if(file==="game.js"&&fs.existsSync(path.join(root,"radial-menu.js")))vm.runInContext(fs.readFileSync(path.join(root,"radial-menu.js"),"utf8"),sandbox,{filename:"radial-menu.js"});
    if(file==="game.js"&&fs.existsSync(path.join(root,"fighter-presentation.js")))vm.runInContext(fs.readFileSync(path.join(root,"fighter-presentation.js"),"utf8"),sandbox,{filename:"fighter-presentation.js"});
    if(file==="game.js"&&fs.existsSync(path.join(root,"ice.js")))vm.runInContext(fs.readFileSync(path.join(root,"ice.js"),"utf8"),sandbox,{filename:"ice.js"});
    if(file==="game.js"&&fs.existsSync(path.join(root,"ember.js")))vm.runInContext(fs.readFileSync(path.join(root,"ember.js"),"utf8"),sandbox,{filename:"ember.js"});
    vm.runInContext(visual.sourceOverrides?.[file]??fs.readFileSync(path.join(root,file),"utf8"),sandbox,{filename:file});
  }
  return { debug:window.__dashPunchDebug, rb:window.__dashPunchDebug.online.rollback, codec:sandbox.DashRollback,
    sandbox, elements, listeners,
    render(time) { clock=time; raf(time); },
  };
}
module.exports = { createGame };
