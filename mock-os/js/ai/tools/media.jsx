/* ============================================================
   ai/tools/media.jsx — Media Studio → AI tools (vertical slice)
   Drives the open Media Studio window through OSBus ('media').
   ============================================================ */
(function(){
  const need = async (fn)=>{ const ok=await ensureApp('media',fn); if(!ok) throw new Error('Media Studio unavailable'); };

  registerTools('media', [
    { id:'media.open', name:'Open Media Studio', desc:'Open the Media Studio image editor.',
      params:{}, run:async()=>{ await need('addText'); return { result:'Opened Media Studio' }; } },

    { id:'media.set_aspect', name:'Set canvas size', desc:'Resize the canvas for a platform.',
      params:{ ratio:{ type:'string', desc:'1:1, 4:5, 9:16, 16:9, 1.91:1, or 3:2', required:true } },
      run:async (a)=>{ await need('setAspect'); await OSBus.call('media','setAspect', a.ratio); return { result:`Canvas → ${a.ratio}` }; } },

    { id:'media.add_text', name:'Add text', desc:'Add a text layer to the canvas.',
      params:{ text:{ type:'string', desc:'The text to add', required:true } },
      run:async (a)=>{ await need('addText'); await OSBus.call('media','addText', a.text); return { result:`Added text “${a.text}”` }; } },

    { id:'media.add_sticker', name:'Add sticker', desc:'Add an emoji sticker layer.',
      params:{ emoji:{ type:'string', desc:'An emoji, e.g. 🔥', required:true } },
      run:async (a)=>{ await need('addSticker'); await OSBus.call('media','addSticker', a.emoji); return { result:`Added sticker ${a.emoji}` }; } },

    { id:'media.add_shape', name:'Add shape', desc:'Add a rectangle or ellipse layer.',
      params:{ shape:{ type:'string', desc:'rect or ellipse' } },
      run:async (a)=>{ await need('addShape'); await OSBus.call('media','addShape', a.shape||'rect'); return { result:`Added ${a.shape||'rect'}` }; } },

    { id:'media.apply_filter', name:'Apply filter', desc:'Apply a photo filter preset.',
      params:{ name:{ type:'string', desc:'Original, Vivid, Mono, Warm, Cool, Faded, Noir, or Dream', required:true } },
      run:async (a)=>{ await need('applyFilter'); const r=await OSBus.call('media','applyFilter', a.name); return { result:r||`Filter → ${a.name}` }; } },

    { id:'media.export', name:'Export design', desc:'Open the export panel (JSON / HTML).',
      params:{}, run:async()=>{ await need('exportDesign'); await OSBus.call('media','exportDesign'); return { result:'Opened export panel' }; } },
  ]);
})();
