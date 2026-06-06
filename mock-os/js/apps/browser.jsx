/* ============================================================
   apps/browser.jsx — Browser
   Tabs · omnibox (URL/search) · back/forward/reload/home · bookmarks ·
   history · real page rendering via <iframe> with block-aware fallback
   Exposes (window): Browser
   ============================================================ */

/* curated start-page tiles — sites that generally allow being embedded */
const QUICK_LINKS = [
  { name:'Wikipedia',   url:'https://en.wikipedia.org/wiki/Web_browser', glyph:'globe', color:'linear-gradient(160deg,#8a8f9c,#3b3f4b)' },
  { name:'Hacker News', url:'https://news.ycombinator.com',              glyph:'code',  color:'linear-gradient(160deg,#ff8a3d,#ff5f2e)' },
  { name:'OpenStreetMap', url:'https://www.openstreetmap.org/export/embed.html?bbox=-0.2,51.45,0.0,51.55&layer=mapnik', glyph:'globe', color:'linear-gradient(160deg,#34d39a,#0f9e6a)' },
  { name:'Project Gutenberg', url:'https://www.gutenberg.org', glyph:'doc', color:'linear-gradient(160deg,#7a8aff,#4f5bd6)' },
  { name:'example.com', url:'https://example.com',             glyph:'globe', color:'linear-gradient(160deg,#3aa0ff,#1f6dff)' },
  { name:'os-rr API',   url:'os-rr API.html',                  glyph:'cloud', color:'linear-gradient(160deg,#16c2c2,#0a8a8a)' },
];

const SEARCH = 'https://www.google.com/search?q=';

function isUrlLike(s){
  s = s.trim();
  if(!s) return false;
  if(/^https?:\/\//i.test(s)) return true;
  if(/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(s)) return true;      // domain.tld[/path]
  if(/^localhost(:\d+)?(\/.*)?$/i.test(s)) return true;
  if(/\.html?(\?.*)?$/i.test(s)) return true;                        // local project file
  return false;
}
function normalizeUrl(s){
  s = s.trim();
  if(/^https?:\/\//i.test(s)) return s;
  if(/\.html?(\?.*)?$/i.test(s) && !/\s/.test(s) && !/^[\w-]+\.[\w-]+\//.test(s)) {
    // looks like a local file (e.g. "os-rr API.html") — leave relative
    if(!/^[\w-]+(\.[\w-]+)+/.test(s) || /^os-rr/i.test(s)) return s;
  }
  return 'https://' + s;
}
function toTarget(input){
  return isUrlLike(input) ? normalizeUrl(input) : SEARCH + encodeURIComponent(input.trim());
}
function hostOf(url){
  try{ if(/^https?:\/\//i.test(url)) return new URL(url).hostname.replace(/^www\./,''); }catch(e){}
  return url;
}
function faviconFor(url){
  if(!/^https?:\/\//i.test(url)) return null;
  return 'https://www.google.com/s2/favicons?sz=64&domain_url=' + encodeURIComponent(url);
}

const NEWTAB = '';
let TID = 0; const newTabId = () => 't' + (++TID) + Date.now().toString(36).slice(-3);
function makeTab(url = NEWTAB){
  return { id:newTabId(), url, title: url===NEWTAB?'New Tab':hostOf(url), history:[url], hi:0, loading:url!==NEWTAB, nonce:0, blocked:false };
}

function Favicon({ url, size=15 }){
  const [err,setErr] = React.useState(false);
  const src = faviconFor(url);
  if(!url || url===NEWTAB) return <Ico name="globe" size={size}/>;
  if(!src || err) return <Ico name={/^os-rr/i.test(url)?'cloud':'globe'} size={size}/>;
  return <img src={src} width={size} height={size} alt="" style={{borderRadius:3,display:'block'}} onError={()=>setErr(true)} />;
}

function Browser({ notify, appearance }){
  const [tabs,setTabs] = usePersistent('browser.tabs', () => [makeTab('https://en.wikipedia.org/wiki/Web_browser')]);
  const [activeId,setActiveId] = usePersistent('browser.active', () => null);
  const [bookmarks,setBookmarks] = usePersistent('browser.bookmarks', () => [
    { url:'https://en.wikipedia.org/wiki/Main_Page', title:'Wikipedia' },
    { url:'https://news.ycombinator.com', title:'Hacker News' },
  ]);
  const [history,setHistory] = usePersistent('browser.history', () => []);
  const [menu,setMenu] = React.useState(null);          // 'menu' | 'history' | null
  const [omni,setOmni] = React.useState('');
  const [focusOmni,setFocusOmni] = React.useState(false);
  const iframeRef = React.useRef(null);
  const omniRef = React.useRef(null);
  const blockTimer = React.useRef(0);

  // ensure a valid active tab
  const active = tabs.find(t=>t.id===activeId) || tabs[0];
  React.useEffect(()=>{ if(!tabs.find(t=>t.id===activeId)) setActiveId(tabs[0]?.id||null); },[tabs,activeId]);
  React.useEffect(()=>{ if(tabs.length===0){ const t=makeTab(); setTabs([t]); setActiveId(t.id); } },[tabs.length]);

  const setTab = (id,patch)=> setTabs(ts=>ts.map(t=>t.id===id?{...t,...(typeof patch==='function'?patch(t):patch)}:t));

  // sync omnibox text with active tab when not editing
  React.useEffect(()=>{ if(!focusOmni) setOmni(active?active.url:''); },[active&&active.url, active&&active.id, focusOmni]);

  const recordHistory = (url,title)=>{ if(!/^https?:\/\//i.test(url)) return;
    setHistory(h=>[{url,title:title||hostOf(url),time:Date.now()}, ...h.filter(x=>x.url!==url)].slice(0,120)); };

  const navigate = (rawUrl, {tabId=active.id, push=true}={})=>{
    const url = rawUrl;
    clearTimeout(blockTimer.current);
    setTab(tabId, t=>{
      const history = push ? [...t.history.slice(0,t.hi+1), url] : t.history;
      const hi = push ? history.length-1 : t.hi;
      return { url, history, hi, title:url===NEWTAB?'New Tab':hostOf(url), loading:url!==NEWTAB, blocked:false, nonce:(t.nonce||0)+1 };
    });
    setMenu(null);
    if(url!==NEWTAB){
      // heuristic: if the frame never reports a usable load, hint that the site blocked embedding
      blockTimer.current = setTimeout(()=>{ setTab(tabId, t=> t.loading ? {...t, loading:false, blocked:true} : t); }, 9000);
    }
  };

  const submitOmni = (e)=>{ e&&e.preventDefault(); const v=omni.trim(); if(!v) return;
    navigate(toTarget(v)); if(omniRef.current) omniRef.current.blur(); setFocusOmni(false); };

  const back = ()=>{ if(active.hi>0){ const url=active.history[active.hi-1]; setTab(active.id,t=>({...t,hi:t.hi-1})); navigate(url,{push:false}); } };
  const fwd  = ()=>{ if(active.hi<active.history.length-1){ const url=active.history[active.hi+1]; setTab(active.id,t=>({...t,hi:t.hi+1})); navigate(url,{push:false}); } };
  const reload = ()=>{ if(active.url===NEWTAB) return; clearTimeout(blockTimer.current);
    setTab(active.id,t=>({...t,loading:true,blocked:false,nonce:(t.nonce||0)+1}));
    blockTimer.current=setTimeout(()=>setTab(active.id,t=>t.loading?{...t,loading:false,blocked:true}:t),9000); };
  const goHome = ()=> navigate(NEWTAB);

  const onFrameLoad = ()=>{ clearTimeout(blockTimer.current);
    let title=null; try{ title = iframeRef.current.contentDocument.title; }catch(e){ /* cross-origin */ }
    setTab(active.id, t=>({...t, loading:false, title: title || hostOf(t.url)}));
    if(active.url!==NEWTAB) recordHistory(active.url, title); };

  const addTab = (url=NEWTAB)=>{ const t=makeTab(url); setTabs(ts=>[...ts,t]); setActiveId(t.id);
    if(url===NEWTAB) setTimeout(()=>omniRef.current&&omniRef.current.focus(),60); };
  const closeTab = (id)=>{ setTabs(ts=>{ const i=ts.findIndex(t=>t.id===id); const next=ts.filter(t=>t.id!==id);
      if(id===activeId && next.length){ setActiveId((next[i]||next[i-1]||next[0]).id); } return next; }); };

  const isBookmarked = active && bookmarks.some(b=>b.url===active.url);
  const toggleBookmark = ()=>{ if(!active||active.url===NEWTAB) return;
    setBookmarks(bs=> isBookmarked ? bs.filter(b=>b.url!==active.url) : [...bs,{url:active.url,title:active.title||hostOf(active.url)}]);
    notify && notify(isBookmarked?'Bookmark removed':'Bookmarked '+(active.title||hostOf(active.url))); };

  React.useEffect(()=>{ const h=()=>setMenu(null); window.addEventListener('click',h); return ()=>window.removeEventListener('click',h); },[]);

  // expose to the AI command bus
  const apiRef = React.useRef({});
  apiRef.current = { navigate, addTab, active, bookmarkActive:toggleBookmark };
  React.useEffect(()=>{ if(!window.OSBus) return; return OSBus.register('browser', {
    navigateInput:(q)=>{ const dest=toTarget(q); apiRef.current.navigate(dest); return /^https?:/i.test(dest)?hostOf(dest):dest; },
    newTab:(q)=>{ apiRef.current.addTab(q?toTarget(q):NEWTAB); return true; },
    bookmarkCurrent:()=>{ const a=apiRef.current.active; if(!a||a.url===NEWTAB) return 'Nothing to bookmark'; apiRef.current.bookmarkActive(); return 'Bookmarked '+hostOf(a.url); },
  }); },[]);


  const secure = active && /^https:\/\//i.test(active.url);
  const canBack = active && active.hi>0, canFwd = active && active.hi<active.history.length-1;

  return (
    <div className="app-host" style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'var(--window-bg)',fontSize:13,position:'relative'}}>
      {/* ---- tab strip ---- */}
      <div style={{display:'flex',alignItems:'flex-end',gap:2,padding:'6px 8px 0',background:'var(--window-head)',borderBottom:'.5px solid var(--sep)',overflowX:'auto'}}>
        {tabs.map(t=>{
          const on=t.id===active.id;
          return <div key={t.id} onClick={()=>setActiveId(t.id)} title={t.title}
            style={{display:'flex',alignItems:'center',gap:7,height:32,padding:'0 8px 0 11px',minWidth:0,maxWidth:200,flex:'0 1 auto',borderRadius:'9px 9px 0 0',cursor:'default',
              background:on?'var(--window-bg)':'transparent',color:on?'var(--text)':'var(--text-dim)',boxShadow:on?'0 -.5px 0 var(--sep), -.5px 0 0 var(--sep), .5px 0 0 var(--sep)':'none'}}>
            <span style={{flex:'0 0 auto',display:'grid',placeItems:'center',width:15,height:15}}>{t.loading?<Spinner/>:<Favicon url={t.url}/>}</span>
            <span style={{flex:1,minWidth:0,fontSize:12,fontWeight:on?600:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title||'New Tab'}</span>
            {tabs.length>1 && <button onClick={(e)=>{e.stopPropagation();closeTab(t.id);}} title="Close tab"
              style={{flex:'0 0 auto',width:17,height:17,border:'none',background:'transparent',color:'var(--text-faint)',cursor:'default',borderRadius:5,fontSize:13,lineHeight:1,padding:0}}>×</button>}
          </div>;
        })}
        <button onClick={()=>addTab()} title="New tab" style={{flex:'0 0 auto',width:26,height:26,margin:'0 0 3px 4px',border:'none',background:'transparent',color:'var(--text-dim)',cursor:'default',borderRadius:7,display:'grid',placeItems:'center'}}>
          <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
      </div>

      {/* ---- toolbar / omnibox ---- */}
      <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'var(--window-head)',borderBottom:'.5px solid var(--sep)',position:'relative'}}>
        <NavBtn dis={!canBack} onClick={back} title="Back"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></NavBtn>
        <NavBtn dis={!canFwd} onClick={fwd} title="Forward"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></NavBtn>
        {active.loading
          ? <NavBtn onClick={()=>setTab(active.id,{loading:false})} title="Stop"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></NavBtn>
          : <NavBtn dis={active.url===NEWTAB} onClick={reload} title="Reload"><path d="M20 11a8 8 0 1 0-.7 4M20 5v6h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></NavBtn>}
        <NavBtn onClick={goHome} title="Home"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></NavBtn>

        <form onSubmit={submitOmni} style={{flex:1,minWidth:0,position:'relative',display:'flex',alignItems:'center'}}>
          <span style={{position:'absolute',left:11,display:'grid',placeItems:'center',pointerEvents:'none',color: secure?'#1f9d57':'var(--text-faint)'}}>
            {secure ? <svg viewBox="0 0 24 24" style={{width:13,height:13}}><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
              : <svg viewBox="0 0 24 24" style={{width:13,height:13}}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>}
          </span>
          <input ref={omniRef} className="field" value={omni}
            onChange={e=>setOmni(e.target.value)}
            onFocus={e=>{ setFocusOmni(true); e.target.select(); }}
            onBlur={()=>setFocusOmni(false)}
            onKeyDown={e=>{ e.stopPropagation(); if(e.key==='Escape'){ setOmni(active.url); e.target.blur(); } }}
            placeholder="Search Google or type a URL"
            style={{flex:1,height:32,paddingLeft:32,paddingRight:34,borderRadius:18,background:'var(--field)'}} />
          <button type="button" onClick={toggleBookmark} disabled={!active||active.url===NEWTAB} title={isBookmarked?'Remove bookmark':'Bookmark this page'}
            style={{position:'absolute',right:6,width:24,height:24,border:'none',background:'transparent',cursor:'default',display:'grid',placeItems:'center',opacity:(!active||active.url===NEWTAB)?.3:1}}>
            <svg viewBox="0 0 24 24" style={{width:16,height:16}}><path d="M12 4l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17.3 6.8 20l1-5.8L3.6 10.1l5.8-.8z"
              fill={isBookmarked?'var(--accent)':'none'} stroke={isBookmarked?'var(--accent)':'var(--text-faint)'} strokeWidth="1.6" strokeLinejoin="round"/></svg>
          </button>
        </form>

        <NavBtn onClick={(e)=>{e.stopPropagation();setMenu(m=>m==='menu'?null:'menu');}} title="Menu" active={menu==='menu'}>
          <circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></NavBtn>

        {/* loading bar */}
        {active.loading && <div style={{position:'absolute',left:0,right:0,bottom:-1,height:2.5,overflow:'hidden'}}>
          <div style={{position:'absolute',height:'100%',width:'40%',background:'var(--accent)',borderRadius:2,animation:'brLoad 1.1s ease-in-out infinite'}}/></div>}

        {menu==='menu' && <div className="ctx" style={{right:10,top:46,minWidth:210}} onClick={e=>e.stopPropagation()}>
          <div className="mi" onClick={()=>{addTab();}}>New tab<span style={{marginLeft:'auto',opacity:.4}}>⌘T</span></div>
          <div className="mi" onClick={()=>{reload();}}>Reload<span style={{marginLeft:'auto',opacity:.4}}>⌘R</span></div>
          <div className="sep"/>
          <div className="mi" onClick={()=>setMenu('history')}>History…</div>
          <div className="mi" onClick={()=>{ if(active.url!=='' ) navigator.clipboard&&navigator.clipboard.writeText(active.url).then(()=>notify&&notify('Link copied')); }}>Copy link</div>
          <div className="mi" onClick={()=>{ window.open(active.url||'about:blank','_blank'); }}>Open in new browser tab ↗</div>
          <div className="sep"/>
          <div className="mi danger" onClick={()=>{ setHistory([]); notify&&notify('History cleared'); }}>Clear history</div>
        </div>}

        {menu==='history' && <div className="ctx" style={{right:10,top:46,minWidth:300,maxHeight:340,overflow:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--text-faint)',padding:'4px 9px 6px'}}>History</div>
          {history.length===0 && <div style={{padding:'8px 9px',color:'var(--text-faint)',fontSize:12}}>Nothing here yet.</div>}
          {history.slice(0,40).map((h,i)=>(
            <div key={i} className="mi" onClick={()=>navigate(h.url)} style={{gap:8}}>
              <Favicon url={h.url}/><span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.title}</span>
              <span style={{fontSize:10,color:'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{relTime(h.time)}</span></div>))}
        </div>}
      </div>

      {/* ---- bookmarks bar ---- */}
      {bookmarks.length>0 && <div style={{display:'flex',alignItems:'center',gap:3,padding:'5px 10px',background:'var(--window-head)',borderBottom:'.5px solid var(--sep)',overflowX:'auto'}}>
        {bookmarks.map((b,i)=>(
          <button key={i} onClick={()=>navigate(b.url)} title={b.url}
            style={{display:'flex',alignItems:'center',gap:6,height:24,padding:'0 9px',flex:'0 0 auto',border:'none',borderRadius:6,background:'transparent',color:'var(--text-dim)',cursor:'default',fontSize:12,fontWeight:500,maxWidth:170}}>
            <Favicon url={b.url} size={13}/><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</span></button>))}
      </div>}

      {/* ---- viewport ---- */}
      <div className="browser-view" style={{flex:1,minHeight:0,position:'relative',background:'var(--surface)'}}>
        {active.url===NEWTAB
          ? <NewTab onGo={navigate} bookmarks={bookmarks} appearance={appearance}/>
          : <>
              <iframe ref={iframeRef} key={active.id+':'+active.nonce} src={active.url} onLoad={onFrameLoad}
                title={active.title} sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer" loading="eager"
                style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',background:'#fff'}}/>
              {active.blocked && <BlockedOverlay url={active.url} onOpen={()=>window.open(active.url,'_blank')} onRetry={reload}/>}
            </>}
      </div>
    </div>
  );
}

/* ---- new tab page ---- */
function NewTab({ onGo, bookmarks }){
  const [q,setQ]=React.useState(''); const ref=React.useRef(null);
  React.useEffect(()=>{ const id=setTimeout(()=>ref.current&&ref.current.focus(),60); return ()=>clearTimeout(id); },[]);
  const go=(e)=>{ e.preventDefault(); const v=q.trim(); if(v) onGo(toTarget(v)); };
  return (
    <div style={{position:'absolute',inset:0,overflow:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:30,padding:'40px 24px',background:'var(--surface)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
        <div style={{width:74,height:74,borderRadius:20,background:'var(--accent)',display:'grid',placeItems:'center',color:'#fff',fontWeight:900,fontSize:30,letterSpacing:'-.05em',boxShadow:'0 14px 40px -10px var(--accent)'}}>rr</div>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:'-.02em',color:'var(--text)'}}>os-rr Browser</div>
      </div>
      <form onSubmit={go} style={{width:'min(560px,90%)',position:'relative',display:'flex',alignItems:'center'}}>
        <span style={{position:'absolute',left:18,color:'var(--text-faint)',display:'grid',placeItems:'center'}}>
          <svg viewBox="0 0 24 24" style={{width:18,height:18}}><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span>
        <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.stopPropagation()}
          placeholder="Search Google or type a URL" className="field"
          style={{flex:1,height:48,paddingLeft:48,paddingRight:18,borderRadius:26,fontSize:15,boxShadow:'0 4px 18px rgba(0,0,0,.08)'}}/>
      </form>
      <div style={{width:'min(620px,92%)'}}>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:12,textAlign:'center'}}>Shortcuts</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(96px,1fr))',gap:14,maxWidth:560,margin:'0 auto'}}>
          {QUICK_LINKS.map(l=>(
            <button key={l.name} onClick={()=>onGo(l.url)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:9,padding:'4px',border:'none',background:'transparent',cursor:'default'}}>
              <div style={{width:52,height:52}}><div className="appicon" style={{background:l.color,width:52,height:52}}><Glyph name={l.glyph}/></div></div>
              <span style={{fontSize:11.5,fontWeight:500,color:'var(--text-dim)',textAlign:'center',lineHeight:1.2}}>{l.name}</span></button>))}
        </div>
      </div>
      <div style={{fontSize:11,color:'var(--text-faint)',textAlign:'center',maxWidth:420,lineHeight:1.5}}>
        Renders live pages in a frame. Some sites (Google, YouTube…) block embedding for security — those open in a new tab instead.</div>
    </div>
  );
}

function BlockedOverlay({ url, onOpen, onRetry }){
  return <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',background:'var(--surface)',padding:24}}>
    <div style={{textAlign:'center',maxWidth:380}}>
      <div style={{width:64,height:64,margin:'0 auto 16px',borderRadius:16,background:'var(--inset)',display:'grid',placeItems:'center',color:'var(--text-faint)'}}>
        <svg viewBox="0 0 24 24" style={{width:30,height:30}}><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
      <div style={{fontSize:16,fontWeight:800,letterSpacing:'-.01em',marginBottom:6}}>This site won’t open in a frame</div>
      <div style={{fontSize:13,color:'var(--text-dim)',lineHeight:1.5,marginBottom:18}}>
        <b style={{fontFamily:'var(--font-mono)',fontSize:12}}>{hostOf(url)}</b> refuses to be embedded (X-Frame-Options / CSP). That’s a protection set by the site, not an os-rr error.</div>
      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        <button className="btn" onClick={onRetry}>Try again</button>
        <button className="btn primary" onClick={onOpen}>Open in new tab ↗</button>
      </div>
    </div>
  </div>;
}

function NavBtn({ children, onClick, dis, title, active }){
  return <button onClick={onClick} disabled={dis} title={title} className="btn icon"
    style={{width:30,height:30,borderRadius:8,flex:'0 0 auto',background:active?'var(--inset)':'transparent',border:'none'}}>
    <svg viewBox="0 0 24 24" style={{width:17,height:17}}>{children}</svg></button>;
}
function Ico({ name, size=15 }){ return <svg viewBox="0 0 24 24" style={{width:size,height:size,color:'var(--text-faint)'}}><Glyph name={name}/></svg>; }
function Spinner(){ return <svg viewBox="0 0 24 24" style={{width:14,height:14,animation:'brSpin .8s linear infinite'}}><circle cx="12" cy="12" r="9" fill="none" stroke="var(--sep-strong)" strokeWidth="2.6"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round"/></svg>; }
function relTime(t){ const s=(Date.now()-t)/1000; if(s<60)return 'now'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; }

Object.assign(window, { Browser });
