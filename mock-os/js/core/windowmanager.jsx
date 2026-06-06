/* ============================================================
   windowmanager.jsx — useWindows hook + WindowFrame chrome
   Exposes (window): useWindows, WindowFrame
   ============================================================ */

const TOPBAR = 26, DOCK_RESERVE = 96;

function useWindows(){
  // Boot guard: if the previous restore didn't finish (page hung), skip restoring
  // this time so a bad session can never permanently lock the user out.
  const [wins, setWins] = React.useState(()=>{
    const prevAttemptOpen = LS.get('restoreAttempt', false);
    if(prevAttemptOpen){ LS.del('wins'); LS.set('restoreAttempt', false); return []; }
    const saved = LS.get('wins', []);
    if(!Array.isArray(saved) || saved.length===0) return [];
    LS.set('restoreAttempt', true);                 // mark BEFORE the risky render
    return saved.filter(w=>w && w.id && w.appId).slice(0,8).map(w=>({ ...w, anim:false, min:false }));
  });
  const zRef = React.useRef(wins.reduce((m,w)=>Math.max(m,w.z||0),20));
  const focusedRef = React.useRef(null);

  // committed successfully → clear the guard
  React.useEffect(()=>{ LS.set('restoreAttempt', false); }, []);

  // persist session (debounced)
  React.useEffect(()=>{ const id=setTimeout(()=>LS.set('wins', wins.map(({anim,...w})=>w)), 250); return ()=>clearTimeout(id); }, [wins]);

  // keep windows on-screen when the viewport changes
  React.useEffect(()=>{
    const onResize=()=> setWins(ws=>ws.map(w=>{
      const vw=window.innerWidth, vh=window.innerHeight;
      if(w.max) return { ...w, x:8, y:TOPBAR+6, w:vw-16, h:vh-TOPBAR-DOCK_RESERVE, anim:false };
      let width=Math.max(280, Math.min(w.w, vw-16));
      let height=Math.max(180, Math.min(w.h, vh-TOPBAR-DOCK_RESERVE-12));
      let x=Math.max(8, Math.min(w.x, vw-width-8));
      let y=Math.max(TOPBAR+4, Math.min(w.y, vh-DOCK_RESERVE-40));
      return { ...w, x, y, w:width, h:height, anim:false };
    }));
    window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  }, []);

  const focus = React.useCallback((id) => {
    zRef.current += 1; const z = zRef.current; focusedRef.current = id;
    setWins(ws => ws.map(w => w.id === id ? { ...w, z, min:false } : w));
  }, []);

  const open = React.useCallback((app, props) => {
    setWins(ws => {
      const existing = ws.find(w => w.appId === app.id);
      if (existing){
        zRef.current += 1; focusedRef.current = existing.id;
        return ws.map(w => w.id === existing.id ? { ...w, z:zRef.current, min:false, props: props!==undefined ? {...props, _n:(w.props?._n||0)+1} : w.props } : w);
      }
      zRef.current += 1;
      const W = app.w || 880, H = app.h || 560;
      const vw = window.innerWidth, vh = window.innerHeight;
      const maxW = Math.min(W, vw-24), maxH = Math.min(H, vh-TOPBAR-DOCK_RESERVE-12);
      const offset = (ws.length % 5) * 26;
      const x = Math.max(12, Math.round((vw - maxW)/2) + offset - 40);
      const y = Math.max(TOPBAR + 12, Math.round((vh - DOCK_RESERVE - maxH)/2) + offset - 20);
      const id = uid('win');
      focusedRef.current = id;
      return [...ws, { id, appId:app.id, title:app.name, x, y, w:maxW, h:maxH, z:zRef.current, min:false, max:false, anim:true, props: props||{} }];
    });
  }, []);

  const close = React.useCallback((id) => setWins(ws => ws.filter(w => w.id !== id)), []);
  const minimize = React.useCallback((id) => setWins(ws => ws.map(w => w.id===id ? { ...w, min:true } : w)), []);
  const update = React.useCallback((id, patch) => setWins(ws => ws.map(w => w.id===id ? { ...w, ...patch } : w)), []);

  const toggleMax = React.useCallback((id) => setWins(ws => ws.map(w => {
    if (w.id!==id) return w;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (w.max) return { ...w, ...w.prevRect, max:false, anim:true };
    return { ...w, prevRect:{x:w.x,y:w.y,w:w.w,h:w.h}, x:8, y:TOPBAR+6, w:vw-16, h:vh-TOPBAR-DOCK_RESERVE, max:true, anim:true };
  })), []);

  const snap = React.useCallback((id, zone) => setWins(ws => ws.map(w => {
    if (w.id!==id) return w;
    const vw = window.innerWidth, vh = window.innerHeight;
    const top = TOPBAR+6, availH = vh - top - DOCK_RESERVE + 50, fullH = vh - top - 14;
    const rects = {
      left:  {x:8, y:top, w:Math.round(vw/2)-12, h:fullH},
      right: {x:Math.round(vw/2)+4, y:top, w:Math.round(vw/2)-12, h:fullH},
      top:   {x:8, y:top, w:vw-16, h:fullH},
      tl:{x:8,y:top,w:Math.round(vw/2)-12,h:Math.round(availH/2)},
      tr:{x:Math.round(vw/2)+4,y:top,w:Math.round(vw/2)-12,h:Math.round(availH/2)},
      bl:{x:8,y:top+Math.round(availH/2)+4,w:Math.round(vw/2)-12,h:Math.round(availH/2)},
      br:{x:Math.round(vw/2)+4,y:top+Math.round(availH/2)+4,w:Math.round(vw/2)-12,h:Math.round(availH/2)},
    };
    const r = rects[zone]; if(!r) return w;
    return { ...w, ...r, max:false, prevRect:{x:w.x,y:w.y,w:w.w,h:w.h}, anim:true };
  })), []);

  return { wins, open, close, focus, minimize, toggleMax, update, snap, focusedRef };
}

/* zone from pointer position near screen edges */
function snapZone(px, py){
  const vw = window.innerWidth, vh = window.innerHeight, m = 26, cTop = 120;
  const left = px < m, right = px > vw - m, top = py < TOPBAR + 4;
  if (top) return 'top';
  if (left && py < cTop) return 'tl';
  if (left && py > vh - cTop) return 'bl';
  if (right && py < cTop) return 'tr';
  if (right && py > vh - cTop) return 'br';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

function Light({ cls, onClick, icon }){
  return <span className={'light '+cls} onClick={(e)=>{e.stopPropagation();onClick();}}>
    <svg viewBox="0 0 8 8">{icon}</svg></span>;
}

function WindowFrame({ win, focused, mgr, children, onPreviewSnap, onAskAI }){
  const ref = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);

  const startDrag = (e) => {
    if (e.button!==0) return;
    if (e.target.closest('.light, .win-tools button')) return;
    mgr.focus(win.id);
    if (win.max){ mgr.toggleMax(win.id); }
    const sx=e.clientX, sy=e.clientY, ox=win.x, oy=win.y;
    setDragging(true);
    let zone=null, raf=0, cx=sx, cy=sy;
    const apply=()=>{ raf=0;
      const nx=ox+(cx-sx), ny=Math.max(TOPBAR+2, oy+(cy-sy));
      if(ref.current){ ref.current.style.left=nx+'px'; ref.current.style.top=ny+'px'; }
      zone=snapZone(cx,cy); onPreviewSnap(zone);
    };
    const move=(ev)=>{ cx=ev.clientX; cy=ev.clientY; if(!raf) raf=requestAnimationFrame(apply); };
    const up=()=>{ cancelAnimationFrame(raf); onPreviewSnap(null); setDragging(false);
      window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
      if(zone){ mgr.snap(win.id, zone); }
      else { const r=ref.current.getBoundingClientRect(); mgr.update(win.id,{x:r.left,y:r.top}); }
    };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  };

  const startResize = (e, dir) => {
    e.stopPropagation(); if(e.button!==0) return;
    mgr.focus(win.id); setResizing(true);
    const sx=e.clientX, sy=e.clientY, ow=win.w, oh=win.h, ox=win.x;
    let raf=0, cx=sx, cy=sy;
    const apply=()=>{ raf=0;
      let w=ow, h=oh, x=ox;
      if(dir.includes('r')) w=Math.max(300, ow+(cx-sx));
      if(dir.includes('b')) h=Math.max(200, oh+(cy-sy));
      if(dir.includes('l')){ w=Math.max(300, ow-(cx-sx)); x=ox+(ow-w); }
      const el=ref.current; if(el){ el.style.width=w+'px'; el.style.height=h+'px'; el.style.left=x+'px'; }
    };
    const move=(ev)=>{ cx=ev.clientX; cy=ev.clientY; if(!raf) raf=requestAnimationFrame(apply); };
    const up=()=>{ cancelAnimationFrame(raf); setResizing(false);
      window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
      const r=ref.current.getBoundingClientRect(); mgr.update(win.id,{x:r.left,y:r.top,w:r.width,h:r.height,max:false});
    };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  };

  const cls = ['win', focused&&'focused', dragging&&'dragging', resizing&&'resizing', win.min&&'min', win.anim&&!dragging&&!resizing&&'anim'].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={cls} style={{ left:win.x, top:win.y, width:win.w, height:win.h }}
         onMouseDown={()=>mgr.focus(win.id)}
         onTransitionEnd={()=>win.anim&&mgr.update(win.id,{anim:false})}>
      <div className="win-head glass" onPointerDown={startDrag} onDoubleClick={()=>mgr.toggleMax(win.id)}>
        <div className="lights">
          <Light cls="l-close" onClick={()=>mgr.close(win.id)} icon={<path d="M1.6 1.6l4.8 4.8M6.4 1.6l-4.8 4.8" stroke="#7a0a00" strokeWidth="1.2" strokeLinecap="round"/>} />
          <Light cls="l-min" onClick={()=>mgr.minimize(win.id)} icon={<path d="M1.4 4h5.2" stroke="#7a4b00" strokeWidth="1.4" strokeLinecap="round"/>} />
          <Light cls="l-max" onClick={()=>mgr.toggleMax(win.id)} icon={<path d="M2 6V2h4M6 2L2 6" stroke="#0a5200" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>} />
        </div>
        <div className="win-title">{win.title}</div>
        <div className="win-tools">
          {onAskAI && win.appId!=='assistant' && <button title="Ask Alfa about this app" onClick={(e)=>{ e.stopPropagation(); onAskAI(win.appId); }}
            style={{display:'flex',alignItems:'center',gap:5,height:20,padding:'0 8px',border:'none',borderRadius:7,cursor:'default',background:'var(--inset)',color:'var(--text-dim)',fontSize:11,fontWeight:600}}>
            <svg viewBox="0 0 24 24" style={{width:12,height:12}}><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" fill="var(--accent)"/></svg>Alfa</button>}
        </div>
      </div>
      <div className="win-body">{children}</div>
      <div className="resize-h rh-l" onPointerDown={(e)=>startResize(e,'l')} />
      <div className="resize-h rh-r" onPointerDown={(e)=>startResize(e,'r')} />
      <div className="resize-h rh-b" onPointerDown={(e)=>startResize(e,'b')} />
      <div className="resize-h rh-br" onPointerDown={(e)=>startResize(e,'br')} />
    </div>
  );
}

Object.assign(window, { useWindows, WindowFrame, snapZone });
