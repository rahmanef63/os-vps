/* ============================================================
   apps/assistant.jsx — AI Mode
   Chat with an agent that calls OS tools (function calling), live narration,
   plus Skills library and Agents manager with Create flows.
   Exposes (window): Assistant
   ============================================================ */

/* grouped tool checklist */
function ToolPicker({ value, onChange }){
  const set=new Set(value||[]);
  const toggle=(id)=>{ const n=new Set(set); n.has(id)?n.delete(id):n.add(id); onChange([...n]); };
  return <div style={{display:'flex',flexDirection:'column',gap:10}}>
    {Object.keys(GROUP_META).map(g=>{ const tools=OS_TOOLS.filter(t=>t.group===g); if(!tools.length) return null; const meta=GROUP_META[g];
      const all=tools.every(t=>set.has(t.id));
      return <div key={g}>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
          <GroupDot group={g}/><span style={{fontSize:11.5,fontWeight:700}}>{meta.label}</span>
          <button className="btn" style={{marginLeft:'auto',height:20,padding:'0 7px',fontSize:10.5}} onClick={()=>{ const n=new Set(set); all?tools.forEach(t=>n.delete(t.id)):tools.forEach(t=>n.add(t.id)); onChange([...n]); }}>{all?'none':'all'}</button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
          {tools.map(t=>(<button key={t.id} onClick={()=>toggle(t.id)} title={t.desc}
            style={{fontSize:11,padding:'4px 9px',borderRadius:16,border:'.5px solid var(--sep)',cursor:'default',
              background:set.has(t.id)?'var(--accent)':'var(--field)',color:set.has(t.id)?'#fff':'var(--text-dim)'}}>{t.name}</button>))}
        </div>
      </div>; })}
  </div>;
}

function GlyphPick({ value, onChange, options }){
  return <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{options.map(g=>(
    <button key={g} onClick={()=>onChange(g)} style={{width:34,height:34,borderRadius:9,border:value===g?'2px solid var(--accent)':'.5px solid var(--sep)',background:'var(--field)',display:'grid',placeItems:'center',cursor:'default'}}>
      <svg viewBox="0 0 24 24" style={{width:17,height:17}}><g style={{stroke:'var(--text-dim)',fill:'var(--text-dim)'}}><Glyph name={g}/></g></svg></button>))}</div>;
}
function ColorPick({ value, onChange, options }){
  return <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{options.map(c=>(
    <button key={c} onClick={()=>onChange(c)} style={{width:30,height:30,borderRadius:8,background:c,border:'none',cursor:'default',boxShadow:value===c?'0 0 0 2px var(--window-bg),0 0 0 4px var(--accent)':'inset 0 0 0 .5px rgba(0,0,0,.2)'}}/>))}</div>;
}

/* ---------------- Skill editor ---------------- */
function SkillForm({ skill, store, onClose }){
  const editing=!!skill;
  const [name,setName]=React.useState(skill?skill.name:'New Skill');
  const [glyph,setGlyph]=React.useState(skill?skill.glyph:'spark');
  const [color,setColor]=React.useState(skill?skill.color:'#7a5cff');
  const [instr,setInstr]=React.useState(skill?skill.instructions:'');
  const [tools,setTools]=React.useState(skill?skill.tools||[]:[]);
  const [starters,setStarters]=React.useState(skill?(skill.starters||[]).join('\n'):'');
  const save=()=>{ const payload={ name, glyph, color, instructions:instr, tools, starters:starters.split('\n').map(s=>s.trim()).filter(Boolean) };
    if(editing) store.updateSkill(skill.id,payload); else store.addSkill(payload); onClose(); };
  return <FormShell title={editing?'Edit Skill':'Create Skill'} onClose={onClose} onSave={save} preview={
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <div className="appicon" style={{width:64,height:64,background:`linear-gradient(160deg,${color},${color})`}}><Glyph name={glyph}/></div>
        <span style={{fontWeight:700}}>{name}</span>
        <span style={{fontSize:11.5,color:'var(--text-faint)'}}>{tools.length} tools</span>
      </div>}>
    <Field2 label="Name"><input className="field" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.stopPropagation()}/></Field2>
    <Field2 label="Icon"><GlyphPick value={glyph} onChange={setGlyph} options={SKILL_ICONS}/></Field2>
    <Field2 label="Color"><ColorPick value={color} onChange={setColor} options={['#7a5cff','#2f8bf0','#16c2c2','#ff6a3d','#0f9e6a','#c5318f']}/></Field2>
    <Field2 label="Instructions" hint="How the agent should use this skill — added to its system prompt.">
      <textarea className="field" style={{width:'100%',height:64,padding:8,resize:'vertical'}} value={instr} onChange={e=>setInstr(e.target.value)} onKeyDown={e=>e.stopPropagation()} placeholder="e.g. Organize the filesystem; keep names tidy…"/></Field2>
    <Field2 label="Allowed tools" hint="The only tools this skill grants.">
      <ToolPicker value={tools} onChange={setTools}/></Field2>
    <Field2 label="Starter prompts" hint="One per line — shown as quick chips.">
      <textarea className="field" style={{width:'100%',height:56,padding:8,resize:'vertical',fontSize:12}} value={starters} onChange={e=>setStarters(e.target.value)} onKeyDown={e=>e.stopPropagation()}/></Field2>
  </FormShell>;
}

/* ---------------- Agent editor ---------------- */
function AgentForm({ agent, store, onClose }){
  const editing=!!agent;
  const [name,setName]=React.useState(agent?agent.name:'New Agent');
  const [glyph,setGlyph]=React.useState(agent?agent.glyph:'spark');
  const [color,setColor]=React.useState(agent?agent.color:AGENT_COLORS[0]);
  const [persona,setPersona]=React.useState(agent?agent.persona:'');
  const [allTools,setAllTools]=React.useState(agent?!!agent.allTools:false);
  const [skills,setSkills]=React.useState(agent?agent.skills||[]:[]);
  const toggleSkill=(id)=> setSkills(s=> s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const save=()=>{ const payload={ name, glyph, color, persona, allTools, skills };
    if(editing) store.updateAgent(agent.id,payload); else { const a=store.addAgent(payload); store.setActiveAgentId(a.id); } onClose(); };
  const toolCount = allTools ? OS_TOOLS.length : new Set(skills.flatMap(id=>{ const s=store.skills.find(x=>x.id===id); return s?s.tools:[]; })).size;
  return <FormShell title={editing?'Edit Agent':'Create Agent'} onClose={onClose} onSave={save} preview={
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <div className="appicon" style={{width:68,height:68,background:color}}><Glyph name={glyph}/></div>
        <span style={{fontWeight:700}}>{name}</span>
        <span style={{fontSize:11.5,color:'var(--text-faint)'}}>{allTools?'all tools':skills.length+' skills'} · {toolCount} tools</span>
      </div>}>
    <Field2 label="Name"><input className="field" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.stopPropagation()}/></Field2>
    <Field2 label="Icon"><GlyphPick value={glyph} onChange={setGlyph} options={SKILL_ICONS}/></Field2>
    <Field2 label="Color"><ColorPick value={color} onChange={setColor} options={AGENT_COLORS}/></Field2>
    <Field2 label="Persona" hint="Voice & behaviour — added to the system prompt.">
      <textarea className="field" style={{width:'100%',height:60,padding:8,resize:'vertical'}} value={persona} onChange={e=>setPersona(e.target.value)} onKeyDown={e=>e.stopPropagation()} placeholder="e.g. Friendly editor that prefers vertical video…"/></Field2>
    <Field2 label="Access" hint="Generalist agents can use every tool.">
      <label style={{display:'flex',alignItems:'center',gap:9,fontSize:12.5,fontWeight:600,color:'var(--text-dim)',cursor:'default'}}>
        <input type="checkbox" checked={allTools} onChange={e=>setAllTools(e.target.checked)}/> Generalist — grant all tools</label></Field2>
    {!allTools && <Field2 label="Skills" hint="The agent owns these skills; its tools are their union.">
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {store.skills.map(s=>(<button key={s.id} onClick={()=>toggleSkill(s.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:9,border:'.5px solid var(--sep)',cursor:'default',textAlign:'left',
          background:skills.includes(s.id)?'var(--accent)':'var(--field)',color:skills.includes(s.id)?'#fff':'var(--text)'}}>
          <div className="appicon" style={{width:26,height:26,flex:'0 0 auto',background:`linear-gradient(160deg,${s.color},${s.color})`}}><Glyph name={s.glyph}/></div>
          <div style={{minWidth:0,flex:1}}><div style={{fontSize:12.5,fontWeight:700}}>{s.name}</div><div style={{fontSize:11,opacity:.75,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(s.tools||[]).length} tools</div></div>
          <span style={{flex:'0 0 auto',opacity:skills.includes(s.id)?1:.3}}>✓</span>
        </button>))}
      </div></Field2>}
  </FormShell>;
}

function FormShell({ title, children, preview, onClose, onSave }){
  return <div style={{display:'flex',width:'100%',height:'100%',background:'var(--window-bg)'}}>
    <div style={{flex:1,minWidth:0,overflow:'auto',padding:'22px 26px'}}>
      <div style={{display:'flex',alignItems:'center',marginBottom:18}}><h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:'-.02em'}}>{title}</h2>
        <button className="btn" style={{marginLeft:'auto'}} onClick={onClose}>Cancel</button></div>
      {children}
    </div>
    <div style={{width:240,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--sidebar)',padding:'24px 20px',display:'flex',flexDirection:'column'}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:18}}>Preview</div>
      {preview}
      <button className="btn primary" style={{marginTop:'auto',height:34,justifyContent:'center'}} onClick={onSave}>{title.startsWith('Edit')?'Save changes':'Create'}</button>
    </div>
  </div>;
}
function Field2({ label, hint, children }){ return <div style={{marginBottom:16,maxWidth:520}}>
  <div style={{fontSize:12.5,fontWeight:600,marginBottom:hint?2:7}}>{label}</div>
  {hint && <div style={{fontSize:11,color:'var(--text-faint)',marginBottom:7}}>{hint}</div>}{children}</div>; }

/* ---------------- main app ---------------- */
function Assistant(props){
  const store = useAIStore();
  const { activeAgent, skills, agents, automations } = store;
  const [view,setView] = React.useState('chat');     // chat | automations | skills | agents
  const [form,setForm] = React.useState(null);        // {kind:'skill'|'agent'|'automation', item}
  const [agentMenu,setAgentMenu] = React.useState(false);
  const chatCtrl = React.useRef(null);                // imperative handle into <AIChat>

  // run a saved automation flow — narrated inside the shared chat
  const runAutomation = (auto)=>{ if(!auto) return; setView('chat');
    const agent=agents.find(a=>a.id===auto.agentId)||activeAgent;
    setTimeout(()=>chatCtrl.current && chatCtrl.current.runSteps(auto.steps, agent, auto.name), 30); };

  // expose self-management to the AI command bus (alfa.* tools call these)
  const busRef = React.useRef({});
  busRef.current = { store, agents, skills, automations, runAutomation };
  React.useEffect(()=>{ if(!window.OSBus) return; const R=()=>busRef.current; return OSBus.register('assistant', {
    list_skills:()=>R().store.skills.map(s=>({ id:s.id, name:s.name, tools:s.tools })),
    create_skill:(a)=>{ const s=R().store.addSkill({ name:a.name, instructions:a.instructions||'', tools:a.tools||[], starters:a.starters||[], glyph:a.glyph||'spark', color:a.color||'#7a5cff' }); return 'Created skill “'+s.name+'” ('+(s.tools||[]).length+' tools)'; },
    update_skill:(a)=>{ const s=R().store.skills.find(x=>x.name===a.name||x.id===a.id); if(!s) throw new Error('skill “'+a.name+'” not found'); const p={}; ['instructions','tools','starters','name'].forEach(k=>{ if(a[k]!=null)p[k]=a[k]; }); R().store.updateSkill(s.id,p); return 'Updated “'+s.name+'”'; },
    delete_skill:(a)=>{ const s=R().store.skills.find(x=>x.name===a.name||x.id===a.id); if(!s) throw new Error('not found'); R().store.removeSkill(s.id); return 'Deleted skill “'+s.name+'”'; },
    list_agents:()=>R().store.agents.map(a=>({ id:a.id, name:a.name, allTools:!!a.allTools, skills:a.skills })),
    create_agent:(a)=>{ const ids=(a.skills||[]).map(n=>{ const s=R().store.skills.find(x=>x.name===n||x.id===n); return s&&s.id; }).filter(Boolean);
      const ag=R().store.addAgent({ name:a.name, persona:a.persona||'', allTools:!!a.allTools, skills:ids }); return 'Created agent “'+ag.name+'”'; },
    delete_agent:(a)=>{ const ag=R().store.agents.find(x=>x.name===a.name||x.id===a.id); if(!ag) throw new Error('not found'); if(ag.builtin) throw new Error('cannot delete a preset agent'); R().store.removeAgent(ag.id); return 'Deleted agent “'+ag.name+'”'; },
    list_automations:()=>R().store.automations.map(a=>({ id:a.id, name:a.name, steps:(a.steps||[]).length })),
    create_automation:(a)=>{ const steps=(a.steps||[]).filter(s=>s&&s.tool); const ag=R().store.agents.find(x=>x.name===a.agent||x.id===a.agent);
      const au=R().store.addAutomation({ name:a.name, steps, agentId:ag?ag.id:R().store.activeAgentId }); return 'Created automation “'+au.name+'” ('+steps.length+' steps)'; },
    delete_automation:(a)=>{ const au=R().store.automations.find(x=>x.name===a.name||x.id===a.id); if(!au) throw new Error('not found'); R().store.removeAutomation(au.id); return 'Deleted automation “'+au.name+'”'; },
    run_automation:(a)=>{ const au=R().store.automations.find(x=>x.name===a.name||x.id===a.id); if(!au) throw new Error('automation “'+a.name+'” not found'); R().runAutomation(au); return 'Running “'+au.name+'”'; },
  }); },[]);



  React.useEffect(()=>{ if(props._ts && props.prompt){ setView('chat'); } },[props._ts]);

  const toolCount = toolsForAgent(activeAgent, skills).length;

  if(form){ return form.kind==='skill'
    ? <SkillForm skill={form.item} store={store} onClose={()=>setForm(null)}/>
    : form.kind==='automation'
    ? <AutomationForm auto={form.item} store={store} onClose={()=>setForm(null)}/>
    : <AgentForm agent={form.item} store={store} onClose={()=>setForm(null)}/>; }

  return (
    <div className="app-host" style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'var(--window-bg)'}}>
      {/* header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'.5px solid var(--sep)',background:'var(--window-head)',position:'relative'}}>
        <div onClick={()=>setAgentMenu(m=>!m)} style={{display:'flex',alignItems:'center',gap:9,cursor:'default',padding:'3px 8px 3px 3px',borderRadius:9,background:agentMenu?'var(--inset)':'transparent'}}>
          <AgentAvatar agent={activeAgent} size={30}/>
          <div style={{lineHeight:1.15}}><div style={{fontSize:13,fontWeight:700}}>{activeAgent.name}</div>
            <div style={{fontSize:10.5,color:'var(--text-faint)'}}>{activeAgent.allTools?'Generalist':(activeAgent.skills||[]).length+' skills'} · {toolCount} tools</div></div>
          <svg viewBox="0 0 24 24" style={{width:14,height:14,color:'var(--text-faint)'}}><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {agentMenu && <div className="ctx" style={{left:10,top:50,minWidth:230}} onClick={e=>e.stopPropagation()}>
          {agents.map(a=>(<div key={a.id} className="mi" onClick={()=>{ store.setActiveAgentId(a.id); setAgentMenu(false); setView('chat'); }} style={{gap:9}}>
            <AgentAvatar agent={a} size={24}/><span style={{flex:1}}>{a.name}</span>{a.id===activeAgent.id&&<span style={{opacity:.5}}>✓</span>}</div>))}
          <div className="sep"/>
          <div className="mi" onClick={()=>{ setForm({kind:'agent'}); setAgentMenu(false); }}>＋ New agent…</div>
        </div>}
        <div style={{marginLeft:'auto',display:'flex',background:'var(--inset)',borderRadius:7,padding:2}}>
          {[['chat','Chat'],['automations','Automations'],['skills','Skills'],['agents','Agents']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{height:24,padding:'0 10px',border:'none',borderRadius:5,fontSize:11.5,fontWeight:600,cursor:'default',
              background:view===v?'var(--window-bg)':'transparent',boxShadow:view===v?'0 1px 2px rgba(0,0,0,.12)':'none',color:'var(--text)'}}>{l}</button>))}
        </div>
      </div>

      {view==='chat' && <AIChat agent={activeAgent} skills={skills} agents={agents} onSwitchAgent={store.setActiveAgentId}
        storeKey="ai.threads" threadId={activeAgent.id} controllerRef={chatCtrl}
        autoPrompt={props.prompt} autoTs={props._ts} seed={props.seed} seedTs={props.seed?props._ts:undefined} />}

      {view==='automations' && <AutomationView store={store} onRun={runAutomation} onNew={()=>setForm({kind:'automation'})} onEdit={(it)=>setForm({kind:'automation',item:it})}/>}
      {view==='skills' && <Library kind="skill" items={skills} store={store} onNew={()=>setForm({kind:'skill'})} onEdit={(it)=>setForm({kind:'skill',item:it})}/>}
      {view==='agents' && <Library kind="agent" items={agents} store={store} onNew={()=>setForm({kind:'agent'})} onEdit={(it)=>setForm({kind:'agent',item:it})}/>}
    </div>
  );
}

/* skills / agents grid */
function Library({ kind, items, store, onNew, onEdit }){
  const isAgent=kind==='agent';
  return <div style={{flex:1,minHeight:0,overflow:'auto',padding:'18px 20px'}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
      <div><div style={{fontSize:16,fontWeight:800,letterSpacing:'-.02em'}}>{isAgent?'Agents':'Skills'}</div>
        <div style={{fontSize:12,color:'var(--text-faint)'}}>{isAgent?'Personas that own skills and run tools.':'Bundles of tools + instructions you give to agents.'}</div></div>
      <button className="btn primary" style={{marginLeft:'auto'}} onClick={onNew}>＋ New {isAgent?'agent':'skill'}</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
      {items.map(it=>{ const tcount = isAgent ? (it.allTools?OS_TOOLS.length:new Set((it.skills||[]).flatMap(id=>{const s=store.skills.find(x=>x.id===id);return s?s.tools:[];})).size) : (it.tools||[]).length;
        return <div key={it.id} style={{display:'flex',flexDirection:'column',gap:10,padding:14,borderRadius:12,background:'var(--glass-panel)',border:'.5px solid var(--sep)'}}>
          <div style={{display:'flex',gap:11,alignItems:'center'}}>
            <div className="appicon" style={{width:42,height:42,flex:'0 0 auto',background:isAgent?it.color:`linear-gradient(160deg,${it.color},${it.color})`}}><Glyph name={it.glyph}/></div>
            <div style={{minWidth:0,flex:1}}><div style={{fontWeight:700,display:'flex',alignItems:'center',gap:6}}>{it.name}{it.builtin&&<span style={{fontSize:9.5,fontWeight:700,padding:'1px 6px',borderRadius:10,background:'var(--inset)',color:'var(--text-faint)',textTransform:'uppercase',letterSpacing:'.04em'}}>preset</span>}</div>
              <div style={{fontSize:11.5,color:'var(--text-faint)'}}>{isAgent?(it.allTools?'Generalist':(it.skills||[]).length+' skills'):''} {isAgent?'· ':''}{tcount} tools</div></div>
          </div>
          <div style={{fontSize:12,color:'var(--text-dim)',lineHeight:1.45,minHeight:34}}>{(isAgent?it.persona:it.instructions)||<span style={{color:'var(--text-faint)'}}>No description.</span>}</div>
          <div style={{display:'flex',gap:7,marginTop:'auto'}}>
            {isAgent && <button className="btn" onClick={()=>{ store.setActiveAgentId(it.id); }} style={it.id===store.activeAgentId?{background:'var(--accent)',color:'#fff',borderColor:'transparent'}:null}>{it.id===store.activeAgentId?'Active':'Use'}</button>}
            <button className="btn" onClick={()=>onEdit(it)}>Edit</button>
            {!it.builtin && <button className="btn" style={{color:'#ff5f57'}} onClick={()=>isAgent?store.removeAgent(it.id):store.removeSkill(it.id)}>Delete</button>}
          </div>
        </div>; })}
    </div>
  </div>;
}

/* (Glyph2, buildArgsFromText, AttachPicker now live in ui/AIChat.jsx — shared) */

/* ---------------- Automations ---------------- */
function AutomationView({ store, onRun, busy, onNew, onEdit }){
  const items=store.automations;
  return <div style={{flex:1,minHeight:0,overflow:'auto',padding:'18px 20px'}}>
    <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
      <div><div style={{fontSize:16,fontWeight:800,letterSpacing:'-.02em'}}>Automations</div>
        <div style={{fontSize:12,color:'var(--text-faint)'}}>Saved flows — an ordered list of tool steps you can run in one click.</div></div>
      <button className="btn primary" style={{marginLeft:'auto'}} onClick={onNew}>＋ New automation</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
      {items.map(au=>{ const agent=store.agents.find(a=>a.id===au.agentId);
        return <div key={au.id} style={{display:'flex',flexDirection:'column',gap:10,padding:14,borderRadius:12,background:'var(--glass-panel)',border:'.5px solid var(--sep)'}}>
          <div style={{display:'flex',gap:11,alignItems:'center'}}>
            <div className="appicon" style={{width:42,height:42,flex:'0 0 auto',background:`linear-gradient(160deg,${au.color},${au.color})`}}><Glyph name={au.glyph}/></div>
            <div style={{minWidth:0,flex:1}}><div style={{fontWeight:700,display:'flex',alignItems:'center',gap:6}}>{au.name}{au.builtin&&<span style={{fontSize:9.5,fontWeight:700,padding:'1px 6px',borderRadius:10,background:'var(--inset)',color:'var(--text-faint)',textTransform:'uppercase',letterSpacing:'.04em'}}>preset</span>}</div>
              <div style={{fontSize:11.5,color:'var(--text-faint)'}}>{(au.steps||[]).length} steps · {agent?agent.name:'—'}</div></div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {(au.steps||[]).slice(0,4).map((s,i)=>{ const t=toolById(s.tool); const g=GROUP_META[t?t.group:'']||{};
              return <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:11.5,color:'var(--text-dim)'}}>
                <span style={{width:15,textAlign:'right',color:'var(--text-faint)',fontVariantNumeric:'tabular-nums'}}>{i+1}</span><GroupDot group={t?t.group:''}/>
                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t?t.name:s.tool}</span></div>; })}
            {(au.steps||[]).length>4 && <div style={{fontSize:11,color:'var(--text-faint)',paddingLeft:22}}>+{au.steps.length-4} more</div>}
          </div>
          <div style={{display:'flex',gap:7,marginTop:'auto'}}>
            <button className="btn primary" disabled={busy} onClick={()=>onRun(au)}><svg viewBox="0 0 24 24" style={{width:13,height:13}}><path d="M5 4l14 8-14 8z" fill="currentColor"/></svg>Run</button>
            <button className="btn" onClick={()=>onEdit(au)}>Edit</button>
            {!au.builtin && <button className="btn" style={{color:'#ff5f57'}} onClick={()=>store.removeAutomation(au.id)}>Delete</button>}
          </div>
        </div>; })}
    </div>
  </div>;
}

function AutomationForm({ auto, store, onClose }){
  const editing=!!auto;
  const [name,setName]=React.useState(auto?auto.name:'New Automation');
  const [glyph,setGlyph]=React.useState(auto?auto.glyph:'spark');
  const [color,setColor]=React.useState(auto?auto.color:'#7a5cff');
  const [agentId,setAgentId]=React.useState(auto?auto.agentId:store.activeAgentId);
  const [steps,setSteps]=React.useState(auto?(auto.steps||[]).map(s=>({ tool:s.tool, argText: s.args&&Object.keys(s.args).length?JSON.stringify(s.args):'' })):[]);
  const [picking,setPicking]=React.useState(false);
  const addStep=(tid)=>{ setSteps(s=>[...s,{ tool:tid, argText:'' }]); setPicking(false); };
  const setArg=(i,v)=>setSteps(s=>s.map((x,j)=>j===i?{...x,argText:v}:x));
  const move=(i,d)=>setSteps(s=>{ const j=i+d; if(j<0||j>=s.length)return s; const a=[...s]; [a[i],a[j]]=[a[j],a[i]]; return a; });
  const del=(i)=>setSteps(s=>s.filter((_,j)=>j!==i));
  const save=()=>{ const built=steps.map(s=>({ tool:s.tool, args:buildArgsFromText(toolById(s.tool)||{params:{}}, s.argText) }));
    const payload={ name, glyph, color, agentId, steps:built };
    if(editing) store.updateAutomation(auto.id,payload); else store.addAutomation(payload); onClose(); };
  const agent=store.agents.find(a=>a.id===agentId);
  return <div style={{display:'flex',width:'100%',height:'100%',background:'var(--window-bg)',position:'relative'}}>
    <div style={{flex:1,minWidth:0,overflow:'auto',padding:'22px 26px'}}>
      <div style={{display:'flex',alignItems:'center',marginBottom:18}}><h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:'-.02em'}}>{editing?'Edit Automation':'Create Automation'}</h2>
        <button className="btn" style={{marginLeft:'auto'}} onClick={onClose}>Cancel</button></div>
      <Field2 label="Name"><input className="field" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.stopPropagation()}/></Field2>
      <Field2 label="Icon"><GlyphPick value={glyph} onChange={setGlyph} options={SKILL_ICONS}/></Field2>
      <Field2 label="Color"><ColorPick value={color} onChange={setColor} options={['#7a5cff','#2f8bf0','#16c2c2','#ff6a3d','#0f9e6a','#c5318f']}/></Field2>
      <Field2 label="Run as agent" hint="Steps run with this agent's tools.">
        <select className="field" style={{width:'100%'}} value={agentId} onChange={e=>setAgentId(e.target.value)}>{store.agents.map(a=>(<option key={a.id} value={a.id}>{a.name}</option>))}</select></Field2>
      <Field2 label="Steps" hint="Each step runs a tool in order. Args: plain text → first parameter, or JSON for full control.">
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {steps.length===0 && <div style={{fontSize:12,color:'var(--text-faint)',padding:'6px 2px'}}>No steps yet — add one below.</div>}
          {steps.map((s,i)=>{ const t=toolById(s.tool); const g=GROUP_META[t?t.group:'']||{};
            return <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start',padding:'10px 11px',borderRadius:10,background:'var(--inset)',border:'.5px solid var(--sep)'}}>
              <div className="appicon" style={{width:24,height:24,flex:'0 0 auto',marginTop:1,background:`linear-gradient(160deg,${g.color||'#888'},${g.color||'#666'})`}}><Glyph name={g.glyph||'grid'}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:12.5,fontWeight:700}}>{t?t.name:s.tool}</span><span style={{fontSize:10,fontFamily:'var(--font-mono)',color:'var(--text-faint)'}}>{s.tool}</span></div>
                <input className="field" style={{width:'100%',height:26,marginTop:6,fontFamily:'var(--font-mono)',fontSize:11.5}} placeholder={t&&Object.keys(t.params||{}).length?('e.g. '+Object.keys(t.params)[0]+' value'):'no arguments'} value={s.argText} onChange={e=>setArg(i,e.target.value)} onKeyDown={e=>e.stopPropagation()}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:2,flex:'0 0 auto'}}>
                <button className="btn icon" style={{height:20,width:20}} disabled={i===0} onClick={()=>move(i,-1)}>↑</button>
                <button className="btn icon" style={{height:20,width:20}} disabled={i===steps.length-1} onClick={()=>move(i,1)}>↓</button>
                <button className="btn icon" style={{height:20,width:20,color:'#ff5f57'}} onClick={()=>del(i)}>×</button>
              </div>
            </div>; })}
          <button className="btn" style={{alignSelf:'flex-start'}} onClick={()=>setPicking(true)}>＋ Add step</button>
        </div></Field2>
    </div>
    <div style={{width:240,flex:'0 0 auto',borderLeft:'.5px solid var(--sep)',background:'var(--sidebar)',padding:'24px 20px',display:'flex',flexDirection:'column'}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--text-faint)',marginBottom:18}}>Preview</div>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <div className="appicon" style={{width:64,height:64,background:`linear-gradient(160deg,${color},${color})`}}><Glyph name={glyph}/></div>
        <span style={{fontWeight:700}}>{name}</span>
        <span style={{fontSize:11.5,color:'var(--text-faint)'}}>{steps.length} steps · {agent?agent.name:'—'}</span>
      </div>
      <button className="btn primary" style={{marginTop:'auto',height:34,justifyContent:'center'}} onClick={save}>{editing?'Save changes':'Create'}</button>
    </div>
    {picking && <div onClick={()=>setPicking(false)} style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,.4)',display:'grid',placeItems:'center'}}>
      <div onClick={e=>e.stopPropagation()} className="glass" style={{width:'min(440px,88%)',maxHeight:'78%',overflow:'auto',background:'var(--glass-menu)',border:'.5px solid var(--sep-strong)',borderRadius:14,boxShadow:'var(--shadow-pop)',padding:'12px 12px'}}>
        <div style={{fontSize:13.5,fontWeight:700,padding:'2px 4px 10px'}}>Add a step</div>
        {Object.keys(GROUP_META).map(grp=>{ const tools=OS_TOOLS.filter(t=>t.group===grp); if(!tools.length) return null; const meta=GROUP_META[grp];
          return <div key={grp} style={{marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:7,margin:'4px 4px 5px'}}><GroupDot group={grp}/><span style={{fontSize:11,fontWeight:700,color:'var(--text-dim)'}}>{meta.label}</span></div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{tools.map(t=>(<button key={t.id} className="btn" style={{height:24,fontSize:11}} title={t.desc} onClick={()=>addStep(t.id)}>{t.name}</button>))}</div>
          </div>; })}
      </div>
    </div>}
  </div>;
}

Object.assign(window, { Assistant, AgentAvatar });
