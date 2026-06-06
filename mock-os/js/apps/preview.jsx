/* ============================================================
   apps/preview.jsx — Media viewer (image · video · audio · doc)
   Opens media as a VIEWER (play / look), with a button to jump into the
   matching editor. Used as the default action when opening media files.
   Exposes (window): MediaViewer
   ============================================================ */

function pvType(file){ if(!file) return 'other'; const e=(file.ext||'').toLowerCase();
  if(file.kindTag==='video'||['mp4','mov','webm','avi','mkv'].includes(e)) return 'video';
  if(file.kindTag==='image'||['png','jpg','jpeg','gif','svg','webp','bmp'].includes(e)) return 'image';
  if(file.kindTag==='audio'||['wav','mp3','aiff','m4a','flac','ogg'].includes(e)) return 'audio';
  if(e==='pdf') return 'pdf'; return 'other'; }
function pvDur(meta){ const m=String(meta||'').match(/(\d+):(\d+)/); return m? (+m[1])*60+(+m[2]) : 0; }
function pvDims(meta){ const m=String(meta||'').match(/(\d{2,5})\s*[×x]\s*(\d{2,5})/); return m?{w:+m[1],h:+m[2]}:null; }
function pvFmt(s){ s=Math.max(0,Math.round(s)); const m=Math.floor(s/60); const ss=(s%60).toString().padStart(2,'0'); return m+':'+ss; }
const PV_TINT = { video:'linear-gradient(135deg,#2a2f6b,#ff7ac4)', image:'linear-gradient(135deg,#ff9a6b,#ff6a9b 40%,#9b5cff 75%,#3aa0ff)', audio:'linear-gradient(135deg,#0f9e6a,#34d39a)' };

function MediaViewer({ file, path, launch, notify }){
  const f = file || { name:'untitled', meta:'' };
  const type = pvType(f);
  const dur = pvDur(f.meta) || (type==='video'?24:type==='audio'?42:0);
  const dims = pvDims(f.meta) || (type==='image'?{w:1600,h:1066}:null);
  const [playing,setPlaying] = React.useState(false);
  const [pos,setPos] = React.useState(0);            // 0..1
  const [zoom,setZoom] = React.useState(1);
  const raf = React.useRef(0), last = React.useRef(0);

  React.useEffect(()=>{ if(!playing){ cancelAnimationFrame(raf.current); return; } last.current=performance.now();
    const loop=(t)=>{ const dt=(t-last.current)/1000; last.current=t; setPos(p=>{ const n=p+dt/(dur||1); return n>=1?0:n; }); raf.current=requestAnimationFrame(loop); };
    raf.current=requestAnimationFrame(loop); return ()=>cancelAnimationFrame(raf.current); },[playing,dur]);

  const editor = type==='image'?'media':(type==='video'||type==='audio')?'video':null;
  const editorName = type==='image'?'Media Studio':'Reel Editor';
  const Striped = ({children})=> <div style={{position:'absolute',inset:0}}>
    <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 14px,transparent 14px 28px)'}}/>{children}</div>;

  const PlayBtn = ({big})=> <button onClick={()=>setPlaying(p=>!p)} style={{width:big?72:34,height:big?72:34,borderRadius:'50%',border:'none',cursor:'default',
    background:big?'rgba(0,0,0,.45)':'rgba(255,255,255,.12)',color:'#fff',display:'grid',placeItems:'center',backdropFilter:'blur(6px)'}}>
    <svg viewBox="0 0 24 24" style={{width:big?30:17,height:big?30:17}}>{playing?<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>:<path d="M8 5l12 7-12 7z" fill="currentColor"/>}</svg></button>;
  const Scrubber = ()=> <div onClick={(e)=>{ const r=e.currentTarget.getBoundingClientRect(); setPos(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))); }}
    style={{flex:1,height:5,borderRadius:3,background:'rgba(255,255,255,.22)',cursor:'default',position:'relative'}}>
    <div style={{position:'absolute',left:0,top:0,bottom:0,width:(pos*100)+'%',background:'var(--accent)',borderRadius:3}}/>
    <div style={{position:'absolute',left:'calc('+(pos*100)+'% - 6px)',top:-3.5,width:12,height:12,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/></div>;

  return (
    <div className="app-host" style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'var(--window-bg)'}}>
      {/* header */}
      <div className="app-toolbar" style={{background:'var(--window-head)',justifyContent:'space-between'}}>
        <span style={{display:'flex',alignItems:'center',gap:9,minWidth:0}}>
          {window.FileIcon && <FileIcon file={f} sz={22}/>}
          <span style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</span>
          <span style={{fontSize:11,color:'var(--text-faint)',textTransform:'uppercase',fontFamily:'var(--font-mono)'}}>{type}</span>
        </span>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn" onClick={()=>notify&&notify('Downloading '+f.name+'…')}><svg viewBox="0 0 24 24" style={{width:14,height:14}}><path d="M12 16V5m0 11l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          {editor && <button className="btn primary" onClick={()=>launch&&launch(editor,{ file:f })}>Open in {editorName}</button>}
        </div>
      </div>

      {/* stage */}
      <div style={{flex:1,minHeight:0,display:'grid',placeItems:'center',padding:24,overflow:'auto',background:type==='image'?'repeating-conic-gradient(#0000 0 25%, rgba(128,128,128,.06) 0 50%) 0 0/24px 24px':'#0c0d10'}}>

        {type==='video' && <div style={{width:'100%',maxWidth:760,display:'flex',flexDirection:'column',gap:0,borderRadius:12,overflow:'hidden',boxShadow:'0 16px 50px rgba(0,0,0,.5)'}}>
          <div style={{position:'relative',aspectRatio:'16/9',background:PV_TINT.video}}>
            <Striped><div style={{position:'absolute',left:16,bottom:14,color:'rgba(255,255,255,.85)',fontFamily:'var(--font-mono)',fontSize:13}}>▶ {f.name}</div></Striped>
            <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}><PlayBtn big/></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(0,0,0,.6)',color:'#fff'}}>
            <PlayBtn/><span style={{fontFamily:'var(--font-mono)',fontSize:12,fontVariantNumeric:'tabular-nums'}}>{pvFmt(pos*dur)}</span><Scrubber/><span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'rgba(255,255,255,.6)'}}>{pvFmt(dur)}</span>
            <svg viewBox="0 0 24 24" style={{width:17,height:17,opacity:.8}}><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>}

        {type==='image' && <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{position:'relative',width:'min(70vw,520px)',aspectRatio:(dims?dims.w/dims.h:1.5),background:PV_TINT.image,borderRadius:8,overflow:'hidden',boxShadow:'0 16px 50px rgba(0,0,0,.4)',transform:'scale('+zoom+')',transition:'transform .2s'}}>
            <Striped/><div style={{position:'absolute',top:'24%',left:'18%',width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,.6)',filter:'blur(2px)'}}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'42%',background:'linear-gradient(to top,rgba(0,0,0,.25),transparent)'}}/></div>
          <div style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'var(--text-faint)'}}>
            <button className="btn icon" onClick={()=>setZoom(z=>Math.max(.4,z-.2))}>−</button>
            <span style={{width:42,textAlign:'center',fontVariantNumeric:'tabular-nums'}}>{Math.round(zoom*100)}%</span>
            <button className="btn icon" onClick={()=>setZoom(z=>Math.min(3,z+.2))}>+</button>
            {dims && <span style={{fontFamily:'var(--font-mono)'}}>{dims.w}×{dims.h}</span>}
          </div>
        </div>}

        {type==='audio' && <div style={{width:'100%',maxWidth:520,padding:'26px 24px',borderRadius:16,background:'var(--glass-panel)',border:'.5px solid var(--sep)',display:'flex',flexDirection:'column',gap:18}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:56,height:56,borderRadius:14,background:PV_TINT.audio,display:'grid',placeItems:'center',flex:'0 0 auto'}}><svg viewBox="0 0 24 24" style={{width:26,height:26}}><path d="M10 6.5l8-1.6v9.3a2.6 2.6 0 1 1-1.6-2.4V8L11.6 9v6.7A2.6 2.6 0 1 1 10 13.3z" fill="#fff"/></svg></div>
            <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div><div style={{fontSize:12,color:'var(--text-faint)'}}>{f.meta||'Audio'}</div></div>
          </div>
          <svg viewBox="0 0 300 48" preserveAspectRatio="none" style={{width:'100%',height:48}}>
            {Array.from({length:90}).map((_,i)=>{ const h=6+Math.abs(Math.sin(i*0.5)*Math.cos(i*0.23))*38; const on=(i/90)<=pos;
              return <rect key={i} x={i*3.33} y={(48-h)/2} width="1.8" height={h} rx="1" fill={on?'var(--accent)':'var(--sep-strong)'}/>; })}</svg>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <PlayBtn/><span style={{fontFamily:'var(--font-mono)',fontSize:12}}>{pvFmt(pos*dur)}</span><Scrubber/><span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-faint)'}}>{pvFmt(dur)}</span>
          </div>
        </div>}

        {(type==='pdf'||type==='other') && <div style={{textAlign:'center',color:'var(--text-faint)'}}>
          <div style={{width:84,height:84,margin:'0 auto 14px'}}>{window.FileIcon && <FileIcon file={f} sz={84}/>}</div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{f.name}</div>
          <div style={{fontSize:12.5,marginTop:6}}>{type==='pdf'?'PDF preview is not available in the mock filesystem.':'No preview available for this file type.'}</div>
        </div>}
      </div>

      {/* footer */}
      <div style={{height:26,flex:'0 0 auto',borderTop:'.5px solid var(--sep)',display:'flex',alignItems:'center',gap:14,padding:'0 14px',fontSize:11,color:'var(--text-faint)',fontFamily:'var(--font-mono)'}}>
        <span>{(path?(path==='/'?'/':path+'/'):'')+f.name}</span>
        <span style={{marginLeft:'auto'}}>{f.size||''}</span>{f.meta && <span>{f.meta}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { MediaViewer, pvType });
