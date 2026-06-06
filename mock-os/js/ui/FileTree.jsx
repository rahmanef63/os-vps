/* ============================================================
   ui/FileTree.jsx — shared file/folder directory (DRY, dynamic)
   A reusable browser over the live mock FS. Used by the attachment
   picker, the Code editor explorer, and any other slice that needs to
   navigate files. Re-renders live when the filesystem changes.

   <FileBrowser
      start="/"                     starting folder
      accept={['image','code']}     kindTags / extensions to show (folders always shown); omit = all
      onOpenFile={(path,item)=>{}}  click a file
      onPickFolder={(path)=>{}}     (optional) choose a folder
      compact height                styling
   />
   Exposes (window): FileBrowser, useFsTick, fsList
   ============================================================ */

function useFsTick(){
  const [,force] = React.useReducer(x=>x+1, 0);
  React.useEffect(()=>{ const h=()=>force(); window.addEventListener('osrr:fs', h); return ()=>window.removeEventListener('osrr:fs', h); },[]);
}
function fsGet(){ return (window.OSCTX && OSCTX.current.getFs) ? OSCTX.current.getFs() : {}; }
function fsList(path){ const fs=fsGet(); return fs[path] || []; }
const fbJoin = (b,n)=> b==='/'?'/'+n : b.replace(/\/$/,'')+'/'+n;

function FileBrowser({ start='/', accept, onOpenFile, onPickFolder, compact, height }){
  useFsTick();
  const [path,setPath] = React.useState(start);
  const fs = fsGet();
  const items = fs[path] || [];
  const matches = (it)=>{ if(it.kind==='folder') return true; if(!accept) return true;
    const arr = Array.isArray(accept)?accept:[accept];
    return arr.includes(it.kindTag) || arr.includes(it.ext) || arr.includes('file'); };
  const shown = items.filter(matches);
  const crumbs = path==='/'?[{n:'os-rr',p:'/'}]:[{n:'os-rr',p:'/'}].concat(path.split('/').filter(Boolean).map((n,i,a)=>({n,p:'/'+a.slice(0,i+1).join('/')})));
  const pad = compact?'5px 8px':'7px 10px';

  return <div style={{display:'flex',flexDirection:'column',minHeight:0,height:height||'100%'}}>
    {/* breadcrumb */}
    <div style={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',padding:'2px 2px 8px',fontSize:11.5}}>
      {crumbs.map((c,i)=>(<React.Fragment key={c.p}>
        {i>0 && <span style={{color:'var(--text-faint)'}}>›</span>}
        <span onClick={()=>setPath(c.p)} style={{padding:'2px 6px',borderRadius:6,cursor:'default',fontWeight:i===crumbs.length-1?700:500,color:i===crumbs.length-1?'var(--text)':'var(--text-dim)'}}>{c.n}</span>
      </React.Fragment>))}
      {onPickFolder && <button className="btn" style={{marginLeft:'auto',height:22,fontSize:11}} onClick={()=>onPickFolder(path)}>Use this folder</button>}
    </div>
    {/* list */}
    <div style={{flex:1,minHeight:0,overflow:'auto'}}>
      {shown.length===0 && <div style={{color:'var(--text-faint)',fontSize:12,textAlign:'center',padding:'18px'}}>Empty folder</div>}
      {shown.map(it=>{ const fp=fbJoin(path,it.name); const isDir=it.kind==='folder';
        return <div key={it.id||it.name} onClick={()=>{ if(isDir) setPath(fp); else onOpenFile&&onOpenFile(fp,it); }}
          onDoubleClick={()=>{ if(isDir) setPath(fp); }}
          style={{display:'flex',alignItems:'center',gap:9,padding:pad,borderRadius:8,cursor:'default'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {window.FileIcon ? <FileIcon file={it} sz={compact?18:22}/> : <span style={{width:18,height:18}}/>}
          <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:compact?12:12.5}}>{it.name}</span>
          {isDir ? <svg viewBox="0 0 24 24" style={{width:14,height:14,color:'var(--text-faint)'}}><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <span style={{fontSize:10.5,color:'var(--text-faint)',fontFamily:'var(--font-mono)'}}>{it.ext||''}</span>}
        </div>; })}
    </div>
  </div>;
}

/* move an item (by full path) into a destination folder, via the live FS */
function fsMove(from, toDir){ const os=OSCTX.current; if(!os.setFs||!from||!toDir) return;
  const par = from.replace(/\/[^/]*$/,'')||'/'; const nm = from.split('/').pop();
  if(par===toDir || from===toDir || toDir===from+'' || (toDir+'/').startsWith(from+'/')) return;
  os.setFs(prev=>{ const n={...prev}; const src=n[par]||[]; const it=src.find(x=>x.name===nm); if(!it) return prev;
    const dest=[...(n[toDir]||[])]; let name=nm; const names=new Set(dest.map(x=>x.name));
    while(names.has(name)){ const d=name.lastIndexOf('.'); name = d>0?name.slice(0,d)+' copy'+name.slice(d):name+' copy'; }
    n[par]=src.filter(x=>x.name!==nm); n[toDir]=[...dest,{...it,name}];
    if(it.kind==='folder'){ const oldP=from, newP=fbJoin(toDir,name); Object.keys(n).forEach(k=>{ if(k===oldP||k.startsWith(oldP+'/')){ n[newP+k.slice(oldP.length)]=n[k]; delete n[k]; } }); }
    return n; });
}

/* expandable tree sidebar — Finder / Explorer style (left dir panel), drag-and-drop */
function FileTreeNav({ start='/', selected, onOpenFile, onNavigate, expandedInit, compact }){
  useFsTick();
  const [open,setOpen] = React.useState(()=>({ [start]:true, '/Media':false, ...(expandedInit||{}) }));
  const [drop,setDrop] = React.useState(null);
  const dragRef = React.useRef(null);
  const fs = fsGet();
  const Chev = ({o,show})=> show
    ? <svg viewBox="0 0 24 24" style={{width:12,height:12,flex:'0 0 auto',transform:o?'rotate(90deg)':'none',transition:'transform .12s',opacity:.6}}><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    : <span style={{width:12,flex:'0 0 auto'}}/>;
  const rows = (dir, depth)=> (fs[dir]||[]).map(it=>{ const fp=fbJoin(dir,it.name); const isDir=it.kind==='folder'; const o=open[fp]; const sel=(selected===fp||selected===it.id); const isDrop=drop===fp;
    const dnd = { draggable:true,
      onDragStart:(e)=>{ e.stopPropagation(); dragRef.current=fp; try{ e.dataTransfer.setData('text/plain',fp); e.dataTransfer.effectAllowed='move'; }catch(_){ } },
      onDragEnd:()=>{ dragRef.current=null; setDrop(null); },
      ...(isDir ? {
        onDragOver:(e)=>{ if(dragRef.current&&dragRef.current!==fp){ e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect='move'; if(drop!==fp) setDrop(fp); } },
        onDragLeave:()=>setDrop(d=>d===fp?null:d),
        onDrop:(e)=>{ e.preventDefault(); e.stopPropagation(); const from=dragRef.current||e.dataTransfer.getData('text/plain'); setDrop(null); if(from){ fsMove(from,fp); setOpen(s=>({...s,[fp]:true})); } },
      } : {}) };
    return <React.Fragment key={it.id||it.name}>
      <div className="ftrow" title={it.name} {...dnd}
        onClick={(e)=>{ e.stopPropagation(); if(isDir){ setOpen(s=>({...s,[fp]:!s[fp]})); onNavigate&&onNavigate(fp); } else onOpenFile&&onOpenFile(fp,it); }}
        style={{height:compact?24:27,paddingLeft:6+depth*14, ...(sel?{background:'var(--accent)',color:'var(--accent-text)'}:null), ...(isDrop?{outline:'2px solid var(--accent)',outlineOffset:-2,background:'var(--hover-strong)'}:null)}}>
        <span onClick={(e)=>{ if(isDir){ e.stopPropagation(); setOpen(s=>({...s,[fp]:!s[fp]})); } }} style={{display:'grid',placeItems:'center',width:14,height:'100%',flex:'0 0 auto',marginLeft:-2,cursor:'default'}}><Chev o={o} show={isDir}/></span>
        {window.FileIcon && <FileIcon file={it} sz={compact?16:18}/>}
        <span style={{fontSize:compact?12:12.5,overflow:'hidden',textOverflow:'ellipsis'}}>{it.name}</span>
      </div>
      {isDir && o && rows(fp, depth+1)}
    </React.Fragment>; });
  return <div
    onDragOver={(e)=>{ if(dragRef.current){ e.preventDefault(); } }}
    onDrop={(e)=>{ const from=dragRef.current; setDrop(null); if(from && start) fsMove(from, start); }}
    style={{padding:'4px 6px',minHeight:'100%'}}>{rows(start,0)}</div>;
}

Object.assign(window, { FileBrowser, FileTreeNav, fsMove, useFsTick, fsList });
