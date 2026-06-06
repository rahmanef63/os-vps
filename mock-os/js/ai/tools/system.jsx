/* ============================================================
   ai/tools/system.jsx — System & Terminal → AI tools (vertical slice)
   Uses the OS API (mock/live) for stats, the Terminal bus for commands.
   ============================================================ */
(function(){
  registerTools('system', [
    { id:'system.stats', name:'System stats', desc:'Read current CPU / memory / disk / GPU usage.',
      params:{},
      run:async (a,ctx)=>{ const api=ctx.os.api; if(!api) throw new Error('No API'); const s=await api.sys.stats();
        const pct=(x)=>Math.round(x); return { result:`CPU ${pct(s.cpu.pct)}% · MEM ${(s.mem.used/1e9).toFixed(1)}/${(s.mem.total/1e9).toFixed(0)}GB · DISK ${(s.disk.used/1e9).toFixed(0)}/${(s.disk.total/1e9).toFixed(0)}GB`,
          data:{ cpu:pct(s.cpu.pct), memGB:+(s.mem.used/1e9).toFixed(1), diskGB:Math.round(s.disk.used/1e9) } }; } },

    { id:'system.processes', name:'List processes', desc:'List the running processes on the VPS.',
      params:{},
      run:async (a,ctx)=>{ const api=ctx.os.api; const ps=await api.sys.processes(); return { result:`${ps.length} processes running`, data:ps.map(p=>({ pid:p.pid, name:p.name, cpu:p.cpu })) }; } },

    { id:'system.open_monitor', name:'Open System Monitor', desc:'Open the System Monitor app.',
      params:{}, run:(a,ctx)=>{ ctx.os.launch('monitor'); return { result:'Opened System Monitor' }; } },

    { id:'system.run_command', name:'Run shell command', desc:'Run a command in the Terminal and return its output (ls, pwd, df, ps, uname, neofetch, mkdir, touch, echo…).',
      params:{ cmd:{ type:'string', desc:'The shell command line', required:true } },
      run:async (a,ctx)=>{ const ok=await ensureApp('terminal','run'); if(!ok) throw new Error('Terminal unavailable');
        const out=await OSBus.call('terminal','run', a.cmd); return { result:`$ ${a.cmd}`, data:out }; } },
  ]);
})();
