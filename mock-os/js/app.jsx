/* ============================================================
   app.jsx — top-level OS: boot, theme/tweaks, routing, registry
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#2f7bf6",
  "dir": "aqua",
  "wallpaper": "aurora",
  "reduceGlass": false,
  "device": "auto",
  "forceMobile": false,
  "serverMode": "mock",
  "serverUrl": "https://your-vps.example.com",
  "serverToken": ""
}/*EDITMODE-END*/;

function OS(){
  const [t,setTweak]=useTweaks({...TWEAK_DEFAULTS, ...LS.get('tweaks',{})});
  React.useEffect(()=>{ LS.set('tweaks', t); },[t]);
  const [booted,setBooted]=React.useState(false);
  const [fs,setFs]=usePersistent('fs', makeFS);
  const [userApps,setUserApps]=usePersistent('apps', []);
  const [toasts,setToasts]=React.useState([]);
  const [vw,setVw]=React.useState(window.innerWidth);
  const mgr=useWindows();

  React.useEffect(()=>{ const id=setTimeout(()=>setBooted(true),1900); return ()=>clearTimeout(id); },[]);
  React.useEffect(()=>{ const h=()=>setVw(window.innerWidth); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h); },[]);

  const appearance={ theme:t.theme, accent:t.accent, dir:t.dir, wallpaper:t.wallpaper, reduceGlass:t.reduceGlass };
  const setAppearance=(u)=>{ const n=typeof u==='function'?u(appearance):u; setTweak({theme:n.theme,accent:n.accent,dir:n.dir,wallpaper:n.wallpaper,reduceGlass:n.reduceGlass}); };

  const allApps=React.useMemo(()=>[...OS_APPS,...userApps],[userApps]);
  const notify=React.useCallback((msg)=>{ const id=uid('t'); setToasts(ts=>[...ts,{id,msg}]); setTimeout(()=>setToasts(ts=>ts.filter(x=>x.id!==id)),2800); },[]);
  const installApp=React.useCallback((app)=>setUserApps(u=>[...u,app]),[]);
  const launch=React.useCallback((id,props)=>{ const app=allApps.find(a=>a.id===id); if(!app)return; mgr.open(app,props); },[allApps,mgr]);

  // ── API boundary (mock ↔ live VPS). fsRef keeps the mock adapter in sync. ──
  const fsRef=React.useRef(fs); fsRef.current=fs;
  const userAppsRef=React.useRef(userApps); userAppsRef.current=userApps;
  const api=React.useMemo(()=>makeApi({ mode:t.serverMode, baseUrl:t.serverUrl, token:t.serverToken,
    fsRef, userApps:()=>userAppsRef.current }), [t.serverMode, t.serverUrl, t.serverToken]);

  const MAP={ files:FileManager, video:VideoEditor, media:MediaEditor, browser:Browser, editor:CodeEditor, preview:MediaViewer, terminal:Terminal, monitor:SystemMonitor,
    store:AppStore, settings:Settings, create:CreateApp, assistant:Assistant };
  const common={ fs, setFs, launch, notify, appearance, setAppearance, installApp, api,
    server:{ mode:t.serverMode, url:t.serverUrl, token:t.serverToken },
    setServer:(patch)=>setTweak(patch),
    openFile:(it,path)=>{ const tag=it.kindTag, e=(it.ext||'').toLowerCase();
      if(tag==='video'||tag==='image'||tag==='audio'||['mp4','mov','webm','png','jpg','jpeg','gif','svg','wav','mp3','pdf'].includes(e)) launch('preview',{ file:it, path, _ts:Date.now() });
      else launch('editor',{ file:it, path, _ts:Date.now() }); } };

  // keep the AI layer's live OS handle fresh every render
  React.useEffect(()=>{ if(window.OSCTX) OSCTX.current = { ...common, getFs:()=>fsRef.current, mgr, allApps }; });
  // notify shared components (FileBrowser, etc.) that the filesystem changed
  React.useEffect(()=>{ try{ window.dispatchEvent(new CustomEvent('osrr:fs')); }catch(e){} },[fs]);

  const renderApp=(target)=>{ const id=target.appId||target.id; const props=target.props||{};
    let C=MAP[id];
    if(!C){ // user-created app → generic runner view
      const app=allApps.find(a=>a.id===id);
      return <UserApp app={app} notify={notify}/>;
    }
    return <C key={id+(props._n||'')} {...common} {...props}/>;
  };

  const device = t.device || (t.forceMobile?'phone':'auto');
  const mobile = device==='phone' || (device==='auto' && vw<760);

  return (<>
    {!booted && <Boot accent={t.accent}/>}
    <div style={{opacity:booted?1:0,transition:'opacity .5s ease',height:'100%'}}>
      {mobile
        ? <MobileShell apps={allApps} renderApp={renderApp} appearance={appearance} setAppearance={setAppearance}/>
        : <Desktop appearance={appearance} setAppearance={setAppearance} apps={allApps} mgr={mgr} renderApp={renderApp} launch={launch} toasts={toasts}/>}
    </div>

    <TweaksPanel title="Tweaks">
      <TweakSection label="Shell" />
      <TweakRadio label="Style" value={t.dir} options={[{value:'aqua',label:'Aqua'},{value:'graphite',label:'Graphite'},{value:'vivid',label:'Vivid'}]} onChange={v=>setTweak('dir',v)} />
      <TweakRadio label="Theme" value={t.theme} options={['light','dark']} onChange={v=>setTweak('theme',v)} />
      <TweakColor label="Accent" value={t.accent} options={['#2f7bf6','#7a5cff','#ff5f8f','#ff7a3d','#16b8a6','#34c759']} onChange={v=>setTweak('accent',v)} />
      <TweakSelect label="Wallpaper" value={t.wallpaper} options={[{value:'aurora',label:'Aurora'},{value:'dusk',label:'Dusk'},{value:'mist',label:'Mist'},{value:'graphite',label:'Graphite'},{value:'noir',label:'Noir'}]} onChange={v=>setTweak('wallpaper',v)} />
      <TweakSection label="Display" />
      <TweakRadio label="Device" value={device} options={[{value:'auto',label:'Auto'},{value:'desktop',label:'Desktop'},{value:'phone',label:'Phone'}]} onChange={v=>setTweak('device',v)} />
      <TweakToggle label="Reduce transparency" value={t.reduceGlass} onChange={v=>setTweak('reduceGlass',v)} />
    </TweaksPanel>
  </>);
}

function UserApp({ app, notify }){
  if(!app) return null;
  return <div style={{width:'100%',height:'100%',display:'grid',placeItems:'center',background:'var(--window-bg)',padding:24}}>
    <div style={{textAlign:'center',maxWidth:340}}>
      <div style={{width:88,height:88,margin:'0 auto 16px'}}><AppIcon app={app}/></div>
      <div style={{fontSize:18,fontWeight:800,letterSpacing:'-.02em'}}>{app.name}</div>
      <div style={{fontSize:12.5,color:'var(--text-faint)',margin:'6px 0 18px',fontFamily:'var(--font-mono)'}}>runtime: {app.runtime||'html'} · /apps/{app.name.toLowerCase().replace(/\s+/g,'-')}</div>
      <div style={{padding:'14px 16px',borderRadius:11,background:'var(--inset)',fontSize:12.5,color:'var(--text-dim)',lineHeight:1.5,marginBottom:16}}>
        This app was created from a manifest. os-rr loads its entry point in a sandboxed wrapper. Connect your VPS to run it live.</div>
      <button className="btn primary" onClick={()=>notify('Starting '+app.name+'…')}>Run app</button>
    </div></div>;
}

function Boot({ accent }){
  return <div style={{position:'fixed',inset:0,zIndex:3000,background:'#0a0b0f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28}}>
    <div style={{width:96,height:96,borderRadius:24,background:accent,display:'grid',placeItems:'center',color:'#fff',fontWeight:900,fontSize:40,letterSpacing:'-.05em',boxShadow:'0 20px 60px -10px '+accent+'88',animation:'bootPulse 1.6s ease-in-out infinite'}}>rr</div>
    <div style={{width:160,height:4,borderRadius:3,background:'rgba(255,255,255,.12)',overflow:'hidden'}}>
      <div style={{height:'100%',background:'rgba(255,255,255,.8)',animation:'bootBar 1.8s ease forwards'}}/></div>
    <div style={{color:'rgba(255,255,255,.4)',fontSize:12,fontFamily:'var(--font-mono)',letterSpacing:'.05em'}}>os-rr · booting web-kernel</div>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<OS/>);
