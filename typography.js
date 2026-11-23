"use strict";
(function(root){
  const family='"BackOut", system-ui, sans-serif',doc=root.document;
  const api={family,status:"unavailable",canvas:(size,weight=500)=>`${weight} ${size}px ${family}`};
  root.DashTypography=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(doc?.addEventListener){
    let target=null,tip=null,description="";
    const hide=()=>{
      tip?.remove();tip=null;
      if(target){if(description)target.setAttribute("aria-describedby",description);else target.removeAttribute("aria-describedby");}target=null;
    };
    const show=next=>{
      if(!next||next===target)return;hide();target=next;
      tip=doc.createElement("div");tip.id="appTooltip";tip.className="app-tooltip";tip.setAttribute("role","tooltip");tip.textContent=next.dataset.tooltip;doc.body.appendChild(tip);
      description=next.getAttribute("aria-describedby")||"";next.setAttribute("aria-describedby",`${description} appTooltip`.trim());
      const box=next.getBoundingClientRect(),bounds=tip.getBoundingClientRect();
      tip.style.left=`${Math.max(8,Math.min(root.innerWidth-bounds.width-8,box.left+(box.width-bounds.width)/2))}px`;
      tip.style.top=`${box.bottom+bounds.height+8>root.innerHeight?Math.max(8,box.top-bounds.height-6):box.bottom+6}px`;
    };
    doc.addEventListener("pointerover",event=>show(event.target.closest?.("[data-tooltip]")));
    doc.addEventListener("pointerout",event=>{if(target&&!target.contains(event.relatedTarget))hide();});
    doc.addEventListener("focusin",event=>show(event.target.closest?.("[data-tooltip]")));
    doc.addEventListener("focusout",hide);doc.addEventListener("pointerdown",hide);
    doc.addEventListener("keydown",event=>{if(event.code==="Escape")hide();});
  }
  if(!doc?.fonts?.load){api.ready=Promise.resolve(false);return;}
  const html=doc.documentElement;
  const status=value=>{api.status=value;if(html){html.dataset.fontStatus=value;html.classList.toggle("font-loading",value==="loading");}};
  status("loading");
  const load=doc.fonts.load('500 16px "BackOut"',"Dash Punch 0123456789 Ready").then(faces=>{
    if(!faces.length)throw Error("BackOut font face was not registered");
    status("ready");doc.getElementById("fontFailureNotice")?.remove();return true;
  });
  // Presentation startup has a bounded wait; font failure never blocks a match.
  let timer;
  api.ready=Promise.race([load,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("BackOut loading timed out")),5000);})]).catch(error=>{
    status("fallback");
    const notify=()=>{
      if(api.status==="ready"||!doc.body||doc.getElementById("fontFailureNotice"))return;
      const note=doc.createElement("div");note.id="fontFailureNotice";note.className="font-failure-notice";note.setAttribute("role","status");
      note.textContent="BackOut could not load. Using a system font.";doc.body.appendChild(note);
    };
    if(doc.body)notify();else doc.addEventListener("DOMContentLoaded",notify,{once:true});
    root.console?.warn?.(error.message);return false;
  }).finally(()=>clearTimeout(timer));
})(typeof globalThis!=="undefined"?globalThis:this);
