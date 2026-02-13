const WORKER_URL="https://nizzix.xyz/robloxassets";
const FACE_ORDER=["Right","Left","Front","Back","Up","Down"];
const FACE_SHORT={Right:"Rt",Left:"Lf",Front:"Ft",Back:"Bk",Up:"Up",Down:"Dn"};
const faces={};
let sourceFileName="";
let sourceImage=null;

window.addEventListener("DOMContentLoaded",()=>{
  try{
    const c=JSON.parse(localStorage.getItem("byefron_skybox")||"{}");
    if(c.apiKey&&c.apiKey.length>20)document.getElementById("apiKey").value=c.apiKey;
    if(c.userId&&/^\d+$/.test(c.userId))document.getElementById("userId").value=c.userId;
  }catch(e){}
  renderHistory();
});

function switchTab(name){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
  document.querySelectorAll(".tab-content").forEach(t=>t.classList.toggle("active",t.id===`tab-${name}`));
  if(name==="history")renderHistory();
}

const fileInput=document.getElementById("fileInput");
fileInput.addEventListener("change",e=>{if(e.target.files[0])loadFile(e.target.files[0])});
let dragCounter=0;
function hasExternalFiles(e){return e.dataTransfer&&e.dataTransfer.types&&e.dataTransfer.types.indexOf("Files")!==-1}
document.addEventListener("dragenter",e=>{e.preventDefault();if(!hasExternalFiles(e))return;dragCounter++;document.getElementById("dropOverlay").classList.add("visible")});
document.addEventListener("dragleave",e=>{e.preventDefault();if(!hasExternalFiles(e))return;dragCounter--;if(dragCounter<=0){dragCounter=0;document.getElementById("dropOverlay").classList.remove("visible")}});
document.addEventListener("dragover",e=>e.preventDefault());
document.addEventListener("drop",e=>{e.preventDefault();dragCounter=0;document.getElementById("dropOverlay").classList.remove("visible");if(e.dataTransfer.files&&e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});

function loadFile(file){
  const img=new Image();
  img.onload=()=>{
    sourceImage=img;
    sourceFileName=file.name.replace(/\.[^.]+$/,"");
    document.getElementById("fileInfo").textContent=`${file.name} \u2014 ${img.width}\u00d7${img.height}`;
    const cleaned=sourceFileName.replace(/[_\-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();
    document.getElementById("presetName").value=cleaned;
    document.getElementById("controlsBar").classList.remove("hidden");
    switchTab("convert");
    convertToFaces(img);
  };
  img.src=URL.createObjectURL(file);
}

const rotSlider=document.getElementById("rotSlider");
const rotVal=document.getElementById("rotVal");
rotSlider.addEventListener("input",()=>{rotVal.textContent=rotSlider.value+"\u00b0"});
rotSlider.addEventListener("change",()=>{if(sourceImage)convertToFaces(sourceImage)});

const brSlider=document.getElementById("brSlider");
const ctSlider=document.getElementById("ctSlider");
const satSlider=document.getElementById("satSlider");
const brVal=document.getElementById("brVal");
const ctVal=document.getElementById("ctVal");
const satVal=document.getElementById("satVal");
brSlider.addEventListener("input",()=>{brVal.textContent=brSlider.value});
ctSlider.addEventListener("input",()=>{ctVal.textContent=ctSlider.value});
satSlider.addEventListener("input",()=>{satVal.textContent=satSlider.value});
brSlider.addEventListener("change",()=>{if(sourceImage)convertToFaces(sourceImage)});
ctSlider.addEventListener("change",()=>{if(sourceImage)convertToFaces(sourceImage)});
satSlider.addEventListener("change",()=>{if(sourceImage)convertToFaces(sourceImage)});

function reconvert(){
  if(!sourceImage)return;
  convertToFaces(sourceImage);
}

function applyBCS(sd){
  const br=parseInt(brSlider.value)||0;
  const ct=parseInt(ctSlider.value)||0;
  const sat=parseInt(satSlider.value)||0;
  if(br===0&&ct===0&&sat===0)return sd;
  const d=sd.data;
  const cF=(259*(ct+255))/(255*(259-ct));
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2];
    r+=br*2.55;g+=br*2.55;b+=br*2.55;
    r=cF*(r-128)+128;g=cF*(g-128)+128;b=cF*(b-128)+128;
    if(sat!==0){
      const gray=0.2126*r+0.7152*g+0.0722*b;
      const s=1+sat/100;
      r=gray+s*(r-gray);g=gray+s*(g-gray);b=gray+s*(b-gray);
    }
    d[i]=Math.max(0,Math.min(255,r));
    d[i+1]=Math.max(0,Math.min(255,g));
    d[i+2]=Math.max(0,Math.min(255,b));
  }
  return sd;
}

function stampWatermark(canvas){
  if(!document.getElementById("wmCheck").checked)return;
  const txt=document.getElementById("wmText").value.trim();
  if(!txt)return;
  const ctx=canvas.getContext("2d");
  const sz=Math.max(10,canvas.width*0.06);
  ctx.save();
  ctx.font=`bold ${sz}px sans-serif`;
  ctx.fillStyle="rgba(255,255,255,0.25)";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.rotate(-Math.PI/6);
  ctx.fillText(txt,0,0);
  ctx.restore();
}

function convertToFaces(img){
  const selRes=parseInt(document.getElementById("resSelect").value)||1024;
  const faceSize=Math.min(img.height,selRes);
  const rotDeg=parseInt(rotSlider.value)||0;
  const rotRad=rotDeg*Math.PI/180;
  document.getElementById("faceSize").textContent=`${faceSize}\u00d7${faceSize}`;
  const src=document.createElement("canvas");
  src.width=img.width;src.height=img.height;
  const sctx=src.getContext("2d");
  sctx.drawImage(img,0,0);
  const sd=applyBCS(sctx.getImageData(0,0,img.width,img.height));
  const O={
    Right:(x,y)=>({x:-1,y:-x,z:-y}),Left:(x,y)=>({x:1,y:x,z:-y}),
    Front:(x,y)=>({x:x,y:-1,z:-y}),Back:(x,y)=>({x:-x,y:1,z:-y}),
    Up:(x,y)=>({x:-y,y:-x,z:1}),Down:(x,y)=>({x:y,y:-x,z:-1}),
  };
  const w=sd.width,h=sd.height;
  const prog=document.getElementById("convertProgress");
  const fill=document.getElementById("convertFill");
  const label=document.getElementById("convertLabel");
  prog.classList.add("visible");fill.style.width="0%";
  let fi=0;
  function doFace(){
    if(fi>=FACE_ORDER.length){
      prog.classList.remove("visible");
      showResults();
      setTimeout(()=>init3DPreview(),50);
      return;
    }
    const face=FACE_ORDER[fi];
    label.textContent=`Converting ${face} (${fi+1}/6)...`;
    fill.style.width=`${(fi/6)*100}%`;
    setTimeout(()=>{
      const c=document.createElement("canvas");c.width=faceSize;c.height=faceSize;
      const ctx=c.getContext("2d");const wd=ctx.createImageData(faceSize,faceSize);
      const orient=O[face];
      for(let px=0;px<faceSize;px++){for(let py=0;py<faceSize;py++){
        const fx=(2*(px+.5)/faceSize)-1,fy=(2*(py+.5)/faceSize)-1;
        const cb=orient(fx,fy);const r=Math.sqrt(cb.x*cb.x+cb.y*cb.y+cb.z*cb.z);
        let lon=Math.atan2(cb.y,cb.x)+rotRad;const lat=Math.acos(cb.z/r);
        let sx=w*lon/(2*Math.PI)-.5;const sy=h*lat/Math.PI-.5;
        sx=((sx%w)+w)%w;
        const si=(Math.round(Math.min(Math.max(sy,0),h-1))*w+Math.round(Math.min(Math.max(sx,0),w-1)))*4;
        const di=(py*faceSize+px)*4;
        wd.data[di]=sd.data[si];wd.data[di+1]=sd.data[si+1];wd.data[di+2]=sd.data[si+2];wd.data[di+3]=255;
      }}
      ctx.putImageData(wd,0,0);stampWatermark(c);faces[face]=c;
      fill.style.width=`${((fi+1)/6)*100}%`;
      fi++;
      doFace();
    },10);
  }
  doFace();
}

function showResults(){
  document.getElementById("splitView").classList.remove("hidden");
  document.getElementById("exportBtn").classList.remove("hidden");
  document.getElementById("exportZipBtn").classList.remove("hidden");
  document.getElementById("luaBtn").classList.remove("hidden");
  document.getElementById("uploadToggle").classList.remove("hidden");
  document.querySelectorAll(".cube-grid .face[data-face]").forEach(el=>{
    const f=el.dataset.face;
    if(faces[f]){
      let i=el.querySelector("img");if(!i){i=document.createElement("img");el.appendChild(i)}
      i.src=faces[f].toDataURL();
      i.draggable=false;
    }
    if(!el.querySelector(".face-replace-hint")){
      const hint=document.createElement("div");hint.className="face-replace-hint";hint.textContent="Drop image / Drag to swap";
      el.appendChild(hint);
    }
    el.draggable=true;
    el.addEventListener("dragstart",onFaceDragStart);
    el.addEventListener("dragover",onFaceDragOver);
    el.addEventListener("dragleave",onFaceDragLeave);
    el.addEventListener("drop",onFaceDrop);
  });
  const list=document.getElementById("faceList");list.innerHTML="";
  for(const face of FACE_ORDER){
    const d=document.createElement("div");d.className="face-item";
    d.innerHTML=`<span class="tag">${FACE_SHORT[face]}</span><span class="fname">${FACE_SHORT[face]}_${sourceFileName}.png</span>`;
    d.onclick=()=>exportFace(face);list.appendChild(d);
  }
}

let draggedFace=null;
function onFaceDragStart(e){
  draggedFace=this.dataset.face;
  e.dataTransfer.effectAllowed="move";
  this.style.opacity="0.4";
  setTimeout(()=>{this.style.opacity=""},200);
}
function onFaceDragOver(e){
  e.preventDefault();
  if(draggedFace&&this.dataset.face&&this.dataset.face!==draggedFace)this.classList.add("drag-over");
}
function onFaceDragLeave(e){
  this.classList.remove("drag-over");
}
function onFaceDrop(e){
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove("drag-over");
  const targetFace=this.dataset.face;
  if(!targetFace)return;
  if(e.dataTransfer.files&&e.dataTransfer.files[0]&&e.dataTransfer.files[0].type.startsWith("image/")){
    const file=e.dataTransfer.files[0];
    const img=new Image();
    img.onload=()=>{
      const sz=faces[targetFace]?faces[targetFace].width:1024;
      const c=document.createElement("canvas");c.width=sz;c.height=sz;
      c.getContext("2d").drawImage(img,0,0,sz,sz);
      stampWatermark(c);
      faces[targetFace]=c;
      const el=document.querySelector(`.cube-grid .face[data-face="${targetFace}"]`);
      if(el){let i=el.querySelector("img");if(i)i.src=c.toDataURL()}
      if(gl3d){uploadFaceTextures();render3D()}
    };
    img.src=URL.createObjectURL(file);
    draggedFace=null;
    return;
  }
  if(!draggedFace||draggedFace===targetFace)return;
  const tmp=faces[draggedFace];
  faces[draggedFace]=faces[targetFace];
  faces[targetFace]=tmp;
  document.querySelectorAll(".cube-grid .face[data-face]").forEach(el=>{
    const f=el.dataset.face;
    if(faces[f]){let i=el.querySelector("img");if(i)i.src=faces[f].toDataURL()}
  });
  draggedFace=null;
  if(gl3d){uploadFaceTextures();render3D()}
}

function exportFace(face){
  if(!faces[face])return;const a=document.createElement("a");
  a.download=`${FACE_SHORT[face]}_${sourceFileName}.png`;a.href=faces[face].toDataURL("image/png");a.click();
}
function exportAll(){for(const f of FACE_ORDER)exportFace(f)}

async function exportZip(){
  if(typeof JSZip==="undefined"){alert("JSZip not loaded");return}
  const zip=new JSZip();
  for(const face of FACE_ORDER){
    if(!faces[face])continue;
    const blob=await new Promise(r=>faces[face].toBlob(r,"image/png"));
    zip.file(`${FACE_SHORT[face]}_${sourceFileName}.png`,blob);
  }
  const content=await zip.generateAsync({type:"blob"});
  const a=document.createElement("a");
  a.download=`${sourceFileName}_skybox.zip`;
  a.href=URL.createObjectURL(content);
  a.click();
  URL.revokeObjectURL(a.href);
}

function saveConfig(){
  localStorage.setItem("byefron_skybox",JSON.stringify({
    apiKey:document.getElementById("apiKey").value,
    userId:document.getElementById("userId").value,
  }));
}
["apiKey","userId"].forEach(id=>document.getElementById(id).addEventListener("input",saveConfig));

function openUploadModal(){
  document.getElementById("uploadOverlay").classList.add("open");
  const btn=document.getElementById("uploadBtn");
  btn.textContent="Upload All Faces";btn.disabled=false;
  btn.onclick=uploadAll;
  document.getElementById("progressBar").style.display="none";
  document.getElementById("jsonOutput").classList.add("hidden");
  const warn=document.getElementById("noCredsWarn");
  const ak=document.getElementById("apiKey").value.trim();
  const ui=document.getElementById("userId").value.trim();
  if(!ak||!ui){warn.classList.remove("hidden");btn.disabled=true}else{warn.classList.add("hidden")}
  buildSteps();
}
function closeUploadModal(){document.getElementById("uploadOverlay").classList.remove("open")}
document.getElementById("uploadOverlay").addEventListener("click",e=>{if(e.target===e.currentTarget)closeUploadModal()});

function buildSteps(){
  const c=document.getElementById("uploadSteps");c.innerHTML="";
  for(const face of FACE_ORDER){
    const d=document.createElement("div");d.className="upload-step";d.id=`step-${face}`;
    d.innerHTML=`<div class="dot"></div><span>${FACE_SHORT[face]} \u2014 ${face}</span>`;c.appendChild(d);
  }
}
function setStep(face,state,detail){
  const el=document.getElementById(`step-${face}`);if(!el)return;
  el.className=`upload-step ${state}`;const dot=el.querySelector(".dot");
  if(state==="done")dot.textContent="\u2713";else if(state==="err")dot.textContent="!";else dot.textContent="";
  if(detail)el.querySelector("span").textContent=`${FACE_SHORT[face]} \u2014 ${detail}`;
}

function syntaxJSON(obj){
  const str=JSON.stringify(obj,null,2);
  return str.replace(/(".*?")(\s*:\s*)/g,'<span class="j-key">$1</span><span class="j-colon">$2</span>')
    .replace(/:\s*(".*?")/g,': <span class="j-str">$1</span>')
    .replace(/[{}]/g,'<span class="j-brace">$&</span>');
}

async function uploadAll(){
  const apiKey=document.getElementById("apiKey").value.trim();
  const userId=document.getElementById("userId").value.trim();
  const preset=document.getElementById("presetName").value.trim()||"My Skybox";
  if(!apiKey||!userId){switchTab("settings");closeUploadModal();return}

  const btn=document.getElementById("uploadBtn");
  const bar=document.getElementById("progressBar");
  const fill=document.getElementById("progressFill");
  const jo=document.getElementById("jsonOutput");

  btn.disabled=true;btn.textContent="Uploading...";
  bar.style.display="block";fill.style.width="0%";
  jo.classList.add("hidden");
  saveConfig();buildSteps();

  const ids={};const thumbs={};
  for(let i=0;i<FACE_ORDER.length;i++){
    const face=FACE_ORDER[i];
    setStep(face,"active","Uploading...");
    fill.style.width=`${(i/6)*100}%`;
    try{
      const blob=await new Promise(r=>faces[face].toBlob(r,"image/png"));
      const imgBuf=await blob.arrayBuffer();
      const jsonPart=JSON.stringify({assetType:"Image",displayName:`${preset}_${FACE_SHORT[face]}`.slice(0,50),description:"Skybox face",creationContext:{creator:{userId}}});
      const boundary="----BF"+Date.now()+i;
      const enc=new TextEncoder();
      const parts=[
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${jsonPart}\r\n`),
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="${FACE_SHORT[face]}.png"\r\nContent-Type: image/png\r\n\r\n`),
        new Uint8Array(imgBuf),
        enc.encode(`\r\n--${boundary}--\r\n`)
      ];
      const totalLen=parts.reduce((a,b)=>a+b.byteLength,0);
      const body=new Uint8Array(totalLen);
      let off=0;for(const p of parts){body.set(p,off);off+=p.byteLength;}
      const resp=await fetch(`${WORKER_URL}/assets/v1/assets`,{method:"POST",headers:{"x-api-key":apiKey,"content-type":`multipart/form-data; boundary=${boundary}`},body:body.buffer});
      if(!resp.ok)throw new Error(`HTTP ${resp.status}`);
      const data=await resp.json();
      let aid=data?.response?.assetId;
      if(!aid&&data.path){
        setStep(face,"active","Processing...");
        for(let p=0;p<30;p++){
          await new Promise(r=>setTimeout(r,2000));
          const pr=await fetch(`${WORKER_URL}/assets/v1/${data.path}`,{headers:{"x-api-key":apiKey}});
          if(pr.ok){const pd=await pr.json();if(pd.done){aid=pd.response?.assetId;break}}
        }
      }
      if(!aid)throw new Error("No asset ID returned");
      ids[face]=String(aid);
      const tc=document.createElement("canvas");tc.width=64;tc.height=64;
      tc.getContext("2d").drawImage(faces[face],0,0,64,64);
      thumbs[face]=tc.toDataURL("image/jpeg",0.6);
      setStep(face,"done",`rbxassetid://${aid}`);
    }catch(e){
      setStep(face,"err",e.message);
      btn.disabled=false;btn.textContent="Retry Upload";return;
    }
    fill.style.width=`${((i+1)/6)*100}%`;
    await new Promise(r=>setTimeout(r,800));
  }

  fill.style.width="100%";
  const json={name:preset,bk:`rbxassetid://${ids.Back||""}`,dn:`rbxassetid://${ids.Down||""}`,
    ft:`rbxassetid://${ids.Front||""}`,lf:`rbxassetid://${ids.Left||""}`,
    rt:`rbxassetid://${ids.Right||""}`,up:`rbxassetid://${ids.Up||""}`};

  jo.innerHTML=syntaxJSON(json);
  jo.classList.remove("hidden");
  jo.onclick=()=>{navigator.clipboard.writeText(JSON.stringify(json,null,2));
    jo.style.borderColor="var(--green)";setTimeout(()=>jo.style.borderColor="",1000)};
  btn.disabled=false;btn.textContent="Done";
  btn.onclick=null;
  btn.onclick=()=>closeUploadModal();

  lastUploadIds=ids;
  saveToHistory({name:preset,date:new Date().toISOString(),ids,thumbs,json});
}

function getHistory(){
  try{return JSON.parse(localStorage.getItem("byefron_history")||"[]")}catch(e){return[]}
}
function saveToHistory(entry){
  const h=getHistory();
  h.unshift(entry);
  if(h.length>20)h.length=20;
  localStorage.setItem("byefron_history",JSON.stringify(h));
}
function deleteHistory(idx){
  const h=getHistory();h.splice(idx,1);
  localStorage.setItem("byefron_history",JSON.stringify(h));
  renderHistory();
}
function renderHistory(){
  const container=document.getElementById("historyContainer");
  const empty=document.getElementById("historyEmpty");
  const h=getHistory();
  container.querySelectorAll(".history-item").forEach(el=>el.remove());
  if(h.length===0){empty.classList.remove("hidden");return}
  empty.classList.add("hidden");
  h.forEach((entry,idx)=>{
    const div=document.createElement("div");div.className="history-item";
    const date=new Date(entry.date);
    const dateStr=date.toLocaleDateString()+" "+date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    let facesHtml="";
    if(entry.thumbs){
      for(const face of FACE_ORDER){
        if(entry.thumbs[face])facesHtml+=`<div class="hi-face"><img src="${entry.thumbs[face]}"></div>`;
      }
    }
    div.innerHTML=`
      <div class="hi-header"><span class="hi-name">${entry.name}</span><span class="hi-date">${dateStr}</span></div>
      <div class="hi-faces">${facesHtml}</div>
      <div class="json-box" style="display:block;max-height:140px;font-size:11px;cursor:pointer" onclick="navigator.clipboard.writeText(this.dataset.raw);this.style.borderColor='var(--green)';setTimeout(()=>this.style.borderColor='',800)" data-raw='${JSON.stringify(entry.json).replace(/'/g,"&#39;")}'>${syntaxJSON(entry.json)}</div>
      <div class="hi-actions" style="margin-top:10px">
        <button class="btn" onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(entry.json).replace(/"/g,'&quot;')},null,2))">Copy JSON</button>
        <button class="btn" onclick="historyLua(${idx})">Lua Code</button>
        <button class="btn" onclick="historyShare(${idx})">Share</button>
        <button class="hi-del" onclick="deleteHistory(${idx})">Delete</button>
      </div>`;
    container.appendChild(div);
  });
}

function historyLua(idx){
  const h=getHistory();if(!h[idx])return;
  const ids=h[idx].ids||{};
  lastUploadIds=ids;
  showLuaSnippet();
}

function historyShare(idx){
  const h=getHistory();if(!h[idx])return;
  const entry=h[idx];
  const ids=entry.ids||{};
  const params=new URLSearchParams();
  params.set("n",entry.name||"Skybox");
  for(const f of FACE_ORDER){if(ids[f])params.set(FACE_SHORT[f].toLowerCase(),ids[f])}
  const url=location.origin+location.pathname+"?"+params.toString();
  document.getElementById("shareUrl").value=url;
  document.getElementById("shareOverlay").classList.add("open");
}

let gl3d=null,gl3dProg=null,gl3dVao=null;
let gl3dFaceTex={};
let camYaw=0,camPitch=0,camFov=90;
let isDragging=false,lastMX=0,lastMY=0;

function init3DPreview(){
  const canvas=document.getElementById("preview3dCanvas");
  if(!gl3d){
    canvas.width=1280;canvas.height=720;
    gl3d=canvas.getContext("webgl2",{preserveDrawingBuffer:true});
    if(!gl3d)return;
    setupGL();
    canvas.addEventListener("mousedown",e=>{isDragging=true;lastMX=e.clientX;lastMY=e.clientY});
    window.addEventListener("mouseup",()=>{isDragging=false});
    window.addEventListener("mousemove",e=>{
      if(!isDragging)return;
      camYaw+=(e.clientX-lastMX)*0.3;
      camPitch-=(e.clientY-lastMY)*0.3;
      camPitch=Math.max(-89,Math.min(89,camPitch));
      lastMX=e.clientX;lastMY=e.clientY;
      render3D();
    });
    canvas.addEventListener("wheel",e=>{
      e.preventDefault();
      camFov+=e.deltaY*0.05;
      camFov=Math.max(30,Math.min(120,camFov));
      render3D();
    },{passive:false});
    canvas.addEventListener("touchstart",e=>{
      if(e.touches.length===1){isDragging=true;lastMX=e.touches[0].clientX;lastMY=e.touches[0].clientY}
    });
    canvas.addEventListener("touchmove",e=>{
      if(!isDragging||e.touches.length!==1)return;
      e.preventDefault();
      camYaw+=(e.touches[0].clientX-lastMX)*0.3;
      camPitch-=(e.touches[0].clientY-lastMY)*0.3;
      camPitch=Math.max(-89,Math.min(89,camPitch));
      lastMX=e.touches[0].clientX;lastMY=e.touches[0].clientY;
      render3D();
    },{passive:false});
    canvas.addEventListener("touchend",()=>{isDragging=false});
  }
  uploadFaceTextures();
  render3D();
}

function setupGL(){
  const gl=gl3d;
  const vs=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs,`#version 300 es
    in vec2 a_pos;
    out vec3 v_dir;
    uniform mat4 u_invVP;
    void main(){
      gl_Position=vec4(a_pos,0,1);
      vec4 t=u_invVP*vec4(a_pos,1,1);
      v_dir=t.xyz/t.w;
    }`);
  gl.compileShader(vs);
  const fs=gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs,`#version 300 es
    precision highp float;
    in vec3 v_dir;
    out vec4 fragColor;
    uniform sampler2D u_rt,u_lf,u_ft,u_bk,u_up,u_dn;
    void main(){
      vec3 d=normalize(v_dir);
      float ax=abs(d.x),ay=abs(d.y),az=abs(d.z);
      vec2 uv;
      if(ax>=ay&&ax>=az&&d.x<0.0){
        uv=vec2(-d.y/ax, -d.z/ax)*0.5+0.5;
        fragColor=texture(u_rt,uv);
      }
      else if(ax>=ay&&ax>=az&&d.x>=0.0){
        uv=vec2(d.y/ax, -d.z/ax)*0.5+0.5;
        fragColor=texture(u_lf,uv);
      }
      else if(ay>=ax&&ay>=az&&d.y<0.0){
        uv=vec2(d.x/ay, -d.z/ay)*0.5+0.5;
        fragColor=texture(u_ft,uv);
      }
      else if(ay>=ax&&ay>=az&&d.y>=0.0){
        uv=vec2(-d.x/ay, -d.z/ay)*0.5+0.5;
        fragColor=texture(u_bk,uv);
      }
      else if(d.z>0.0){
        uv=vec2(-d.y/az, -d.x/az)*0.5+0.5;
        fragColor=texture(u_up,uv);
      }
      else{
        uv=vec2(-d.y/az, d.x/az)*0.5+0.5;
        fragColor=texture(u_dn,uv);
      }
    }`);
  gl.compileShader(fs);
  gl3dProg=gl.createProgram();
  gl.attachShader(gl3dProg,vs);gl.attachShader(gl3dProg,fs);
  gl.linkProgram(gl3dProg);gl.useProgram(gl3dProg);

  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl3dVao=gl.createVertexArray();
  gl.bindVertexArray(gl3dVao);
  const loc=gl.getAttribLocation(gl3dProg,"a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

  for(const face of FACE_ORDER){
    const tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl3dFaceTex[face]=tex;
  }
}

function uploadFaceTextures(){
  const gl=gl3d;
  for(const face of FACE_ORDER){
    if(!faces[face])continue;
    gl.bindTexture(gl.TEXTURE_2D,gl3dFaceTex[face]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,faces[face]);
  }
}

function render3D(){
  if(!gl3d)return;
  const gl=gl3d;
  const canvas=document.getElementById("preview3dCanvas");
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(gl3dProg);
  gl.bindVertexArray(gl3dVao);

  const unifNames=["u_rt","u_lf","u_ft","u_bk","u_up","u_dn"];
  for(let i=0;i<FACE_ORDER.length;i++){
    gl.activeTexture(gl.TEXTURE0+i);
    gl.bindTexture(gl.TEXTURE_2D,gl3dFaceTex[FACE_ORDER[i]]);
    gl.uniform1i(gl.getUniformLocation(gl3dProg,unifNames[i]),i);
  }

  const aspect=canvas.width/canvas.height;
  const fovR=camFov*Math.PI/180;
  const yawR=camYaw*Math.PI/180;
  const pitchR=camPitch*Math.PI/180;

  const cy=Math.cos(yawR),sy=Math.sin(yawR);
  const cp=Math.cos(pitchR),sp=Math.sin(pitchR);
  const fx=cy*cp,fy=sy*cp,fz=sp;
  const rx=sy,ry=-cy,rz=0;
  const ux=-cy*sp,uy=-sy*sp,uz=cp;

  const tanH=Math.tan(fovR/2);
  const tanW=tanH*aspect;

  const m=new Float32Array(16);
  m[0]=rx*tanW;m[1]=ry*tanW;m[2]=rz*tanW;m[3]=0;
  m[4]=ux*tanH;m[5]=uy*tanH;m[6]=uz*tanH;m[7]=0;
  m[8]=fx;m[9]=fy;m[10]=fz;m[11]=0;
  m[12]=0;m[13]=0;m[14]=0;m[15]=1;

  gl.uniformMatrix4fv(gl.getUniformLocation(gl3dProg,"u_invVP"),false,m);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}

let lastUploadIds={};

function showLuaSnippet(){
  const ids=lastUploadIds;
  const hasIds=Object.values(ids).some(v=>v);
  const code=hasIds?
`local sky = Instance.new("Sky")
sky.SkyboxRt = "rbxassetid://${ids.Right||"0"}"
sky.SkyboxLf = "rbxassetid://${ids.Left||"0"}"
sky.SkyboxFt = "rbxassetid://${ids.Front||"0"}"
sky.SkyboxBk = "rbxassetid://${ids.Back||"0"}"
sky.SkyboxUp = "rbxassetid://${ids.Up||"0"}"
sky.SkyboxDn = "rbxassetid://${ids.Down||"0"}"
sky.Parent = game:GetService("Lighting")`:
`-- Upload faces first to get asset IDs
local sky = Instance.new("Sky")
sky.SkyboxRt = "rbxassetid://REPLACE"
sky.SkyboxLf = "rbxassetid://REPLACE"
sky.SkyboxFt = "rbxassetid://REPLACE"
sky.SkyboxBk = "rbxassetid://REPLACE"
sky.SkyboxUp = "rbxassetid://REPLACE"
sky.SkyboxDn = "rbxassetid://REPLACE"
sky.Parent = game:GetService("Lighting")`;
  document.getElementById("luaCode").textContent=code;
  document.getElementById("luaOverlay").classList.add("open");
}
function closeLuaModal(){document.getElementById("luaOverlay").classList.remove("open")}
document.getElementById("luaOverlay").addEventListener("click",e=>{if(e.target===e.currentTarget)closeLuaModal()});

function sharePreset(){
  const ids=lastUploadIds;
  const hasIds=Object.values(ids).some(v=>v);
  if(!hasIds){
    const h=getHistory();
    if(h.length>0&&h[0].ids)Object.assign(ids,h[0].ids);
  }
  const params=new URLSearchParams();
  const name=document.getElementById("presetName").value.trim()||"Skybox";
  params.set("n",name);
  for(const f of FACE_ORDER){if(ids[f])params.set(FACE_SHORT[f].toLowerCase(),ids[f])}
  const url=location.origin+location.pathname+"?"+params.toString();
  document.getElementById("shareUrl").value=url;
  document.getElementById("shareOverlay").classList.add("open");
}
function closeShareModal(){document.getElementById("shareOverlay").classList.remove("open")}
document.getElementById("shareOverlay").addEventListener("click",e=>{if(e.target===e.currentTarget)closeShareModal()});

async function loadSharedPreset(ids,name){
  lastUploadIds=ids;
  sourceFileName=name||"shared";
  document.getElementById("fileInfo").textContent=`Shared: ${name}`;
  document.getElementById("luaBtn").classList.remove("hidden");
  document.getElementById("controlsBar").classList.remove("hidden");
  const allIds=FACE_ORDER.map(f=>ids[f]).filter(Boolean);
  if(allIds.length===0){showLuaSnippet();return}
  try{
    const resp=await fetch(`https://thumbnails.roblox.com/v1/assets?assetIds=${allIds.join(",")}&size=420x420&format=Png&isCircular=false`);
    const data=await resp.json();
    const urlMap={};
    if(data.data){for(const item of data.data){urlMap[String(item.targetId)]=item.imageUrl}}
    let loaded=0;
    for(const face of FACE_ORDER){
      if(!ids[face]||!urlMap[ids[face]])continue;
      const img=new Image();img.crossOrigin="anonymous";
      await new Promise((res,rej)=>{
        img.onload=res;img.onerror=rej;
        img.src=urlMap[ids[face]];
      });
      const c=document.createElement("canvas");c.width=img.width;c.height=img.height;
      c.getContext("2d").drawImage(img,0,0);
      faces[face]=c;loaded++;
    }
    if(loaded>0){
      document.getElementById("faceSize").textContent=`${faces[FACE_ORDER.find(f=>faces[f])].width}\u00d7${faces[FACE_ORDER.find(f=>faces[f])].height}`;
      showResults();
      setTimeout(()=>init3DPreview(),50);
    }
  }catch(e){}
  showLuaSnippet();
}

window.addEventListener("DOMContentLoaded",()=>{
  const p=new URLSearchParams(location.search);
  if(p.has("n")){
    const name=p.get("n");
    const ids={};
    for(const f of FACE_ORDER){const v=p.get(FACE_SHORT[f].toLowerCase());if(v)ids[f]=v}
    if(Object.keys(ids).length>0){
      loadSharedPreset(ids,name);
    }
  }
});

const batchQueue=[];
const batchInput=document.getElementById("batchInput");
batchInput.addEventListener("change",e=>{
  for(const file of e.target.files){
    batchQueue.push({file,name:file.name.replace(/\.[^.]+$/,""),status:"pending",faces:null,ids:null});
  }
  batchInput.value="";
  renderBatchQueue();
});

function renderBatchQueue(){
  const container=document.getElementById("batchQueue");
  container.innerHTML="";
  document.getElementById("batchCount").textContent=`${batchQueue.length} file${batchQueue.length!==1?"s":""}`;
  document.getElementById("batchConvertBtn").disabled=batchQueue.length===0;
  document.getElementById("batchUploadBtn").disabled=!batchQueue.some(q=>q.faces);
  batchQueue.forEach((item,idx)=>{
    const div=document.createElement("div");div.className="batch-item";
    const statusCls=item.status==="done"?"done":item.status==="error"?"err":"";
    let thumbsHtml="";
    if(item.faces){
      thumbsHtml='<div style="display:flex;gap:2px;margin-top:8px">';
      for(const f of FACE_ORDER){
        if(item.faces[f]){
          const tc=document.createElement("canvas");tc.width=32;tc.height=32;
          tc.getContext("2d").drawImage(item.faces[f],0,0,32,32);
          thumbsHtml+=`<img src="${tc.toDataURL("image/jpeg",0.5)}" style="width:32px;height:32px;border-radius:2px">`;
        }
      }
      thumbsHtml+="</div>";
    }
    let jsonHtml="";
    if(item.ids){
      const json={name:item.name};
      for(const f of FACE_ORDER){json[FACE_SHORT[f].toLowerCase()]=`rbxassetid://${item.ids[f]||""}`}
      jsonHtml=`<div class="json-box" style="display:block;max-height:100px;font-size:10px;margin-top:8px;cursor:pointer" onclick="navigator.clipboard.writeText(this.dataset.raw);this.style.borderColor='var(--green)';setTimeout(()=>this.style.borderColor='',800)" data-raw='${JSON.stringify(json,null,2).replace(/'/g,"&#39;")}'>${syntaxJSON(json)}</div>`;
    }
    div.innerHTML=`
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="batch-name">${item.name}</div>
          <div class="batch-status ${statusCls}">${item.status}</div>
          <button class="batch-remove" onclick="batchRemove(${idx})">×</button>
        </div>
        ${thumbsHtml}${jsonHtml}
      </div>`;
    container.appendChild(div);
  });
}

function batchRemove(idx){
  batchQueue.splice(idx,1);
  renderBatchQueue();
}

async function batchConvertAll(){
  const btn=document.getElementById("batchConvertBtn");
  btn.disabled=true;btn.textContent="Converting...";
  const selRes=parseInt(document.getElementById("resSelect").value)||1024;
  const rotDeg=parseInt(rotSlider.value)||0;
  const rotRad=rotDeg*Math.PI/180;
  const O={
    Right:(x,y)=>({x:-1,y:-x,z:-y}),Left:(x,y)=>({x:1,y:x,z:-y}),
    Front:(x,y)=>({x:x,y:-1,z:-y}),Back:(x,y)=>({x:-x,y:1,z:-y}),
    Up:(x,y)=>({x:-y,y:-x,z:1}),Down:(x,y)=>({x:y,y:-x,z:-1}),
  };
  for(const item of batchQueue){
    if(item.faces){item.status="done";continue}
    item.status="converting";renderBatchQueue();
    try{
      const img=await new Promise((res,rej)=>{
        const i=new Image();i.onload=()=>res(i);i.onerror=rej;
        i.src=URL.createObjectURL(item.file);
      });
      const faceSize=Math.min(img.height,selRes);
      const src=document.createElement("canvas");src.width=img.width;src.height=img.height;
      const sctx=src.getContext("2d");sctx.drawImage(img,0,0);
      const sd=applyBCS(sctx.getImageData(0,0,img.width,img.height));
      const w=sd.width,h=sd.height;
      item.faces={};
      for(const face of FACE_ORDER){
        const c=document.createElement("canvas");c.width=faceSize;c.height=faceSize;
        const ctx=c.getContext("2d");const wd=ctx.createImageData(faceSize,faceSize);
        const orient=O[face];
        for(let px=0;px<faceSize;px++){for(let py=0;py<faceSize;py++){
          const fx=(2*(px+.5)/faceSize)-1,fy=(2*(py+.5)/faceSize)-1;
          const cb=orient(fx,fy);const r=Math.sqrt(cb.x*cb.x+cb.y*cb.y+cb.z*cb.z);
          let lon=Math.atan2(cb.y,cb.x)+rotRad;const lat=Math.acos(cb.z/r);
          let sx=w*lon/(2*Math.PI)-.5;const sy=h*lat/Math.PI-.5;
          sx=((sx%w)+w)%w;
          const si=(Math.round(Math.min(Math.max(sy,0),h-1))*w+Math.round(Math.min(Math.max(sx,0),w-1)))*4;
          const di=(py*faceSize+px)*4;
          wd.data[di]=sd.data[si];wd.data[di+1]=sd.data[si+1];wd.data[di+2]=sd.data[si+2];wd.data[di+3]=255;
        }}
        ctx.putImageData(wd,0,0);stampWatermark(c);
        item.faces[face]=c;
      }
      item.status="done";
    }catch(e){
      item.status="error";
    }
    renderBatchQueue();
    await new Promise(r=>setTimeout(r,10));
  }
  btn.disabled=false;btn.textContent="Convert All";
  renderBatchQueue();
}

async function batchUploadAll(){
  const apiKey=document.getElementById("apiKey")?.value?.trim();
  const userId=document.getElementById("userId")?.value?.trim();
  if(!apiKey||!userId){openUploadModal();return}
  const btn=document.getElementById("batchUploadBtn");
  btn.disabled=true;btn.textContent="Uploading...";
  for(const item of batchQueue){
    if(!item.faces||item.ids){continue}
    item.status="uploading";renderBatchQueue();
    const preset=item.name.replace(/[_\-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();
    const ids={};const thumbs={};
    let ok=true;
    for(let i=0;i<FACE_ORDER.length;i++){
      const face=FACE_ORDER[i];
      try{
        const blob=await new Promise(r=>item.faces[face].toBlob(r,"image/png"));
        const imgBuf=await blob.arrayBuffer();
        const jsonPart=JSON.stringify({assetType:"Image",displayName:`${preset}_${FACE_SHORT[face]}`.slice(0,50),description:"Skybox face",creationContext:{creator:{userId}}});
        const boundary="----BF"+Date.now()+i;
        const enc=new TextEncoder();
        const parts=[
          enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${jsonPart}\r\n`),
          enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="fileContent"; filename="${FACE_SHORT[face]}.png"\r\nContent-Type: image/png\r\n\r\n`),
          new Uint8Array(imgBuf),
          enc.encode(`\r\n--${boundary}--\r\n`)
        ];
        const totalLen=parts.reduce((a,b)=>a+b.byteLength,0);
        const body=new Uint8Array(totalLen);
        let off=0;for(const p of parts){body.set(p,off);off+=p.byteLength;}
        const resp=await fetch(`${WORKER_URL}/assets/v1/assets`,{method:"POST",headers:{"x-api-key":apiKey,"content-type":`multipart/form-data; boundary=${boundary}`},body:body.buffer});
        if(!resp.ok)throw new Error(`HTTP ${resp.status}`);
        const data=await resp.json();
        let aid=data?.response?.assetId;
        if(!aid&&data.path){
          for(let p=0;p<30;p++){
            await new Promise(r=>setTimeout(r,2000));
            const pr=await fetch(`${WORKER_URL}/assets/v1/${data.path}`,{headers:{"x-api-key":apiKey}});
            if(pr.ok){const pd=await pr.json();if(pd.done){aid=pd.response?.assetId;break}}
          }
        }
        if(!aid)throw new Error("No ID");
        ids[face]=String(aid);
        const tc=document.createElement("canvas");tc.width=64;tc.height=64;
        tc.getContext("2d").drawImage(item.faces[face],0,0,64,64);
        thumbs[face]=tc.toDataURL("image/jpeg",0.6);
      }catch(e){
        ok=false;item.status="error";break;
      }
      await new Promise(r=>setTimeout(r,800));
    }
    if(ok){
      item.ids=ids;item.status="done";
      const json={name:preset};
      for(const f of FACE_ORDER){const k=FACE_SHORT[f].toLowerCase();json[k]=`rbxassetid://${ids[f]||""}`}
      saveToHistory({name:preset,date:new Date().toISOString(),ids,thumbs,json});
    }
    renderBatchQueue();
  }
  btn.disabled=false;btn.textContent="Upload All";
  renderBatchQueue();
}
