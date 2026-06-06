/* ============================================================
   apps-launcher.jsx — Launchpad, App Store, Settings, Create App
   Exposes (window): Launchpad, AppStore, Settings, CreateApp
   ============================================================ */

/* ---------------- Launchpad (fullscreen overlay) ---------------- */
function Launchpad({ apps, launch, onClose }){
  const [q,setQ]=React.useState('');
  const list=apps.filter(a=>a.special!=='launchpad' && a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="glass" style={{position:'absolute',inset:0,zIndex:870,background:'rgba(20,22,30,.4)',backdropFilter:'blur(40px) saturate(160%)',WebkitBackdropFilter:'blur(40px) saturate(160%)',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:60}}
         onClick={onClose}>
      <input autoFocus value={q} onChange={e=>setQ(e.target.value)} onClick={e=>e.stopPropagation()} placeholder="Search"
        style={{width:260,height:34,borderRadius:10,border:'none',background:'rgba(255,255,255,.18)',color:'#fff',textAlign:'center',fontSize:14,outline:'none'}}/>
      <div onClick={e=>e.stopPropagation()} style={{marginTop:50,display:'grid',gridTemplateColumns:'repeat(5,120px)',gap:'34px 20px',justifyContent:'center'}}>
        {list.map(a=>(
          <div key={a.id} onClick={()=>{launch(a.id);onClose();}} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:9,cursor:'default'}}>
            <div style={{width:72,height:72}}><AppIcon app={a}/></div>
            <span style={{color:'#fff',fontSize:13,fontWeight:500,textShadow:'0 1px 4px rgba(0,0,0,.4)'}}>{a.name}</span></div>))}
      </div>
    </div>
  );
}

/* ---------------- App Store ---------------- */
const STORE=[
  { name:'Pixel Paint', glyph:'image', color:'linear-gradient(160deg,#ff8a3d,#ff5fa2)', cat:'Graphics', desc:'Raster painting with layers & brushes.', size:'18 MB' },
  { name:'WaveForge', glyph:'music', color:'linear-gradient(160deg,#34d39a,#0f9e6a)', cat:'Audio', desc:'Multitrack audio editor & mastering.', size:'24 MB' },
  { name:'CodeRunner', glyph:'code', color:'linear-gradient(160deg,#3aa0ff,#1f6dff)', cat:'Developer', desc:'Run Python / Node / shell in a sandbox.', size:'11 MB' },
  { name:'SiteForge', glyph:'globe', color:'linear-gradient(160deg,#7a5cff,#4f2fd6)', cat:'Web', desc:'Static-site builder with live preview.', size:'9 MB' },
  { name:'Vault', glyph:'cloud', color:'linear-gradient(160deg,#5b6070,#2b2f3a)', cat:'Utilities', desc:'Encrypted backups to your VPS.', size:'6 MB' },
  { name:'Frames', glyph:'film', color:'linear-gradient(160deg,#ff6a9b,#c5318f)', cat:'Video', desc:'Motion templates for the Reel Editor.', size:'31 MB' },
];
function AppStore({ notify }){
  const [installed,setInstalled]=React.useState({});
  const cats=['Featured',...new Set(STORE.map(s=>s.cat))];
  const [cat,setCat]=React.useState('Featured');
  const list=cat==='Featured'?STORE:STORE.filter(s=>s.cat===cat);
  return (
    <div className="app-root">
      <div className="app-side">
        <div className="side-h">Discover</div>
        {cats.map(c=>(<div key={c} className={'side-i'+(cat===c?' active':'')} onClick={()=>setCat(c)}><Glyph name="store"/><span>{c}</span></div>))}
      </div>
      <div className="app-main">
        <div className="app-toolbar"><strong>App Store</strong><span style={{marginLeft:'auto',fontSize:11,color:'var(--text-faint)'}}>{list.length} apps</span></div>
        <div style={{flex:1,overflow:'auto',padding:16}}>
          {cat==='Featured' && <div style={{borderRadius:14,padding:'24px 26px',marginBottom:16,background:'linear-gradient(120deg,#2f7bf6,#9b5cff)',color:'#fff',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',right:-20,top:-20,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,.12)'}}/>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:'.08em',opacity:.8}}>EDITOR'S CHOICE</div>
            <div style={{fontSize:24,fontWeight:800,margin:'6px 0',letterSpacing:'-.02em'}}>Build your VPS toolkit</div>
            <div style={{fontSize:13,opacity:.9,maxWidth:380}}>Install editing tools, runtimes and utilities — each app lives in its own folder with a manifest.</div></div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
            {list.map(s=>(
              <div key={s.name} style={{display:'flex',gap:12,padding:14,borderRadius:12,background:'var(--glass-panel)',border:'.5px solid var(--sep)'}}>
                <div style={{width:54,height:54,flex:'0 0 auto'}}><AppIcon app={s}/></div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontWeight:700}}>{s.name}</div>
                  <div style={{fontSize:11.5,color:'var(--text-faint)',marginBottom:4}}>{s.cat} · {s.size}</div>
                  <div style={{fontSize:12,color:'var(--text-dim)',lineHeight:1.4,marginBottom:8}}>{s.desc}</div>
                  <button className="btn" style={installed[s.name]?{}:{background:'var(--accent)',color:'#fff',borderColor:'transparent'}}
                    onClick={()=>{ if(installed[s.name])return; setInstalled(i=>({...i,[s.name]:'ing'}));
                      setTimeout(()=>{setInstalled(i=>({...i,[s.name]:'done'}));notify(`Installed “${s.name}”`);},1100); }}>
                    {installed[s.name]==='done'?'Open':installed[s.name]==='ing'?'Installing…':'Get'}</button>
                </div></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function Settings({ appearance, setAppearance, notify, server, setServer, api }){
  const [pane,setPane]=React.useState('appearance');
  const [test,setTest]=React.useState(null);
  const a=appearance;
  const ACCENTS=[['#2f7bf6','Blue'],['#7a5cff','Purple'],['#ff5f8f','Pink'],['#ff7a3d','Orange'],['#16b8a6','Teal'],['#34c759','Green']];
  const WP=[['aurora','Aurora'],['dusk','Dusk'],['mist','Mist'],['graphite','Graphite'],['noir','Noir']];
  const DIRS=[['aqua','Aqua Glass'],['graphite','Graphite Pro'],['vivid','Vivid']];
  const set=(k,v)=>setAppearance(p=>({...p,[k]:v}));
  return (
    <div className="app-root">
      <div className="app-side">
        {[['appearance','Appearance','gear'],['server','Server','cloud'],['about','About','globe']].map(([id,l,g])=>(
          <div key={id} className={'side-i'+(pane===id?' active':'')} onClick={()=>setPane(id)}><Glyph name={g}/><span>{l}</span></div>))}
      </div>
      <div className="app-main"><div style={{flex:1,overflow:'auto',padding:'20px 24px'}}>
        {pane==='appearance' && <div style={{maxWidth:520}}>
          <h2 style={{margin:'0 0 18px',fontSize:20,fontWeight:800,letterSpacing:'-.02em'}}>Appearance</h2>
          <SetRow label="Theme" desc="Switch between light and dark chrome.">
            <div style={{display:'flex',gap:6}}>{['light','dark'].map(t=>(
              <button key={t} className="btn" style={{textTransform:'capitalize',background:a.theme===t?'var(--accent)':'var(--field)',color:a.theme===t?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>set('theme',t)}>{t}</button>))}</div>
          </SetRow>
          <SetRow label="Accent color" desc="Used for highlights, selection and controls.">
            <div style={{display:'flex',gap:8}}>{ACCENTS.map(([c,n])=>(
              <button key={c} title={n} onClick={()=>set('accent',c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:'none',cursor:'default',boxShadow:a.accent===c?'0 0 0 2px var(--window-bg),0 0 0 4px '+c:'inset 0 0 0 .5px rgba(0,0,0,.2)'}}/>))}</div>
          </SetRow>
          <SetRow label="Shell style" desc="Overall density & shape of the desktop.">
            <div style={{display:'flex',gap:6}}>{DIRS.map(([id,l])=>(
              <button key={id} className="btn" style={{background:a.dir===id?'var(--accent)':'var(--field)',color:a.dir===id?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>set('dir',id)}>{l}</button>))}</div>
          </SetRow>
          <SetRow label="Wallpaper" desc="">
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{WP.map(([id,l])=>(
              <div key={id} onClick={()=>set('wallpaper',id)} style={{cursor:'default',textAlign:'center'}}>
                <div className={'wp-'+id} style={{width:64,height:40,borderRadius:8,outline:a.wallpaper===id?'2px solid var(--accent)':'.5px solid var(--sep)'}}/>
                <div style={{fontSize:10,marginTop:3,color:a.wallpaper===id?'var(--accent)':'var(--text-faint)',fontWeight:a.wallpaper===id?700:500}}>{l}</div></div>))}</div>
          </SetRow>
          <SetRow label="Reduce transparency" desc="Turn off background blur for performance.">
            <button className="btn" style={{background:a.reduceGlass?'var(--accent)':'var(--field)',color:a.reduceGlass?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>set('reduceGlass',!a.reduceGlass)}>{a.reduceGlass?'On':'Off'}</button>
          </SetRow>
        </div>}
        {pane==='server' && <div style={{maxWidth:540}}>
          <h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:800,letterSpacing:'-.02em'}}>Server</h2>
          <p style={{margin:'0 0 18px',color:'var(--text-faint)',fontSize:13}}>os-rr talks to your VPS through one API. Run in <b>Mock</b> (simulated, no backend) or point at a live <b>os-rr daemon</b>.</p>
          <SetRow label="Connection" desc="Mock simulates everything in-browser. Live calls your VPS.">
            <div style={{display:'flex',gap:6}}>{['mock','live'].map(m=>(
              <button key={m} className="btn" style={{textTransform:'capitalize',background:server.mode===m?'var(--accent)':'var(--field)',color:server.mode===m?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>{setServer({serverMode:m});setTest(null);}}>{m}</button>))}</div>
          </SetRow>
          <div style={{marginTop:4}}>
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:7}}>Base URL</div>
            <input className="field" style={{width:'100%',height:34,fontFamily:'var(--font-mono)',fontSize:12,opacity:server.mode==='live'?1:.55}} value={server.url} disabled={server.mode!=='live'} onChange={e=>setServer({serverUrl:e.target.value})} placeholder="https://your-vps.example.com"/>
            <div style={{fontSize:11,color:'var(--text-faint)',margin:'5px 0 16px',fontFamily:'var(--font-mono)'}}>→ {server.url||'…'}/api/v1</div>
          </div>
          <div>
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:7}}>Access token</div>
            <input className="field" type="password" style={{width:'100%',height:34,fontFamily:'var(--font-mono)',fontSize:12,opacity:server.mode==='live'?1:.55}} value={server.token} disabled={server.mode!=='live'} onChange={e=>setServer({serverToken:e.target.value})} placeholder="Bearer token from POST /auth/token"/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0 6px'}}>
            <button className="btn primary" onClick={async()=>{ setTest({state:'testing'}); try{ const me=await api.auth.me(); const u=await api.fs.usage(); setTest({state:'ok',msg:`${me.user.name} · ${Math.round(u.used/1e9)}/${Math.round(u.total/1e9)} GB`}); }catch(e){ setTest({state:'err',msg:(e&&e.message)||String(e)}); } }}>Test connection</button>
            {test && <span style={{display:'flex',alignItems:'center',gap:7,fontSize:12.5,fontWeight:600,color:test.state==='ok'?'#1f9d57':test.state==='err'?'#ff5f57':'var(--text-faint)'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:test.state==='ok'?'#34c759':test.state==='err'?'#ff5f57':'var(--text-faint)'}}/>
              {test.state==='testing'?'Testing…':test.state==='ok'?'Connected — '+test.msg:'Failed — '+test.msg}</span>}
          </div>
          <div style={{marginTop:18,padding:'14px 16px',borderRadius:11,background:'var(--inset)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)'}}>API surface</span>
              <button className="btn" style={{height:26}} onClick={()=>{ try{ window.open('os-rr API.html','_blank'); }catch(e){ notify('Open “os-rr API.html”'); } }}>Open reference ↗</button></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 18px',fontSize:12,fontFamily:'var(--font-mono)',color:'var(--text-dim)'}}>
              {[['fs','/fs/*'],['exec','/exec/*'],['sys','/sys/*'],['render','/render/*'],['apps','/apps/*'],['auth','/auth/*']].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text)'}}>{k}</span><span>{v}</span></div>))}
            </div>
          </div>
        </div>}
        {pane==='about' && <div style={{maxWidth:460}}>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{width:64,height:64,borderRadius:16,background:'var(--accent)',display:'grid',placeItems:'center',color:'#fff',fontWeight:900,fontSize:26,letterSpacing:'-.04em'}}>rr</div>
            <div><div style={{fontSize:22,fontWeight:800,letterSpacing:'-.02em'}}>os-rr</div><div style={{color:'var(--text-faint)'}}>Version 2.7.1 · web-kernel</div></div></div>
          {[['VPS','8 vCPU · 16 GB RAM'],['Storage','289 GB of 460 GB used'],['Region','fra-1 · Frankfurt'],['Uptime','14 days, 6 hours'],['Apps installed','9']].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'11px 0',borderBottom:'.5px solid var(--sep)',fontSize:13}}><span style={{color:'var(--text-dim)'}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>))}
          <button className="btn" style={{marginTop:16}} onClick={()=>notify('os-rr is up to date')}>Check for updates</button>
          <button className="btn" style={{marginTop:16,marginLeft:8,color:'#ff5f57'}} onClick={()=>{ if(window.LS){LS.clear();} notify('Resetting os-rr…'); setTimeout(()=>location.reload(),700); }}>Reset os-rr</button>
        </div>}
      </div></div>
    </div>
  );
}
function SetRow({ label, desc, children }){ return (
  <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 0',borderBottom:'.5px solid var(--sep)'}}>
    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13.5}}>{label}</div>{desc&&<div style={{fontSize:12,color:'var(--text-faint)',marginTop:2}}>{desc}</div>}</div>
    <div style={{flex:'0 0 auto'}}>{children}</div></div>); }

/* ---------------- Create App ---------------- */
const RUNTIMES=[['html','HTML','#ff6a3d','html'],['js','Node.js','#f5c518','js'],['py','Python','#4f86c6','py'],['sh','Shell','#5b6070','sh']];
const ICON_COLORS=['linear-gradient(160deg,#3aa0ff,#1f6dff)','linear-gradient(160deg,#ff6a9b,#c5318f)','linear-gradient(160deg,#ffb13b,#ff6a3d)','linear-gradient(160deg,#34d39a,#0f9e6a)','linear-gradient(160deg,#7a5cff,#4f2fd6)','linear-gradient(160deg,#16c2c2,#0a8a8a)'];
const ICON_GLYPHS=['grid','code','globe','image','music','gauge','folder','cloud'];

function CreateApp({ installApp, notify }){
  const [name,setName]=React.useState('My App');
  const [rt,setRt]=React.useState('html');
  const [color,setColor]=React.useState(ICON_COLORS[4]);
  const [glyph,setGlyph]=React.useState('grid');
  const [entry,setEntry]=React.useState('index.html');
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'my-app';
  React.useEffect(()=>{ const e={html:'index.html',js:'main.js',py:'app.py',sh:'run.sh'}[rt]; setEntry(e); },[rt]);
  const manifest={ name, slug, runtime:rt, entry, icon:{glyph}, window:{ width:900, height:600 } };

  const create=()=>{ installApp({ id:'usr-'+slug+'-'+uid(), name, glyph, color, w:900, h:600, user:true, runtime:rt });
    notify(`Created “${name}” — added to Launchpad & dock`); };

  return (
    <div style={{display:'flex',width:'100%',height:'100%',background:'var(--window-bg)'}}>
      <div style={{flex:1,minWidth:0,overflow:'auto',padding:'24px 28px'}}>
        <h2 style={{margin:'0 0 4px',fontSize:21,fontWeight:800,letterSpacing:'-.02em'}}>Create App</h2>
        <p style={{margin:'0 0 22px',color:'var(--text-faint)',fontSize:13}}>Wrap any HTML, Node, Python or shell program into a desktop app. Each app gets its own folder & manifest.</p>

        <Field label="App name"><input className="field" style={{width:'100%',height:34}} value={name} onChange={e=>setName(e.target.value)}/></Field>
        <Field label="Runtime"><div style={{display:'flex',gap:8}}>{RUNTIMES.map(([id,l,c,g])=>(
          <button key={id} onClick={()=>{setRt(id);setGlyph(g);}} style={{flex:1,padding:'10px 6px',borderRadius:10,border:'.5px solid var(--sep)',background:rt===id?'var(--accent)':'var(--field)',color:rt===id?'#fff':'var(--text)',cursor:'default',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
            <div style={{width:26,height:26}}><div className="appicon" style={{background:`linear-gradient(160deg,${c},${c})`,width:26,height:26}}><Glyph name={g}/></div></div>
            <span style={{fontSize:12,fontWeight:600}}>{l}</span></button>))}</div></Field>
        <Field label="Entry point"><input className="field" style={{width:'100%',height:34,fontFamily:'var(--font-mono)'}} value={entry} onChange={e=>setEntry(e.target.value)}/></Field>
        <Field label="Icon glyph"><div style={{display:'flex',gap:7,flexWrap:'wrap'}}>{ICON_GLYPHS.map(g=>(
          <button key={g} onClick={()=>setGlyph(g)} style={{width:38,height:38,borderRadius:9,border:glyph===g?'2px solid var(--accent)':'.5px solid var(--sep)',background:'var(--field)',display:'grid',placeItems:'center',cursor:'default'}}>
            <svg viewBox="0 0 24 24" style={{width:18,height:18,color:'var(--text-dim)'}}><g style={{stroke:'var(--text-dim)'}}><Glyph name={g}/></g></svg></button>))}</div></Field>
        <Field label="Icon color"><div style={{display:'flex',gap:8}}>{ICON_COLORS.map(c=>(
          <button key={c} onClick={()=>setColor(c)} style={{width:30,height:30,borderRadius:8,background:c,border:'none',cursor:'default',boxShadow:color===c?'0 0 0 2px var(--window-bg),0 0 0 4px var(--accent)':'none'}}/>))}</div></Field>
      </div>

      {/* live preview + manifest */}
      <div style={{width:280,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--sidebar)',padding:'22px 20px',display:'flex',flexDirection:'column'}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:14}}>Preview</div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:18}}>
          <div style={{width:76,height:76}}><div className="appicon" style={{background:color,width:76,height:76}}><Glyph name={glyph}/></div></div>
          <span style={{fontWeight:600}}>{name}</span></div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:8}}>/apps/{slug}/manifest.json</div>
        <pre style={{flex:1,margin:0,background:'#0d0e12',color:'#cfd4de',borderRadius:9,padding:12,fontFamily:'var(--font-mono)',fontSize:11,lineHeight:1.6,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(manifest,null,2)}</pre>
        <button className="btn primary" style={{marginTop:14,height:34,justifyContent:'center'}} onClick={create}>Create app</button>
      </div>
    </div>
  );
}
function Field({ label, children }){ return <div style={{marginBottom:18,maxWidth:460}}><div style={{fontSize:12.5,fontWeight:600,marginBottom:7}}>{label}</div>{children}</div>; }

Object.assign(window, { Launchpad, AppStore, Settings, CreateApp });
