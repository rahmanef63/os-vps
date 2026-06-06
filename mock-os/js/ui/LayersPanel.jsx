/* ============================================================
   ui/LayersPanel.jsx — reusable layer stack (front = top of list)
   Props: layers[{id,name,kind,visible,opacity}], sel, set of callbacks, addMenu
   Exposes (window): LayersPanel, LayerGlyph
   ============================================================ */

function LayerGlyph({ kind }){
  const p = kind==='text' ? <path d="M5 6h14M12 6v13M8 19h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    : kind==='shape' ? <rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    : kind==='sticker' ? <g fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r=".8" fill="currentColor" stroke="none"/><path d="M9 14c1 1.3 5 1.3 6 0" strokeLinecap="round"/></g>
    : kind==='html' ? <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    : kind==='adjust' ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></g>
    : <g fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><path d="M5 17l4-4 3 3 3-2 4 3"/></g>;
  return <svg viewBox="0 0 24 24" style={{width:15,height:15}}>{p}</svg>;
}

function LayersPanel({ layers, sel, onSelect, onToggle, onOpacity, onMove, onDelete, onRename, onAdd }){
  const [menu,setMenu]=React.useState(false);
  const [editing,setEditing]=React.useState(null);
  const selLayer = layers.find(l=>l.id===sel);
  const ADD=[['image','Image'],['text','Text'],['shape','Shape'],['html','Embed HTML']];
  return <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:200}}>
    <SectionLabel right={
      <div style={{position:'relative'}}>
        <button className="btn icon" style={{width:24,height:24}} title="Add layer" onClick={()=>setMenu(m=>!m)}>
          <svg viewBox="0 0 24 24" style={{width:14,height:14}}><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></button>
        {menu && <div className="ctx" style={{right:0,top:26,left:'auto',minWidth:120}} onMouseLeave={()=>setMenu(false)}>
          {ADD.map(([k,l])=><div key={k} className="mi" onClick={()=>{onAdd&&onAdd(k);setMenu(false);}}><LayerGlyph kind={k}/>&nbsp;{l}</div>)}
        </div>}
      </div>}>Layers</SectionLabel>

    <div style={{flex:1,minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:4,paddingRight:2}}>
      {layers.length===0 && <Empty sub="Use + to add one">No layers</Empty>}
      {layers.map((l,i)=>{ const on=l.id===sel;
        return <div key={l.id} onClick={()=>onSelect(l.id)}
          style={{display:'flex',alignItems:'center',gap:7,padding:'6px 7px',borderRadius:8,cursor:'default',
            background:on?'var(--accent)':'var(--field)',color:on?'#fff':'var(--text)',border:'.5px solid '+(on?'transparent':'var(--sep)'),opacity:l.visible?1:.45}}>
          <button title="Visibility" onClick={(e)=>{e.stopPropagation();onToggle(l.id);}} style={{border:'none',background:'transparent',color:'inherit',cursor:'default',padding:0,display:'grid',placeItems:'center',width:18,height:18}}>
            {l.visible ? <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>
              : <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M4 4l16 16M9.5 9.6A2.6 2.6 0 0012 14.6M6.3 6.5C3.8 8 2 12 2 12s4 7 10 7c1.8 0 3.4-.5 4.8-1.2M9.5 5.2A9.7 9.7 0 0112 5c6 0 10 7 10 7a18 18 0 01-2.4 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          </button>
          <span style={{opacity:.85,display:'grid',placeItems:'center'}}><LayerGlyph kind={l.kind}/></span>
          {editing===l.id
            ? <input autoFocus className="field" defaultValue={l.name} style={{flex:1,height:22,fontSize:12}} onClick={e=>e.stopPropagation()}
                onBlur={e=>{onRename(l.id,e.target.value);setEditing(null);}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')e.target.blur();if(e.key==='Escape')setEditing(null);}}/>
            : <span style={{flex:1,fontSize:12.5,fontWeight:on?600:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onDoubleClick={()=>setEditing(l.id)}>{l.name}</span>}
          <div style={{display:'flex',gap:1}}>
            <button title="Up" disabled={i===0} onClick={(e)=>{e.stopPropagation();onMove(l.id,-1);}} style={miniBtn(i===0,on)}>▲</button>
            <button title="Down" disabled={i===layers.length-1} onClick={(e)=>{e.stopPropagation();onMove(l.id,1);}} style={miniBtn(i===layers.length-1,on)}>▼</button>
          </div>
        </div>; })}
    </div>

    {selLayer && <div style={{borderTop:'.5px solid var(--sep)',marginTop:8,paddingTop:10}}>
      <KSlider label="Opacity" value={Math.round(selLayer.opacity)} min={0} max={100} unit="%" onChange={v=>onOpacity(selLayer.id,v)} />
      <button className="btn" style={{width:'100%',color:'#ff5f57'}} onClick={()=>onDelete(selLayer.id)}>Delete layer</button>
    </div>}
  </div>;
}
function miniBtn(dis,on){ return {width:16,height:16,border:'none',borderRadius:4,fontSize:8,lineHeight:1,cursor:'default',
  background:on?'rgba(255,255,255,.18)':'var(--inset)',color:'inherit',opacity:dis?.3:.8,padding:0}; }

Object.assign(window, { LayersPanel, LayerGlyph });
