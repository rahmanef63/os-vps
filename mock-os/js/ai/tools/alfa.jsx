/* ============================================================
   ai/tools/alfa.jsx — Alfa self-management → AI tools (vertical slice)
   Lets the agent CRUD agents, skills and automation flows. These run
   through the OSBus 'assistant' handlers registered by the Alfa app.
   ============================================================ */
(function(){
  const call = async (fn, args)=>{ const ok=await ensureApp('assistant', fn); if(!ok) throw new Error('Alfa app unavailable'); return await OSBus.call('assistant', fn, args||{}); };

  registerTools('alfa', [
    /* ---- skills ---- */
    { id:'alfa.list_skills', name:'List skills', desc:'List every skill (name, tools).', params:{},
      run:async()=>{ const d=await call('list_skills'); return { result:`${d.length} skills`, data:d }; } },
    { id:'alfa.create_skill', name:'Create skill', desc:'Create a new skill = instructions + a set of allowed tool ids + starter prompts.',
      params:{ name:{type:'string',desc:'Skill name',required:true}, instructions:{type:'string',desc:'How an agent should use it'},
        tools:{type:'array',desc:'Array of tool ids this skill grants, e.g. ["files.create_folder","files.move"]'}, starters:{type:'array',desc:'Optional starter prompts'} },
      run:async(a)=>({ result:await call('create_skill', a) }) },
    { id:'alfa.update_skill', name:'Update skill', desc:'Update a skill by name. Pass any of: instructions, tools, starters.',
      params:{ name:{type:'string',desc:'Existing skill name',required:true}, instructions:{type:'string'}, tools:{type:'array'}, starters:{type:'array'} },
      run:async(a)=>({ result:await call('update_skill', a) }) },
    { id:'alfa.delete_skill', name:'Delete skill', desc:'Delete a skill by name.',
      params:{ name:{type:'string',required:true} }, run:async(a)=>({ result:await call('delete_skill', a) }) },

    /* ---- agents ---- */
    { id:'alfa.list_agents', name:'List agents', desc:'List every agent.', params:{},
      run:async()=>{ const d=await call('list_agents'); return { result:`${d.length} agents`, data:d }; } },
    { id:'alfa.create_agent', name:'Create agent', desc:'Create an agent with a persona. Either generalist (allTools) or owning named skills.',
      params:{ name:{type:'string',required:true}, persona:{type:'string',desc:'Voice & behaviour'}, allTools:{type:'boolean',desc:'true = grant every tool'}, skills:{type:'array',desc:'Array of skill names the agent owns'} },
      run:async(a)=>({ result:await call('create_agent', a) }) },
    { id:'alfa.delete_agent', name:'Delete agent', desc:'Delete an agent by name.',
      params:{ name:{type:'string',required:true} }, run:async(a)=>({ result:await call('delete_agent', a) }) },

    /* ---- automations ---- */
    { id:'alfa.list_automations', name:'List automations', desc:'List saved automation flows.', params:{},
      run:async()=>{ const d=await call('list_automations'); return { result:`${d.length} automations`, data:d }; } },
    { id:'alfa.create_automation', name:'Create automation', desc:'Save an automation flow: an ordered list of steps, each {tool, args}.',
      params:{ name:{type:'string',required:true}, agent:{type:'string',desc:'Agent name to run it (optional)'},
        steps:{type:'array',desc:'Ordered steps: [{"tool":"files.create_folder","args":{"path":"/Projects","name":"X"}}]',required:true} },
      run:async(a)=>({ result:await call('create_automation', a) }) },
    { id:'alfa.run_automation', name:'Run automation', desc:'Run a saved automation flow by name.',
      params:{ name:{type:'string',required:true} }, run:async(a)=>({ result:await call('run_automation', a) }) },
    { id:'alfa.delete_automation', name:'Delete automation', desc:'Delete an automation by name.',
      params:{ name:{type:'string',required:true} }, run:async(a)=>({ result:await call('delete_automation', a) }) },
  ]);
})();
