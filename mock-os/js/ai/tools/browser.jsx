/* ============================================================
   ai/tools/browser.jsx — Browser → AI tools (vertical slice)
   Drives the Browser window through OSBus ('browser' handlers).
   ============================================================ */
(function(){
  registerTools('browser', [
    { id:'browser.open', name:'Browse', desc:'Open the Browser and navigate to a URL or run a web search.',
      params:{ query:{ type:'string', desc:'A URL (https://…) or search terms', required:true } },
      run:async (a,ctx)=>{ const ok=await ensureApp('browser','navigateInput'); if(!ok) throw new Error('Browser unavailable');
        const dest=await OSBus.call('browser','navigateInput', a.query); return { result:`Browsing ${dest}` }; } },

    { id:'browser.new_tab', name:'New tab', desc:'Open a new browser tab, optionally at a URL/search.',
      params:{ query:{ type:'string', desc:'Optional URL or search terms' } },
      run:async (a,ctx)=>{ const ok=await ensureApp('browser','newTab'); if(!ok) throw new Error('Browser unavailable');
        await OSBus.call('browser','newTab', a.query||''); return { result:a.query?`New tab → ${a.query}`:'Opened a new tab' }; } },

    { id:'browser.bookmark', name:'Bookmark page', desc:'Bookmark the page currently shown in the browser.',
      params:{},
      run:async (a,ctx)=>{ const ok=await ensureApp('browser','bookmarkCurrent'); if(!ok) throw new Error('Browser unavailable');
        const t=await OSBus.call('browser','bookmarkCurrent'); return { result:t||'Bookmarked' }; } },
  ]);
})();
