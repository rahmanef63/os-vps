/* ============================================================
   apps/editor.jsx — Code editor
   Tabs · line numbers · lightweight syntax highlighting · save to FS ·
   OSBus 'editor' handlers so Alfa can read/write/edit code.
   Exposes (window): CodeEditor
   ============================================================ */

/* ---------------- syntax highlighting (no deps) ---------------- */
const ED_KW = new Set(('const let var function return if else for while do switch case break continue new class extends super this import from export default await async yield typeof instanceof in of delete void try catch finally throw null true false undefined '
  +'def lambda elif except with as pass raise global nonlocal None True False and or not is print self '
  +'public private protected static interface type enum implements namespace readonly '
  +'echo fi then esac done fc local export source '
  +'int float double bool boolean string char long short').split(/\s+/).filter(Boolean));
const ED_LANG = { js:'code',jsx:'code',ts:'code',tsx:'code',mjs:'code',cjs:'code',json:'code',py:'code',rb:'code',go:'code',rs:'code',java:'code',c:'code',cpp:'code',cs:'code',php:'code',sh:'code',bash:'code',zsh:'code',yml:'code',yaml:'code',toml:'code',css:'code',scss:'code',sql:'code',
  html:'markup',htm:'markup',xml:'markup',svg:'markup',vue:'markup', md:'md',markdown:'md', txt:'txt' };
const HASH_COMMENT = { py:1,rb:1,sh:1,bash:1,zsh:1,yml:1,yaml:1,toml:1 };
function edEsc(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function edLangOf(ext){ return ED_LANG[(ext||'').toLowerCase()] || 'code'; }

function hlCode(code, ext){
  const hash = HASH_COMMENT[(ext||'').toLowerCase()];
  const cmt = hash ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp('('+cmt+')|(`(?:\\\\.|[^`\\\\])*`|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')|(\\b\\d[\\d_.eExXa-fA-F]*\\b)|([A-Za-z_$][\\w$]*)', 'g');
  let out='', last=0, m;
  while((m=re.exec(code))){
    out += edEsc(code.slice(last, m.index));
    if(m[1]) out += '<span class="tok-cmt">'+edEsc(m[1])+'</span>';
    else if(m[2]) out += '<span class="tok-str">'+edEsc(m[2])+'</span>';
    else if(m[3]) out += '<span class="tok-num">'+edEsc(m[3])+'</span>';
    else { const w=m[4]; const after=code[re.lastIndex];
      if(ED_KW.has(w)) out += '<span class="tok-kw">'+w+'</span>';
      else if(after==='(') out += '<span class="tok-fn">'+w+'</span>';
      else out += edEsc(w); }
    last = re.lastIndex;
  }
  return out + edEsc(code.slice(last));
}
function hlMarkup(code){
  const re = /(<!--[\s\S]*?-->)|(<\/?)([A-Za-z][\w:-]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\/?>)/g;
  let out='', last=0, m;
  while((m=re.exec(code))){
    out += edEsc(code.slice(last, m.index));
    if(m[1]) out += '<span class="tok-cmt">'+edEsc(m[1])+'</span>';
    else if(m[2]!==undefined && m[3]) out += '<span class="tok-punct">'+edEsc(m[2])+'</span><span class="tok-tag">'+edEsc(m[3])+'</span>';
    else if(m[4]) out += '<span class="tok-str">'+edEsc(m[4])+'</span>';
    else if(m[5]) out += '<span class="tok-punct">'+edEsc(m[5])+'</span>';
    last = re.lastIndex;
  }
  return out + edEsc(code.slice(last));
}
function hlMd(code){
  return code.split('\n').map(ln=>{
    if(/^\s*#{1,6}\s/.test(ln)) return '<span class="tok-h">'+edEsc(ln)+'</span>';
    let s=edEsc(ln);
    s=s.replace(/(`[^`]+`)/g,'<span class="tok-str">$1</span>');
    s=s.replace(/(\*\*[^*]+\*\*)/g,'<span class="tok-fn">$1</span>');
    return s;
  }).join('\n');
}
function highlight(code, ext){ const fam=edLangOf(ext);
  if(fam==='markup') return hlMarkup(code); if(fam==='md') return hlMd(code); if(fam==='txt') return edEsc(code);
  return hlCode(code, ext); }

/* ---------------- seed contents for existing mock files ---------------- */
const ED_SEED = {
  '/readme.md':'# os-rr\n\nA browser workspace that runs your VPS from the browser.\n\n- **Files** — manage your storage\n- **Reel Editor** — Remotion-style video\n- **Media Studio** — social image design\n- **Alfa** — AI agents that operate the whole OS\n\nConnect a VPS in Settings → Server to go live.\n',
  '/Documents/roadmap.md':'# Roadmap\n\n## Now\n- [x] Browser app\n- [x] Alfa AI mode + tools\n- [x] Code editor\n\n## Next\n- [ ] Live VPS daemon\n- [ ] Collaborative editing\n',
  '/Projects/remotion.config.ts':"import { Config } from 'remotion';\n\nConfig.setVideoImageFormat('jpeg');\nConfig.setOverwriteOutput(true);\nConfig.setConcurrency(8);\n\nexport const FPS = 30;\nexport const DURATION = 300; // frames\n",
  '/Projects/launch-promo/Root.tsx':"import { Composition } from 'remotion';\nimport { Promo } from './Promo';\n\nexport const Root = () => {\n  return (\n    <Composition\n      id=\"Promo\"\n      component={Promo}\n      durationInFrames={270}\n      fps={30}\n      width={1920}\n      height={1080}\n    />\n  );\n};\n",
  '/apps/scraper.py':"import requests\nfrom bs4 import BeautifulSoup\n\ndef scrape(url):\n    r = requests.get(url, timeout=10)\n    soup = BeautifulSoup(r.text, 'html.parser')\n    return [a.get('href') for a in soup.find_all('a')]\n\nif __name__ == '__main__':\n    for link in scrape('https://example.com'):\n        print(link)\n",
  '/apps/backup.sh':'#!/usr/bin/env bash\nset -euo pipefail\n\nSRC=\"/Media\"\nDEST=\"/backups/$(date +%F)\"\n\nmkdir -p \"$DEST\"\nrsync -a --delete \"$SRC/\" \"$DEST/\"\necho \"Backup complete -> $DEST\"\n',
  '/apps/color-picker/manifest.json':'{\n  "name": "color-picker",\n  "runtime": "html",\n  "entry": "index.html",\n  "window": { "width": 360, "height": 480 }\n}\n',
  '/apps/color-picker/index.html':'<!doctype html>\n<html>\n<head><meta charset="utf-8"><title>Color Picker</title></head>\n<body>\n  <input type="color" id="c" value="#2f7bf6">\n  <output id="v">#2f7bf6</output>\n  <script>\n    c.oninput = () => v.textContent = c.value;\n  </script>\n</body>\n</html>\n',
};
const edExt = (name)=> (name.split('.').pop()||'').toLowerCase();
const edJoin = (b,n)=> b==='/'?'/'+n : b.replace(/\/$/,'')+'/'+n;
const edParent = (p)=>{ const a=p.replace(/\/$/,'').split('/'); a.pop(); return '/'+a.filter(Boolean).join('/'); };
const edBase = (p)=> p.replace(/\/$/,'').split('/').pop();
function edTag(nm){ const e=edExt(nm); if(['mp4','mov','webm'].includes(e))return'video'; if(['png','jpg','jpeg','gif','svg'].includes(e))return'image'; if(['wav','mp3'].includes(e))return'audio'; if(['js','ts','tsx','jsx','py','sh','html','json','css','md'].includes(e))return'code'; return null; }

function CodeEditor(props){
  const [files,setFiles] = usePersistent('editor.files', ()=>({...ED_SEED}));     // the "disk"
  const [buf,setBuf] = React.useState({});       // working copies path->text
  const [tabs,setTabs] = React.useState([]);     // open paths
  const [active,setActive] = React.useState(null);
  const [pos,setPos] = React.useState({ln:1,col:1});
  const [newOpen,setNewOpen] = React.useState(false);
  const [showExplorer,setShowExplorer] = React.useState(true);
  const [showAI,setShowAI] = React.useState(false);
  const [explorerRoot,setExplorerRoot] = React.useState('/');
  const [treeNonce,setTreeNonce] = React.useState(0);
  const [folderPick,setFolderPick] = React.useState(false);
  const aiStore = useAIStore();
  const taRef = React.useRef(null), preRef = React.useRef(null), gutRef = React.useRef(null);
  const filesRef = React.useRef(files); filesRef.current = files;

  const text = active!=null ? (buf[active]??'') : '';
  const ext = active ? edExt(active) : '';
  const html = React.useMemo(()=>highlight(text, ext)+'\n', [text, ext]);
  const dirty = active!=null && buf[active]!==files[active];

  const open = (path)=>{ if(path==null) return; setBuf(b=> (path in b)?b:{...b,[path]: (filesRef.current[path] ?? ED_SEED[path] ?? '')});
    setFiles(f=> (path in f)?f:{...f,[path]:(ED_SEED[path]??'')});
    setTabs(t=> t.includes(path)?t:[...t,path]); setActive(path);
    setTimeout(()=>taRef.current&&taRef.current.focus(),0); };
  const close = (path,e)=>{ e&&e.stopPropagation(); setTabs(t=>{ const i=t.indexOf(path); const n=t.filter(x=>x!==path);
      if(active===path) setActive(n[i]||n[i-1]||n[0]||null); return n; }); };
  const edit = (val)=>{ setBuf(b=>({...b,[active]:val})); };
  const save = (path=active)=>{ if(path==null) return; setFiles(f=>({...f,[path]:buf[path]??''}));
    if(props.notify) props.notify('Saved '+path); };

  // open whatever was passed in (from Files / Spotlight)
  React.useEffect(()=>{ const p = props.openPath || (props.file ? edJoin(props.path||'/', props.file.name) : null); if(p) open(p); /* eslint-disable-next-line */ },[props._ts, props.file, props.openPath]);

  const onScroll = ()=>{ const ta=taRef.current; if(!ta) return; if(preRef.current){ preRef.current.scrollTop=ta.scrollTop; preRef.current.scrollLeft=ta.scrollLeft; }
    if(gutRef.current) gutRef.current.style.transform='translateY('+(-ta.scrollTop)+'px)'; };
  const syncPos = ()=>{ const ta=taRef.current; if(!ta) return; const c=ta.selectionStart; const upto=(buf[active]??'').slice(0,c);
    const lines=upto.split('\n'); setPos({ ln:lines.length, col:lines[lines.length-1].length+1 }); };
  const onKey = (e)=>{ e.stopPropagation();
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); return; }
    if(e.key==='Tab'){ e.preventDefault(); const ta=e.target; const s=ta.selectionStart, en=ta.selectionEnd; const v=buf[active]??'';
      const nv=v.slice(0,s)+'  '+v.slice(en); edit(nv); setTimeout(()=>{ ta.selectionStart=ta.selectionEnd=s+2; },0); } };

  // FS helper — add a file entry so it shows in Files
  const addToFs = (path)=>{ const par=edParent(path), nm=edBase(path);
    if(!OSCTX.current.setFs) return; OSCTX.current.setFs(prev=>{ const n={...prev}; if(!n[par]) n[par]=[];
      if(n[par].some(x=>x.name===nm)) return prev; n[par]=[...n[par],{ id:uid('f'), name:nm, kind:'file', ext:edExt(nm), size:'0 B', meta:'File', kindTag:edTag(nm) }]; return n; }); };

  const createFile = (name, folder='/')=>{ name=(name||'').trim(); if(!name) return; const path=edJoin(folder,name);
    setFiles(f=>({...f,[path]:f[path]??''})); addToFs(path); open(path); setNewOpen(false); };
  const newFolderIn = (base)=>{ if(!OSCTX.current.setFs) return; OSCTX.current.setFs(prev=>{ const n={...prev};
    let nm='new folder', i=2; const names=new Set((n[base]||[]).map(x=>x.name)); while(names.has(nm)) nm='new folder '+(i++);
    n[base]=[...(n[base]||[]),{ id:uid('f'), name:nm, kind:'folder' }]; n[edJoin(base,nm)]=[]; return n; }); };

  // ---- expose to the AI command bus ----
  const apiRef = React.useRef({});
  apiRef.current = { open, save, addToFs,
    read:(p)=> (active===p?buf[p]:undefined) ?? filesRef.current[p] ?? ED_SEED[p],
    write:(p,t)=>{ setFiles(f=>({...f,[p]:t})); setBuf(b=> (p in b)?{...b,[p]:t}:b); },
    setBufOpen:(p,t)=>{ setBuf(b=>({...b,[p]:t})); } };
  React.useEffect(()=>{ if(!window.OSBus) return; return OSBus.register('editor', {
    open:(p)=>{ apiRef.current.open(p); return 'Opened '+p; },
    read:(p)=>{ const v=apiRef.current.read(p); if(v==null) throw new Error('no such file: '+p); return v; },
    write:(p,t)=>{ apiRef.current.write(p, t==null?'':String(t)); return 'Wrote '+p; },
    create:(p,t)=>{ apiRef.current.addToFs(p); apiRef.current.write(p, t==null?'':String(t)); apiRef.current.open(p); return 'Created '+p; },
    save:(p)=>{ apiRef.current.save(p); return 'Saved '+p; },
  }); },[]);

  const lines = text.split('\n');

  return (
    <div className="app-host" style={{display:'flex',width:'100%',height:'100%',background:'#1e1e22',position:'relative'}}>
      {showExplorer && <div data-theme="dark" style={{width:212,flex:'0 0 auto',background:'#16161a',borderRight:'1px solid #2a2a30',display:'flex',flexDirection:'column',color:'#c7ccd4'}}>
        <div style={{display:'flex',alignItems:'center',gap:4,padding:'8px 6px 6px 10px'}}>
          <span style={{flex:1,minWidth:0,fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'#9aa0aa',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{explorerRoot==='/'?'Explorer':edBase(explorerRoot)}</span>
          <ExBtn title="New File" onClick={()=>setNewOpen(true)}><path d="M13 3H6v18h12V8z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M13 3v5h5M12 12v5M9.5 14.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></ExBtn>
          <ExBtn title="New Folder" onClick={()=>newFolderIn(explorerRoot)}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l1.6 1.7H19.5A1.5 1.5 0 0 1 21 8.2V17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 10.5v4M10 12.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></ExBtn>
          <ExBtn title="Open Folder" onClick={()=>setFolderPick(true)}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l1.6 1.7H19.5A1.5 1.5 0 0 1 21 8.2V17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></ExBtn>
          <ExBtn title="Collapse all" onClick={()=>setTreeNonce(n=>n+1)}><path d="M5 9l4-4 4 4M5 15l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></ExBtn>
        </div>
        {explorerRoot!=='/' && <div onClick={()=>setExplorerRoot('/')} className="ftrow" style={{height:22,paddingLeft:10,color:'#7d8590',fontSize:11}}>‹ os-rr (root)</div>}
        <div style={{flex:1,minHeight:0,overflow:'auto',padding:'2px 4px 8px'}}><FileTreeNav key={explorerRoot+':'+treeNonce} start={explorerRoot} selected={active} onOpenFile={(p)=>open(p)} compact/></div>
      </div>}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
      {/* tab strip */}
      <div style={{display:'flex',alignItems:'stretch',background:'#16161a',borderBottom:'1px solid #2a2a30',minHeight:36,overflowX:'auto'}}>
        {tabs.map(p=>{ const on=p===active; const d=buf[p]!==files[p];
          return <div key={p} onClick={()=>setActive(p)} title={p} style={{display:'flex',alignItems:'center',gap:8,padding:'0 10px 0 13px',cursor:'default',fontSize:12,maxWidth:200,flex:'0 0 auto',
            background:on?'#1e1e22':'transparent',color:on?'#e6e6e6':'#9aa0aa',borderRight:'1px solid #2a2a30',borderTop:on?'2px solid var(--accent)':'2px solid transparent'}}>
            <FileIcon file={{name:edBase(p),ext:edExt(p),kind:'file'}} sz={15}/>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{edBase(p)}</span>
            <button onClick={(e)=>close(p,e)} style={{border:'none',background:'transparent',color:'#9aa0aa',cursor:'default',width:16,height:16,borderRadius:4,padding:0,fontSize:13,lineHeight:1}}>{d?'●':'×'}</button>
          </div>; })}
        <button onClick={()=>setNewOpen(true)} title="New file" style={{flex:'0 0 auto',width:30,border:'none',background:'transparent',color:'#9aa0aa',cursor:'default',fontSize:16}}>＋</button>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,padding:'0 12px',flex:'0 0 auto'}}>
          {active && <span style={{fontSize:11,color:'#7d8590',fontFamily:'var(--font-mono)',textTransform:'uppercase'}}>{ext||'txt'}</span>}
          <button className="btn primary" disabled={!active||!dirty} onClick={()=>save()} style={{height:24}}>Save</button>
          <button title="Toggle Explorer" onClick={()=>setShowExplorer(v=>!v)} style={{height:24,width:26,border:'none',borderRadius:6,cursor:'default',background:showExplorer?'#2a2a30':'transparent',color:'#9aa0aa',display:'grid',placeItems:'center'}}>
            <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M4 5h6l2 2h8v12H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></button>
          <button title="Ask Alfa" onClick={()=>setShowAI(v=>!v)} style={{height:24,padding:'0 8px',border:'none',borderRadius:6,cursor:'default',background:showAI?'var(--accent)':'#2a2a30',color:showAI?'#fff':'#9aa0aa',display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600}}>
            <svg viewBox="0 0 24 24" style={{width:12,height:12}}><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" fill={showAI?'#fff':'var(--accent)'}/></svg>Alfa</button>
        </div>
      </div>

      {/* editor body */}
      {active!=null ? (
        <div className="ed-wrap">
          <div className="ed-gutter"><div ref={gutRef} className="ed-gutter-inner">
            {lines.map((_,i)=><div key={i} className={i+1===pos.ln?'cur':''}>{i+1}</div>)}
          </div></div>
          <div className="ed-code">
            <pre ref={preRef} className="ed-pre" dangerouslySetInnerHTML={{__html:html}}/>
            <textarea ref={taRef} className="ed-ta" spellCheck={false} value={text}
              onChange={e=>edit(e.target.value)} onScroll={onScroll} onKeyDown={onKey}
              onKeyUp={syncPos} onClick={syncPos} wrap="off"/>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:'grid',placeItems:'center',color:'#7d8590'}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:60,height:60,margin:'0 auto 14px'}}><div className="appicon" style={{width:60,height:60,background:'linear-gradient(160deg,#3aa0ff,#1f6dff)'}}><Glyph name="code"/></div></div>
            <div style={{fontSize:15,fontWeight:700,color:'#c7ccd4'}}>No file open</div>
            <div style={{fontSize:12.5,marginTop:6,lineHeight:1.5,maxWidth:320}}>Open a file from the Explorer, ask Alfa to write code, or start something new.</div>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14}}>
              <button className="btn primary" onClick={()=>setNewOpen(true)}>New file</button>
              <button className="btn" onClick={()=>setFolderPick(true)}>Open folder</button>
            </div>
          </div>
        </div>
      )}

      {/* status bar */}
      <div style={{height:24,flex:'0 0 auto',background:'#16161a',borderTop:'1px solid #2a2a30',display:'flex',alignItems:'center',gap:14,padding:'0 14px',fontSize:11,color:'#7d8590',fontFamily:'var(--font-mono)'}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active||'—'}</span>
        {active && <><span style={{marginLeft:'auto'}}>Ln {pos.ln}, Col {pos.col}</span><span>Spaces: 2</span><span>{dirty?'● Unsaved':'Saved'}</span></>}
      </div>
      </div>{/* /center column */}

      {showAI && <div style={{width:340,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--window-bg)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderBottom:'.5px solid var(--sep)',background:'var(--window-head)'}}>
          <AgentAvatar agent={aiStore.activeAgent} size={24}/><strong style={{fontSize:12.5,flex:1}}>{aiStore.activeAgent.name}</strong>
          <button className="btn icon" onClick={()=>setShowAI(false)} title="Close" style={{height:24,width:24}}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
        </div>
        <AIChat agent={aiStore.activeAgent} skills={aiStore.skills} scope="Code editor" compact
          storeKey="ai.appthreads" threadId="editor"
          starters={['Write a hello() function in the open file','Read the current file and add JSDoc comments','Create /Projects/utils.js with a debounce helper']}/>
      </div>}

      {newOpen && <NewFileModal defaultFolder={explorerRoot} onClose={()=>setNewOpen(false)} onCreate={createFile}/>}
      {folderPick && <OpenFolderModal current={explorerRoot} onClose={()=>setFolderPick(false)} onPick={(p)=>{ setExplorerRoot(p); setFolderPick(false); }}/>}
    </div>
  );
}

function ExBtn({ title, onClick, children }){ return <button title={title} onClick={onClick} style={{flex:'0 0 auto',width:24,height:24,border:'none',borderRadius:5,cursor:'default',background:'transparent',color:'#9aa0aa',display:'grid',placeItems:'center'}}
  onMouseEnter={e=>e.currentTarget.style.background='#2a2a30'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><svg viewBox="0 0 24 24" style={{width:15,height:15}}>{children}</svg></button>; }

function OpenFolderModal({ current, onClose, onPick }){
  const folders=React.useMemo(()=>{ const fs=(window.OSCTX&&OSCTX.current.getFs)?OSCTX.current.getFs():{}; return Object.keys(fs).filter(k=>Array.isArray(fs[k])).sort(); },[]);
  return <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center'}}>
    <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(420px,88%)',maxHeight:'72%',display:'flex',flexDirection:'column',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:14,boxShadow:'var(--shadow-pop)',overflow:'hidden'}}>
      <div style={{fontSize:14,fontWeight:700,padding:'14px 16px 10px'}}>Open folder</div>
      <div style={{flex:1,minHeight:0,overflow:'auto',padding:'0 8px 10px'}}>
        {folders.map(p=><div key={p} className="mi" style={{borderRadius:8,gap:9,fontFamily:'var(--font-mono)',fontSize:12,...(p===current?{background:'var(--accent)',color:'#fff'}:null)}} onClick={()=>onPick(p)}>
          <Glyph2 name="folder"/>{p}</div>)}
      </div>
    </div>
  </div>;
}

function NewFileModal({ onClose, onCreate, defaultFolder }){
  const [name,setName]=React.useState('untitled.js'); const [folder,setFolder]=React.useState(defaultFolder||'/');
  const folders=React.useMemo(()=>{ const fs=(window.OSCTX&&OSCTX.current.getFs)?OSCTX.current.getFs():{}; return Object.keys(fs).filter(k=>Array.isArray(fs[k])).sort(); },[]);
  return <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center'}}>
    <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(420px,88%)',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:14,boxShadow:'var(--shadow-pop)',padding:'18px 20px'}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>New file</div>
      <div style={{fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:6}}>Folder</div>
      <select className="field" style={{width:'100%',marginBottom:12}} value={folder} onChange={e=>setFolder(e.target.value)}>{folders.map(f=><option key={f} value={f}>{f}</option>)}</select>
      <div style={{fontSize:12,fontWeight:600,color:'var(--text-dim)',marginBottom:6}}>File name</div>
      <input autoFocus className="field" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{ e.stopPropagation(); if(e.key==='Enter') onCreate(name,folder); }}/>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={()=>onCreate(name,folder)}>Create</button>
      </div>
    </div>
  </div>;
}

Object.assign(window, { CodeEditor, highlight });
