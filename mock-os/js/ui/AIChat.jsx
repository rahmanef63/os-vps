/* ============================================================
   ui/AIChat.jsx — shared, embeddable Alfa chat ("AI tab")
   The single source of truth for the agent chat experience: composer
   (@ agents · / tools · 📎 attach), live task-plan, tool-call cards, and
   the agentic run loop. Used by the Alfa app AND embedded in other slices.

   <AIChat agent skills agents onSwitchAgent storeKey threadId scope compact
           starters controllerRef autoPrompt autoTs seed seedTs />
   Exposes (window): AIChat, AgentAvatar, ToolCard, PlanCard, GroupDot,
                     Glyph2, buildArgsFromText, AttachPicker
   ============================================================ */

function AgentAvatar({ agent, size=34 }){
  return <div className="appicon" style={{ background:agent.color, width:size, height:size }}><Glyph name={agent.glyph||'spark'}/></div>;
}
function GroupDot({ group }){ const g=GROUP_META[group]||{}; return <span style={{width:8,height:8,borderRadius:2,flex:'0 0 auto',background:g.color||'#888'}}/>; }
function Glyph2({ name }){ return <svg viewBox="0 0 24 24" style={{width:12,height:12,flex:'0 0 auto'}}><g style={{stroke:'currentColor',fill:'currentColor'}}><Glyph name={name}/></g></svg>; }

function buildArgsFromText(tool, text){ if(!text) return {};
  if(text.trim()[0]==='{'){ try{ return JSON.parse(text.trim()); }catch(e){} }
  const params=tool.params||{}; const keys=Object.keys(params);
  if(/[:=]/.test(text) && keys.length>1){ const args={}; text.split(/[,;]/).forEach(p=>{ const m=p.match(/^\s*([\w]+)\s*[:=]\s*(.+)$/); if(m&&params[m[1]]) args[m[1]]=m[2].trim(); }); if(Object.keys(args).length) return args; }
  const req=keys.find(k=>params[k].required)||keys[0]; const a={}; if(req) a[req]=text.trim(); return a;
}
function argSummary(args){ if(!args) return ''; return Object.entries(args).map(([k,v])=>`${k}: ${String(v).slice(0,40)}`).join(' · '); }

function ToolCard({ b }){
  const tool=toolById(b.tool); const g=GROUP_META[tool?tool.group:'']||{};
  const statusColor = b.status==='error'?'#ff5f57':b.status==='done'?'#1f9d57':'var(--text-faint)';
  return <div style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 11px',borderRadius:11,background:'var(--inset)',border:'.5px solid var(--sep)',maxWidth:'92%'}}>
    <div className="appicon" style={{width:26,height:26,flex:'0 0 auto',background:`linear-gradient(160deg,${g.color||'#888'},${g.color||'#666'})`}}><Glyph name={g.glyph||'grid'}/></div>
    <div style={{minWidth:0,flex:1}}>
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <span style={{fontSize:12.5,fontWeight:700}}>{tool?tool.name:b.tool}</span>
        <span style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-faint)'}}>{b.tool}</span>
        <span style={{marginLeft:'auto',display:'grid',placeItems:'center',width:16,height:16,color:statusColor}}>
          {b.status==='run' ? <svg viewBox="0 0 24 24" style={{width:14,height:14,animation:'brSpin .8s linear infinite'}}><circle cx="12" cy="12" r="9" fill="none" stroke="var(--sep-strong)" strokeWidth="2.6"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round"/></svg>
            : b.status==='error' ? <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>
            : <svg viewBox="0 0 24 24" style={{width:15,height:15}}><path d="M5 12l5 5L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
      </div>
      {argSummary(b.args) && <div style={{fontSize:11.5,color:'var(--text-dim)',marginTop:2,fontFamily:'var(--font-mono)',wordBreak:'break-word'}}>{argSummary(b.args)}</div>}
      {b.result && <div style={{fontSize:12,color:'var(--text)',marginTop:5}}>{b.result}</div>}
      {b.error && <div style={{fontSize:12,color:'#ff5f57',marginTop:5}}>{b.error}</div>}
      {b.data && <pre style={{margin:'6px 0 0',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-dim)',whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:120,overflow:'auto'}}>{typeof b.data==='string'?b.data:JSON.stringify(b.data,null,1).slice(0,500)}</pre>}
    </div>
  </div>;
}

function PlanCard({ steps }){
  const done=steps.filter(s=>s.status==='done').length;
  return <div style={{padding:'11px 13px',borderRadius:12,background:'var(--inset)',border:'.5px solid var(--sep)'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
      <svg viewBox="0 0 24 24" style={{width:15,height:15,color:'var(--accent)'}}><path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      <span style={{fontSize:12,fontWeight:700,letterSpacing:'.02em'}}>Task plan</span>
      <span style={{marginLeft:'auto',fontSize:10.5,color:'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{done}/{steps.length}</span>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      {steps.map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:9,fontSize:12.5,color:s.status==='pending'?'var(--text-faint)':'var(--text)'}}>
        <span style={{flex:'0 0 auto',width:16,height:16,display:'grid',placeItems:'center'}}>
          {s.status==='done' ? <svg viewBox="0 0 24 24" style={{width:16,height:16,color:'#1f9d57'}}><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".15"/><path d="M7.5 12l3 3 6-6" fill="none" stroke="#1f9d57" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : s.status==='active' ? <svg viewBox="0 0 24 24" style={{width:15,height:15,animation:'brSpin .8s linear infinite'}}><circle cx="12" cy="12" r="9" fill="none" stroke="var(--sep-strong)" strokeWidth="2.6"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round"/></svg>
            : <span style={{width:11,height:11,borderRadius:'50%',border:'1.6px solid var(--sep-strong)'}}/>}
        </span>
        <span style={{fontWeight:s.status==='active'?600:400}}>{s.text}</span>
      </div>))}
    </div>
  </div>;
}

function AttachPicker({ onClose, onPick }){
  return <div onClick={onClose} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,.4)',display:'grid',placeItems:'center'}}>
    <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(460px,88%)',height:'70%',display:'flex',flexDirection:'column',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:14,boxShadow:'var(--shadow-pop)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 14px',borderBottom:'.5px solid var(--sep)'}}>
        <strong style={{fontSize:13.5}}>Attach a file</strong>
        <button className="btn" style={{marginLeft:'auto'}} onClick={onClose}>Close</button>
      </div>
      <div style={{flex:1,minHeight:0,padding:'10px 12px'}}>
        <FileBrowser start="/" onOpenFile={(path,it)=>onPick({ name:it.name, path, kind:'fs' })}/>
      </div>
    </div>
  </div>;
}

function AIChat(props){
  const { agent, skills=[], agents=[], onSwitchAgent, scope, compact } = props;
  const storeKey = props.storeKey || 'ai.threads';
  const threadId = props.threadId || agent.id;
  const [threads,setThreads] = usePersistent(storeKey, {});
  const [input,setInput] = React.useState('');
  const [busy,setBusy] = React.useState(false);
  const [attachments,setAttachments] = React.useState([]);
  const [attachOpen,setAttachOpen] = React.useState(false);
  const [pending,setPending] = React.useState(null);
  const [mention,setMention] = React.useState(null);
  const scrollRef = React.useRef(null), taRef = React.useRef(null), planRef = React.useRef(null);

  const blocks = threads[threadId] || [];
  const setBlocks = (fn)=> setThreads(t=>{ const next=fn(t[threadId]||[]); return { ...t, [threadId]: next.length>200?next.slice(next.length-200):next }; });
  React.useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop=scrollRef.current.scrollHeight; },[blocks,busy]);

  const onEvent = React.useCallback((ev)=>{
    if(ev.type==='tool'){ setBlocks(b=> ev.status==='run'
      ? [...b,{ type:'tool', id:ev.id, tool:ev.tool, args:ev.args, status:'run' }]
      : b.map(x=>x.id===ev.id?{...x,status:ev.status,result:ev.result,error:ev.error,data:ev.data}:x)); }
    else if(ev.type==='plan'){ setBlocks(b=>{ if(planRef.current){ return b.map(x=> x.bid===planRef.current ? {...x, steps: ev.steps.map((t,i)=>({ text:t, status:(x.steps[i]&&x.steps[i].status)||(i===0?'active':'pending') }))} : x); }
        const bid=uid('pl'); planRef.current=bid; return [...b,{ type:'plan', bid, steps: ev.steps.map((t,i)=>({ text:t, status:i===0?'active':'pending' })) }]; }); }
    else if(ev.type==='step'){ const a=ev.active; setBlocks(b=> b.map(x=> x.bid===planRef.current ? {...x, steps:x.steps.map((s,i)=>({ ...s, status:i<a?'done':(i===a?'active':'pending') }))} : x)); }
    else if(ev.type==='final'){ planRef.current=null; setBlocks(b=>[...b,{ type:'assistant', text:ev.text, engine:ev.engine }]); }
  // eslint-disable-next-line
  },[threadId]);

  const send = async (text)=>{ text=(text||'').trim(); const atts=attachments;
    if((!text && !atts.length)||busy) return; setInput(''); setAttachments([]); resetTA(); planRef.current=null;
    const history = (threads[threadId]||[]).filter(b=>b.type==='user'||b.type==='assistant').map(b=>({role:b.type,text:b.text}));
    setBlocks(b=>[...b,{ type:'user', text:text||'(attachment)', atts }]); setBusy(true);
    const ctx = (scope?`Context: working inside the ${scope}. `:'');
    const userText = ctx + text + (atts.length?`\n\n[Attached files: ${atts.map(a=>a.path||a.name).join(', ')}]`:'');
    try{ await runAgent({ agent, skills, tools:toolsForAgent(agent,skills), history, userText, onEvent }); }
    catch(e){ setBlocks(b=>[...b,{ type:'assistant', text:'Sorry — '+((e&&e.message)||e) }]); }
    setBusy(false);
  };
  const runPending = async ()=>{ const t=toolById(pending); if(!t||busy) return; const argText=input.trim();
    const args=buildArgsFromText(t, argText); setPending(null); setInput(''); resetTA(); setBusy(true); planRef.current=null;
    setBlocks(b=>[...b,{ type:'user', text:'/'+t.id+(argText?(' '+argText):'') }]);
    try{ await window.execCall({ tool:t.id, args }, OS_TOOLS, onEvent); }
    catch(e){ setBlocks(b=>[...b,{ type:'assistant', text:'Error: '+((e&&e.message)||e) }]); }
    setBusy(false);
  };
  // imperative API for the host (e.g. run automation flows narrated here)
  React.useEffect(()=>{ if(!props.controllerRef) return; props.controllerRef.current = {
    runSteps: async (steps, flowAgent, label)=>{ if(busy) return; setBusy(true); planRef.current=null;
      setBlocks(b=>[...b,{ type:'auto', text:'Running automation “'+(label||'flow')+'”' }]);
      const ag=flowAgent||agent; const tools=toolsForAgent(ag,skills);
      for(const s of (steps||[])){ try{ await window.execCall({ tool:s.tool, args:s.args||{} }, OS_TOOLS, onEvent); }catch(e){} await aiSleep(160); }
      setBlocks(b=>[...b,{ type:'assistant', text:'Automation “'+(label||'flow')+'” finished.' }]); setBusy(false); },
    clear: ()=>setBlocks(()=>[]),
  }; });

  const resetTA = ()=>{ const ta=taRef.current; if(ta) ta.style.height='auto'; };
  const autoGrow = (ta)=>{ if(!ta) return; ta.style.height='auto'; ta.style.height=Math.min(150, ta.scrollHeight)+'px'; };
  const onInput = (e)=>{ const val=e.target.value; setInput(val); autoGrow(e.target);
    const m=val.slice(0,e.target.selectionStart).match(/(?:^|\s)([@/])([^\s@/]*)$/);
    setMention(m ? { kind:m[1]==='@'?'agent':'tool', query:m[2] } : null); };
  const replaceTrigger = (insert='')=>{ const ta=taRef.current; if(!ta) return; const caret=ta.selectionStart; const val=input;
    const m=val.slice(0,caret).match(/(?:^|\s)([@/])([^\s@/]*)$/); if(!m){ setMention(null); return; }
    const start=m.index + (m[0].length - (m[1].length+m[2].length));
    const next=val.slice(0,start)+insert+val.slice(caret); setInput(next); setMention(null);
    setTimeout(()=>{ ta.focus(); const p=start+insert.length; ta.setSelectionRange(p,p); autoGrow(ta); },0); };
  const pickAgent = (a)=>{ replaceTrigger(''); onSwitchAgent && onSwitchAgent(a.id); };
  const pickTool = (t)=>{ replaceTrigger(''); if(t.special){ t.run(); return; } setPending(t.id); setTimeout(()=>taRef.current&&taRef.current.focus(),0); };
  const SLASH_CMDS=[{ id:'cmd_new', name:'New chat', desc:'Clear this conversation', special:true, run:()=>setBlocks(()=>[]) }];
  const mentionItems = ()=>{ if(!mention) return []; const q=(mention.query||'').toLowerCase();
    if(mention.kind==='agent'){ if(!onSwitchAgent) return []; return agents.filter(a=>a.name.toLowerCase().includes(q)).slice(0,8); }
    const cmds=SLASH_CMDS.filter(c=>c.name.toLowerCase().includes(q));
    const tls=toolsForAgent(agent,skills).filter(t=>t.id.toLowerCase().includes(q)||t.name.toLowerCase().includes(q)||(GROUP_META[t.group]||{}).label.toLowerCase().includes(q)).slice(0,10);
    return [...cmds,...tls]; };
  const onKey = (e)=>{ e.stopPropagation();
    if(mention){ if(e.key==='Escape'){ setMention(null); e.preventDefault(); return; }
      if(e.key==='Enter'){ e.preventDefault(); const it=mentionItems()[0]; if(it){ mention.kind==='agent'?pickAgent(it):pickTool(it); } return; } }
    if(e.key==='Escape' && pending){ setPending(null); e.preventDefault(); return; }
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); pending?runPending():send(input); } };

  // auto prompt / seed (once per ts)
  React.useEffect(()=>{ const ts=props.autoTs; if(ts && props.autoPrompt && LS.get('ai.handledPrompt')!==ts){ LS.set('ai.handledPrompt',ts); send(props.autoPrompt); } },[props.autoTs]);
  React.useEffect(()=>{ const ts=props.seedTs; if(ts && props.seed && LS.get('ai.handledSeed')!==ts){ LS.set('ai.handledSeed',ts); setInput(props.seed); setTimeout(()=>{ const ta=taRef.current; if(ta){ ta.focus(); ta.setSelectionRange(props.seed.length,props.seed.length); autoGrow(ta); } },50); } },[props.seedTs]);

  const starters = props.starters || (agent.allTools
    ? ['Create a folder “Demo” in /Projects','Open the browser to wikipedia.org then verify it loads','Make a vertical reel titled Sale and render it','Write /Projects/app.js with a greet() function, then read it back to verify']
    : Array.from(new Set((agent.skills||[]).flatMap(id=>{ const s=skills.find(x=>x.id===id); return s?(s.starters||[]):[]; }))).slice(0,5));
  const toolCount = toolsForAgent(agent, skills).length;
  const padX = compact?12:16;

  return <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,position:'relative'}}>
    <div ref={scrollRef} style={{flex:1,minHeight:0,overflowY:'auto',padding:compact?'12px':'18px 16px',display:'flex',flexDirection:'column',gap:11}}>
      {blocks.length===0 && <div style={{margin:'auto',textAlign:'center',maxWidth:420,color:'var(--text-faint)'}}>
        <div style={{width:compact?44:60,height:compact?44:60,margin:'0 auto 12px'}}><AgentAvatar agent={agent} size={compact?44:60}/></div>
        <div style={{fontSize:compact?13.5:15,fontWeight:700,color:'var(--text)'}}>Ask {agent.name}{scope?(' · '+scope):''}</div>
        <div style={{fontSize:12.5,marginTop:6,lineHeight:1.5}}>{scope?`${agent.name} can act here and across os-rr — `:'Works across os-rr — '}{toolCount} tools, runs live, and iterates until done.</div>
      </div>}
      {blocks.map((b,i)=>{
        if(b.type==='user') return <div key={i} style={{alignSelf:'flex-end',maxWidth:'86%',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          {b.atts&&b.atts.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:5,justifyContent:'flex-end'}}>{b.atts.map((a,j)=><span key={j} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,padding:'3px 8px',borderRadius:8,background:'var(--inset)',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}><Glyph2 name="doc"/>{a.name}</span>)}</div>}
          <div style={{padding:'9px 13px',borderRadius:'14px 14px 4px 14px',background:'var(--accent)',color:'#fff',fontSize:13,lineHeight:1.45,whiteSpace:'pre-wrap'}}>{b.text}</div></div>;
        if(b.type==='tool') return <div key={i} style={{alignSelf:'flex-start'}}><ToolCard b={b}/></div>;
        if(b.type==='plan') return <div key={i} style={{alignSelf:'flex-start',width:'92%'}}><PlanCard steps={b.steps}/></div>;
        if(b.type==='auto') return <div key={i} style={{alignSelf:'center',display:'flex',alignItems:'center',gap:7,fontSize:11.5,fontWeight:600,color:'var(--text-faint)',padding:'4px 12px',borderRadius:20,background:'var(--inset)',border:'.5px solid var(--sep)'}}><svg viewBox="0 0 24 24" style={{width:13,height:13}}><path d="M5 4l14 8-14 8z" fill="currentColor"/></svg>{b.text}</div>;
        return <div key={i} style={{alignSelf:'flex-start',maxWidth:'88%',padding:'9px 13px',borderRadius:'14px 14px 14px 4px',background:'var(--inset)',color:'var(--text)',fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{b.text}{b.engine && <span style={{display:'block',fontSize:9.5,color:'var(--text-faint)',marginTop:4,textTransform:'uppercase',letterSpacing:'.04em'}}>{b.engine}</span>}</div>;
      })}
      {busy && <div style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:8,color:'var(--text-faint)',fontSize:12,padding:'2px 4px'}}>
        <svg viewBox="0 0 24 24" style={{width:15,height:15,animation:'brSpin .8s linear infinite'}}><circle cx="12" cy="12" r="9" fill="none" stroke="var(--sep-strong)" strokeWidth="2.6"/><path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round"/></svg>{agent.name} is working…</div>}
    </div>
    <div style={{flex:'0 0 auto',borderTop:'.5px solid var(--sep)',padding:'10px '+padX+'px',background:'var(--window-head)',position:'relative'}}>
      {blocks.length===0 && starters.length>0 && !pending && attachments.length===0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:9}}>
        {starters.map((s,i)=><button key={i} onClick={()=>send(s)} style={{fontSize:11,padding:'5px 10px',borderRadius:16,border:'.5px solid var(--sep)',background:'var(--field)',color:'var(--text-dim)',cursor:'default'}}>{s}</button>)}</div>}
      {mention && mentionItems().length>0 && <div className="ctx" style={{left:padX,right:padX,bottom:'100%',marginBottom:6,maxHeight:230,overflow:'auto',minWidth:0}} onMouseDown={e=>e.preventDefault()}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--text-faint)',padding:'4px 8px 6px'}}>{mention.kind==='agent'?'Agents — @':'Tools & commands — /'}</div>
        {mentionItems().map((it)=> mention.kind==='agent'
          ? <div key={it.id} className="mi" onClick={()=>pickAgent(it)} style={{gap:9}}><AgentAvatar agent={it} size={22}/><span style={{flex:1}}>{it.name}</span><span style={{fontSize:10,color:'var(--text-faint)'}}>{it.allTools?'all tools':(it.skills||[]).length+' skills'}</span></div>
          : <div key={it.id} className="mi" onClick={()=>pickTool(it)} style={{gap:9}}>{it.special?<span style={{width:18,display:'grid',placeItems:'center',color:'var(--text-faint)'}}>⌘</span>:<GroupDot group={it.group}/>}<span style={{flex:1}}>{it.name}</span><span style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-faint)'}}>{it.special?'command':it.id}</span></div>)}
      </div>}
      {(attachments.length>0 || pending) && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {pending && (()=>{ const t=toolById(pending); return <span style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,fontWeight:600,padding:'4px 9px',borderRadius:8,background:'var(--accent)',color:'#fff'}}>
          <svg viewBox="0 0 24 24" style={{width:12,height:12}}><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>{t.name}<span style={{opacity:.7,fontFamily:'var(--font-mono)',fontWeight:400}}>{t.id}</span>
          <button onClick={()=>setPending(null)} style={{border:'none',background:'transparent',color:'#fff',cursor:'default',padding:0,marginLeft:2,fontSize:13,lineHeight:1}}>×</button></span>; })()}
        {attachments.map((a,i)=><span key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,padding:'4px 9px',borderRadius:8,background:'var(--inset)',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}><Glyph2 name="doc"/>{a.name}<button onClick={()=>setAttachments(s=>s.filter((_,j)=>j!==i))} style={{border:'none',background:'transparent',color:'var(--text-faint)',cursor:'default',padding:0,fontSize:13,lineHeight:1}}>×</button></span>)}
      </div>}
      <div style={{display:'flex',gap:8,alignItems:'flex-end',background:'var(--field)',border:'.5px solid var(--sep-strong)',borderRadius:16,padding:6}}>
        <button className="btn icon" title="Attach a file" onClick={()=>setAttachOpen(true)} style={{flex:'0 0 auto',height:32,width:32,border:'none',background:'transparent',color:'var(--text-dim)'}}>
          <svg viewBox="0 0 24 24" style={{width:18,height:18}}><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L14 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <textarea ref={taRef} rows={1} value={input} placeholder={pending?`Arguments for ${toolById(pending).name}… (or just Run)`:`Message ${agent.name}…   @ agent · / tools`}
          onChange={onInput} onKeyDown={onKey} disabled={busy}
          style={{flex:1,minWidth:0,resize:'none',border:'none',outline:'none',background:'transparent',color:'var(--text)',font:'inherit',fontSize:13.5,lineHeight:1.45,padding:'6px 2px',maxHeight:150}}/>
        <button className="btn primary" style={{flex:'0 0 auto',height:32,width:42,borderRadius:11}} onClick={()=>pending?runPending():send(input)} disabled={busy||(!pending&&!input.trim()&&attachments.length===0)} title={pending?'Run tool':'Send'}>
          {pending ? <svg viewBox="0 0 24 24" style={{width:16,height:16}}><path d="M5 4l14 8-14 8z" fill="currentColor"/></svg> : <svg viewBox="0 0 24 24" style={{width:17,height:17}}><path d="M4 12l16-8-6 8 6 8z" fill="currentColor"/></svg>}</button>
      </div>
      {!compact && <div style={{fontSize:10,color:'var(--text-faint)',marginTop:6,display:'flex',gap:6,alignItems:'center'}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:hasClaude()?'#34c759':'var(--text-faint)'}}/>Engine: {hasClaude()?'Claude':'Local planner'} · <b style={{fontWeight:600}}>@</b> agent · <b style={{fontWeight:600}}>/</b> tools · 📎 attach · Shift+Enter = newline</div>}
    </div>
    {attachOpen && <AttachPicker onClose={()=>setAttachOpen(false)} onPick={(a)=>{ setAttachments(s=>[...s,a]); setAttachOpen(false); }}/>}
  </div>;
}

Object.assign(window, { AIChat, AgentAvatar, ToolCard, PlanCard, GroupDot, Glyph2, buildArgsFromText, AttachPicker, argSummary });
