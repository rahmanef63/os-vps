/* ============================================================
   apps-video.jsx — Reel Editor (Remotion-style timeline)
   Exposes (window): VideoEditor
   ============================================================ */

const FPS = 30;
const CLIP_COLORS = { video:'#ff6a9b', overlay:'#7a5cff', text:'#ffb13b', audio:'#34d39a' };
const TRACK_DOT = { video:'#7a8aff', audio:'#34d39a' };
const RATIOS = [['16:9',1920,1080],['9:16',1080,1920],['1:1',1080,1080],['4:5',1080,1350]];

function defaultComp(){
  return {
    w:1920, h:1080, fps:FPS, duration:300,
    tracks:[
      { id:uid('t'), name:'Video', type:'video', clips:[
        { id:uid('c'), name:'intro.mp4', start:0, len:120, color:'#ff6a9b', src:'gradient-a' },
        { id:uid('c'), name:'product.mov', start:120, len:150, color:'#ff6a9b', src:'gradient-b' },
      ]},
      { id:uid('t'), name:'Video 1', type:'video', clips:[
        { id:uid('c'), name:'intro.mp4', start:0, len:120, color:'#ff6a9b', src:'gradient-a' },
        { id:uid('c'), name:'product.mov', start:120, len:150, color:'#ff6a9b', src:'gradient-b' },
      ]},
      { id:uid('t'), name:'Video 2', type:'video', clips:[
        { id:uid('c'), name:'logo-anim', start:30, len:90, color:'#7a5cff', src:'logo',
          kf:{ scale:[{t:0,v:40},{t:18,v:115},{t:30,v:100}], rotate:[{t:0,v:-12},{t:30,v:0}] } },
      ]},
      { id:uid('t'), name:'Video 3', type:'video', clips:[
        { id:uid('c'), name:'Headline', start:18, len:84, color:'#ffb13b', text:'Build on your VPS', anim:'rise' },
        { id:uid('c'), name:'CTA', start:200, len:80, color:'#ffb13b', text:'os-rr', anim:'pop' },
      ]},
      { id:uid('t'), name:'Audio', type:'audio', clips:[
        { id:uid('c'), name:'music-bed.wav', start:0, len:300, color:'#34d39a', src:'wave' },
      ]},
    ],
  };
}

function VideoEditor({ file, notify, api, fs }){
  const [comp, setCompState] = React.useState(defaultComp);
  const [past,setPast]=React.useState([]); const [future,setFuture]=React.useState([]);
  const lastPush=React.useRef(0);
  const setComp=(u)=>{ setCompState(prev=>{ const next=typeof u==='function'?u(prev):u; const now=Date.now();
    if(now-lastPush.current>400){ setPast(p=>[...p.slice(-59),prev]); setFuture([]); } lastPush.current=now; return next; }); };
  const commitNow=()=>{ lastPush.current=0; };
  const [frame, setFrame] = React.useState(30);
  const [playing, setPlaying] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const [zoom, setZoom] = React.useState(3.2);
  const [rendering, setRendering] = React.useState(null);
  const [mode, setMode] = React.useState('editor');   // editor | ai
  const [showProps,setShowProps]=React.useState(false);
  const [panelTab,setPanelTab]=React.useState('props'); // props | assets
  const rafRef = React.useRef(0); const lastRef = React.useRef(0);
  const frameRef = React.useRef(0); frameRef.current = frame;
  const rootRef = React.useRef(null);
  const [aiLog,setAiLog]=React.useState([{role:'ai',text:'Tell me what to change. Try “make it vertical”, “fade in”, “split here”, “punch in”, or “add title Sale”.'}]);

  React.useEffect(()=>{ if(file){ commitNow(); setComp(c=>{ const t=c.tracks.find(x=>x.type==='video');
    t.clips=[...t.clips, { id:uid('c'), name:file.name, start:c.duration-1>270?270:Math.max(...t.clips.map(k=>k.start+k.len),0), len:120, color:'#ff6a9b', src:'gradient-a' }];
    return {...c, tracks:[...c.tracks]}; }); } },[file]);

  React.useEffect(()=>{
    if(!playing){ cancelAnimationFrame(rafRef.current); return; }
    lastRef.current = performance.now();
    const loop = (t)=>{ const dt=(t-lastRef.current)/1000; lastRef.current=t;
      let nf = frameRef.current + dt*comp.fps; if(nf>=comp.duration){ nf=0; }
      frameRef.current=nf; setFrame(nf); rafRef.current=requestAnimationFrame(loop); };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[playing, comp.fps, comp.duration]);

  const selClip = sel && comp.tracks.flatMap(t=>t.clips).find(c=>c.id===sel);
  const findClip = (id)=>comp.tracks.flatMap(t=>t.clips).find(c=>c.id===id);
  const setClip = (id, patch)=> setComp(c=>({ ...c, tracks:c.tracks.map(t=>({ ...t, clips:t.clips.map(cl=>cl.id===id?{...cl,...patch}:cl) })) }));
  const kfSet = (id,k,keys)=> { commitNow(); setComp(c=>({ ...c, tracks:c.tracks.map(t=>({ ...t, clips:t.clips.map(cl=>cl.id===id?{...cl,kf:{...(cl.kf||{}),[k]:keys}}:cl) })) })); };
  const delClip = (id)=> { commitNow(); setComp(c=>({ ...c, tracks:c.tracks.map(t=>({...t,clips:t.clips.filter(cl=>cl.id!==id)})) })); setSel(null); };

  const undo=()=>{ setPast(p=>{ if(!p.length) return p; setFuture(f=>[comp,...f].slice(0,60)); setCompState(p[p.length-1]); lastPush.current=Date.now(); return p.slice(0,-1); }); };
  const redo=()=>{ setFuture(f=>{ if(!f.length) return f; setPast(p=>[...p,comp].slice(-60)); setCompState(f[0]); lastPush.current=Date.now(); return f.slice(1); }); };

  const setRatio=(w,h)=>{ commitNow(); setComp(c=>({...c,w,h})); };
  const splitAtPlayhead=()=>{ const f=Math.round(frame); commitNow();
    setComp(c=>({...c,tracks:c.tracks.map(t=>({...t,clips:t.clips.flatMap(cl=>{
      const within=f>cl.start+1 && f<cl.start+cl.len-1; const targeted = sel? cl.id===sel : within;
      if(targeted && within){ const L=f-cl.start; const a={...cl,len:L}; const b={...cl,id:uid('c'),start:f,len:cl.len-L};
        if(cl.kf){ a.kf={}; b.kf={}; Object.keys(cl.kf).forEach(k=>{ a.kf[k]=cl.kf[k].filter(x=>x.t<=L); b.kf[k]=cl.kf[k].map(x=>({...x,t:x.t-L})).filter(x=>x.t>=0); if(!a.kf[k].length)delete a.kf[k]; if(!b.kf[k].length)delete b.kf[k]; }); }
        return [a,b]; } return [cl]; })}))})); notify('Split at playhead'); };
  const duplicateClip=()=>{ if(!sel)return; commitNow();
    setComp(c=>({...c,tracks:c.tracks.map(t=>{ const cl=t.clips.find(x=>x.id===sel); if(!cl)return t; return {...t,clips:[...t.clips,{...cl,id:uid('c'),start:cl.start+cl.len}]}; })})); };
  const addText=(label)=>{ commitNow(); const start=Math.round(frame);
    setComp(c=>({...c,tracks:c.tracks.map(x=>x.type==='text'?{...x,clips:[...x.clips,{id:uid('c'),name:label.slice(0,16),start,len:90,color:'#ffb13b',text:label,anim:'rise'}]}:x)})); };
  const addTrack=(kind='video')=>{ commitNow(); setComp(c=>({...c,tracks:[...c.tracks,{id:uid('t'),name:(kind==='audio'?'Audio ':'Video ')+(c.tracks.filter(t=>t.type===kind).length+1),type:kind,clips:[]}]})); };
  const addAsset=(a)=>{ commitNow(); const type=a.kindTag==='audio'?'audio':'video'; const f=Math.round(frame);
    setComp(c=>{ let placed=false; const tracks=c.tracks.map(t=>{ if(placed||t.type!==type) return t; placed=true;
      const start=Math.min(c.duration-30,f); const len=Math.min(120,c.duration-start);
      const src=type==='video'?'gradient-a':type==='audio'?'wave':'logo';
      return {...t,clips:[...t.clips,{id:uid('c'),name:a.name,start,len,color:CLIP_COLORS[type],src}]}; });
      return {...c,tracks}; }); notify('Added “'+a.name+'” to timeline'); };

  const applyAI=(text)=>{ const t=text.toLowerCase(); let r; const cl=sel&&findClip(sel); const needSel=()=>{ if(!cl){ r='Select a clip first, then ask again.'; return false; } return true; };
    if(/vertical|9:16|tiktok|reel|story/.test(t)){ setRatio(1080,1920); r='Switched to 9:16 vertical — perfect for TikTok/Reels.'; }
    else if(/square|1:1/.test(t)){ setRatio(1080,1080); r='Switched to 1:1 square.'; }
    else if(/4:5|portrait/.test(t)){ setRatio(1080,1350); r='Switched to 4:5 portrait.'; }
    else if(/wide|16:9|landscape|youtube/.test(t)){ setRatio(1920,1080); r='Switched to 16:9 landscape.'; }
    else if(/split|cut|razor/.test(t)){ splitAtPlayhead(); r='Done — split at the playhead.'; }
    else if(/duplicate|copy/.test(t)){ if(needSel()){ duplicateClip(); r='Duplicated the selected clip.'; } }
    else if(/delete|remove|trim out/.test(t)){ if(needSel()){ delClip(sel); r='Deleted the clip.'; } }
    else if(/fade in/.test(t)){ if(needSel()){ kfSet(sel,'opacity',[{t:0,v:0},{t:12,v:100}]); r='Added a fade-in.'; } }
    else if(/fade out/.test(t)){ if(needSel()){ kfSet(sel,'opacity',[{t:Math.max(0,cl.len-12),v:100},{t:cl.len,v:0}]); r='Added a fade-out.'; } }
    else if(/punch|zoom in|ken ?burns|scale up/.test(t)){ if(needSel()){ kfSet(sel,'scale',[{t:0,v:100},{t:cl.len,v:118}]); r='Added a slow punch-in zoom.'; } }
    else if(/spin|rotate/.test(t)){ if(needSel()){ kfSet(sel,'rotate',[{t:0,v:0},{t:cl.len,v:360}]); r='Added a 360° spin.'; } }
    else if(/slide in|slide/.test(t)){ if(needSel()){ kfSet(sel,'x',[{t:0,v:-60},{t:14,v:0}]); r='Added a slide-in from the left.'; } }
    else if(/(title|text|caption)\s+(.+)/i.test(text)){ const m=text.match(/(?:title|text|caption)\s+(.+)/i); addText(m[1]); r='Added title “'+m[1]+'”.'; }
    else if(/help|what can/.test(t)){ r='I can: vertical / square / 4:5 / 16:9, split, duplicate, delete, fade in, fade out, punch in, spin, slide in, add title <text>.'; }
    else { r='Not sure yet — try “vertical”, “fade in”, “split”, “punch in”, “spin”, or “add title …”.'; }
    setAiLog(l=>[...l,{role:'user',text},{role:'ai',text:r}]);
    return r;
  };

  const fmtT = (f)=>{ const s=f/comp.fps; const m=Math.floor(s/60); const ss=(s%60); return `${m}:${ss.toFixed(2).padStart(5,'0')}`; };

  const doRender = async ()=>{ setPlaying(false); setRendering({ pct:0 });
    if(!api){ notify('No server configured'); setRendering(null); return; }
    try{ const { jobId } = await api.render.start({ composition:'Root', duration:comp.duration, format:{ w:comp.w, h:comp.h, fps:comp.fps } });
      const iv=setInterval(async ()=>{ let s; try{ s=await api.render.status(jobId); }catch(e){ clearInterval(iv); setRendering(null); notify('Render error: '+e.message); return; }
        setRendering(rr=> rr&&!rr.done ? { pct:(s.progress||0)*100 } : rr);
        if(s.state==='done'){ clearInterval(iv); setRendering({ pct:100, done:true }); setTimeout(()=>{ setRendering(null); notify('Rendered → '+(s.output||'/Media')); }, 900); }
        else if(s.state==='error'){ clearInterval(iv); setRendering(null); notify('Render failed: '+(s.message||'unknown')); }
      }, 200);
    }catch(e){ setRendering(null); notify('Render error: '+(e.message||e)); } };

  // expose to the AI command bus
  const veApiRef = React.useRef({});
  veApiRef.current = { applyAI, doRender };
  React.useEffect(()=>{ if(!window.OSBus) return; return OSBus.register('video', {
    command:(text)=>veApiRef.current.applyAI(text),
    render:()=>{ veApiRef.current.doRender(); return true; },
  }); },[]);

  const onKey=(e)=>{ const tag=(e.target.tagName||''); if(tag==='INPUT'||tag==='TEXTAREA') return; const mod=e.metaKey||e.ctrlKey;
    if(mod && e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); }
    else if(mod && e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
    else if(e.key.toLowerCase()==='s' && !mod){ e.preventDefault(); splitAtPlayhead(); }
    else if((e.key==='Backspace'||e.key==='Delete') && sel){ e.preventDefault(); delClip(sel); }
    else if(e.key===' '){ e.preventDefault(); setPlaying(p=>!p); } };

  const ic = (style)=>({width:26,height:26,borderRadius:7,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',display:'grid',placeItems:'center',cursor:'default',...style});

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKey} onMouseDown={()=>rootRef.current&&rootRef.current.focus({preventScroll:true})}
         style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'var(--window-bg)',fontSize:13,outline:'none'}}>
      {/* toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',rowGap:7,padding:'7px 12px',borderBottom:'.5px solid var(--sep)',background:'var(--window-head)'}}>
        <strong style={{fontSize:13}}>Reel Editor</strong>
        <div style={{display:'flex',gap:4}}>{RATIOS.map(([l,w,h])=>{ const on=comp.w===w&&comp.h===h;
          return <button key={l} onClick={()=>setRatio(w,h)} title={l} style={{height:24,padding:'0 9px',borderRadius:6,border:'none',fontSize:11,fontWeight:700,cursor:'default',background:on?'var(--accent)':'var(--inset)',color:on?'#fff':'var(--text-dim)'}}>{l}</button>; })}</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <button className="btn icon" disabled={!past.length} onClick={undo} title="Undo (⌘Z)"><svg viewBox="0 0 24 24"><path d="M9 7L4 12l5 5M4 12h11a5 5 0 1 1 0 10h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <button className="btn icon" disabled={!future.length} onClick={redo} title="Redo (⇧⌘Z)"><svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5M20 12H9a5 5 0 1 0 0 10h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <div style={{display:'flex',background:'var(--inset)',borderRadius:7,padding:2}}>
            {[['editor','Editor'],['ai','AI']].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setShowProps(true);}} style={{height:24,padding:'0 10px',border:'none',borderRadius:5,fontSize:11.5,fontWeight:600,cursor:'default',display:'flex',alignItems:'center',gap:4,
                background:mode===m?'var(--window-bg)':'transparent',boxShadow:mode===m?'0 1px 2px rgba(0,0,0,.12)':'none',color:'var(--text)'}}>{m==='ai'&&<VESpark/>}{l}</button>))}
          </div>
          <button className="btn ve-props-toggle" onClick={()=>setShowProps(s=>!s)} title="Panel"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
          <button className="btn primary" onClick={doRender}><svg viewBox="0 0 24 24"><path d="M5 4l14 8-14 8z" fill="currentColor"/></svg>Render</button>
        </div>
      </div>

      <div style={{flex:1,minHeight:0,display:'flex'}}>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',background:'#0c0d10'}}>
          <div style={{flex:1,minHeight:0,display:'grid',placeItems:'center',padding:18}}>
            <CompPreview comp={comp} frame={frame} />
          </div>
          <div style={{minHeight:46,flexWrap:'wrap',rowGap:8,flex:'0 0 auto',display:'flex',alignItems:'center',gap:12,padding:'7px 16px',background:'rgba(0,0,0,.35)',borderTop:'.5px solid rgba(255,255,255,.08)',color:'#e8e8ee'}}>
            <div style={{display:'flex',gap:6}}>
              <Tbtn onClick={()=>setFrame(0)} t="Start"><path d="M6 5v14M9 12l9-7v14z" fill="currentColor"/></Tbtn>
              <Tbtn onClick={()=>setPlaying(p=>!p)} big t="Play/Pause (Space)">{playing?<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>:<path d="M7 5l12 7-12 7z" fill="currentColor"/>}</Tbtn>
              <Tbtn onClick={()=>setFrame(comp.duration-1)} t="End"><path d="M18 5v14M15 12L6 5v14z" fill="currentColor"/></Tbtn>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button title="Split (S)" onClick={splitAtPlayhead} style={ic()}><svg viewBox="0 0 24 24" style={{width:15,height:15}}><g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><path d="M8 7.4L20 17M8 16.6L20 7"/></g></svg></button>
              <button title="Duplicate" onClick={duplicateClip} style={ic({opacity:sel?1:.45})}><svg viewBox="0 0 24 24" style={{width:15,height:15}}><g fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/></g></svg></button>
              <button title="Delete (⌫)" onClick={()=>sel&&delClip(sel)} style={ic({opacity:sel?1:.45})}><svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></button>
            </div>
            <span style={{fontFamily:'var(--font-mono)',fontSize:13,fontVariantNumeric:'tabular-nums',color:'#fff'}}>{fmtT(frame)}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'rgba(255,255,255,.4)'}}>f{Math.round(frame)}</span>
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,fontSize:11,color:'rgba(255,255,255,.6)'}}>
              <span>Zoom</span><input type="range" min="1.4" max="8" step="0.1" value={zoom} onChange={e=>setZoom(+e.target.value)} style={{width:80}} />
            </div>
          </div>
        </div>

        <div className={'ve-props'+(showProps?' open':'')} style={{width:222,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--sidebar)',overflowY:'auto',padding:'12px 12px 16px'}}>
          {mode==='ai' ? <AIPanel log={aiLog} onSend={applyAI} hasSel={!!sel} />
            : <>
              <div style={{display:'flex',background:'var(--inset)',borderRadius:7,padding:2,marginBottom:12}}>
                {[['props','Properties'],['assets','Assets']].map(([v,l])=>(
                  <button key={v} onClick={()=>setPanelTab(v)} style={{flex:1,height:24,border:'none',borderRadius:5,fontSize:11.5,fontWeight:600,cursor:'default',
                    background:panelTab===v?'var(--window-bg)':'transparent',boxShadow:panelTab===v?'0 1px 2px rgba(0,0,0,.12)':'none',color:'var(--text)'}}>{l}</button>))}
              </div>
              {panelTab==='assets'
                ? <AssetsPanel fs={fs} kinds={['video','image','audio']} onPick={addAsset} compact />
                : (selClip ? <ClipProps clip={selClip} setClip={setClip} delClip={delClip} fmtT={fmtT} fps={comp.fps} comp={comp} setFrame={setFrame} frame={frame} />
                  : <CompProps comp={comp} setComp={setComp} commitNow={commitNow} />)}
            </>}
        </div>
      </div>

      <Timeline comp={comp} setComp={setComp} commitNow={commitNow} frame={frame} setFrame={setFrame} zoom={zoom} sel={sel} setSel={(id)=>{setSel(id); if(id&&mode==='editor'){setShowProps(true);setPanelTab('props');}}} setClip={setClip} onAddTrack={addTrack} />

      {rendering && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'grid',placeItems:'center',zIndex:20}}>
        <div className="glass" style={{width:320,padding:'22px 24px',borderRadius:14,background:'var(--glass-menu)',boxShadow:'var(--shadow-pop)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><RemotionMark big/><strong>{rendering.done?'Render complete':'Rendering composition…'}</strong></div>
          <div style={{height:8,borderRadius:5,background:'var(--inset)',overflow:'hidden'}}><div style={{width:rendering.pct+'%',height:'100%',background:'var(--accent)',transition:'width .2s'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'var(--text-faint)',fontFamily:'var(--font-mono)'}}>
            <span>{Math.round(rendering.pct/100*comp.duration)} / {comp.duration} frames</span><span>{Math.round(rendering.pct)}%</span></div>
        </div></div>}
    </div>
  );
}

function VESpark(){ return <svg viewBox="0 0 24 24" style={{width:13,height:13}}><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" fill="var(--accent)"/></svg>; }
function AIPanel({ log, onSend, hasSel }){
  const [v,setV]=React.useState(''); const ref=React.useRef(null);
  React.useEffect(()=>{ if(ref.current) ref.current.scrollTop=ref.current.scrollHeight; },[log]);
  const sugg=['Make it vertical','Fade in','Punch in','Split here','Spin','Add title Sale'];
  const send=(x)=>{ const s=(x||'').trim(); if(s){ onSend(s); setV(''); } };
  return <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:360}}>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}><VESpark/> AI Assistant</div>
    <div style={{fontSize:10.5,color:'var(--text-faint)',marginBottom:10}}>{hasSel?'Acting on the selected clip.':'Select a clip for clip-level edits.'}</div>
    <div ref={ref} style={{flex:1,minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:7,paddingRight:2}}>
      {log.map((m,i)=><div key={i} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'94%',padding:'7px 10px',borderRadius:11,fontSize:12,lineHeight:1.45,
        background:m.role==='user'?'var(--accent)':'var(--inset)',color:m.role==='user'?'#fff':'var(--text)'}}>{m.text}</div>)}
    </div>
    <div style={{display:'flex',flexWrap:'wrap',gap:5,margin:'9px 0'}}>{sugg.map(s=><button key={s} onClick={()=>send(s)} style={{fontSize:10.5,padding:'4px 8px',borderRadius:20,border:'.5px solid var(--sep)',background:'var(--field)',color:'var(--text-dim)',cursor:'default'}}>{s}</button>)}</div>
    <div style={{display:'flex',gap:6}}>
      <input className="field" style={{flex:1}} value={v} placeholder="Describe an edit…" onChange={e=>setV(e.target.value)} onKeyDown={e=>{ e.stopPropagation(); if(e.key==='Enter')send(v); }}/>
      <button className="btn primary" onClick={()=>send(v)}>Go</button>
    </div>
  </div>;
}

function Tbtn({ children, onClick, big, t }){ return (
  <button onClick={onClick} title={t} style={{width:big?34:28,height:28,borderRadius:7,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',display:'grid',placeItems:'center',cursor:'default'}}>
    <svg viewBox="0 0 24 24" style={{width:big?16:14,height:big?16:14}}>{children}</svg></button>); }

function RemotionMark({ big }){ const s=big?18:14; return <span style={{width:s,height:s,borderRadius:5,background:'linear-gradient(135deg,#0b84ff,#9b5cff)',display:'inline-grid',placeItems:'center'}}><span style={{width:s*.42,height:s*.42,borderRadius:'50%',background:'#fff'}}/></span>; }

/* ---------------- keyframe model ---------------- */
const KF_PROPS=[
  {k:'opacity',label:'Opacity',min:0,max:100,step:1,unit:'%'},
  {k:'scale',label:'Scale',min:0,max:300,step:1,unit:'%'},
  {k:'x',label:'Position X',min:-100,max:100,step:1,unit:'%'},
  {k:'y',label:'Position Y',min:-100,max:100,step:1,unit:'%'},
  {k:'rotate',label:'Rotation',min:-180,max:180,step:1,unit:'°'},
];
const KF_DEF={opacity:100,scale:100,x:0,y:0,rotate:0};
function sampleKeys(keys,f,fb){ if(!keys||!keys.length) return fb;
  if(f<=keys[0].t) return keys[0].v; const last=keys[keys.length-1]; if(f>=last.t) return last.v;
  for(let i=0;i<keys.length-1;i++){ const a=keys[i],b=keys[i+1]; if(f>=a.t&&f<=b.t){ const p=(f-a.t)/((b.t-a.t)||1); return a.v+(b.v-a.v)*p; } } return fb; }
function clipVal(c,k,local){ const base=(c.p&&c.p[k]!=null)?c.p[k]:KF_DEF[k]; const keys=c.kf&&c.kf[k]; return keys&&keys.length? sampleKeys(keys,local,base): base; }

/* ---------------- preview canvas ---------------- */
function CompPreview({ comp, frame }){
  const visual = comp.tracks.filter(t=>t.type!=='audio');
  const active = visual.flatMap(t=>t.clips).filter(c=>frame>=c.start && frame<c.start+c.len).sort((a,b)=>a.start-b.start);
  const portrait = comp.h>comp.w;
  const frameStyle = portrait
    ? {height:'100%',width:'auto',aspectRatio:`${comp.w}/${comp.h}`,maxWidth:'100%'}
    : {width:'100%',aspectRatio:`${comp.w}/${comp.h}`,maxHeight:'100%'};
  return (
    <div style={{position:'relative',...frameStyle,background:'#000',borderRadius:8,overflow:'hidden',boxShadow:'0 12px 40px rgba(0,0,0,.5)'}}>
      {active.map(c=>{
        const local=frame-c.start, t0=Math.min(1,local/12), t1=Math.min(1,(c.start+c.len-frame)/10), fade=Math.min(t0,t1);
        const op=clipVal(c,'opacity',local)/100, sc=clipVal(c,'scale',local)/100, x=clipVal(c,'x',local), y=clipVal(c,'y',local), rot=clipVal(c,'rotate',local);
        const wrap={position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',opacity:Math.max(0,fade*op),transform:`translate(${x}%,${y}%) scale(${sc}) rotate(${rot}deg)`};
        let inner;
        if(c.text){ const yy=c.anim==='rise'?(1-t0)*30:0; const ss=c.anim==='pop'?0.7+0.3*t0:1;
          inner=<div style={{transform:`translateY(${yy}px) scale(${ss})`,color:'#fff',fontWeight:800,fontSize:'clamp(20px,6vw,52px)',letterSpacing:'-.02em',textShadow:'0 4px 20px rgba(0,0,0,.5)',textAlign:'center',padding:'0 6%'}}>{c.text}</div>;
        } else if(c.src==='logo'){ inner=<div style={{width:'22%',aspectRatio:'1',borderRadius:'24%',background:'linear-gradient(160deg,#fff,#cfd6e6)',display:'grid',placeItems:'center',boxShadow:'0 8px 30px rgba(0,0,0,.4)',transform:`scale(${0.8+0.2*t0})`}}><span style={{fontWeight:900,fontSize:'2.4vw',color:'#2f7bf6'}}>rr</span></div>;
        } else { const bg=c.src==='gradient-b'?'linear-gradient(135deg,#1b2050,#5be0c8)':'linear-gradient(135deg,#2a2f6b,#ff7ac4)';
          inner=<div style={{position:'absolute',inset:0,background:bg}}><div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 14px,transparent 14px 28px)'}}/><div style={{position:'absolute',left:16,bottom:14,color:'rgba(255,255,255,.85)',fontFamily:'var(--font-mono)',fontSize:'1.2vw'}}>▶ {c.name}</div></div>;
        }
        return <div key={c.id} style={wrap}>{inner}</div>;
      })}
      {active.length===0 && <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'rgba(255,255,255,.3)',fontSize:13}}>No clip at playhead</div>}
    </div>
  );
}

/* ---------------- properties panels ---------------- */
function Row({ label, children }){ return <div style={{marginBottom:11}}><div style={{fontSize:11,fontWeight:600,color:'var(--text-dim)',marginBottom:5}}>{label}</div>{children}</div>; }
function ClipProps({ clip, setClip, delClip, fmtT, fps, comp, setFrame, frame }){
  const local=Math.max(0,Math.min(clip.len, Math.round(frame-clip.start)));
  const inClip = frame>=clip.start && frame<clip.start+clip.len;
  const setKey=(k,v)=>{ const cur=(clip.kf&&clip.kf[k])?clip.kf[k].slice():[]; const i=cur.findIndex(x=>x.t===local);
    if(i>=0)cur[i]={t:local,v};else cur.push({t:local,v}); cur.sort((a,b)=>a.t-b.t); setClip(clip.id,{kf:{...(clip.kf||{}),[k]:cur}}); };
  const removeKey=(k)=>{ const cur=((clip.kf&&clip.kf[k])||[]).filter(x=>x.t!==local); const kf={...(clip.kf||{})}; if(cur.length)kf[k]=cur; else delete kf[k]; setClip(clip.id,{kf}); };
  const setBase=(k,v)=>setClip(clip.id,{p:{...(clip.p||{}),[k]:v}});
  const onSlide=(k,v)=>{ const keys=clip.kf&&clip.kf[k]; if(keys&&keys.length) setKey(k,v); else setBase(k,v); };
  const seekLocal=(t)=>setFrame(clip.start+Math.max(0,Math.min(clip.len,t)));
  const animatedCount = clip.kf ? Object.keys(clip.kf).filter(k=>clip.kf[k]&&clip.kf[k].length).length : 0;
  return <div>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:10}}>Clip</div>
    <Row label="Name"><input className="field" style={{width:'100%'}} value={clip.name} onChange={e=>setClip(clip.id,{name:e.target.value})}/></Row>
    {clip.text!=null && <Row label="Text"><input className="field" style={{width:'100%'}} value={clip.text} onChange={e=>setClip(clip.id,{text:e.target.value})}/></Row>}
    {clip.anim!=null && <Row label="Entrance">
      <div style={{display:'flex',gap:4}}>{['rise','pop','fade'].map(a=>(
        <button key={a} className="btn" style={{flex:1,padding:0,height:26,background:clip.anim===a?'var(--accent)':'var(--field)',color:clip.anim===a?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>setClip(clip.id,{anim:a})}>{a}</button>))}</div></Row>}
    <Row label={`Start — ${fmtT(clip.start)}`}><input type="range" min="0" max={comp.duration-1} value={clip.start} style={{width:'100%'}} onChange={e=>{setClip(clip.id,{start:+e.target.value});setFrame(+e.target.value);}}/></Row>
    <Row label={`Duration — ${(clip.len/fps).toFixed(2)}s`}><input type="range" min="6" max={comp.duration} value={clip.len} style={{width:'100%'}} onChange={e=>setClip(clip.id,{len:+e.target.value})}/></Row>

    <div style={{borderTop:'.5px solid var(--sep)',margin:'14px -12px 11px'}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:9}}>
      <span style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)'}}>Animate</span>
      <span style={{fontSize:10,fontFamily:'var(--font-mono)',color: inClip?'var(--text-faint)':'#ff8a3d'}}>{inClip? '◆ '+(local/fps).toFixed(2)+'s' : 'playhead off-clip'}</span>
    </div>
    {KF_PROPS.map(P=>{
      const keys=clip.kf&&clip.kf[P.k]; const has=keys&&keys.length; const val=Math.round(clipVal(clip,P.k,local)); const here=has&&keys.some(x=>x.t===local);
      return <div key={P.k} style={{marginBottom:11}}>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
          <button title={!inClip?'Move playhead onto clip':here?'Remove keyframe':'Add keyframe'} onClick={()=>{ if(!inClip)return; here?removeKey(P.k):setKey(P.k,val); }}
            style={{width:18,height:18,flex:'0 0 auto',border:'none',background:'transparent',cursor:'default',display:'grid',placeItems:'center',opacity:inClip?1:.4}}><Diamond on={here} dim={!has}/></button>
          <span style={{fontSize:11,fontWeight:600,color:'var(--text-dim)',flex:1}}>{P.label}</span>
          {has && <NavKeys keys={keys} local={local} seek={seekLocal}/>}
          <span style={{fontSize:11,color:'var(--text-faint)',fontVariantNumeric:'tabular-nums',minWidth:34,textAlign:'right'}}>{val}{P.unit}</span>
        </div>
        <input type="range" min={P.min} max={P.max} step={P.step} value={val} style={{width:'100%'}} onChange={e=>onSlide(P.k,+e.target.value)}/>
        {has && <KeyLane keys={keys} len={clip.len} local={local} seek={seekLocal}/>}
      </div>;
    })}
    {animatedCount>0 && <button className="btn" style={{width:'100%',marginTop:2,height:26}} onClick={()=>setClip(clip.id,{kf:undefined})}>Clear all keyframes</button>}
    <button className="btn" style={{width:'100%',color:'#ff5f57',marginTop:8}} onClick={()=>delClip(clip.id)}>Delete clip</button>
  </div>;
}
function Diamond({on,dim}){ return <svg viewBox="0 0 12 12" style={{width:12,height:12}}><path d="M6 .8l5.2 5.2L6 11.2.8 6z" fill={on?'var(--accent)':'none'} stroke={dim?'var(--text-faint)':'var(--accent)'} strokeWidth="1.4" strokeLinejoin="round"/></svg>; }
function NavKeys({keys,local,seek}){ const prev=[...keys].reverse().find(k=>k.t<local); const next=keys.find(k=>k.t>local);
  const b=(on)=>({width:16,height:16,border:'none',borderRadius:4,background:'var(--inset)',color:on?'var(--text-dim)':'var(--text-faint)',cursor:'default',opacity:on?1:.4,fontSize:11,lineHeight:1,padding:0});
  return <span style={{display:'flex',gap:2}}>
    <button style={b(!!prev)} disabled={!prev} onClick={()=>prev&&seek(prev.t)}>‹</button>
    <button style={b(!!next)} disabled={!next} onClick={()=>next&&seek(next.t)}>›</button></span>; }
function KeyLane({keys,len,local,seek}){
  return <div onClick={(e)=>{ const r=e.currentTarget.getBoundingClientRect(); seek(Math.round((e.clientX-r.left)/r.width*len)); }}
    style={{position:'relative',height:13,marginTop:5,borderRadius:4,background:'var(--inset)',cursor:'default'}}>
    <div style={{position:'absolute',top:0,bottom:0,left:(Math.max(0,Math.min(len,local))/len*100)+'%',width:1.5,background:'#ff3b30'}}/>
    {keys.map((k,i)=><div key={i} onClick={(e)=>{e.stopPropagation();seek(k.t);}} title={(k.t/30).toFixed(2)+'s · '+k.v}
      style={{position:'absolute',top:'50%',left:(k.t/len*100)+'%',width:8,height:8,marginLeft:-4,marginTop:-4,transform:'rotate(45deg)',background:'var(--accent)',borderRadius:1,boxShadow:'0 0 0 1.5px var(--sidebar)'}}/>)}
  </div>;
}
function CompProps({ comp, setComp, commitNow }){
  const presets=[['1920×1080','16:9',1920,1080],['1080×1920','9:16',1080,1920],['1080×1080','1:1',1080,1080],['1080×1350','4:5',1080,1350]];
  const set=(patch)=>{ commitNow&&commitNow(); setComp(c=>({...c,...patch})); };
  return <div>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:10}}>Composition</div>
    <Row label="Format">{presets.map(([l,r,w,h])=>(
      <div key={l} onClick={()=>set({w,h})} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderRadius:8,marginBottom:5,cursor:'default',background:comp.w===w&&comp.h===h?'var(--accent)':'var(--field)',color:comp.w===w&&comp.h===h?'#fff':'var(--text)',border:'.5px solid var(--sep)'}}>
        <span style={{fontWeight:600}}>{l}</span><span style={{fontSize:11,opacity:.7}}>{r}</span></div>))}</Row>
    <Row label={`Duration — ${(comp.duration/comp.fps).toFixed(1)}s`}><input type="range" min="60" max="900" step="30" value={comp.duration} style={{width:'100%'}} onChange={e=>set({duration:+e.target.value})}/></Row>
    <Row label="Frame rate"><div style={{display:'flex',gap:4}}>{[24,30,60].map(f=>(
      <button key={f} className="btn" style={{flex:1,padding:0,height:26,background:comp.fps===f?'var(--accent)':'var(--field)',color:comp.fps===f?'#fff':'var(--text)',borderColor:'transparent'}} onClick={()=>set({fps:f})}>{f}</button>))}</div></Row>
    <div style={{marginTop:10,padding:'10px 12px',borderRadius:9,background:'var(--inset)',fontSize:11,color:'var(--text-dim)',lineHeight:1.5}}>
      Select a clip to keyframe it, press <b>S</b> to split at the playhead, or switch to <b>AI</b> for one-line edits.</div>
  </div>;
}

/* ---------------- timeline ---------------- */
function Timeline({ comp, setComp, commitNow, frame, setFrame, zoom, sel, setSel, setClip, onAddTrack }){
  const scrollRef = React.useRef(null);
  const [addMenu,setAddMenu]=React.useState(false);
  const [editTrack,setEditTrack]=React.useState(null);
  const [dropTrack,setDropTrack]=React.useState(null);
  const W = comp.duration*zoom;
  const TH = 36;
  const setStart=(id,start)=>setClip(id,{start:Math.max(0,Math.min(comp.duration-6,Math.round(start)))});
  const moveToTrack=(clipId,fromId,toId)=>{ if(fromId===toId)return; commitNow&&commitNow();
    setComp(c=>{ let clip; const tracks=c.tracks.map(t=>{ if(t.id===fromId){ clip=t.clips.find(x=>x.id===clipId); return {...t,clips:t.clips.filter(x=>x.id!==clipId)}; } return t; });
      if(!clip) return c; return {...c,tracks:tracks.map(t=>t.id===toId?{...t,clips:[...t.clips,clip]}:t)}; }); };
  const renameTrack=(id,name)=>setComp(c=>({...c,tracks:c.tracks.map(t=>t.id===id?{...t,name:(name||'').trim()||t.name}:t)}));
  const deleteTrack=(id)=>{ commitNow&&commitNow(); setComp(c=>({...c,tracks:c.tracks.filter(t=>t.id!==id)})); };

  const seek=(e)=>{ const r=e.currentTarget.getBoundingClientRect();
    setFrame(Math.max(0,Math.min(comp.duration-1,(e.clientX-r.left)/zoom))); };

  const dragClip=(e,clip,track)=>{ e.stopPropagation(); setSel(clip.id); if(e.button!==0)return; commitNow&&commitNow();
    const sx=e.clientX, os=clip.start, oLen=clip.len;
    const localX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const edge = localX > (clip.len*zoom - 9);   // right edge → resize
    let target=track.id;
    const move=(ev)=>{ const d=Math.round((ev.clientX-sx)/zoom);
      if(edge){ setClip(clip.id,{ len:Math.max(6, Math.min(comp.duration-clip.start, oLen+d)) }); return; }
      setStart(clip.id, os+d);
      const el=document.elementFromPoint(ev.clientX,ev.clientY); const lane=el&&el.closest('[data-ttype]');
      if(lane && lane.getAttribute('data-ttype')===track.type){ const tid=lane.getAttribute('data-track'); target=tid; setDropTrack(tid!==track.id?tid:null); }
      else setDropTrack(null);
    };
    const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
      setDropTrack(null); if(!edge && target && target!==track.id) moveToTrack(clip.id, track.id, target); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  };

  const ticks=[]; const step = zoom<2.2?comp.fps*2:comp.fps; for(let f=0;f<=comp.duration;f+=step) ticks.push(f);

  return (
    <div style={{height:206,flex:'0 0 auto',borderTop:'.5px solid var(--sep)',background:'var(--sidebar)',position:'relative'}}>
      <div ref={scrollRef} style={{position:'absolute',inset:0,overflow:'auto'}}>
        <div style={{width:96+W,position:'relative',minHeight:'100%'}}>
          {/* ruler row — sticky top */}
          <div style={{position:'sticky',top:0,zIndex:6,display:'flex',height:24,background:'var(--sidebar)'}}>
            <div style={{position:'sticky',left:0,zIndex:8,width:96,flex:'0 0 auto',borderRight:'.5px solid var(--sep)',borderBottom:'.5px solid var(--sep)',background:'var(--sidebar)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{position:'relative'}}>
                <button onClick={()=>setAddMenu(m=>!m)} title="Add track" style={{height:18,padding:'0 8px',borderRadius:5,border:'none',cursor:'default',background:'var(--inset)',color:'var(--text-dim)',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',gap:3}}>
                  <svg viewBox="0 0 24 24" style={{width:11,height:11}}><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>Track</button>
                {addMenu && <div className="ctx" style={{left:0,top:22,minWidth:104}} onMouseLeave={()=>setAddMenu(false)}>
                  <div className="mi" onClick={()=>{onAddTrack('video');setAddMenu(false);}}><span style={{width:8,height:8,borderRadius:2,background:TRACK_DOT.video}}/>&nbsp;Video track</div>
                  <div className="mi" onClick={()=>{onAddTrack('audio');setAddMenu(false);}}><span style={{width:8,height:8,borderRadius:2,background:TRACK_DOT.audio}}/>&nbsp;Audio track</div>
                </div>}
              </div>
            </div>
            <div onPointerDown={seek} style={{width:W,position:'relative',borderBottom:'.5px solid var(--sep)',cursor:'text'}}>
              {ticks.map(f=>(<div key={f} style={{position:'absolute',left:f*zoom,top:0,height:'100%',borderLeft:'.5px solid var(--sep)',paddingLeft:4,fontSize:10,color:'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{(f/comp.fps).toFixed(0)}s</div>))}
            </div>
          </div>
          {/* track rows */}
          {comp.tracks.map(t=>(
            <div key={t.id} style={{display:'flex',height:TH}}>
              <div style={{position:'sticky',left:0,zIndex:5,width:96,flex:'0 0 auto',borderRight:'.5px solid var(--sep)',borderBottom:'.5px solid var(--sep)',background:'var(--sidebar)',display:'flex',alignItems:'center',gap:6,padding:'0 6px 0 10px'}}>
                <span style={{width:8,height:8,borderRadius:2,flex:'0 0 auto',background:TRACK_DOT[t.type]||'#888'}}/>
                {editTrack===t.id
                  ? <input autoFocus className="field" defaultValue={t.name} style={{flex:1,minWidth:0,height:20,fontSize:11,padding:'0 4px'}} onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}
                      onBlur={e=>{renameTrack(t.id,e.target.value);setEditTrack(null);}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')e.target.blur();if(e.key==='Escape')setEditTrack(null);}}/>
                  : <span onDoubleClick={()=>setEditTrack(t.id)} title="Double-click to rename" style={{flex:1,minWidth:0,fontSize:11,fontWeight:600,color:'var(--text-dim)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>}
                <button title="Delete track" onClick={()=>deleteTrack(t.id)} style={{flex:'0 0 auto',width:16,height:16,border:'none',background:'transparent',color:'var(--text-faint)',cursor:'default',padding:0,borderRadius:4,fontSize:13,lineHeight:1}}>×</button>
              </div>
              <div data-track={t.id} data-ttype={t.type} onPointerDown={(e)=>{if(e.target===e.currentTarget){setSel(null);seek(e);}}}
                style={{width:W,position:'relative',borderBottom:'.5px solid var(--sep)',background: dropTrack===t.id?'rgba(47,123,246,.16)':(t.type==='audio'?'var(--inset)':'transparent'),boxShadow:dropTrack===t.id?'inset 0 0 0 1.5px var(--accent)':'none'}}>
                {t.clips.map(c=>(
                  <div key={c.id} onPointerDown={(e)=>dragClip(e,c,t)} onClick={(e)=>{e.stopPropagation();setSel(c.id);}}
                    style={{position:'absolute',left:c.start*zoom+1,top:4,width:c.len*zoom-2,height:TH-8,borderRadius:6,background:c.color,
                      boxShadow:sel===c.id?'0 0 0 2px var(--text), 0 2px 8px rgba(0,0,0,.3)':'inset 0 1px 0 rgba(255,255,255,.3)',
                      display:'flex',alignItems:'center',padding:'0 7px',overflow:'hidden',cursor:'grab',color:'#fff'}}>
                    {t.type==='audio' ? <Waveform/> : <span style={{fontSize:11,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textShadow:'0 1px 1px rgba(0,0,0,.25)'}}>{c.text||c.name}</span>}
                    <span style={{position:'absolute',right:0,top:0,bottom:0,width:7,cursor:'ew-resize'}}/>
                  </div>))}
              </div>
            </div>))}
          {/* playhead */}
          <div style={{position:'absolute',top:24,bottom:0,left:96+frame*zoom,width:2,background:'#ff3b30',zIndex:4,pointerEvents:'none'}}>
            <div style={{position:'absolute',top:-1,left:-5,width:12,height:9,background:'#ff3b30',borderRadius:'2px 2px 5px 5px'}}/></div>
        </div>
      </div>
    </div>
  );
}
function Waveform(){ return <svg viewBox="0 0 200 20" preserveAspectRatio="none" style={{width:'100%',height:16,opacity:.85}}>
  {Array.from({length:60}).map((_,i)=>{ const h=4+Math.abs(Math.sin(i*0.7)*Math.cos(i*0.31))*14; return <rect key={i} x={i*3.4} y={(20-h)/2} width="1.8" height={h} fill="#fff" rx="1"/>; })}</svg>; }

Object.assign(window, { VideoEditor });
