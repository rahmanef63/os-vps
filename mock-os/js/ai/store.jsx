/* ============================================================
   ai/store.jsx — agents & skills (persisted, like Create App)
   • Skills  = name + icon + instructions + allowed tools + starter prompts
   • Agents  = persona + the skills they own (tools = union of skill tools)
   One generalist agent ships preset; users create the rest.
   Exposes (window): useAIStore, PRESET_SKILLS, PRESET_AGENTS, SKILL_ICONS
   ============================================================ */

const SKILL_ICONS = ['folder','globe','film','image','gauge','gear','code','cloud','music','grid','doc','spark'];
const AGENT_COLORS = [
  'linear-gradient(160deg,#7a5cff,#4f2fd6)','linear-gradient(160deg,#2f8bf0,#1f6dff)',
  'linear-gradient(160deg,#16c2c2,#0a8a8a)','linear-gradient(160deg,#ff6a9b,#c5318f)',
  'linear-gradient(160deg,#34d39a,#0f9e6a)','linear-gradient(160deg,#ffb13b,#ff6a3d)',
];

const PRESET_SKILLS = [
  { id:'sk_files', builtin:true, name:'File Ops', glyph:'folder', color:'#2f8bf0',
    instructions:'Organize the filesystem: create, rename, move, delete, search and open files and folders.',
    tools:['files.list','files.create_folder','files.create_file','files.rename','files.move','files.delete','files.open','files.search'],
    starters:['Create a folder “Renders” in /Media','List everything in /Projects','Find files named promo'] },
  { id:'sk_web', builtin:true, name:'Web Research', glyph:'globe', color:'#2f6df0',
    instructions:'Browse the web to look things up. Open URLs, run searches, and bookmark useful pages.',
    tools:['browser.open','browser.new_tab','browser.bookmark','files.create_file'],
    starters:['Open browser to wikipedia.org','Search the web for remotion templates','Bookmark this page'] },
  { id:'sk_reel', builtin:true, name:'Reel Maker', glyph:'film', color:'#c5318f',
    instructions:'Edit short-form video in the Reel Editor: set aspect ratio, add titles, split clips, add motion effects, and render.',
    tools:['video.open','video.set_ratio','video.add_title','video.split','video.effect','video.render'],
    starters:['Make it vertical and add title Sale','Add a punch in then render','Split at the playhead'] },
  { id:'sk_post', builtin:true, name:'Post Designer', glyph:'image', color:'#ff6a3d',
    instructions:'Design social images in Media Studio: set canvas size, add text/stickers/shapes, apply filters and export.',
    tools:['media.open','media.set_aspect','media.add_text','media.add_sticker','media.add_shape','media.apply_filter','media.export'],
    starters:['Make a 9:16 story with text “New Drop”','Apply the Vivid filter','Add a 🔥 sticker'] },
  { id:'sk_sys', builtin:true, name:'Sysadmin', glyph:'gauge', color:'#0f9e6a',
    instructions:'Operate the VPS: read system stats, list processes, run shell commands, and tune appearance/settings.',
    tools:['system.stats','system.processes','system.run_command','system.open_monitor','settings.set_theme','settings.set_accent','settings.set_wallpaper','settings.set_shell','settings.open','apps.launch','apps.close','apps.list'],
    starters:['Show system stats','Run df then ps','Switch to dark mode'] },
];

const PRESET_AGENTS = [
  { id:'ag_atlas', builtin:true, name:'Alfa', glyph:'spark', color:AGENT_COLORS[0],
    persona:'Alfa is the os-rr generalist — calm, precise, and proactive. It chains tools to finish multi-step tasks, manages its own agents/skills/automations, and narrates what it does.',
    model:'auto', allTools:true, skills:[] },
];

const PRESET_AUTOMATIONS = [
  { id:'au_setup', builtin:true, name:'Daily Setup', glyph:'gauge', color:'#0f9e6a', agentId:'ag_atlas', trigger:'manual', enabled:true,
    steps:[ { tool:'files.create_folder', args:{ path:'/Projects', name:'Today' } }, { tool:'apps.launch', args:{ app:'files' } }, { tool:'system.stats', args:{} } ] },
  { id:'au_vert', builtin:true, name:'Go Vertical Reel', glyph:'film', color:'#c5318f', agentId:'ag_atlas', trigger:'manual', enabled:true,
    steps:[ { tool:'video.set_ratio', args:{ ratio:'9:16' } }, { tool:'video.render', args:{} } ] },
];

function loadList(key, presets){
  const saved = LS.get(key, null);
  if(Array.isArray(saved) && saved.length) return saved;
  return presets.map(p=>({...p}));
}

function useAIStore(){
  const [skills,setSkills] = React.useState(()=>loadList('ai.skills', PRESET_SKILLS));
  const [agents,setAgents] = React.useState(()=>loadList('ai.agents', PRESET_AGENTS));
  const [automations,setAutomations] = React.useState(()=>loadList('ai.automations', PRESET_AUTOMATIONS));
  const [activeAgentId,setActiveAgentId] = React.useState(()=>LS.get('ai.activeAgent', PRESET_AGENTS[0].id));
  React.useEffect(()=>{ LS.set('ai.skills', skills); },[skills]);
  React.useEffect(()=>{ LS.set('ai.agents', agents); },[agents]);
  React.useEffect(()=>{ LS.set('ai.automations', automations); },[automations]);
  React.useEffect(()=>{ LS.set('ai.activeAgent', activeAgentId); },[activeAgentId]);

  const addSkill = (s)=>{ const sk={ id:'sk_'+uid(), builtin:false, glyph:'spark', color:'#7a5cff', tools:[], starters:[], ...s };
    setSkills(ls=>[...ls,sk]); return sk; };
  const updateSkill = (id,patch)=> setSkills(ls=>ls.map(s=>s.id===id?{...s,...patch}:s));
  const removeSkill = (id)=>{ setSkills(ls=>ls.filter(s=>s.id!==id)); setAgents(as=>as.map(a=>({...a,skills:(a.skills||[]).filter(x=>x!==id)}))); };

  const addAgent = (a)=>{ const ag={ id:'ag_'+uid(), builtin:false, glyph:'spark', color:AGENT_COLORS[Math.floor(Math.random()*AGENT_COLORS.length)], model:'auto', allTools:false, skills:[], persona:'', ...a };
    setAgents(as=>[...as,ag]); return ag; };
  const updateAgent = (id,patch)=> setAgents(as=>as.map(a=>a.id===id?{...a,...patch}:a));
  const removeAgent = (id)=> setAgents(as=>{ const next=as.filter(a=>a.id!==id); if(activeAgentId===id&&next[0]) setActiveAgentId(next[0].id); return next; });

  const resetAll = ()=>{ setSkills(PRESET_SKILLS.map(p=>({...p}))); setAgents(PRESET_AGENTS.map(p=>({...p}))); setAutomations(PRESET_AUTOMATIONS.map(p=>({...p}))); setActiveAgentId(PRESET_AGENTS[0].id); };

  const addAutomation = (a)=>{ const au={ id:'au_'+uid(), builtin:false, glyph:'spark', color:'#7a5cff', trigger:'manual', enabled:true, steps:[], agentId:activeAgentId, ...a };
    setAutomations(ls=>[...ls,au]); return au; };
  const updateAutomation = (id,patch)=> setAutomations(ls=>ls.map(a=>a.id===id?{...a,...patch}:a));
  const removeAutomation = (id)=> setAutomations(ls=>ls.filter(a=>a.id!==id));

  const activeAgent = agents.find(a=>a.id===activeAgentId) || agents[0];
  return { skills, agents, automations, activeAgent, activeAgentId, setActiveAgentId,
    addSkill, updateSkill, removeSkill, addAgent, updateAgent, removeAgent,
    addAutomation, updateAutomation, removeAutomation, resetAll };
}

Object.assign(window, { useAIStore, PRESET_SKILLS, PRESET_AGENTS, PRESET_AUTOMATIONS, SKILL_ICONS, AGENT_COLORS });
