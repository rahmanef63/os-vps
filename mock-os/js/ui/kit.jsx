/* ============================================================
   ui/kit.jsx — shared, DRY UI primitives (exposed on window)
   SectionLabel · PropRow · KSlider · Seg · IconBtn · TabRail · Empty
   ============================================================ */

function SectionLabel({ children, right }){
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
    <span style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)'}}>{children}</span>
    {right}</div>;
}

function PropRow({ label, value, children }){
  return <div style={{marginBottom:11}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:600,color:'var(--text-dim)',marginBottom:5}}>
      <span>{label}</span>{value!=null && <span style={{color:'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{value}</span>}</div>
    {children}</div>;
}

function KSlider({ label, value, min=0, max=100, step=1, unit='', onChange }){
  return <PropRow label={label} value={`${value}${unit}`}>
    <input type="range" min={min} max={max} step={step} value={value} style={{width:'100%'}} onChange={e=>onChange(+e.target.value)} />
  </PropRow>;
}

// segmented button group — options: [value] or [[value,label]]
function Seg({ options, value, onChange, style }){
  const opts = options.map(o=>Array.isArray(o)?o:[o,o]);
  return <div style={{display:'flex',gap:4,...style}}>
    {opts.map(([v,l])=>(
      <button key={v} className="btn" style={{flex:1,padding:'0 8px',height:26,textTransform:typeof l==='string'?'capitalize':'none',
        background:value===v?'var(--accent)':'var(--field)',color:value===v?'#fff':'var(--text)',borderColor:'transparent'}}
        onClick={()=>onChange(v)}>{l}</button>))}
  </div>;
}

function IconBtn({ title, onClick, active, disabled, dim, children }){
  return <button title={title} disabled={disabled} onClick={onClick} className="btn icon"
    style={active?{background:'var(--accent)',color:'#fff',borderColor:'transparent'}:dim?{opacity:.5}:null}>{children}</button>;
}

// vertical icon tool rail (Media editor etc.) — items: [{id,label,icon}]
function TabRail({ items, value, onChange }){
  return <div style={{width:54,flex:'0 0 auto',background:'var(--sidebar)',borderRight:'.5px solid var(--sep)',display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'10px 0',overflowY:'auto'}}>
    {items.map(it=>(
      <button key={it.id} onClick={()=>onChange(it.id)} title={it.label} style={{width:40,height:40,flex:'0 0 auto',borderRadius:9,border:'none',cursor:'default',display:'grid',placeItems:'center',
        background:value===it.id?'var(--accent)':'transparent',color:value===it.id?'#fff':'var(--text-dim)'}}>
        <svg viewBox="0 0 24 24" style={{width:20,height:20}}>{it.icon}</svg></button>))}
  </div>;
}

function Empty({ children, sub }){
  return <div style={{color:'var(--text-faint)',textAlign:'center',marginTop:40,fontSize:13,lineHeight:1.5}}>{children}{sub&&<><br/><span style={{fontSize:12}}>{sub}</span></>}</div>;
}

Object.assign(window, { SectionLabel, PropRow, KSlider, Seg, IconBtn, TabRail, Empty });
