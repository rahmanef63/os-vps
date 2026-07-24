/* ============================================================
   ai/engine.jsx — agent runtime
   runAgent() plans with real Claude (window.claude.complete) when available,
   otherwise a deterministic local planner. Either way it emits a stream of
   events the UI renders: tool runs, results, and a final reply.

   onEvent({ type:'tool', status:'run'|'done'|'error', id, tool, args, result, error })
   onEvent({ type:'final', text, engine })
   Exposes (window): runAgent, hasClaude
   ============================================================ */

const hasClaude = ()=> !!(window.claude && typeof window.claude.complete === 'function');

function buildSystemPrompt(agent, skills, tools){
  const skillText = (agent.allTools ? [] : (agent.skills||[]).map(id=>skills.find(s=>s.id===id)).filter(Boolean))
    .map(s=>`• ${s.name}: ${s.instructions||''}`).join('\n');
  return [
    `You are ${agent.name}, an AI agent living inside os-rr — a browser workspace that runs a user's VPS.`,
    agent.persona ? agent.persona : 'You are concise, friendly and action-oriented.',
    skillText ? `Your skills:\n${skillText}` : '',
    `You operate the OS ONLY by calling tools. You cannot do anything except via tools.`,
    `Available tools (JSON list of {name, description, params}):`,
    JSON.stringify(toolSpec(tools)),
    `Reply with ONE JSON object and nothing else:`,
    `{"calls":[{"tool":"<tool name>","args":{...}}],"reply":"<short message to the user>"}`,
    `Rules: use "calls" to take real actions; pass valid args; use [] when no tool is needed.`,
    `Keep "reply" to one or two sentences. Never invent tools outside the list.`,
  ].filter(Boolean).join('\n');
}

function extractJSON(text){
  if(!text) return null;
  const s=text.indexOf('{'); const e=text.lastIndexOf('}');
  if(s<0||e<0||e<s) return null;
  try{ return JSON.parse(text.slice(s,e+1)); }catch(_){ 
    try{ return JSON.parse(text.slice(s,e+1).replace(/,\s*}/g,'}').replace(/,\s*]/g,']')); }catch(__){ return null; } }
}

async function execCall(call, tools, onEvent){
  const tool = toolById(call.tool);
  const id = uid('call');
  if(!tool || !tools.some(t=>t.id===tool.id)){
    onEvent({ type:'tool', status:'error', id, tool:call.tool, args:call.args, error:'tool not available to this agent' });
    return { tool:call.tool, error:'not available' };
  }
  onEvent({ type:'tool', status:'run', id, tool:tool.id, args:call.args||{} });
  try{
    const ctx = { os:OSCTX.current, bus:OSBus, log:(m)=>onEvent({type:'log',text:m}) };
    const out = await tool.run(call.args||{}, ctx);
    onEvent({ type:'tool', status:'done', id, tool:tool.id, args:call.args||{}, result:out&&out.result, data:out&&out.data });
    return { tool:tool.id, result:out&&out.result, data:out&&out.data };
  }catch(e){
    onEvent({ type:'tool', status:'error', id, tool:tool.id, args:call.args||{}, error:(e&&e.message)||String(e) });
    return { tool:tool.id, error:(e&&e.message)||String(e) };
  }
}

async function runAgent({ agent, skills, tools, history, userText, onEvent }){
  tools = tools || toolsForAgent(agent, skills);
  if(hasClaude()){
    try{ return await runWithClaude({ agent, skills, tools, history, userText, onEvent }); }
    catch(e){ /* fall through to local */ }
  }
  return await runLocal({ agent, tools, userText, onEvent });
}

const MAX_TURNS = 14;

function buildLoopPrompt(agent, skills, tools){
  const base = buildSystemPrompt(agent, skills, tools);
  return base + '\n\n' + [
    'AGENT LOOP — you complete the user GOAL by working across os-rr apps, moving between them as needed,',
    'and you may ITERATE: take an action, observe the result, verify it (e.g. open the Browser to check a page,',
    're-read a file in the editor), then revise (edit the code/media/video, retry) until the goal is truly met.',
    'On every turn reply with ONE JSON object and nothing else:',
    '{"plan":["short step", ...], "active":<1-based index of the step you are on>, "calls":[{"tool":"id","args":{}}], "done":false, "reply":"one short sentence on what you are doing or the final summary"}',
    'Rules:',
    '- First turn: lay out a concise "plan" (2–6 steps). Keep it stable across turns; only revise if reality forces it.',
    '- Run 1–3 "calls" per turn, then you will be shown the results and can continue.',
    '- Move between apps freely (files, editor, browser, media, video, system, settings) — that is expected.',
    '- Verify before finishing when it makes sense; revise if a result is wrong.',
    '- Set "done":true ONLY when the whole goal is complete; put the wrap-up in "reply".',
  ].join('\n');
}

async function runWithClaude({ agent, skills, tools, history, userText, onEvent }){
  const sys = buildLoopPrompt(agent, skills, tools);
  const convo = (history||[]).filter(m=>m.role==='user'||m.role==='assistant')
    .slice(-6).map(m=>`${m.role==='user'?'User':agent.name}: ${m.text}`).join('\n');
  let note = '', lastReply = '', plan = [], idleTurns = 0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  for(let turn=0; turn<MAX_TURNS; turn++){
    const prompt = `${sys}\n\nConversation so far:\n${convo||'(new chat)'}\n\nGOAL: ${userText}\n${note}\nReturn the JSON object now.`;
    let raw; try{ raw = await window.claude.complete({ messages:[{ role:'user', content: prompt }] }); }
    catch(e){ onEvent({ type:'final', text: lastReply || 'I lost the connection mid-task.', engine:'claude' }); return; }
    const obj = extractJSON(raw) || { calls:[], reply:(raw||'').trim().slice(0,300), done:true };
    if(Array.isArray(obj.plan) && obj.plan.length){ plan = obj.plan.map(s=>String(s)); onEvent({ type:'plan', steps:plan }); }
    if(plan.length && typeof obj.active==='number'){ onEvent({ type:'step', active: clamp(obj.active-1, 0, plan.length-1) }); }
    if(obj.reply) lastReply = obj.reply;
    const calls = Array.isArray(obj.calls) ? obj.calls : [];
    const results = [];
    for(const c of calls){ results.push(await execCall(c, tools, onEvent)); await aiSleep(120); }
    if(obj.done){ if(plan.length) onEvent({ type:'step', active: plan.length }); onEvent({ type:'final', text: lastReply || summarize(results), engine:'claude' }); return; }
    if(!calls.length){ idleTurns++; if(idleTurns>=2){ if(plan.length) onEvent({ type:'step', active: plan.length }); onEvent({ type:'final', text: lastReply || 'Done.', engine:'claude' }); return; }
      note = 'You returned no calls and not done. If the goal is complete set "done":true; otherwise take the next action.'; continue; }
    idleTurns = 0;
    note = `Results of the last step: ${JSON.stringify(results).slice(0,800)}\nContinue the plan — verify or revise as needed, advance "active", or set "done":true when finished.`;
  }
  if(plan.length) onEvent({ type:'step', active: plan.length });
  onEvent({ type:'final', text: lastReply || 'I reached the step limit — tell me to keep going if needed.', engine:'claude' });
}

function summarize(results){
  const ok=results.filter(r=>r&&r.result&&!r.error).map(r=>r.result);
  const bad=results.filter(r=>r&&r.error);
  if(!ok.length && bad.length) return 'I hit an error: '+bad[0].error;
  return ok.length ? ok.join(' · ') : 'Done.';
}

/* ---------------- local fallback planner ---------------- */
function runLocal({ agent, tools, userText, onEvent }){
  return (async ()=>{
    const has=(id)=>tools.some(t=>t.id===id);
    const t=userText.trim(); const low=t.toLowerCase();
    const calls=[]; const m=(re)=>t.match(re);
    const add=(tool,args)=>{ if(has(tool)) calls.push({tool,args}); };

    let r;
    if((r=m(/(?:create|make|new|buat(?:kan)?)\s+(?:a\s+)?folder\s+(?:called\s+|named\s+)?["']?([\w .\-]+?)["']?(?:\s+(?:in|inside|di)\s+(\/[\w \/.\-]+))?$/i))){
      add('files.create_folder',{ name:r[1].trim(), path:(r[2]||'/').trim() });
    } else if((r=m(/(?:create|make|new|buat(?:kan)?)\s+(?:a\s+)?file\s+["']?([\w .\-]+?)["']?(?:\s+(?:in|inside|di)\s+(\/[\w \/.\-]+))?$/i))){
      add('files.create_file',{ name:r[1].trim(), path:(r[2]||'/').trim() });
    } else if((r=m(/(?:delete|remove|hapus|trash)\s+(\/[\w \/.\-]+)/i))){
      add('files.delete',{ path:r[1].trim() });
    } else if((r=m(/(?:list|show|isi|apa isi)\s+(?:files?\s+(?:in|of)\s+)?(\/[\w \/.\-]*)/i))){
      add('files.list',{ path:(r[1]||'/').trim() });
    } else if((r=m(/(?:search|find|cari)\s+(?:files?\s+)?(?:for\s+|named\s+)?["']?([\w .\-]+)["']?/i)) && /file|cari|search|find/.test(low)){
      add('files.search',{ query:r[1].trim() });
    }

    if((r=m(/(?:open|go to|browse|visit|navigate to|buka)\s+((?:https?:\/\/)?[\w.\-]+\.[a-z]{2,}[^\s]*)/i))){
      add('browser.open',{ query:r[1].trim() });
    } else if((r=m(/(?:search (?:the )?web|google|cari di web|web search)\s+(?:for\s+)?(.+)/i))){
      add('browser.open',{ query:r[1].trim() });
    }

    if(/dark mode|make it dark|tema gelap|mode gelap/.test(low)) add('settings.set_theme',{ theme:'dark' });
    else if(/light mode|make it light|tema terang|mode terang/.test(low)) add('settings.set_theme',{ theme:'light' });
    if((r=m(/(?:accent|warna aksen|aksen)\s+(?:color\s+)?(?:to\s+)?(blue|purple|pink|orange|teal|green|#?[0-9a-f]{6})/i))) add('settings.set_accent',{ color:r[1] });
    if((r=m(/wallpaper\s+(?:to\s+)?(aurora|dusk|mist|graphite|noir)/i))) add('settings.set_wallpaper',{ id:r[1] });

    if(/make it vertical|9:16|reel|tiktok|story/.test(low) && (has('video.set_ratio')||has('media.set_aspect'))){
      if(has('video.set_ratio')) add('video.set_ratio',{ ratio:'9:16' }); else add('media.set_aspect',{ ratio:'9:16' });
    }
    if(/\brender\b/.test(low)) add('video.render',{});
    if(/\bsplit\b/.test(low)) add('video.split',{});
    if(/fade in/.test(low)) add('video.effect',{ effect:'fade in' });
    else if(/punch in|zoom in|ken ?burns/.test(low)) add('video.effect',{ effect:'punch in' });
    if((r=m(/add (?:a )?title\s+(.+)/i))) add('video.add_title',{ text:r[1].trim() });

    if((r=m(/add (?:a )?text\s+(.+)/i)) && has('media.add_text')) add('media.add_text',{ text:r[1].trim() });
    if((r=m(/add (?:a )?sticker\s+(\S+)/i))) add('media.add_sticker',{ emoji:r[1] });

    if(/system stats|cpu|memory|how busy|usage|status/.test(low)) add('system.stats',{});
    if(/processes|what's running|whats running|proses/.test(low)) add('system.processes',{});
    if((r=m(/(?:run|exec|jalankan)\s+(?:command\s+)?["']?(.+?)["']?$/i)) && has('system.run_command') && !/folder|file/.test(low)) add('system.run_command',{ cmd:r[1].trim() });

    if((r=m(/(?:open|launch|buka)\s+(files|browser|terminal|reel editor|media studio|system monitor|settings|app store|monitor|video|media)/i)) && calls.length===0){
      add('apps.launch',{ app:r[1].trim() });
    }

    if(calls.length===0){
      onEvent({ type:'final', engine:'local', text:`I can act on the OS — try: “create folder Demo in /Projects”, “open browser to wikipedia.org”, “dark mode”, “accent purple”, “make it vertical then render”, or “system stats”.` });
      return;
    }
    const results=[];
    onEvent({ type:'plan', steps:['Carry out your request'] });
    onEvent({ type:'step', active:0 });
    for(const c of calls){ results.push(await execCall(c, tools, onEvent)); await aiSleep(160); }
    onEvent({ type:'step', active:1 });
    onEvent({ type:'final', engine:'local', text: summarize(results) });
  })();
}

Object.assign(window, { runAgent, hasClaude, execCall });
