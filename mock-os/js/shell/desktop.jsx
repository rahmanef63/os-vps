/* ============================================================
   shell.jsx — Desktop shell: menu bar, dock, windows, launchpad
   Exposes (window): Desktop
   ============================================================ */

function useClock(){
  const [now,setNow]=React.useState(new Date());
  React.useEffect(()=>{ const iv=setInterval(()=>setNow(new Date()),1000*20); return ()=>clearInterval(iv); },[]);
  return now;
}

function MenuBar({ appName, appearance, setAppearance, onAbout, onLaunchpad }){
  const now=useClock();
  const [menu,setMenu]=React.useState(null);
  const day=now.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
  const time=now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  React.useEffect(()=>{ const h=()=>setMenu(null); window.addEventListener('click',h); return ()=>window.removeEventListener('click',h); },[]);
  const M=(id,label,items,bold,extra)=> <div className={'mb-item'+(bold?' app':'')+(extra?' '+extra:'')+(menu===id?' active':'')} onClick={(e)=>{e.stopPropagation();setMenu(menu===id?null:id);}} onMouseEnter={()=>menu&&setMenu(id)}>{label}
    {menu===id && <div className="menu-pop" style={{left:0}} onClick={e=>e.stopPropagation()}>{items.map((it,i)=>it==='-'?<div key={i} className="sep"/>:<div key={i} className={'mi'+(it.dim?' dim':'')} onClick={()=>{it.fn&&it.fn();setMenu(null);}}>{it.l}{it.k&&<span className="k">{it.k}</span>}</div>)}</div>}</div>;
  return (
    <div className="menubar glass" style={{position:'relative'}}>
      <div className="mb-logo"><b>rr</b></div>
      {M('apple','os-rr',[{l:'About os-rr',fn:onAbout},'-',{l:'System Settings…',fn:()=>onAbout('settings')},{l:'App Store…'},'-',{l:'Sleep'},{l:'Restart…'},{l:'Shut Down…'}])}
      {M('app',appName,[{l:'About '+appName,dim:true},'-',{l:'Preferences…',k:'⌘,'},'-',{l:'Hide '+appName,k:'⌘H'},{l:'Quit '+appName,k:'⌘Q'}],true)}
      {M('file','File',[{l:'New',k:'⌘N'},{l:'Open…',k:'⌘O'},'-',{l:'Save',k:'⌘S'},{l:'Export…'}],false,'mb-menu-extra')}
      {M('edit','Edit',[{l:'Undo',k:'⌘Z'},{l:'Redo',k:'⇧⌘Z'},'-',{l:'Cut',k:'⌘X'},{l:'Copy',k:'⌘C'},{l:'Paste',k:'⌘V'}],false,'mb-menu-extra')}
      {M('view','View',[{l:'Launchpad',fn:onLaunchpad},'-',{l:'Enter Full Screen',k:'⌃⌘F'}],false,'mb-menu-extra')}
      <div className="mb-right">
        <div className="mb-stat" title="Toggle theme" onClick={()=>setAppearance(p=>({...p,theme:p.theme==='dark'?'light':'dark'}))}>
          {appearance.theme==='dark'
            ? <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" fill="currentColor"/></svg>
            : <svg viewBox="0 0 24 24" style={{width:15,height:15}}><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        </div>
        <div className="mb-stat mb-stat-net"><svg viewBox="0 0 24 24" style={{width:16,height:16}}><path d="M2 8.5C5 6 9 4.5 12 4.5S19 6 22 8.5M5 12c2-1.7 4.5-2.6 7-2.6s5 .9 7 2.6M8 15.4c1.2-1 2.6-1.5 4-1.5s2.8.5 4 1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor"/></svg></div>
        <div className="mb-stat mb-stat-vol"><svg viewBox="0 0 24 24" style={{width:16,height:16}}><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
        <div className="mb-stat mb-clock">{day}&nbsp;&nbsp;{time}</div>
      </div>
    </div>
  );
}

function Dock({ apps, mgr, launch }){
  const running=new Set(mgr.wins.map(w=>w.appId));
  const docked=apps.filter(a=>a.dock || running.has(a.id) || a.user);
  return (
    <div className="dock-wrap">
      <div className="dock glass">
        {docked.map((a,i)=>(<React.Fragment key={a.id}>
          {a.id==='launcher'&&i>0&&<div className="dock-sep"/>}
          <div className="dock-ico" onClick={()=>launch(a.id)}>
            <span className="tip">{a.name}</span>
            <AppIcon app={a}/>
            {running.has(a.id)&&<span className="dock-run"/>}
          </div>
        </React.Fragment>))}
      </div>
    </div>
  );
}

const TOPBAR2=26, DOCKRES=96;
function snapRect(zone){
  const vw=window.innerWidth, vh=window.innerHeight, top=TOPBAR2+6;
  const availH=vh-top-DOCKRES+50, fullH=vh-top-14;
  const R={ left:{x:8,y:top,w:vw/2-12,h:fullH}, right:{x:vw/2+4,y:top,w:vw/2-12,h:fullH}, top:{x:8,y:top,w:vw-16,h:fullH},
    tl:{x:8,y:top,w:vw/2-12,h:availH/2}, tr:{x:vw/2+4,y:top,w:vw/2-12,h:availH/2},
    bl:{x:8,y:top+availH/2+4,w:vw/2-12,h:availH/2}, br:{x:vw/2+4,y:top+availH/2+4,w:vw/2-12,h:availH/2} };
  return R[zone];
}

function Desktop({ appearance, setAppearance, apps, mgr, renderApp, launch, toasts, openSettings }){
  const [lp,setLp]=React.useState(false);
  const [snap,setSnap]=React.useState(null);
  const [spot,setSpot]=React.useState(false);
  const focused=mgr.wins.reduce((a,b)=>!a||b.z>a.z?b:a,null);
  const focusedApp=focused?apps.find(a=>a.id===focused.appId):null;
  const appName=focusedApp?focusedApp.name:'Finder';

  const onAbout=(which)=>{ launch(which==='settings'?'settings':'settings'); };
  React.useEffect(()=>{ const h=(e)=>{ if(e.key==='Escape'){ setLp(false); setSpot(false); }
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setSpot(s=>!s); } };
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[]);

  return (
    <div className={'os dir-'+appearance.dir+(appearance.reduceGlass?' reduce-glass':'')} data-theme={appearance.theme} style={{'--accent':appearance.accent}}>
      <div className={'wallpaper wp-'+appearance.wallpaper} onClick={()=>mgr.focusedRef&&(mgr.focusedRef.current=null)} onDoubleClick={()=>{}} />

      <MenuBar appName={appName} appearance={appearance} setAppearance={setAppearance} onAbout={onAbout} onLaunchpad={()=>setLp(true)} />

      {/* windows */}
      {mgr.wins.map(w=>(
        <WindowFrame key={w.id} win={w} focused={focused&&focused.id===w.id} mgr={mgr}
          onPreviewSnap={(z)=>setSnap(z)}
          onAskAI={(appId)=>{ const app=apps.find(a=>a.id===appId); launch('assistant',{ seed:'Working in '+(app?app.name:'this app')+' — ', _ts:Date.now() }); }}>
          {renderApp(w)}
        </WindowFrame>
      ))}

      {snap && (()=>{ const r=snapRect(snap); return r?<div className="snap-preview" style={{left:r.x,top:r.y,width:r.w,height:r.h}}/>:null; })()}

      {lp && <Launchpad apps={apps} launch={launch} onClose={()=>setLp(false)} />}

      {spot && <Spotlight onClose={()=>setSpot(false)} onSubmit={(text)=>{ launch('assistant',{ prompt:text, _ts:Date.now() }); setSpot(false); }} />}

      <Dock apps={apps} mgr={mgr} launch={(id)=>{ if(id==='launcher'){setLp(v=>!v);return;} launch(id); }} />

      {/* toasts */}
      <div style={{position:'absolute',top:36,right:14,zIndex:1000,display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end',pointerEvents:'none'}}>
        {toasts.map(t=>(
          <div key={t.id} className="glass" style={{background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:11,padding:'10px 14px',boxShadow:'var(--shadow-pop)',fontSize:12.5,fontWeight:500,maxWidth:300,animation:'toastIn .25s ease'}}>{t.msg}</div>))}
      </div>
    </div>
  );
}

function Spotlight({ onClose, onSubmit }){
  const [q,setQ]=React.useState(''); const ref=React.useRef(null);
  React.useEffect(()=>{ const id=setTimeout(()=>ref.current&&ref.current.focus(),40); return ()=>clearTimeout(id); },[]);
  const ideas=['Create a folder “Launch” in /Projects','Open browser to wikipedia.org','Make it vertical then render','Switch to dark mode','Show system stats'];
  const go=(v)=>{ const s=(v||'').trim(); if(s) onSubmit(s); };
  return <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:900,background:'rgba(10,12,18,.28)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)',display:'flex',justifyContent:'center',alignItems:'flex-start',paddingTop:'14vh'}}>
    <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(620px,90%)',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:16,boxShadow:'var(--shadow-pop)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px'}}>
        <div className="appicon" style={{width:30,height:30,flex:'0 0 auto',background:'linear-gradient(160deg,#9b5cff,#5b2fe0)'}}><Glyph name="spark"/></div>
        <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter')go(q); }}
          placeholder="Ask AI to do anything on os-rr…" style={{flex:1,border:'none',outline:'none',background:'transparent',color:'var(--text)',fontSize:17,fontWeight:500}}/>
        <span style={{fontSize:10.5,fontFamily:'var(--font-mono)',color:'var(--text-faint)',border:'.5px solid var(--sep-strong)',borderRadius:6,padding:'2px 6px'}}>⌘K</span>
      </div>
      <div style={{borderTop:'.5px solid var(--sep)',padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
        {ideas.map((s,i)=><button key={i} onClick={()=>go(s)} style={{fontSize:11.5,padding:'6px 11px',borderRadius:16,border:'.5px solid var(--sep)',background:'var(--field)',color:'var(--text-dim)',cursor:'default'}}>{s}</button>)}
      </div>
    </div>
  </div>;
}

Object.assign(window, { Desktop, Spotlight });
