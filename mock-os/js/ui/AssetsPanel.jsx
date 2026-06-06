/* ============================================================
   ui/AssetsPanel.jsx — reusable media bin sourced from the filesystem
   Lists files across the VPS, filterable by kind; click or drag to use.
   Props: fs, kinds(['image','video','audio']|null=all), onPick(file), compact
   Exposes (window): AssetsPanel, collectAssets
   ============================================================ */

function collectAssets(fs, kinds){
  const out=[];
  Object.keys(fs||{}).forEach(p=>{ (fs[p]||[]).forEach(e=>{
    if(e.kind==='folder') return;
    if(kinds && !kinds.includes(e.kindTag)) return;
    out.push({ ...e, dir:p }); }); });
  // de-dupe by id, stable order: media-ish first
  const rank={video:0,image:1,audio:2};
  return out.sort((a,b)=>(rank[a.kindTag]??9)-(rank[b.kindTag]??9) || a.name.localeCompare(b.name));
}

function AssetsPanel({ fs, kinds, onPick, compact }){
  const [q,setQ]=React.useState('');
  const [k,setK]=React.useState('all');
  const all=collectAssets(fs, kinds);
  const kindsAvail=['all',...Array.from(new Set(all.map(a=>a.kindTag).filter(Boolean)))];
  const list=all.filter(a=>(k==='all'||a.kindTag===k) && a.name.toLowerCase().includes(q.toLowerCase()));
  const FileIcon=window.FileIcon;
  const drag=(e,a)=>{ e.dataTransfer.effectAllowed='copy'; try{ e.dataTransfer.setData('application/os-asset', JSON.stringify({name:a.name,kindTag:a.kindTag,ext:a.ext,dir:a.dir})); e.dataTransfer.setData('text/plain',a.name);}catch(_){ } };
  return <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:200}}>
    <SectionLabel>Assets</SectionLabel>
    <input className="field" value={q} placeholder="Search media…" onChange={e=>setQ(e.target.value)} style={{width:'100%',marginBottom:8}} onKeyDown={e=>e.stopPropagation()} />
    {kindsAvail.length>2 && <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
      {kindsAvail.map(x=><button key={x} onClick={()=>setK(x)} style={{fontSize:10.5,padding:'3px 9px',borderRadius:20,border:'none',cursor:'default',textTransform:'capitalize',
        background:k===x?'var(--accent)':'var(--inset)',color:k===x?'#fff':'var(--text-dim)',fontWeight:600}}>{x}</button>)}</div>}
    <div style={{flex:1,minHeight:0,overflowY:'auto',display:'grid',gridTemplateColumns:compact?'1fr 1fr':'1fr 1fr 1fr',gap:'10px 8px',alignContent:'start',paddingRight:2}}>
      {list.length===0 && <div style={{gridColumn:'1/-1'}}><Empty>No matching media</Empty></div>}
      {list.map((a,i)=>(
        <div key={a.id||i} draggable onDragStart={e=>drag(e,a)} onClick={()=>onPick&&onPick(a)} title={a.dir+'/'+a.name}
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,cursor:'default'}}>
          <div style={{position:'relative',width:'100%',aspectRatio:'1',borderRadius:9,overflow:'hidden',border:'.5px solid var(--sep)',display:'grid',placeItems:'center',background:'var(--inset)'}}>
            {FileIcon ? <FileIcon file={a} sz={compact?30:34}/> : <div style={{fontSize:11}}>{a.ext}</div>}
            {a.meta && <span style={{position:'absolute',bottom:3,right:4,fontSize:8.5,fontFamily:'var(--font-mono)',color:'rgba(255,255,255,.85)',background:'rgba(0,0,0,.45)',padding:'0 3px',borderRadius:3}}>{(a.ext||'').toUpperCase()}</span>}
          </div>
          <span style={{fontSize:10.5,textAlign:'center',lineHeight:1.2,maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%',color:'var(--text-dim)'}}>{a.name}</span>
        </div>))}
    </div>
    <div style={{fontSize:10,color:'var(--text-faint)',marginTop:8}}>Click or drag an asset into the editor</div>
  </div>;
}

Object.assign(window, { AssetsPanel, collectAssets });
