/* ============================================================
   apps-files.jsx — File manager
   CRUD · multi-select · drag-drop move · cut/copy/paste · upload · keyboard
   Exposes (window): FileManager, fileVisual, FileIcon
   ============================================================ */

const EXT_COLOR = {
  mp4:'#ff6a9b', mov:'#ff6a9b', webm:'#ff6a9b',
  png:'#ffb13b', jpg:'#ffb13b', jpeg:'#ffb13b', gif:'#ffb13b', svg:'#ffb13b',
  wav:'#34d39a', mp3:'#34d39a', aiff:'#34d39a',
  md:'#7a8aff', txt:'#7a8aff', pdf:'#ff5f57', csv:'#34c98a',
  ts:'#3aa0ff', tsx:'#3aa0ff', js:'#f5c518', py:'#4f86c6', sh:'#5b6070', html:'#ff6a3d', json:'#aeb4c0',
  gz:'#9b8cff', zip:'#9b8cff',
};
function fileVisual(file){
  if (file.kind==='folder') return { glyph:'folder', color:'linear-gradient(160deg,#6fc0ff,#2f8bf0)', folder:true };
  const c = EXT_COLOR[file.ext] || '#9aa0ac';
  const g = file.kindTag==='video'?'film':file.kindTag==='image'?'image':file.kindTag==='audio'?'music'
    : file.ext==='py'?'py':file.ext==='js'?'js':file.ext==='sh'?'sh':file.ext==='html'?'html'
    : file.kindTag==='code'?'code':'doc';
  return { glyph:g, color:`linear-gradient(160deg,${c},${shade(c,-18)})` };
}
function shade(hex, p){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const f=(c)=>Math.max(0,Math.min(255,Math.round(c*(1+p/100)))); return `rgb(${f(r)},${f(g)},${f(b)})`; }

function FileIcon({ file, sz=42 }){
  const v = fileVisual(file);
  return <div className="appicon" style={{ background:v.color, width:sz, height:sz, borderRadius: v.folder?'16%':'22%' }}>
    <Glyph name={v.glyph} /></div>;
}

const FAVS = [
  { p:'/', label:'os-rr', glyph:'cloud' },
  { p:'/Media', label:'Media', glyph:'film' },
  { p:'/Projects', label:'Projects', glyph:'code' },
  { p:'/Downloads', label:'Downloads', glyph:'doc' },
  { p:'/Documents', label:'Documents', glyph:'doc' },
  { p:'/apps', label:'apps', glyph:'grid' },
];

const join = (base, name) => base==='/'? '/'+name : base+'/'+name;

function FileManager({ fs, setFs, launch, openFile, notify }){
  const [path, setPath] = React.useState('/');
  const [hist, setHist] = React.useState(['/']);
  const [hi, setHi] = React.useState(0);
  const [view, setView] = React.useState('grid');
  const [sel, setSel] = React.useState([]);          // array of ids
  const [rename, setRename] = React.useState(null);
  const [ctx, setCtx] = React.useState(null);
  const [clip, setClip] = React.useState(null);       // {mode:'copy'|'cut', ids, from}
  const [drop, setDrop] = React.useState(null);        // key of current drop target
  const [showAI, setShowAI] = React.useState(false);
  const aiStore = useAIStore();
  const fileInput = React.useRef(null);
  const lastRef = React.useRef(null);
  const dragIds = React.useRef([]);
  const rootRef = React.useRef(null);

  const items = fs[path] || [];
  const childPath = (name) => join(path, name);
  const go = (p) => { if(p===path) return; const h=hist.slice(0,hi+1).concat(p); setHist(h); setHi(h.length-1); setPath(p); setSel([]); };
  const back = () => { if(hi>0){ setHi(hi-1); setPath(hist[hi-1]); setSel([]);} };
  const fwd = () => { if(hi<hist.length-1){ setHi(hi+1); setPath(hist[hi+1]); setSel([]);} };

  const openItem = (it) => {
    if (it.kind==='folder'){ if(it.appPkg){ notify(`Running app “${it.name}”`); } else go(childPath(it.name)); }
    else openFile && openFile(it, path);   // app.jsx routes: media → Preview, code/docs → Code editor
  };

  const mutate = (fn) => setFs(prev => { const next={...prev}; fn(next); return next; });
  const f2 = (name,kind,extra={}) => ({ id:uid('f'), name, kind, ...extra });
  const uniqueName = (arr,name) => { let nm=name; const names=new Set(arr.map(x=>x.name));
    while(names.has(nm)){ const dot=nm.lastIndexOf('.'); nm = dot>0 ? nm.slice(0,dot)+' copy'+nm.slice(dot) : nm+' copy'; } return nm; };
  const rekey = (n,oldP,newP) => { if(oldP===newP) return; Object.keys(n).forEach(k=>{ if(k===oldP||k.startsWith(oldP+'/')){ n[newP+k.slice(oldP.length)]=n[k]; delete n[k]; } }); };
  const cloneFolder = (n,srcKey,destKey) => { const kids=n[srcKey]||[]; const cloned=kids.map(k=>({...k,id:uid('f')})); n[destKey]=cloned;
    kids.forEach((k,i)=>{ if(k.kind==='folder') cloneFolder(n, srcKey+'/'+k.name, destKey+'/'+cloned[i].name); }); };

  const newFolder = () => { mutate(n => { const nm=uniqueName(n[path]||[],'untitled folder'); const it=f2(nm,'folder');
    n[path]=[...(n[path]||[]), it]; n[childPath(nm)]=[]; setSel([it.id]); setRename(it.id); }); };
  const doRename = (it, val) => { val=val.trim()||it.name; setRename(null); if(val===it.name) return;
    mutate(n => { val=uniqueName((n[path]||[]).filter(x=>x.id!==it.id),val); n[path]=n[path].map(x=>x.id===it.id?{...x,name:val}:x);
      if(it.kind==='folder') rekey(n, childPath(it.name), childPath(val)); }); };
  const duplicate = (ids) => copyItemsFrom(path, ids, path);

  const trash = (ids) => { mutate(n => { const arr=n[path]||[]; const rm=arr.filter(x=>ids.includes(x.id));
      n[path]=arr.filter(x=>!ids.includes(x.id));
      rm.forEach(m=>{ if(m.kind==='folder'){ const k=childPath(m.name); Object.keys(n).forEach(kk=>{ if(kk===k||kk.startsWith(k+'/')) delete n[kk]; }); } }); });
    setSel([]); setCtx(null); notify(`Moved ${ids.length} item${ids.length>1?'s':''} to Trash`); };

  const moveItemsFrom = (srcPath, ids, destPath) => { if(srcPath===destPath) return;
    mutate(n => { const src=n[srcPath]||[];
      let moving=src.filter(x=>ids.includes(x.id))
        .filter(m=>!(m.kind==='folder' && (destPath===join(srcPath,m.name) || destPath.startsWith(join(srcPath,m.name)+'/'))));
      if(!moving.length) return;
      n[srcPath]=src.filter(x=>!moving.some(m=>m.id===x.id));
      const destArr=[...(n[destPath]||[])]; const added=[];
      moving.forEach(m=>{ const nm=uniqueName(destArr.concat(added), m.name); const e={...m,name:nm}; added.push(e);
        if(m.kind==='folder') rekey(n, join(srcPath,m.name), join(destPath,nm)); });
      n[destPath]=[...destArr,...added]; });
    notify(`Moved ${ids.length} item${ids.length>1?'s':''}`); };

  const copyItemsFrom = (srcPath, ids, destPath) => {
    mutate(n => { const src=n[srcPath]||[]; const copying=src.filter(x=>ids.includes(x.id));
      const destArr=[...(n[destPath]||[])]; const added=[];
      copying.forEach(m=>{ const nm=uniqueName(destArr.concat(added), m.name); const e={...m,id:uid('f'),name:nm}; added.push(e);
        if(m.kind==='folder') cloneFolder(n, join(srcPath,m.name), join(destPath,nm)); });
      n[destPath]=[...destArr,...added]; }); };

  const paste = () => { if(!clip) return; if(clip.mode==='cut'){ moveItemsFrom(clip.from, clip.ids, path); setClip(null); } else { copyItemsFrom(clip.from, clip.ids, path); notify('Pasted'); } setCtx(null); };

  const upload = (files, destPath=path) => { const list=[...files].map(file => f2(file.name,'file',{
      ext:(file.name.split('.').pop()||'').toLowerCase(), size:fmtSize(file.size), meta:'Uploaded', kindTag:guessTag(file.name) }));
    mutate(n => { const arr=[...(n[destPath]||[])]; list.forEach(e=>{ e.name=uniqueName(arr,e.name); arr.push(e); }); n[destPath]=arr; });
    notify(`Uploaded ${list.length} file${list.length>1?'s':''}`); };

  // selection
  const onItemClick = (e,it,idx) => { e.stopPropagation();
    if(e.metaKey||e.ctrlKey){ setSel(s=> s.includes(it.id)? s.filter(x=>x!==it.id):[...s,it.id]); lastRef.current=idx; }
    else if(e.shiftKey && lastRef.current!=null){ const a=Math.min(lastRef.current,idx),b=Math.max(lastRef.current,idx); setSel(items.slice(a,b+1).map(x=>x.id)); }
    else { setSel([it.id]); lastRef.current=idx; } };
  const onItemCtx = (e,it,idx) => { e.preventDefault(); e.stopPropagation(); if(!sel.includes(it.id)){ setSel([it.id]); lastRef.current=idx; } setCtx({x:e.clientX,y:e.clientY,target:it}); };

  // drag & drop
  const onDragStart = (e,it) => { const ids = sel.includes(it.id)?sel:[it.id]; if(!sel.includes(it.id)) setSel([it.id]);
    dragIds.current=ids; e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', ids.join(',')); }catch(_){ } };
  const onFolderOver = (e,key) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect='move'; if(drop!==key) setDrop(key); };
  const onFolderDrop = (e,destPath,key) => { e.preventDefault(); e.stopPropagation(); setDrop(null);
    if(e.dataTransfer.files && e.dataTransfer.files.length){ upload(e.dataTransfer.files, destPath); return; }
    if(dragIds.current.length) moveItemsFrom(path, dragIds.current, destPath); dragIds.current=[]; };

  // keyboard
  const onKey = (e) => { if(rename) return; const tag=(e.target.tagName||''); if(tag==='INPUT'||tag==='TEXTAREA') return;
    const mod=e.metaKey||e.ctrlKey;
    if(mod && e.key==='a'){ e.preventDefault(); setSel(items.map(x=>x.id)); }
    else if(mod && e.key.toLowerCase()==='c'){ if(sel.length){ setClip({mode:'copy',ids:sel,from:path}); notify(`Copied ${sel.length} item${sel.length>1?'s':''}`); } }
    else if(mod && e.key.toLowerCase()==='x'){ if(sel.length){ setClip({mode:'cut',ids:sel,from:path}); } }
    else if(mod && e.key.toLowerCase()==='v'){ e.preventDefault(); paste(); }
    else if(e.key==='Enter'){ if(sel.length===1){ e.preventDefault(); setRename(sel[0]); } }
    else if(e.key==='Backspace'||e.key==='Delete'){ if(sel.length){ e.preventDefault(); trash(sel); } }
    else if(e.key==='Escape'){ setSel([]); setClip(null); setCtx(null); } };

  const crumbs = path==='/'? [{n:'os-rr',p:'/'}] : [{n:'os-rr',p:'/'}].concat(
    path.split('/').filter(Boolean).map((n,i,arr)=>({ n, p:'/'+arr.slice(0,i+1).join('/') })));
  React.useEffect(()=>{ const h=()=>setCtx(null); window.addEventListener('click',h); return ()=>window.removeEventListener('click',h); },[]);

  const isCut = (id) => clip && clip.mode==='cut' && clip.from===path && clip.ids.includes(id);

  const Item = (it,idx) => {
    const on = sel.includes(it.id);
    const isDrop = it.kind==='folder' && drop===childPath(it.name);
    const dragProps = { draggable:true, onDragStart:(e)=>onDragStart(e,it),
      ...(it.kind==='folder'?{ onDragOver:(e)=>onFolderOver(e,childPath(it.name)), onDragLeave:()=>setDrop(d=>d===childPath(it.name)?null:d), onDrop:(e)=>onFolderDrop(e,childPath(it.name)) }:{}) };
    const renameInput = (w) => <input className="field" autoFocus defaultValue={it.name} style={{height:22,fontSize:12,width:w,textAlign:w?'center':'left'}}
        onClick={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()} onBlur={(e)=>doRename(it,e.target.value)} onKeyDown={(e)=>{e.stopPropagation(); if(e.key==='Enter')e.target.blur(); if(e.key==='Escape')setRename(null);}} />;
    if(view==='grid') return (
      <div key={it.id} {...dragProps} onClick={(e)=>onItemClick(e,it,idx)} onDoubleClick={()=>openItem(it)} onContextMenu={(e)=>onItemCtx(e,it,idx)}
        style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'8px 4px',borderRadius:10,cursor:'default',opacity:isCut(it.id)?.5:1,
          background:on?'var(--accent)':'transparent',color:on?'var(--accent-text)':'var(--text)',outline:isDrop?'2px solid var(--accent)':'none',outlineOffset:-2}}>
        <div style={{transform:isDrop?'scale(1.08)':'none',transition:'transform .12s'}}><FileIcon file={it} sz={48} /></div>
        {rename===it.id ? renameInput(84) : <span style={{fontSize:12,fontWeight:500,textAlign:'center',lineHeight:1.2,maxWidth:90,wordBreak:'break-word'}}>{it.name}</span>}
      </div>);
    return (
      <div key={it.id} {...dragProps} onClick={(e)=>onItemClick(e,it,idx)} onDoubleClick={()=>openItem(it)} onContextMenu={(e)=>onItemCtx(e,it,idx)}
        style={{display:'grid',gridTemplateColumns:'1fr 120px 120px',gap:10,alignItems:'center',padding:'6px 16px',cursor:'default',opacity:isCut(it.id)?.5:1,
          background:on?'var(--accent)':(isDrop?'var(--hover-strong)':'transparent'),color:on?'var(--accent-text)':'var(--text)',outline:isDrop?'1.5px solid var(--accent)':'none',outlineOffset:-2}}>
        <span style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}><FileIcon file={it} sz={22} />
          {rename===it.id ? renameInput(0) : <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</span>}</span>
        <span style={{fontSize:12,opacity:.7,fontVariantNumeric:'tabular-nums'}}>{it.kind==='folder'?'—':it.size}</span>
        <span style={{fontSize:12,opacity:.7}}>{it.kind==='folder'?'Folder':(it.meta||(it.ext||'').toUpperCase())}</span>
      </div>);
  };

  const ctxTargets = ctx && ctx.target ? (sel.includes(ctx.target.id)?sel:[ctx.target.id]) : [];

  return (
    <div className="app-root" ref={rootRef} tabIndex={0} onKeyDown={onKey} onMouseDown={()=>rootRef.current&&rootRef.current.focus({preventScroll:true})} style={{outline:'none'}} onClick={()=>setSel([])}>
      <div className="app-side" onClick={(e)=>e.stopPropagation()} style={{display:'flex',flexDirection:'column'}}>
        <div className="side-h">Files</div>
        <div style={{flex:1,minHeight:0,overflow:'auto',margin:'0 -4px'}}>
          <FileTreeNav start="/" selected={path} onNavigate={(p)=>go(p)} onOpenFile={(fp,it)=>openFile&&openFile(it, fp.replace(/\/[^/]*$/,'')||'/')} compact/>
        </div>
        <div className="side-h storage-block" style={{marginTop:8}}>Storage</div>
        <div className="storage-block" style={{padding:'4px 8px'}}>
          <div style={{height:6, borderRadius:4, background:'var(--inset)', overflow:'hidden'}}>
            <div style={{width:'63%', height:'100%', background:'var(--accent)'}} /></div>
          <div style={{fontSize:11, color:'var(--text-faint)', marginTop:5}}>289 GB of 460 GB used</div>
        </div>
      </div>

      <div className="app-main">
        <div className="app-toolbar">
          <button className="btn icon" disabled={hi===0} onClick={back} title="Back"><Chev d="left"/></button>
          <button className="btn icon" disabled={hi>=hist.length-1} onClick={fwd} title="Forward"><Chev d="right"/></button>
          <div style={{display:'flex', alignItems:'center', gap:2, flex:1, minWidth:0, overflow:'hidden'}}>
            {crumbs.map((c,i)=>(<React.Fragment key={c.p}>
              {i>0 && <span style={{color:'var(--text-faint)'}}>›</span>}
              <span onClick={()=>go(c.p)} onDragOver={(e)=>onFolderOver(e,'crumb:'+c.p)} onDragLeave={()=>setDrop(d=>d==='crumb:'+c.p?null:d)} onDrop={(e)=>onFolderDrop(e,c.p,'crumb:'+c.p)}
                style={{padding:'2px 6px', borderRadius:6, cursor:'default', fontWeight:i===crumbs.length-1?700:500, color:i===crumbs.length-1?'var(--text)':'var(--text-dim)', whiteSpace:'nowrap', background:drop==='crumb:'+c.p?'var(--accent)':'transparent'}}>{c.n}</span>
            </React.Fragment>))}
          </div>
          <div style={{display:'flex', background:'var(--inset)', borderRadius:7, padding:2}}>
            <button className="btn icon" style={segStyle(view==='grid')} onClick={()=>setView('grid')} title="Grid"><Glyph name="grid"/></button>
            <button className="btn icon" style={segStyle(view==='list')} onClick={()=>setView('list')} title="List"><ListGlyph/></button>
          </div>
          <button className="btn" title="Ask Alfa" onClick={()=>setShowAI(v=>!v)} style={showAI?{background:'var(--accent)',color:'#fff',borderColor:'transparent'}:null}>
            <svg viewBox="0 0 24 24" style={{width:14,height:14}}><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" fill={showAI?'#fff':'var(--accent)'}/></svg>Alfa</button>
          {clip && <button className="btn" onClick={paste} title="Paste">Paste</button>}
          <button className="btn" onClick={newFolder}><Glyph name="folder"/>New</button>
          <button className="btn primary" onClick={()=>fileInput.current.click()}><UpGlyph/>Upload</button>
          <input ref={fileInput} type="file" multiple hidden onChange={(e)=>{upload(e.target.files); e.target.value='';}} />
        </div>

        <div style={{flex:1, minHeight:0, overflow:'auto', padding: view==='grid'?'16px':'6px 0', outline:drop==='self'?'2px dashed var(--accent)':'none', outlineOffset:-6}}
             onClick={(e)=>{e.stopPropagation(); setSel([]);}}
             onContextMenu={(e)=>{e.preventDefault(); setSel([]); setCtx({x:e.clientX,y:e.clientY,target:null});}}
             onDragOver={(e)=>{ if([...e.dataTransfer.types].includes('Files')){ e.preventDefault(); setDrop('self'); } }}
             onDragLeave={()=>setDrop(d=>d==='self'?null:d)}
             onDrop={(e)=>{ setDrop(null); if(e.dataTransfer.files && e.dataTransfer.files.length){ e.preventDefault(); upload(e.dataTransfer.files); } }}>
          {items.length===0 && <div style={{color:'var(--text-faint)', textAlign:'center', marginTop:60, fontSize:13}}>This folder is empty<br/><span style={{fontSize:12}}>Drop files here to upload</span></div>}
          {view==='grid' ? (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))', gap:'10px 6px'}}>{items.map(Item)}</div>
          ) : (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 120px 120px',gap:10,padding:'6px 16px',fontSize:11,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--text-faint)',borderBottom:'.5px solid var(--sep)'}}>
                <span>Name</span><span>Size</span><span>Kind</span></div>
              {items.map(Item)}
            </div>
          )}
        </div>
        <div style={{height:24,flex:'0 0 auto',borderTop:'.5px solid var(--sep)',display:'flex',alignItems:'center',padding:'0 14px',fontSize:11,color:'var(--text-faint)',gap:12}}>
          <span>{items.length} items</span>
          {sel.length>0 && <span>{sel.length} selected</span>}
          {clip && <span style={{marginLeft:'auto'}}>{clip.ids.length} {clip.mode==='cut'?'cut':'copied'} — ⌘V to paste</span>}
        </div>
      </div>

      {showAI && <div style={{width:324,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--window-bg)',display:'flex',flexDirection:'column'}} onClick={(e)=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderBottom:'.5px solid var(--sep)',background:'var(--window-head)'}}>
          <AgentAvatar agent={aiStore.activeAgent} size={24}/><strong style={{fontSize:12.5,flex:1}}>{aiStore.activeAgent.name}</strong>
          <button className="btn icon" onClick={()=>setShowAI(false)} title="Close" style={{height:24,width:24}}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
        </div>
        <AIChat agent={aiStore.activeAgent} skills={aiStore.skills} scope="Files" compact storeKey="ai.appthreads" threadId="files"
          starters={['Create a folder “Invoices” in /Documents','Make a project folder structure under /Projects','List what’s in /Media']}/>
      </div>}

      {ctx && <div className="ctx" style={{left:Math.min(ctx.x,window.innerWidth-200),top:Math.min(ctx.y,window.innerHeight-260)}} onClick={(e)=>e.stopPropagation()}>
        {ctx.target ? <>
          {ctxTargets.length===1 && <div className="mi" onClick={()=>{openItem(ctx.target);setCtx(null);}}>Open</div>}
          {ctxTargets.length===1 && (ctx.target.kindTag==='video'||ctx.target.kindTag==='image') && <div className="mi" onClick={()=>{launch(ctx.target.kindTag==='video'?'video':'media',{file:ctx.target});setCtx(null);}}>Open in editor</div>}
          {ctxTargets.length===1 && <div className="mi" onClick={()=>{setRename(ctx.target.id);setCtx(null);}}>Rename<span style={{marginLeft:'auto',opacity:.4}}>↵</span></div>}
          <div className="sep"/>
          <div className="mi" onClick={()=>{setClip({mode:'cut',ids:ctxTargets,from:path});setCtx(null);}}>Cut<span style={{marginLeft:'auto',opacity:.4}}>⌘X</span></div>
          <div className="mi" onClick={()=>{setClip({mode:'copy',ids:ctxTargets,from:path});setCtx(null);notify(`Copied ${ctxTargets.length} item${ctxTargets.length>1?'s':''}`);}}>Copy<span style={{marginLeft:'auto',opacity:.4}}>⌘C</span></div>
          {clip && <div className="mi" onClick={paste}>Paste<span style={{marginLeft:'auto',opacity:.4}}>⌘V</span></div>}
          <div className="mi" onClick={()=>{duplicate(ctxTargets);setCtx(null);}}>Duplicate</div>
          <div className="mi" onClick={()=>{notify(`Downloading ${ctxTargets.length} item${ctxTargets.length>1?'s':''}…`);setCtx(null);}}>Download</div>
          <div className="sep"/>
          <div className="mi danger" onClick={()=>trash(ctxTargets)}>Move to Trash<span style={{marginLeft:'auto',opacity:.4}}>⌫</span></div>
        </> : <>
          <div className="mi" onClick={()=>{newFolder();setCtx(null);}}>New Folder</div>
          <div className="mi" onClick={()=>{fileInput.current.click();setCtx(null);}}>Upload…</div>
          {clip && <div className="mi" onClick={paste}>Paste<span style={{marginLeft:'auto',opacity:.4}}>⌘V</span></div>}
        </>}
      </div>}
    </div>
  );
}

function FileMiniGlyph({ name }){ return <div style={{width:18,height:18,borderRadius:5,background:'var(--accent)',display:'grid',placeItems:'center',flex:'0 0 auto'}}><svg viewBox="0 0 24 24" style={{width:12,height:12}}><Glyph name={name}/></svg></div>; }
function Chev({d}){ return <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d={d==='left'?'M15 6l-6 6 6 6':'M9 6l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ListGlyph(){ return <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
function TreeGlyph(){ return <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M5 5h6M5 5v14h6M9 12h6M9 12V5m6 7h4m-4 7h4M9 19h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

/* recursive folder structure (the "tree" view) */
function FileTreeView({ fs, sel, setSel, go, onOpenFile }){
  const [open,setOpen] = React.useState({ '/':true });
  const joinp = (b,n)=> b==='/'?'/'+n : b.replace(/\/$/,'')+'/'+n;
  const Chev = ({o})=> <svg viewBox="0 0 24 24" style={{width:12,height:12,flex:'0 0 auto',transform:o?'rotate(90deg)':'none',transition:'transform .12s',color:'var(--text-faint)'}}><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const rows = (dir, depth)=> (fs[dir]||[]).map(it=>{ const fp=joinp(dir,it.name); const isDir=it.kind==='folder'; const o=open[fp]; const on=sel.includes(it.id);
    return <React.Fragment key={it.id}>
      <div onClick={()=>{ setSel([it.id]); if(isDir) setOpen(s=>({...s,[fp]:!s[fp]})); }}
        onDoubleClick={()=>{ if(isDir){ go&&go(fp); } else onOpenFile&&onOpenFile(it,dir); }}
        style={{display:'flex',alignItems:'center',gap:7,padding:'4px 8px',paddingLeft:8+depth*17,borderRadius:7,cursor:'default',
          background:on?'var(--accent)':'transparent',color:on?'var(--accent-text)':'var(--text)'}}>
        {isDir ? <Chev o={o}/> : <span style={{width:12,flex:'0 0 auto'}}/>}
        <FileIcon file={it} sz={18}/>
        <span style={{fontSize:12.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</span>
        {!isDir && it.size && <span style={{marginLeft:'auto',fontSize:10.5,color:on?'rgba(255,255,255,.7)':'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{it.size}</span>}
      </div>
      {isDir && o && rows(fp, depth+1)}
    </React.Fragment>; });
  return <div style={{padding:'6px 8px'}}>{rows('/',0)}</div>;
}
function UpGlyph(){ return <svg viewBox="0 0 24 24"><path d="M12 16V5m0 0l-4 4m4-4l4 4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function segStyle(on){ return { border:'none', background:on?'var(--window-bg)':'transparent', boxShadow:on?'0 1px 2px rgba(0,0,0,.12)':'none', color:'var(--text)' }; }
function fmtSize(b){ if(b<1024)return b+' B'; if(b<1048576)return (b/1024).toFixed(0)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function guessTag(name){ const e=(name.split('.').pop()||'').toLowerCase();
  if(['mp4','mov','webm','avi'].includes(e))return'video'; if(['png','jpg','jpeg','gif','svg','webp'].includes(e))return'image';
  if(['wav','mp3','aiff','m4a'].includes(e))return'audio'; if(['js','ts','tsx','py','sh','html','json','css'].includes(e))return'code'; return null; }

Object.assign(window, { FileManager, fileVisual, FileIcon });
