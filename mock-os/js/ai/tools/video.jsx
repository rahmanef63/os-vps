/* ============================================================
   ai/tools/video.jsx — Reel Editor → AI tools (vertical slice)
   Drives the open Reel Editor window through OSBus ('video').
   ============================================================ */
(function(){
  const need = async (fn)=>{ const ok=await ensureApp('video',fn); if(!ok) throw new Error('Reel Editor unavailable'); };

  registerTools('video', [
    { id:'video.open', name:'Open Reel Editor', desc:'Open the Reel Editor video timeline.',
      params:{}, run:async()=>{ await need('command'); return { result:'Opened Reel Editor' }; } },

    { id:'video.set_ratio', name:'Set aspect ratio', desc:'Switch the composition format.',
      params:{ ratio:{ type:'string', desc:'16:9, 9:16, 1:1, or 4:5', required:true } },
      run:async (a)=>{ await need('command'); const r=await OSBus.call('video','command', a.ratio); return { result:r }; } },

    { id:'video.add_title', name:'Add title', desc:'Add an animated title/text clip.',
      params:{ text:{ type:'string', desc:'Title text', required:true } },
      run:async (a)=>{ await need('command'); const r=await OSBus.call('video','command', 'add title '+a.text); return { result:r }; } },

    { id:'video.split', name:'Split at playhead', desc:'Cut the clip at the current playhead.',
      params:{}, run:async()=>{ await need('command'); const r=await OSBus.call('video','command','split'); return { result:r }; } },

    { id:'video.effect', name:'Add effect', desc:'Add a motion effect to the selected clip.',
      params:{ effect:{ type:'string', desc:'fade in, fade out, punch in, spin, or slide in', required:true } },
      run:async (a)=>{ await need('command'); const r=await OSBus.call('video','command', a.effect); return { result:r }; } },

    { id:'video.render', name:'Render', desc:'Start rendering the composition.',
      params:{}, run:async()=>{ await need('render'); await OSBus.call('video','render'); return { result:'Started render' }; } },
  ]);
})();
