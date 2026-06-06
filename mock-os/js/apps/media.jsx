/* ============================================================
   apps/media.jsx — Media Studio · simple Photoshop for social media
   Tools (move/text/rect/ellipse/sticker/crop) · layers · adjust · filters
   Exposes (window): MediaEditor
   ============================================================ */

const ADJ_DEFAULT = { brightness:100, contrast:100, saturate:100, hue:0, blur:0, sepia:0, grayscale:0 };
const FILTERS = [
  { name:'Original', a:{} }, { name:'Vivid', a:{ saturate:148, contrast:112 } },
  { name:'Mono', a:{ grayscale:100, contrast:108 } }, { name:'Warm', a:{ sepia:34, saturate:120, hue:-8 } },
  { name:'Cool', a:{ hue:18, saturate:110, brightness:104 } }, { name:'Faded', a:{ contrast:88, brightness:108, saturate:78 } },
  { name:'Noir', a:{ grayscale:100, contrast:130, brightness:92 } }, { name:'Dream', a:{ blur:1.2, saturate:130, brightness:108 } },
];
const LAYER_TINTS = ['linear-gradient(135deg,#ff9a6b,#ff6a9b 45%,#9b5cff 80%,#3aa0ff)','linear-gradient(135deg,#34d39a,#3aa0ff)','linear-gradient(135deg,#ffb13b,#ff6a3d)','linear-gradient(135deg,#7a5cff,#c5318f)'];
const SOCIAL = [['Original','3 / 2','3:2'],['Instagram Post','1 / 1','1:1'],['Portrait','4 / 5','4:5'],['Story / Reel','9 / 16','9:16'],['Landscape','1.91 / 1','1.91:1'],['YouTube','16 / 9','16:9']];
const EMOJIS = ['✨','🔥','❤️','😎','👍','🎉','⭐','💯','😂','🚀','🌈','📸','🎵','💡','✅','👀','🙌','💥'];
const MASKS = [['','None'],['circle(50%)','●'],['inset(0 round 18%)','▢'],['polygon(50% 0,100% 100%,0 100%)','▲'],['polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)','⬡'],['polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)','★']];
// safe zones per platform — % insets of the 9:16 frame (official Meta/TikTok guidance)
const SAFE = {
  'TikTok':        { top:6,  bottom:20, left:5, right:14, note:'Bottom 20% captions/progress · right 14% action buttons' },
  'Reels/Stories': { top:14, bottom:35, left:6, right:6,  note:'Meta: top 14%, bottom 35%, sides 6% (central 1010×1280)' },
  'IG Feed':       { top:6,  bottom:6,  left:6, right:6,  note:'Square/portrait feed — light margins' },
  'YouTube':       { top:6,  bottom:10, left:5, right:5,  note:'Lower-third can carry captions/CTA' },
};
const PLATFORMS = Object.keys(SAFE);
function filterStr(a){ const v={...ADJ_DEFAULT,...a};
  return `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%) hue-rotate(${v.hue}deg) blur(${v.blur}px) sepia(${v.sepia}%) grayscale(${v.grayscale}%)`; }

const TOOLS = [
  { id:'move', key:'V', label:'Move (V)', icon:<path d="M5 3l5.5 14 2-5.5 5.5-2z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/> },
  { id:'text', key:'T', label:'Text (T)', icon:<path d="M5 6h14M12 6v13M8.5 19h7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/> },
  { id:'rect', key:'R', label:'Rectangle (R)', icon:<rect x="5" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/> },
  { id:'ellipse', key:'O', label:'Ellipse (O)', icon:<ellipse cx="12" cy="12" rx="8" ry="6.2" fill="none" stroke="currentColor" strokeWidth="1.8"/> },
  { id:'sticker', key:'S', label:'Sticker (S)', icon:<g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="10" r=".9" fill="currentColor" stroke="none"/><path d="M8.8 14c1.2 1.6 5.2 1.6 6.4 0" strokeLinecap="round"/></g> },
  { id:'crop', key:'C', label:'Crop / Resize (C)', icon:<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" stroke="currentColor" strokeWidth="1.7" fill="none"/> },
];

let MID=0; const mkId=()=>'L'+(++MID)+Date.now().toString(36).slice(-3);
const clampS=(v)=>Math.max(5,Math.min(400,Math.round(v)));

/* ---- CSS inject + JSON/HTML serialization (auto z-index) ---- */
function parseCss(css){ const o={}; if(!css)return o; String(css).split(';').forEach(d=>{ const i=d.indexOf(':'); if(i<0)return;
  const k=d.slice(0,i).trim(), v=d.slice(i+1).trim(); if(!k||!v)return; o[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v; }); return o; }
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function arDims(ar){ const [w,h]=String(ar).split('/').map(s=>parseFloat(s)); return w>=h?{w:1080,h:Math.round(1080*h/w)}:{w:Math.round(1080*w/h),h:1080}; }
function layerInnerHTML(l){ const clip=l.clip?`;clip-path:${l.clip}`:'';
  if(l.kind==='text') return `<div style="color:${l.color};font:800 34px/1 system-ui,-apple-system,sans-serif;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.35);text-align:center${clip}">${esc(l.text)}</div>`;
  if(l.kind==='sticker') return `<div style="font-size:54px;line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,.4))${clip}">${esc(l.emoji)}</div>`;
  if(l.kind==='shape') return `<div style="width:46%;height:46%;border-radius:${l.shape==='ellipse'?'50%':'18px'};background:${l.color}${clip}"></div>`;
  if(l.kind==='html') return l.html||'';
  return `<div style="width:${l.base?'100%':'62%'};height:${l.base?'100%':'62%'};border-radius:${l.base?'0':'8px'};background:${l.tint||'#666'}${clip}"></div>`;
}
function buildJSON(layers, ar){ const n=layers.length, d=arDims(ar);
  return { format:'os-rr/layers@1', canvas:{ aspect:ar, width:d.w, height:d.h },
    layers: layers.map((l,i)=>({ id:l.id, name:l.name, kind:l.kind, z:n-i, visible:l.visible!==false, opacity:l.opacity,
      transform:{ x:l.x, y:l.y, scaleX:l.sx, scaleY:l.sy, rotate:l.rotate },
      ...(l.text!=null?{text:l.text}:{}), ...(l.color?{color:l.color}:{}), ...(l.shape?{shape:l.shape}:{}),
      ...(l.emoji?{emoji:l.emoji}:{}), ...(l.html?{html:l.html}:{}), ...(l.tint?{tint:l.tint}:{}), ...(l.clip?{clip:l.clip}:{}), ...(l.css?{css:l.css}:{}) })) }; }
function buildHTML(layers, ar){ const n=layers.length;
  const body=layers.map((l,i)=>{ const css=l.css?(';'+l.css):''; if(l.visible===false) return '';
    return `  <div class="os-layer" style="z-index:${n-i};opacity:${(l.opacity??100)/100};transform:translate(${l.x}%,${l.y}%) scale(${(l.sx??100)/100},${(l.sy??100)/100}) rotate(${l.rotate||0}deg)${css}">\n    ${layerInnerHTML(l)}\n  </div>`; }).filter(Boolean).join('\n');
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>os-rr export</title>\n<style>\n  body{margin:0;background:#15161a}\n  .os-stage{position:relative;aspect-ratio:${ar};max-width:480px;margin:24px auto;overflow:hidden;background:#0b0b0e;border-radius:10px}\n  .os-layer{position:absolute;inset:0;display:grid;place-items:center}\n</style>\n</head>\n<body>\n<div class="os-stage">\n${body}\n</div>\n</body>\n</html>`; }
function downloadText(name, text, type){ const b=new Blob([text],{type}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }

const SCHEMA_DOC = `// os-rr layer document — format "os-rr/layers@1"
{
  "format": "os-rr/layers@1",
  "canvas": { "aspect": "9 / 16", "width": 1080, "height": 1920 },
  "layers": [            // index 0 = front; exported z is auto (top layer = highest)
    {
      "id": "L1",
      "name": "Headline",
      "kind": "text",     // text | image | shape | sticker | html
      "z": 3,             // auto-assigned z-index on export
      "visible": true,
      "opacity": 100,     // 0–100
      "transform": { "x": 0, "y": -20, "scale": 100, "rotate": 0 },  // x/y in % of canvas
      "text": "Hello",    // text layers
      "color": "#ffffff", // text / shape
      "shape": "rect",    // shape layers: rect | ellipse
      "emoji": "🔥",       // sticker layers
      "html": "<div>…</div>", // html (embed) layers — your own markup/script
      "tint": "css gradient", // image layers
      "css": "box-shadow: 0 8px 30px #000; border:2px solid #fff;" // injected onto the layer
    }
  ]
}`;

function MediaEditor({ file, notify, fs }){
  const name = file?.name || 'hero-shot.png';
  const [layers,setLayersRaw]=React.useState(()=>[{id:mkId(),name,kind:'image',visible:true,opacity:100,x:0,y:0,sx:100,sy:100,rotate:0,lock:true,tint:LAYER_TINTS[0],base:true}]);
  const [past,setPast]=React.useState([]); const [future,setFuture]=React.useState([]);
  const lastPush=React.useRef(0); const canvasRef=React.useRef(null); const rootRef=React.useRef(null);
  const setLayers=(u)=>{ setLayersRaw(prev=>{ const next=typeof u==='function'?u(prev):u; const now=Date.now();
    if(now-lastPush.current>400){ setPast(p=>[...p.slice(-49),prev]); setFuture([]); } lastPush.current=now; return next; }); };
  const commitNow=()=>{ lastPush.current=0; };
  const undo=()=>{ setPast(p=>{ if(!p.length)return p; setFuture(f=>[layers,...f].slice(0,50)); setLayersRaw(p[p.length-1]); lastPush.current=Date.now(); return p.slice(0,-1); }); };
  const redo=()=>{ setFuture(f=>{ if(!f.length)return f; setPast(p=>[...p,layers].slice(-50)); setLayersRaw(f[0]); lastPush.current=Date.now(); return f.slice(1); }); };
  const [sel,setSel]=React.useState(()=>null);
  const [adj,setAdj]=React.useState(ADJ_DEFAULT);
  const [active,setActive]=React.useState('Original');
  const [tab,setTab]=React.useState('layers');
  const [tool,setTool]=React.useState('move');
  const [ar,setAr]=React.useState('3 / 2');
  const [emoji,setEmoji]=React.useState(false);
  const [rotate,setRotate]=React.useState(0); const [flip,setFlip]=React.useState(false); const [zoom,setZoom]=React.useState(1);
  const [showPanel,setShowPanel]=React.useState(false);
  const [safe,setSafe]=React.useState(false);
  const [platform,setPlatform]=React.useState('TikTok');

  React.useEffect(()=>{ if(layers.length && !sel) setSel(layers[0].id); },[]);
  const selLayer=layers.find(l=>l.id===sel);

  // expose to the AI command bus
  const mediaApiRef = React.useRef({});
  mediaApiRef.current = { add, setAr, setTool, setExpo, setShowPanel, applyFilter, setG, setAdj, setActive };
  React.useEffect(()=>{ if(!window.OSBus) return; const R2A={ '1:1':'1 / 1','4:5':'4 / 5','9:16':'9 / 16','16:9':'16 / 9','1.91:1':'1.91 / 1','3:2':'3 / 2' };
    return OSBus.register('media', {
      setAspect:(r)=>{ mediaApiRef.current.setAr(R2A[String(r).replace(/\s/g,'')]||'1 / 1'); mediaApiRef.current.setTool('move'); return true; },
      addText:(t)=>{ mediaApiRef.current.add('text',{text:t||'Your text'}); return true; },
      addSticker:(e)=>{ mediaApiRef.current.add('sticker',{emoji:e||'✨',name:'Sticker '+(e||'✨'),sx:140,sy:140}); return true; },
      addShape:(s)=>{ mediaApiRef.current.add('shape',{shape:s==='ellipse'?'ellipse':'rect',name:s==='ellipse'?'Ellipse':'Rectangle'}); return true; },
      applyFilter:(name)=>{ const fl=FILTERS.find(f=>f.name.toLowerCase()===String(name).toLowerCase())||FILTERS[0]; mediaApiRef.current.applyFilter(fl); return 'Filter → '+fl.name; },
      exportDesign:()=>{ mediaApiRef.current.setExpo('json'); return true; },
    }); },[]);


  const setG=(k,v)=>{ setAdj(a=>({...a,[k]:v})); setActive('—'); };
  const applyFilter=fl=>{ setAdj({...ADJ_DEFAULT,...fl.a}); setActive(fl.name); };
  const upd=(id,patch)=>setLayers(ls=>ls.map(l=>l.id===id?{...l,...patch}:l));
  const move=(id,dir)=>setLayers(ls=>{ const i=ls.findIndex(l=>l.id===id); const j=i+dir; if(j<0||j>=ls.length)return ls; const a=[...ls]; [a[i],a[j]]=[a[j],a[i]]; return a; });
  const del=(id)=>{ setLayers(ls=>ls.filter(l=>l.id!==id)); setSel(s=>s===id?null:s); };
  const add=(kind,extra={})=>{ const base={id:mkId(),visible:true,opacity:100,x:0,y:0,sx:kind==='image'?80:100,sy:kind==='image'?80:100,rotate:0,lock:true};
    const seed = kind==='text'?{name:'Text',text:'Your text',color:'#ffffff'}
      : kind==='shape'?{name:'Shape',color:'#2f7bf6',shape:'rect'}
      : kind==='sticker'?{name:'Sticker '+(extra.emoji||'✨'),emoji:'✨'}
      : kind==='html'?{name:'Embed',html:'<div style="color:#fff;font:800 24px sans-serif;text-align:center">Edit&nbsp;HTML</div>'}
      : {name:extra.name||'Image',tint:LAYER_TINTS[(layers.length)%LAYER_TINTS.length]};
    const l={...base,kind,...seed,...extra}; setLayers(ls=>[l,...ls]); setSel(l.id); setTab('layers'); return l; };
  const addFromAsset=(a)=>{ add('image',{name:a.name,tint:LAYER_TINTS[(layers.length)%LAYER_TINTS.length]}); notify('Added “'+a.name+'” as a layer'); };
  const [expo,setExpo]=React.useState(null); const fileRef=React.useRef(null);
  const loadJSON=(d)=>{ if(!d||!Array.isArray(d.layers)) return; commitNow(); if(d.canvas&&d.canvas.aspect)setAr(d.canvas.aspect);
    const ls=[...d.layers].sort((a,b)=>(b.z||0)-(a.z||0)).map(L=>({ id:mkId(), name:L.name||'Layer', kind:L.kind||'shape', visible:L.visible!==false, opacity:L.opacity==null?100:L.opacity,
      x:(L.transform&&L.transform.x)||0, y:(L.transform&&L.transform.y)||0,
      sx:(L.transform&&(L.transform.scaleX!=null?L.transform.scaleX:L.transform.scale))||100,
      sy:(L.transform&&(L.transform.scaleY!=null?L.transform.scaleY:L.transform.scale))||100,
      rotate:(L.transform&&L.transform.rotate)||0, lock:L.lock!==false,
      text:L.text, color:L.color, shape:L.shape, emoji:L.emoji, html:L.html, tint:L.tint||LAYER_TINTS[0], clip:L.clip, css:L.css })); setLayers(ls); setSel(ls[0]&&ls[0].id); };
  const importFile=(f)=>{ if(!f)return; const r=new FileReader(); r.onload=()=>{ const txt=String(r.result);
    if(/\.json$/i.test(f.name)){ try{ loadJSON(JSON.parse(txt)); notify('Imported '+f.name); }catch(e){ notify('Invalid JSON file'); } }
    else { commitNow(); add('html',{name:f.name,html:txt}); notify('Imported '+f.name+' as embed'); } setExpo(null); }; r.readAsText(f); };
  const expoText = expo==='html'?buildHTML(layers,ar) : expo==='schema'?SCHEMA_DOC : JSON.stringify(buildJSON(layers,ar),null,2);

  const placeAt=(kind,e,extra={})=>{ const r=canvasRef.current.getBoundingClientRect();
    const x=Math.max(-55,Math.min(55,Math.round(((e.clientX-(r.left+r.width/2))/r.width)*100)));
    const y=Math.max(-55,Math.min(55,Math.round(((e.clientY-(r.top+r.height/2))/r.height)*100)));
    add(kind,{x,y,...extra}); setTool('move'); };
  const onCanvasClick=(e)=>{ if(tool==='move'){ if(e.target===e.currentTarget) setSel(null); return; }
    if(tool==='text') placeAt('text',e);
    else if(tool==='rect') placeAt('shape',e,{shape:'rect',name:'Rectangle'});
    else if(tool==='ellipse') placeAt('shape',e,{shape:'ellipse',name:'Ellipse'}); };

  const dragLayer=(e,l)=>{ e.stopPropagation(); setSel(l.id); setTab('layers'); setShowPanel(true); if(e.button!==0||!canvasRef.current)return; commitNow();
    const rect=canvasRef.current.getBoundingClientRect(); const sx=e.clientX, sy=e.clientY, ox=l.x, oy=l.y;
    const mv=(ev)=>{ const dx=(ev.clientX-sx)/rect.width*100, dy=(ev.clientY-sy)/rect.height*100;
      upd(l.id,{ x:Math.max(-60,Math.min(60,Math.round(ox+dx))), y:Math.max(-60,Math.min(60,Math.round(oy+dy))) }); };
    const up=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); };
    window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); };
  const onResize=(e,l,corner)=>{ e.stopPropagation(); if(!canvasRef.current)return; commitNow();
    const r=canvasRef.current.getBoundingClientRect(); const cx=r.left+r.width/2+(l.x/100)*r.width, cy=r.top+r.height/2+(l.y/100)*r.height;
    const dx0=Math.max(8,Math.abs(e.clientX-cx)), dy0=Math.max(8,Math.abs(e.clientY-cy)); const sx0=l.sx, sy0=l.sy;
    const mv=(ev)=>{ const fx=Math.abs(ev.clientX-cx)/dx0, fy=Math.abs(ev.clientY-cy)/dy0;
      if(l.lock){ const f=Math.hypot(ev.clientX-cx,ev.clientY-cy)/Math.hypot(dx0,dy0); upd(l.id,{sx:clampS(sx0*f),sy:clampS(sy0*f)}); }
      else upd(l.id,{sx:clampS(sx0*fx),sy:clampS(sy0*fy)}); };
    const up=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); };
    window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); };

  const onKey=(e)=>{ const tag=(e.target.tagName||''); if(tag==='INPUT'||tag==='TEXTAREA')return; const mod=e.metaKey||e.ctrlKey;
    if(mod&&e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
    if(mod&&e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
    if(mod)return;
    if((e.key==='Backspace'||e.key==='Delete')&&sel){ e.preventDefault(); del(sel); }
    else if(e.key==='Escape'){ setSel(null); setTool('move'); setEmoji(false); }
    else { const t=TOOLS.find(t=>t.key.toLowerCase()===e.key.toLowerCase()); if(t){ if(t.id==='sticker')setEmoji(true); else setTool(t.id); } } };

  const onCanvasDrop=(e)=>{ e.preventDefault(); const d=e.dataTransfer.getData('application/os-asset'); if(d){ try{ addFromAsset(JSON.parse(d)); }catch(_){ } } };
  const sliders=[['brightness','Brightness',0,200],['contrast','Contrast',0,200],['saturate','Saturation',0,200],['hue','Hue',-180,180],['blur','Blur',0,10],['sepia','Warmth',0,100],['grayscale','Desaturate',0,100]];
  const PANEL_TABS=[['layers','Layers'],['adjust','Adjust'],['filters','Filters'],['assets','Assets']];

  return (
    <div className="app-host" ref={rootRef} tabIndex={0} onKeyDown={onKey} onMouseDown={()=>rootRef.current&&rootRef.current.focus({preventScroll:true})} style={{display:'flex',width:'100%',height:'100%',background:'var(--window-bg)',fontSize:13,outline:'none',position:'relative'}}>
      {/* tool rail */}
      <div style={{width:48,flex:'0 0 auto',background:'var(--sidebar)',borderRight:'.5px solid var(--sep)',display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'9px 0'}}>
        {TOOLS.map(t=>(
          <button key={t.id} title={t.label} onClick={()=>{ if(t.id==='sticker'){setEmoji(v=>!v);} else {setTool(t.id); if(t.id==='crop')setShowPanel(true);} }}
            style={{width:36,height:36,borderRadius:9,border:'none',cursor:'default',display:'grid',placeItems:'center',
              background:(tool===t.id||(t.id==='sticker'&&emoji))?'var(--accent)':'transparent',color:(tool===t.id||(t.id==='sticker'&&emoji))?'#fff':'var(--text-dim)'}}>
            <svg viewBox="0 0 24 24" style={{width:19,height:19}}>{t.icon}</svg></button>))}
      </div>
      {emoji && <div className="ctx" style={{left:54,top:120,zIndex:30,display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:2,width:196}} onMouseLeave={()=>setEmoji(false)}>
        {EMOJIS.map(em=><button key={em} onClick={()=>{ add('sticker',{emoji:em,name:'Sticker '+em,sx:140,sy:140}); setEmoji(false); }}
          style={{fontSize:20,border:'none',background:'transparent',cursor:'default',padding:'4px',borderRadius:7,lineHeight:1}}>{em}</button>)}
      </div>}

      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',background:'repeating-conic-gradient(#0000 0 25%, rgba(128,128,128,.06) 0 50%) 0 0/22px 22px'}}>
        <div className="app-toolbar" style={{background:'var(--window-head)',justifyContent:'space-between'}}>
          <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn me-toggle" onClick={()=>setShowPanel(s=>!s)} title="Panel"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
            <button className="btn icon" disabled={!past.length} onClick={undo} title="Undo (⌘Z)"><svg viewBox="0 0 24 24"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 1 1 0 10h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button className="btn icon" disabled={!future.length} onClick={redo} title="Redo (⇧⌘Z)"><svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5M20 12H9a5 5 0 1 0 0 10h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button className="btn icon" onClick={()=>setRotate(r=>r-90)} title="Rotate"><svg viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 2 5M4 10V5M4 10h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button className="btn icon" onClick={()=>setFlip(f=>!f)} title="Flip"><svg viewBox="0 0 24 24"><path d="M12 3v18M7 8l-3 4 3 4M17 8l3 4-3 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button className="btn" onClick={()=>setExpo('json')} title="Export / Import / Schema"><svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M12 16V5m0 0L8 9m4-4l4 4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Export</button>
          </div>
        </div>

        <div style={{flex:1,minHeight:0,display:'grid',placeItems:'center',padding:24,overflow:'hidden'}}>
          <div ref={canvasRef} onClick={onCanvasClick} onDrop={onCanvasDrop} onDragOver={e=>{e.preventDefault();}}
            style={{position:'relative',maxWidth:'100%',maxHeight:'100%',width: (parseFloat(ar.split('/')[0])>=parseFloat(ar.split('/')[1]))?'min(100%,520px)':'auto',height:(parseFloat(ar.split('/')[0])>=parseFloat(ar.split('/')[1]))?'auto':'min(100%,380px)',aspectRatio:ar,transform:`rotate(${rotate}deg) scaleX(${flip?-1:1}) scale(${zoom})`,transition:'transform .25s',boxShadow:'0 16px 50px rgba(0,0,0,.4)',borderRadius:6,overflow:'hidden',filter:filterStr(adj),background:'#0b0b0e',cursor:tool==='move'?'default':'crosshair'}}>
            {layers.map((l,i)=> l.visible && (
              <LayerView key={l.id} l={l} z={layers.length-i} sel={l.id===sel} interactive={tool==='move'} onDown={dragLayer} onResize={onResize} />
            ))}
            {safe && <SafeArea platform={platform} />}
            {layers.length===0 && <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'rgba(255,255,255,.4)',fontSize:12}}>Empty canvas — pick a tool</div>}
          </div>
        </div>

        <div style={{height:34,flex:'0 0 auto',borderTop:'.5px solid var(--sep)',display:'flex',alignItems:'center',gap:10,padding:'0 14px',background:'var(--window-head)'}}>
          <span style={{fontSize:11,color:'var(--text-faint)'}}>{(SOCIAL.find(s=>s[1]===ar)||[])[2]||ar} · {layers.length} layer{layers.length!==1?'s':''}</span>
          <span style={{fontSize:11,color:'var(--text-faint)',textTransform:'capitalize'}}>· {tool}</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--text-faint)'}}>
            <span>Zoom</span><input type="range" min="0.5" max="2" step="0.05" value={zoom} onChange={e=>setZoom(+e.target.value)} style={{width:80}}/><span style={{width:32,fontVariantNumeric:'tabular-nums'}}>{Math.round(zoom*100)}%</span></div>
        </div>
      </div>

      <div className={'me-panel'+(showPanel?' open':'')} style={{width:222,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--sidebar)',overflowY:'auto',padding:'14px 12px',display:'flex',flexDirection:'column'}}>
        {tool==='crop' ? <div>
          <SectionLabel>Resize for social</SectionLabel>
          {SOCIAL.map(([l,v,r])=>(
            <div key={l} onClick={()=>{setAr(v);setTool('move');}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 11px',borderRadius:8,marginBottom:6,cursor:'default',
              background:ar===v?'var(--accent)':'var(--field)',color:ar===v?'#fff':'var(--text)',border:'.5px solid var(--sep)'}}>
              <span style={{fontWeight:600}}>{l}</span><span style={{fontSize:11,opacity:.7,fontFamily:'var(--font-mono)'}}>{r}</span></div>))}
          <div style={{fontSize:11,color:'var(--text-faint)',marginTop:6,lineHeight:1.5}}>Pick a canvas size, then add text, stickers & shapes for your post.</div>
          <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12,fontSize:12.5,fontWeight:600,color:'var(--text-dim)',cursor:'default'}}>
            <input type="checkbox" checked={safe} onChange={e=>setSafe(e.target.checked)} /> Show safe area</label>
          {safe && <div style={{marginTop:8}}>
            <Seg options={PLATFORMS.map(p=>[p,p])} value={platform} onChange={setPlatform} style={{flexWrap:'wrap'}} />
            <div style={{fontSize:11,color:'var(--text-faint)',marginTop:6,lineHeight:1.5}}>{(SAFE[platform]||{}).note}</div>
          </div>}
          <div style={{fontSize:11,color:'var(--text-faint)',marginTop:8,lineHeight:1.5}}>Dashed guide marks where platform UI (caption, buttons) covers your design — keep key content inside it.</div>
        </div> : <>
          <div style={{display:'flex',background:'var(--inset)',borderRadius:7,padding:2,marginBottom:12}}>
            {PANEL_TABS.map(([v,l])=>(<button key={v} onClick={()=>setTab(v)} style={{flex:1,height:24,border:'none',borderRadius:5,fontSize:11,fontWeight:600,cursor:'default',
              background:tab===v?'var(--window-bg)':'transparent',boxShadow:tab===v?'0 1px 2px rgba(0,0,0,.12)':'none',color:'var(--text)'}}>{l}</button>))}
          </div>
          {tab==='layers' && <>
            <LayersPanel layers={layers} sel={sel} onSelect={setSel} onToggle={id=>upd(id,{visible:!layers.find(l=>l.id===id).visible})}
              onOpacity={(id,v)=>upd(id,{opacity:v})} onMove={move} onDelete={del} onRename={(id,v)=>upd(id,{name:(v||'').trim()||'Layer'})} onAdd={add} />
            {selLayer && <div style={{borderTop:'.5px solid var(--sep)',marginTop:10,paddingTop:10}}>
              <SectionLabel>Edit · {selLayer.name}</SectionLabel>
              {selLayer.kind==='text' && <PropRow label="Text"><input className="field" style={{width:'100%'}} value={selLayer.text} onChange={e=>upd(selLayer.id,{text:e.target.value})} onKeyDown={e=>e.stopPropagation()}/></PropRow>}
              {(selLayer.kind==='text'||selLayer.kind==='shape') && <PropRow label="Color">
                <div style={{display:'flex',gap:6}}>{['#ffffff','#111827','#2f7bf6','#ff5f8f','#ffb13b','#34c759'].map(c=>(
                  <button key={c} onClick={()=>upd(selLayer.id,{color:c})} style={{width:22,height:22,borderRadius:'50%',background:c,border:'none',cursor:'default',boxShadow:selLayer.color===c?'0 0 0 2px var(--sidebar),0 0 0 4px var(--accent)':'inset 0 0 0 .5px rgba(0,0,0,.2)'}}/>))}</div></PropRow>}
              <PropRow label="Size" value={selLayer.sx===selLayer.sy?selLayer.sx+'%':selLayer.sx+'×'+selLayer.sy+'%'}>
                <button className="btn" style={{width:'100%',height:26,justifyContent:'center',gap:7,background:selLayer.lock?'var(--accent)':'var(--field)',color:selLayer.lock?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>upd(selLayer.id,{lock:!selLayer.lock})}>
                  <svg viewBox="0 0 24 24" style={{width:13,height:13}}>{selLayer.lock?<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>:<path d="M7 11V8a5 5 0 0 1 9.5-2M5 11h14v9H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>}</svg>
                  {selLayer.lock?'Ratio locked':'Ratio free'}</button></PropRow>
              <KSlider label="Width" value={selLayer.sx} min={5} max={400} unit="%" onChange={v=>upd(selLayer.id, selLayer.lock?{sx:v,sy:Math.round(selLayer.sy*(v/(selLayer.sx||1)))}:{sx:v})} />
              <KSlider label="Height" value={selLayer.sy} min={5} max={400} unit="%" onChange={v=>upd(selLayer.id, selLayer.lock?{sy:v,sx:Math.round(selLayer.sx*(v/(selLayer.sy||1)))}:{sy:v})} />
              <KSlider label="Position X" value={selLayer.x} min={-60} max={60} unit="%" onChange={v=>upd(selLayer.id,{x:v})} />
              <KSlider label="Position Y" value={selLayer.y} min={-60} max={60} unit="%" onChange={v=>upd(selLayer.id,{y:v})} />
              <KSlider label="Rotation" value={selLayer.rotate} min={-180} max={180} unit="°" onChange={v=>upd(selLayer.id,{rotate:v})} />
              <PropRow label="Mask / clip"><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{MASKS.map(([v,lbl])=>(
                <button key={lbl} onClick={()=>upd(selLayer.id,{clip:v})} title={lbl} style={{width:30,height:28,borderRadius:7,border:'none',cursor:'default',fontSize:13,
                  background:(selLayer.clip||'')===v?'var(--accent)':'var(--field)',color:(selLayer.clip||'')===v?'#fff':'var(--text-dim)'}}>{lbl}</button>))}</div></PropRow>
              {selLayer.kind==='html' && <PropRow label="HTML / script"><textarea className="field" style={{width:'100%',height:64,fontFamily:'var(--font-mono)',fontSize:11,padding:6,resize:'vertical'}} value={selLayer.html||''} onChange={e=>upd(selLayer.id,{html:e.target.value})} onKeyDown={e=>e.stopPropagation()}/></PropRow>}
              <PropRow label="Custom CSS"><textarea className="field" placeholder="box-shadow: 0 8px 30px #000; border:2px solid #fff;" style={{width:'100%',height:50,fontFamily:'var(--font-mono)',fontSize:11,padding:6,resize:'vertical'}} value={selLayer.css||''} onChange={e=>upd(selLayer.id,{css:e.target.value})} onKeyDown={e=>e.stopPropagation()}/></PropRow>
            </div>}
          </>}
          {tab==='adjust' && <div>
            <SectionLabel>Adjustments</SectionLabel>
            {sliders.map(([k,lbl,min,max])=><KSlider key={k} label={lbl} value={adj[k]} min={min} max={max} onChange={v=>setG(k,v)} />)}
            <button className="btn" style={{width:'100%',marginTop:4}} onClick={()=>{setAdj(ADJ_DEFAULT);setActive('Original');}}>Reset adjustments</button>
          </div>}
          {tab==='filters' && <div>
            <SectionLabel>Filters</SectionLabel>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {FILTERS.map(fl=>(<div key={fl.name} onClick={()=>applyFilter(fl)} style={{cursor:'default'}}>
                <div style={{borderRadius:8,overflow:'hidden',aspectRatio:'1',outline:active===fl.name?'2px solid var(--accent)':'.5px solid var(--sep)'}}><PhotoPlaceholder filter={filterStr(fl.a)} mini/></div>
                <div style={{fontSize:11,textAlign:'center',marginTop:4,fontWeight:active===fl.name?700:500,color:active===fl.name?'var(--accent)':'var(--text-dim)'}}>{fl.name}</div></div>))}
            </div></div>}
          {tab==='assets' && <AssetsPanel fs={fs} kinds={['image']} onPick={addFromAsset} compact />}
        </>}
      </div>

      <input ref={fileRef} type="file" accept=".json,.html,.htm,.svg,.txt" hidden onChange={e=>{importFile(e.target.files[0]); e.target.value='';}} />
      {expo && <ExportModal tab={expo} setTab={setExpo} text={expoText}
        onDownload={()=>downloadText(expo==='html'?'design.html':'design.json', expoText, expo==='html'?'text/html':'application/json')}
        onImport={()=>fileRef.current&&fileRef.current.click()} notify={notify} />}
    </div>
  );
}

function ExportModal({ tab, setTab, text, onDownload, onImport, notify }){
  const TABS=[['json','JSON'],['html','HTML'],['schema','Schema']];
  return <div onClick={()=>setTab(null)} style={{position:'absolute',inset:0,zIndex:40,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center'}}>
    <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(560px,86%)',maxHeight:'82%',display:'flex',flexDirection:'column',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:14,boxShadow:'var(--shadow-pop)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderBottom:'.5px solid var(--sep)'}}>
        <strong style={{fontSize:13.5}}>Export / Import</strong>
        <div style={{display:'flex',background:'var(--inset)',borderRadius:7,padding:2,marginLeft:6}}>
          {TABS.map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{height:24,padding:'0 12px',border:'none',borderRadius:5,fontSize:11.5,fontWeight:600,cursor:'default',background:tab===v?'var(--window-bg)':'transparent',color:'var(--text)'}}>{l}</button>)}
        </div>
        <button className="btn" style={{marginLeft:'auto'}} onClick={onImport}>Import file…</button>
        <button className="btn" onClick={()=>setTab(null)}>Close</button>
      </div>
      <pre style={{flex:1,minHeight:0,margin:0,overflow:'auto',padding:'14px 16px',background:'#0d0e12',color:'#cfd4de',fontFamily:'var(--font-mono)',fontSize:11.5,lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{text}</pre>
      <div style={{display:'flex',gap:8,padding:'12px 14px',borderTop:'.5px solid var(--sep)'}}>
        <span style={{fontSize:11,color:'var(--text-faint)',alignSelf:'center',flex:1}}>{tab==='schema'?'Template for os-rr/layers documents (JSON & HTML).':'Auto z-index from layer order · per-layer CSS included.'}</span>
        {tab!=='schema' && <button className="btn" onClick={()=>{ try{ navigator.clipboard.writeText(text); notify('Copied'); }catch(e){ notify('Copy failed'); } }}>Copy</button>}
        {tab!=='schema' && <button className="btn primary" onClick={onDownload}>Download .{tab}</button>}
      </div>
    </div>
  </div>;
}

function LayerView({ l, sel, interactive, z, onDown, onResize }){
  const t={position:'absolute',inset:0,display:'grid',placeItems:'center',zIndex:z,opacity:l.opacity/100,transform:`translate(${l.x}%,${l.y}%) scale(${(l.sx||100)/100},${(l.sy||100)/100}) rotate(${l.rotate}deg)`,cursor:interactive?'grab':'crosshair',pointerEvents:interactive?'auto':'none',...parseCss(l.css)};
  const down=(e)=>onDown(e,l);
  const handles = sel&&interactive ? ['nw','ne','sw','se'].map(c=>(
    <div key={c} onPointerDown={(e)=>{e.stopPropagation();onResize(e,l,c);}} style={{position:'absolute',width:11,height:11,borderRadius:2,background:'#fff',boxShadow:'0 0 0 1.5px var(--accent)',
      [c[0]==='n'?'top':'bottom']:-6,[c[1]==='w'?'left':'right']:-6,cursor:c==='nw'||c==='se'?'nwse-resize':'nesw-resize',pointerEvents:'auto',zIndex:3}}/>)) : null;
  const ring = sel?{outline:'2px dashed rgba(255,255,255,.9)',outlineOffset:-3}:null;
  const clip = l.clip||undefined;
  let box, content=null;
  if(l.kind==='text'){ box={...ring,position:'relative',padding:'4px 10px',clipPath:clip}; content=<span style={{color:l.color,fontWeight:800,fontSize:34,letterSpacing:'-.02em',textShadow:'0 2px 14px rgba(0,0,0,.35)',textAlign:'center',display:'block'}}>{l.text}</span>; }
  else if(l.kind==='sticker'){ box={...ring,position:'relative',fontSize:54,lineHeight:1,filter:'drop-shadow(0 3px 8px rgba(0,0,0,.4))',clipPath:clip}; content=l.emoji; }
  else if(l.kind==='shape'){ box={...ring,position:'relative',width:'46%',height:'46%',borderRadius:l.shape==='ellipse'?'50%':18,background:l.color,clipPath:clip}; }
  else if(l.kind==='html'){ box={...ring,position:'relative',maxWidth:'90%',maxHeight:'90%',overflow:'auto',clipPath:clip}; content=<div dangerouslySetInnerHTML={{__html:l.html||''}}/>; }
  else { box={...ring,position:'relative',width:l.base?'100%':'62%',height:l.base?'100%':'62%',overflow:'hidden',borderRadius:l.base?0:8,clipPath:clip};
    content=<div style={{width:'100%',height:'100%',background:l.tint,position:'relative'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 12px,transparent 12px 24px)'}}/>
      {l.base && <span style={{position:'absolute',left:12,bottom:10,color:'rgba(255,255,255,.7)',fontFamily:'var(--font-mono)',fontSize:10}}>{l.name}</span>}</div>; }
  return <div style={t} onPointerDown={down}><div style={box}>{content}{handles}</div></div>;
}

function SafeArea({ platform }){ const s=SAFE[platform]||{top:6,bottom:6,left:5,right:5};
  const zone={position:'absolute',background:'rgba(255,70,70,.13)'};
  return <div style={{position:'absolute',inset:0,zIndex:9990,pointerEvents:'none'}}>
    <div style={{...zone,top:0,left:0,right:0,height:s.top+'%'}}/>
    <div style={{...zone,bottom:0,left:0,right:0,height:s.bottom+'%'}}/>
    <div style={{...zone,top:s.top+'%',bottom:s.bottom+'%',left:0,width:s.left+'%'}}/>
    <div style={{...zone,top:s.top+'%',bottom:s.bottom+'%',right:0,width:s.right+'%'}}/>
    <div style={{position:'absolute',top:s.top+'%',bottom:s.bottom+'%',left:s.left+'%',right:s.right+'%',border:'1px dashed rgba(255,255,255,.9)',borderRadius:4}}/>
    <span style={{position:'absolute',top:'calc('+s.top+'% + 3px)',left:'calc('+s.left+'% + 3px)',fontSize:9,color:'#fff',background:'rgba(0,0,0,.55)',padding:'1px 6px',borderRadius:4,fontFamily:'var(--font-mono)'}}>{platform} safe</span>
  </div>;
}

function PhotoPlaceholder({ filter, mini }){
  const W = mini? 120 : 460, H = mini? 120 : 307;
  return (
    <div style={{width:W,height:H,filter,background:'linear-gradient(135deg,#ff9a6b 0%,#ff6a9b 38%,#9b5cff 72%,#3aa0ff 100%)',position:'relative',display:'grid',placeItems:'center'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 12px,transparent 12px 24px)'}}/>
      <div style={{position:'absolute',top:'24%',left:'18%',width:mini?22:64,height:mini?22:64,borderRadius:'50%',background:'rgba(255,255,255,.65)',filter:'blur(2px)'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'46%',background:'linear-gradient(to top,rgba(0,0,0,.25),transparent)'}}/>
    </div>
  );
}

Object.assign(window, { MediaEditor });
