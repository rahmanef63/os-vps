/* ============================================================
   ai/tools/settings.jsx — Settings/appearance → AI tools (vertical slice)
   ============================================================ */
(function(){
  const THEMES=['light','dark'];
  const DIRS={ aqua:'aqua', 'aqua glass':'aqua', graphite:'graphite', 'graphite pro':'graphite', vivid:'vivid' };
  const WP=['aurora','dusk','mist','graphite','noir'];
  const ACCENTS={ blue:'#2f7bf6', purple:'#7a5cff', pink:'#ff5f8f', orange:'#ff7a3d', teal:'#16b8a6', green:'#34c759' };

  registerTools('settings', [
    { id:'settings.set_theme', name:'Set theme', desc:'Switch between light and dark appearance.',
      params:{ theme:{ type:'string', desc:'light or dark', required:true } },
      run:(a,ctx)=>{ const t=(a.theme||'').toLowerCase(); if(!THEMES.includes(t)) throw new Error('theme must be light|dark');
        ctx.os.setAppearance(p=>({...p,theme:t})); return { result:`Theme → ${t}` }; } },

    { id:'settings.set_accent', name:'Set accent color', desc:'Change the accent color.',
      params:{ color:{ type:'string', desc:'blue, purple, pink, orange, teal, green — or a hex like #2f7bf6', required:true } },
      run:(a,ctx)=>{ const c=ACCENTS[(a.color||'').toLowerCase()] || (/^#?[0-9a-f]{6}$/i.test(a.color)?(a.color[0]==='#'?a.color:'#'+a.color):null);
        if(!c) throw new Error('unknown color'); ctx.os.setAppearance(p=>({...p,accent:c})); return { result:`Accent → ${c}` }; } },

    { id:'settings.set_wallpaper', name:'Set wallpaper', desc:'Change the desktop wallpaper.',
      params:{ id:{ type:'string', desc:'aurora, dusk, mist, graphite, or noir', required:true } },
      run:(a,ctx)=>{ const w=(a.id||'').toLowerCase(); if(!WP.includes(w)) throw new Error('unknown wallpaper'); ctx.os.setAppearance(p=>({...p,wallpaper:w})); return { result:`Wallpaper → ${w}` }; } },

    { id:'settings.set_shell', name:'Set shell style', desc:'Change overall shell style.',
      params:{ style:{ type:'string', desc:'aqua, graphite, or vivid', required:true } },
      run:(a,ctx)=>{ const d=DIRS[(a.style||'').toLowerCase()]; if(!d) throw new Error('unknown style'); ctx.os.setAppearance(p=>({...p,dir:d})); return { result:`Shell → ${d}` }; } },

    { id:'settings.open', name:'Open Settings', desc:'Open the Settings app.',
      params:{}, run:(a,ctx)=>{ ctx.os.launch('settings'); return { result:'Opened Settings' }; } },
  ]);
})();
