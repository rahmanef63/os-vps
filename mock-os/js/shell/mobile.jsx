/* ============================================================
   mobile.jsx — iPhone-OS style shell (narrow viewports)
   Home screen · fullscreen apps · swipe-to-close · app switcher
   Exposes (window): MobileShell
   ============================================================ */

function MobileClock(){ const [n,setN]=React.useState(new Date());
  React.useEffect(()=>{const iv=setInterval(()=>setN(new Date()),10000);return()=>clearInterval(iv);},[]);
  return <span>{n.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span>; }

function StatusBar({ light }){
  const c=light?'#fff':'var(--text)';
  return <div style={{height:44,flex:'0 0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 22px',fontSize:14,fontWeight:700,color:c,zIndex:5}}>
    <MobileClock/>
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <svg viewBox="0 0 18 12" style={{width:18,height:12}}><g fill={c}><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".4"/></g></svg>
      <svg viewBox="0 0 20 14" style={{width:18,height:13}}><path d="M10 3C7 3 4.5 4.2 3 6l7 7 7-7c-1.5-1.8-4-3-7-3z" fill={c}/></svg>
      <svg viewBox="0 0 26 13" style={{width:24,height:12}}><rect x="1" y="1.5" width="21" height="10" rx="3" fill="none" stroke={c} strokeWidth="1" opacity=".5"/><rect x="2.5" y="3" width="15" height="7" rx="1.5" fill={c}/><rect x="23" y="4.5" width="2" height="4" rx="1" fill={c} opacity=".5"/></svg>
    </div>
  </div>;
}

function MobileShell({ apps, renderApp, appearance, setAppearance }){
  const [open,setOpen]=React.useState(null);
  const [recents,setRecents]=React.useState([]);
  const [switcher,setSwitcher]=React.useState(false);
  const panelRef=React.useRef(null);
  const home=apps.filter(a=>a.special!=='launchpad');
  const dockApps=apps.filter(a=>['files','video','media','terminal'].includes(a.id));
  const openApp=open?apps.find(a=>a.id===open):null;
  const lightText=appearance.wallpaper!=='mist';

  const launch=(id)=>{ setSwitcher(false); setOpen(id); setRecents(r=>[id,...r.filter(x=>x!==id)].slice(0,6)); };
  const closeHome=()=>setOpen(null);

  // gesture on the home indicator: drag down → home, drag up → app switcher
  const indicatorDrag=(e)=>{
    const sy=e.clientY; const panel=panelRef.current;
    const move=(ev)=>{ const dy=ev.clientY-sy;
      if(panel && dy>0){ panel.style.transform=`translateY(${dy*0.6}px) scale(${1-Math.min(dy,400)/2400})`; panel.style.opacity=1-Math.min(dy,400)/600; } };
    const up=(ev)=>{ const dy=ev.clientY-sy;
      window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
      if(panel){ panel.style.transition='transform .25s,opacity .25s'; panel.style.transform=''; panel.style.opacity=''; setTimeout(()=>{if(panel)panel.style.transition='';},260); }
      if(dy>110) closeHome();
      else if(dy<-60) setSwitcher(true);
    };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  };

  const Indicator=({dark})=> <div style={{display:'flex',justifyContent:'center',padding:'7px 0 9px',touchAction:'none',cursor:'grab'}} onPointerDown={indicatorDrag}>
    <div style={{width:134,height:5,borderRadius:3,background:dark?'rgba(0,0,0,.3)':'rgba(255,255,255,.75)'}}/></div>;

  return (
    <div className={'os dir-'+appearance.dir} data-theme={appearance.theme} style={{'--accent':appearance.accent,position:'fixed',inset:0,overflow:'hidden'}}>
      <div className={'wallpaper wp-'+appearance.wallpaper}/>

      {/* HOME */}
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
        <StatusBar light={lightText}/>
        <div style={{flex:1,minHeight:0,padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridAutoRows:'min-content',gap:'20px 10px',alignContent:'start',overflowY:'auto'}}>
          {home.map(a=>(
            <button key={a.id} onClick={()=>launch(a.id)} style={{background:'none',border:'none',cursor:'default',display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:0}}>
              <div style={{width:'100%',aspectRatio:'1',maxWidth:62}}><AppIcon app={a}/></div>
              <span style={{fontSize:11,fontWeight:500,color:lightText?'#fff':'var(--text)',textShadow:lightText?'0 1px 3px rgba(0,0,0,.5)':'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'}}>{a.name}</span>
            </button>))}
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:6,padding:'2px 0 12px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#fff',opacity:.9}}/><span style={{width:7,height:7,borderRadius:'50%',background:'#fff',opacity:.4}}/></div>
        <div style={{margin:'0 12px 14px',padding:'12px 14px',borderRadius:30,display:'flex',justifyContent:'space-around',background:'rgba(255,255,255,.18)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',border:'.5px solid rgba(255,255,255,.3)'}}>
          {dockApps.map(a=>(<button key={a.id} onClick={()=>launch(a.id)} style={{background:'none',border:'none',cursor:'default',width:60,height:60,padding:0}}><AppIcon app={a}/></button>))}
        </div>
        <Indicator dark={!lightText}/>
      </div>

      {/* APP fullscreen */}
      {openApp && (
        <div ref={panelRef} style={{position:'absolute',inset:0,background:'var(--surface)',display:'flex',flexDirection:'column',animation:'appOpen .28s cubic-bezier(.2,.8,.2,1)',zIndex:10,transformOrigin:'center bottom'}}>
          <div style={{flex:'0 0 auto',background:'var(--glass-bar)',borderBottom:'.5px solid var(--sep)'}}>
            <div style={{height:48,display:'flex',alignItems:'center',gap:10,padding:'0 14px'}}>
              <div style={{width:30,height:30,flex:'0 0 auto'}}><AppIcon app={openApp}/></div>
              <strong style={{flex:1,fontSize:16}}>{openApp.name}</strong>
              <button onClick={closeHome} className="btn" style={{height:30}}>Done</button>
            </div>
          </div>
          <div className="app-host" style={{flex:1,minHeight:0,overflow:'auto',position:'relative'}}>
            <div style={{height:'100%'}}>{renderApp(openApp)}</div>
          </div>
          <Indicator/>
        </div>
      )}

      {/* APP SWITCHER */}
      {switcher && (
        <div onClick={()=>setSwitcher(false)} className="glass" style={{position:'absolute',inset:0,zIndex:40,background:'rgba(10,12,18,.55)',backdropFilter:'blur(30px)',WebkitBackdropFilter:'blur(30px)',display:'flex',flexDirection:'column'}}>
          <div style={{flex:'0 0 auto',height:44}}/>
          <div style={{flex:1,minHeight:0,display:'flex',alignItems:'center',gap:14,overflowX:'auto',padding:'0 32px',scrollSnapType:'x mandatory'}}>
            {recents.length===0 && <div style={{color:'rgba(255,255,255,.6)',width:'100%',textAlign:'center'}}>No recent apps</div>}
            {recents.map(id=>{ const a=apps.find(x=>x.id===id); if(!a)return null;
              return <div key={id} onClick={(e)=>{e.stopPropagation();launch(id);}} style={{flex:'0 0 auto',width:'74%',maxWidth:300,height:'66%',borderRadius:18,overflow:'hidden',scrollSnapAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.5)',background:'var(--window-bg)',display:'flex',flexDirection:'column'}}>
                <div style={{flex:'0 0 auto',display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'var(--glass-bar)',borderBottom:'.5px solid var(--sep)'}}>
                  <div style={{width:24,height:24}}><AppIcon app={a}/></div><strong style={{fontSize:13}}>{a.name}</strong></div>
                <div style={{flex:1,minHeight:0,overflow:'hidden',position:'relative',pointerEvents:'none'}}>
                  <div className="app-host" style={{position:'absolute',inset:0,transform:'scale(.7)',transformOrigin:'top left',width:'143%',height:'143%'}}>{renderApp(a)}</div></div>
              </div>; })}
          </div>
          <div style={{flex:'0 0 auto',textAlign:'center',color:'rgba(255,255,255,.7)',fontSize:13,padding:'10px 0 18px'}}>Tap an app · swipe down to dismiss</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MobileShell });
