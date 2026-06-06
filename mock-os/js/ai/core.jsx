/* ============================================================
   ai/core.jsx — AI layer foundation
   • OSCTX   — live handle to OS state/actions (set by app.jsx each render)
   • OSBus   — command bus: app windows register capabilities, tools call them
   • registry — vertical-slice tool manifests collect here

   Each feature contributes a manifest via registerTools(group, [tools]).
   A tool = { id, group, name, desc, params, run(args, ctx) }.
   ctx = { os: OSCTX.current, bus: OSBus, log(msg) }.
   Exposes (window): OSCTX, OSBus, registerTools, OS_TOOLS, toolById,
                     toolsForAgent, toolSpec, ensureApp, aiSleep
   ============================================================ */

/* live OS handle — app.jsx keeps .current fresh (fs, setFs, launch, notify, …) */
const OSCTX = { current: {} };

/* command bus — app instances register handlers while mounted */
const OSBus = {
  _h: {},
  register(app, handlers){ this._h[app] = { ...(this._h[app]||{}), ...handlers, _alive:true };
    return () => { if(this._h[app]) this._h[app]._alive = false; }; },
  has(app, fn){ const h=this._h[app]; return !!(h && h._alive && typeof h[fn]==='function'); },
  async call(app, fn, ...args){ const h=this._h[app];
    if(!(h && h._alive && h[fn])) throw new Error(`“${app}” is not ready to handle ${fn}`);
    return await h[fn](...args); },
};

const aiSleep = (ms)=> new Promise(r=>setTimeout(r, ms));

/* launch an app and wait until it has registered a bus handler */
async function ensureApp(id, fn){
  const os = OSCTX.current;
  if(!OSBus.has(id, fn)){ os.launch && os.launch(id); }
  for(let i=0; i<50 && !OSBus.has(id, fn); i++) await aiSleep(60);
  return OSBus.has(id, fn);
}

/* ---------------- registry ---------------- */
const OS_TOOLS = [];
const _TOOL_BY_ID = {};
function registerTools(group, tools){
  tools.forEach(t => { t.group = group;
    if(_TOOL_BY_ID[t.id]) return;            // idempotent across reloads
    OS_TOOLS.push(t); _TOOL_BY_ID[t.id] = t; });
}
const toolById = (id)=> _TOOL_BY_ID[id];

/* tools an agent may use — generalist (allTools) gets everything,
   otherwise the union of tools across its skills */
function toolsForAgent(agent, skills){
  if(!agent) return [];
  if(agent.allTools) return OS_TOOLS.slice();
  const ids = new Set();
  (agent.skills||[]).forEach(sid => { const s=(skills||[]).find(x=>x.id===sid);
    if(s) (s.tools||[]).forEach(tid => ids.add(tid)); });
  return OS_TOOLS.filter(t => ids.has(t.id));
}

/* compact spec for the model prompt */
function toolSpec(tools){
  return tools.map(t => ({ name:t.id, description:t.desc, params:t.params||{} }));
}

const GROUP_META = {
  files:    { label:'Files',         glyph:'folder',   color:'#2f8bf0' },
  apps:     { label:'Apps',          glyph:'grid',     color:'#5b6070' },
  browser:  { label:'Browser',       glyph:'globe',    color:'#2f6df0' },
  media:    { label:'Media Studio',  glyph:'image',    color:'#ff6a3d' },
  video:    { label:'Reel Editor',   glyph:'film',     color:'#c5318f' },
  system:   { label:'System',        glyph:'gauge',    color:'#0f9e6a' },
  settings: { label:'Settings',      glyph:'gear',     color:'#6b7180' },
  editor:   { label:'Code',          glyph:'code',     color:'#3a8ef0' },
  alfa:     { label:'Alfa',          glyph:'spark',    color:'#7a5cff' },
};

Object.assign(window, { OSCTX, OSBus, aiSleep, ensureApp, registerTools, OS_TOOLS, toolById, toolsForAgent, toolSpec, GROUP_META });
