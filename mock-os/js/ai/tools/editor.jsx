/* ============================================================
   ai/tools/editor.jsx — Code editor → AI tools (vertical slice)
   Lets Alfa open, read, write and edit code files through OSBus 'editor'.
   ============================================================ */
(function(){
  const need = async (fn)=>{ const ok=await ensureApp('editor', fn); if(!ok) throw new Error('Code editor unavailable'); };

  registerTools('editor', [
    { id:'editor.open', name:'Open in editor', desc:'Open a file in the code editor (creates a tab).',
      params:{ path:{ type:'string', desc:'Full file path, e.g. /apps/scraper.py', required:true } },
      run:async(a)=>{ await need('open'); return { result:await OSBus.call('editor','open', a.path) }; } },

    { id:'editor.read', name:'Read file', desc:'Return the current text content of a file.',
      params:{ path:{ type:'string', desc:'Full file path', required:true } },
      run:async(a)=>{ await need('read'); const t=await OSBus.call('editor','read', a.path); return { result:`Read ${a.path} (${t.length} chars)`, data:t.length>1200?t.slice(0,1200)+'\n…':t }; } },

    { id:'editor.write', name:'Write file', desc:'Replace a file’s entire contents (the file must exist; opens it).',
      params:{ path:{ type:'string', required:true }, content:{ type:'string', desc:'Full new file contents', required:true } },
      run:async(a)=>{ await need('write'); await OSBus.call('editor','open', a.path); await OSBus.call('editor','write', a.path, a.content); await OSBus.call('editor','save', a.path); return { result:`Wrote ${a.path}` }; } },

    { id:'editor.create', name:'Create file', desc:'Create a new file with contents and open it (also appears in Files).',
      params:{ path:{ type:'string', desc:'Full path incl. name, e.g. /Projects/app.js', required:true }, content:{ type:'string', desc:'Initial contents' } },
      run:async(a)=>{ await need('create'); await OSBus.call('editor','create', a.path, a.content||''); await OSBus.call('editor','save', a.path); return { result:`Created ${a.path}` }; } },

    { id:'editor.append', name:'Append to file', desc:'Append text to the end of a file.',
      params:{ path:{ type:'string', required:true }, text:{ type:'string', desc:'Text to append', required:true } },
      run:async(a)=>{ await need('read'); const cur=await OSBus.call('editor','read', a.path); const next=cur+(cur.endsWith('\n')||!cur?'':'\n')+a.text;
        await OSBus.call('editor','open', a.path); await OSBus.call('editor','write', a.path, next); await OSBus.call('editor','save', a.path); return { result:`Appended to ${a.path}` }; } },

    { id:'editor.replace', name:'Find & replace', desc:'Replace every occurrence of a string in a file.',
      params:{ path:{ type:'string', required:true }, find:{ type:'string', required:true }, replace:{ type:'string', desc:'Replacement (default empty)' } },
      run:async(a)=>{ await need('read'); const cur=await OSBus.call('editor','read', a.path);
        if(!cur.includes(a.find)) throw new Error('“'+a.find+'” not found in '+a.path);
        const next=cur.split(a.find).join(a.replace||''); await OSBus.call('editor','open', a.path); await OSBus.call('editor','write', a.path, next); await OSBus.call('editor','save', a.path);
        return { result:`Replaced in ${a.path}` }; } },
  ]);
})();
