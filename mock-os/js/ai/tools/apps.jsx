/* ============================================================
   ai/tools/apps.jsx — Apps & windows → AI tools (vertical slice)
   ============================================================ */
(function(){
  const find = (q)=>{ const list=(OSCTX.current.allApps)||OS_APPS; const s=(q||'').toLowerCase();
    return list.find(a=>a.id===s) || list.find(a=>a.name.toLowerCase()===s) || list.find(a=>a.name.toLowerCase().includes(s)); };

  registerTools('apps', [
    { id:'apps.list', name:'List apps', desc:'List every installed app (built-in + user-created).',
      params:{},
      run:()=>{ const list=(OSCTX.current.allApps)||OS_APPS; return { result:`${list.length} apps installed`, data:list.map(a=>({ id:a.id, name:a.name })) }; } },

    { id:'apps.launch', name:'Open app', desc:'Open / focus an app by name or id (files, browser, video, media, terminal, monitor, store, settings, create).',
      params:{ app:{ type:'string', desc:'App name or id', required:true } },
      run:(a,ctx)=>{ const app=find(a.app); if(!app) throw new Error('Unknown app: '+a.app); ctx.os.launch(app.id); return { result:`Opened ${app.name}` }; } },

    { id:'apps.close', name:'Close app', desc:'Close all open windows of an app.',
      params:{ app:{ type:'string', desc:'App name or id', required:true } },
      run:(a,ctx)=>{ const app=find(a.app); if(!app) throw new Error('Unknown app: '+a.app);
        const mgr=ctx.os.mgr; if(mgr){ mgr.wins.filter(w=>w.appId===app.id).forEach(w=>mgr.close(w.id)); }
        return { result:`Closed ${app.name}` }; } },

    { id:'apps.create', name:'Create app', desc:'Create a new user app and add it to the dock & Launchpad.',
      params:{ name:{ type:'string', desc:'App name', required:true },
        runtime:{ type:'string', desc:'html | js | py | sh (default html)' },
        glyph:{ type:'string', desc:'icon glyph: grid, code, globe, image, music, gauge, folder, cloud' } },
      run:(a,ctx)=>{ const slug=(a.name||'app').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
        const colors=['linear-gradient(160deg,#3aa0ff,#1f6dff)','linear-gradient(160deg,#7a5cff,#4f2fd6)','linear-gradient(160deg,#16c2c2,#0a8a8a)'];
        ctx.os.installApp({ id:'usr-'+slug+'-'+uid(), name:a.name, glyph:a.glyph||'grid', color:colors[Math.floor(Math.random()*colors.length)], w:900, h:600, user:true, runtime:a.runtime||'html' });
        return { result:`Created app “${a.name}”` }; } },
  ]);
})();
