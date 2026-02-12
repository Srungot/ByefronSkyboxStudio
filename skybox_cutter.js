const WORKER_URL="https://nizzix.xyz/robloxassets";
const FACE_ORDER=["Right","Left","Front","Back","Up","Down"];
const FACE_SHORT={Right:"Rt",Left:"Lf",Front:"Ft",Back:"Bk",Up:"Up",Down:"Dn"};
const faces={};
let sourceFileName="";

// ── Init ──
window.addEventListener("DOMContentLoaded",()=>{
  try{
    const c=JSON.parse(localStorage.getItem("byefron_skybox")||"{}");
    if(c.apiKey&&c.apiKey.length>20)document.getElementById("apiKey").value=c.apiKey;
    if(c.userId&&/^\d+$/.test(c.userId))document.getElementById("userId").value=c.userId;
  }catch(e){}
  renderHistory();
});

// ── Tabs ──
function switchTab(name){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===name));
  document.querySelectorAll(".tab-content").forEach(t=>t.classList.toggle("active",t.id===`tab-${name}`));
  if(name==="history")renderHistory();
}

// ── File ──
const fileInput=document.getElementById("fileInput");
fileInput.addEventListener("change",e=>{if(e.target.files[0])loadFile(e.target.files[0])});
let dragCounter=0;
document.addEventListener("dragenter",e=>{e.preventDefault();dragCounter++;document.getElementById("dropOverlay").classList.add("visible")});
document.addEventListener("dragleave",e=>{e.preventDefault();dragCounter--;if(dragCounter<=0){dragCounter=0;document.getElementById("dropOverlay").classList.remove("visible")}});
document.addEventListener("dragover",e=>e.preventDefault());
document.addEventListener("drop",e=>{e.preventDefault();dragCounter=0;document.getElementById("dropOverlay").classList.remove("visible");if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});

function loadFile(file){
  const img=new Image();
  img.onload=()=>{
    sourceFileName=file.name.replace(/\.[^.]+$/,"");
    document.getElementById("fileInfo").textContent=`${file.name} \u2014 ${img.width}\u00d7${img.height}`;
    const cleaned=sourceFileName.replace(/[_\-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();
    document.getElementById("presetName").value=cleaned;
    switchTab("convert");
    convertToFaces(img);
  };
  img.src=URL.createObjectURL(file);
}

// ── Conversion (exact shinjiesk/panorama-to-cubemap orientations) ──
function convertToFaces(img){
  const faceSize=Math.min(img.height,1024);
  document.getElementById("faceSize").textContent=`${faceSize}\u00d7${faceSize}`;
  const src=document.createElement("canvas");
  src.width=img.width;src.height=img.height;
  const sctx=src.getContext("2d");
  sctx.drawImage(img,0,0);
  const sd=sctx.getImageData(0,0,img.width,img.height);
  const O={
    Right:(x,y)=>({x:-1,y:-x,z:-y}),Left:(x,y)=>({x:1,y:x,z:-y}),
    Front:(x,y)=>({x:x,y:-1,z:-y}),Back:(x,y)=>({x:-x,y:1,z:-y}),
    Up:(x,y)=>({x:-y,y:-x,z:1}),Down:(x,y)=>({x:y,y:-x,z:-1}),
  };
  const w=sd.width,h=sd.height;
  for(const face of FACE_ORDER){
    const c=document.createElement("canvas");c.width=faceSize;c.height=faceSize;
    const ctx=c.getContext("2d");const wd=ctx.createImageData(faceSize,faceSize);
    const orient=O[face];
    for(let px=0;px<faceSize;px++){for(let py=0;py<faceSize;py++){
      const fx=(2*(px+.5)/faceSize)-1,fy=(2*(py+.5)/faceSize)-1;
      const cb=orient(fx,fy);const r=Math.sqrt(cb.x*cb.x+cb.y*cb.y+cb.z*cb.z);
      const lon=Math.atan2(cb.y,cb.x);const lat=Math.acos(cb.z/r);
      let sx=w*lon/(2*Math.PI)-.5;const sy=h*lat/Math.PI-.5;
      sx=((sx%w)+w)%w;
      const si=(Math.round(Math.min(Math.max(sy,0),h-1))*w+Math.round(Math.min(Math.max(sx,0),w-1)))*4;
      const di=(py*faceSize+px)*4;
      wd.data[di]=sd.data[si];wd.data[di+1]=sd.data[si+1];wd.data[di+2]=sd.data[si+2];wd.data[di+3]=255;
    }}
    ctx.putImageData(wd,0,0);faces[face]=c;
  }
  showResults();
}

function showResults(){
  document.getElementById("resultBox").classList.remove("hidden");
  document.getElementById("exportBtn").classList.remove("hidden");
  document.getElementById("uploadToggle").classList.remove("hidden");
  document.querySelectorAll(".cube-grid .face[data-face]").forEach(el=>{
    const f=el.dataset.face;
    if(faces[f]){let i=el.querySelector("img");if(!i){i=document.createElement("img");el.appendChild(i)}i.src=faces[f].toDataURL()}
  });
  const list=document.getElementById("faceList");list.innerHTML="";
  for(const face of FACE_ORDER){
    const d=document.createElement("div");d.className="face-item";
    d.innerHTML=`<span class="tag">${FACE_SHORT[face]}</span><span class="fname">${FACE_SHORT[face]}_${sourceFileName}.png</span>`;
    d.onclick=()=>exportFace(face);list.appendChild(d);
  }
}

function exportFace(face){
  if(!faces[face])return;const a=document.createElement("a");
  a.download=`${FACE_SHORT[face]}_${sourceFileName}.png`;a.href=faces[face].toDataURL("image/png");a.click();
}
function exportAll(){for(const f of FACE_ORDER)exportFace(f)}

// ── Config ──
function saveConfig(){
  localStorage.setItem("byefron_skybox",JSON.stringify({
    apiKey:document.getElementById("apiKey").value,
    userId:document.getElementById("userId").value,
  }));
}
["apiKey","userId"].forEach(id=>document.getElementById(id).addEventListener("input",saveConfig));

// ── Modal ──
function openUploadModal(){
  document.getElementById("uploadOverlay").classList.add("open");
  const btn=document.getElementById("uploadBtn");
  btn.textContent="Upload All Faces";btn.disabled=false;
  btn.onclick=uploadAll;
  document.getElementById("progressBar").style.display="none";
  document.getElementById("jsonOutput").classList.add("hidden");
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

// ── JSON syntax highlight ──
function syntaxJSON(obj){
  const str=JSON.stringify(obj,null,2);
  return str.replace(/(".*?")(\s*:\s*)/g,'<span class="j-key">$1</span><span class="j-colon">$2</span>')
    .replace(/:\s*(".*?")/g,': <span class="j-str">$1</span>')
    .replace(/[{}]/g,'<span class="j-brace">$&</span>');
}

// ── Upload ──
async function uploadAll(){
  const apiKey=document.getElementById("apiKey").value.trim();
  const userId=document.getElementById("userId").value.trim();
  const preset=document.getElementById("presetName").value.trim()||"My Skybox";
  if(!apiKey||!userId){alert("Enter API Key and User ID");return}

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

  saveToHistory({name:preset,date:new Date().toISOString(),ids,thumbs,json});
}

// ── History ──
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
        <button class="hi-del" onclick="deleteHistory(${idx})">Delete</button>
      </div>`;
    container.appendChild(div);
  });
}
