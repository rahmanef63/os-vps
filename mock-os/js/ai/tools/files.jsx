/* ============================================================
   ai/tools/files.jsx — Files feature → AI tools (vertical slice)
   Acts on the live mock FS through OSCTX (getFs / setFs / launch).
   ============================================================ */
(function(){
  const join = (b,n)=> b==='/' ? '/'+n : b.replace(/\/$/,'')+'/'+n;
  const parent = (p)=>{ const a=p.replace(/\/$/,'').split('/'); a.pop(); return '/'+a.filter(Boolean).join('/'); };
  const baseName = (p)=> p.replace(/\/$/,'').split('/').pop();
  const norm = (p)=> !p ? '/' : (p[0]==='/'?p:'/'+p).replace(/\/+$/,'')||'/';
  const fresh = (ctx)=> (ctx.os.getFs ? ctx.os.getFs() : {});
  const tag = (nm)=>{ const e=(nm.split('.').pop()||'').toLowerCase();
    if(['mp4','mov','webm'].includes(e))return'video'; if(['png','jpg','jpeg','gif','svg'].includes(e))return'image';
    if(['wav','mp3'].includes(e))return'audio'; if(['js','ts','tsx','py','sh','html','json','css','md'].includes(e))return'code'; return null; };
  const rekey=(n,oldP,newP)=>{ if(oldP===newP)return; Object.keys(n).forEach(k=>{ if(k===oldP||k.startsWith(oldP+'/')){ n[newP+k.slice(oldP.length)]=n[k]; delete n[k]; } }); };

  registerTools('files', [
    { id:'files.list', name:'List folder', desc:'List the entries inside a folder path.',
      params:{ path:{ type:'string', desc:'Folder path, e.g. "/Media". Defaults to "/".' } },
      run:(a,ctx)=>{ const fs=fresh(ctx); const p=norm(a.path||'/'); const items=fs[p];
        if(!items) throw new Error('No such folder: '+p);
        return { result:`${items.length} item(s) in ${p}`, data:items.map(i=>({ name:i.name, kind:i.kind, meta:i.meta||i.ext })) }; } },

    { id:'files.create_folder', name:'Create folder', desc:'Make a new folder inside a parent path.',
      params:{ path:{ type:'string', desc:'Parent folder, e.g. "/Projects". Default "/".' }, name:{ type:'string', desc:'New folder name', required:true } },
      run:(a,ctx)=>{ const p=norm(a.path||'/'); const name=a.name; if(!name) throw new Error('name required');
        ctx.os.setFs(prev=>{ const n={...prev}; if(!n[p]) n[p]=[];
          if(n[p].some(x=>x.name===name)) return prev;
          n[p]=[...n[p], { id:uid('f'), name, kind:'folder' }]; n[join(p,name)]=[]; return n; });
        return { result:`Created folder ${join(p,name)}` }; } },

    { id:'files.create_file', name:'Create file', desc:'Create an empty file inside a folder.',
      params:{ path:{ type:'string', desc:'Parent folder. Default "/".' }, name:{ type:'string', desc:'File name with extension', required:true } },
      run:(a,ctx)=>{ const p=norm(a.path||'/'); const name=a.name; if(!name) throw new Error('name required');
        ctx.os.setFs(prev=>{ const n={...prev}; if(!n[p]) n[p]=[]; if(n[p].some(x=>x.name===name)) return prev;
          n[p]=[...n[p], { id:uid('f'), name, kind:'file', ext:(name.split('.').pop()||'').toLowerCase(), size:'0 B', meta:'File', kindTag:tag(name) }]; return n; });
        return { result:`Created file ${join(p,name)}` }; } },

    { id:'files.rename', name:'Rename', desc:'Rename a file or folder given its full path.',
      params:{ path:{ type:'string', desc:'Full path of the item', required:true }, name:{ type:'string', desc:'New name', required:true } },
      run:(a,ctx)=>{ const p=norm(a.path); const par=parent(p), old=baseName(p);
        ctx.os.setFs(prev=>{ const n={...prev}; const arr=n[par]; if(!arr) return prev; const it=arr.find(x=>x.name===old); if(!it) return prev;
          n[par]=arr.map(x=>x.name===old?{...x,name:a.name}:x); if(it.kind==='folder') rekey(n, join(par,old), join(par,a.name)); return n; });
        return { result:`Renamed ${old} → ${a.name}` }; } },

    { id:'files.move', name:'Move', desc:'Move an item into a destination folder.',
      params:{ from:{ type:'string', desc:'Full path of the item to move', required:true }, to:{ type:'string', desc:'Destination folder path', required:true } },
      run:(a,ctx)=>{ const from=norm(a.from), dest=norm(a.to); const par=parent(from), nm=baseName(from);
        ctx.os.setFs(prev=>{ const n={...prev}; const arr=n[par]; if(!arr) return prev; const it=arr.find(x=>x.name===nm); if(!it) return prev;
          if(!n[dest]) n[dest]=[]; n[par]=arr.filter(x=>x.name!==nm); n[dest]=[...n[dest], it];
          if(it.kind==='folder') rekey(n, join(par,nm), join(dest,nm)); return n; });
        return { result:`Moved ${nm} → ${dest}` }; } },

    { id:'files.delete', name:'Delete', desc:'Move a file or folder to Trash (removes it).',
      params:{ path:{ type:'string', desc:'Full path of the item', required:true } },
      run:(a,ctx)=>{ const p=norm(a.path); const par=parent(p), nm=baseName(p);
        ctx.os.setFs(prev=>{ const n={...prev}; const arr=n[par]; if(!arr) return prev; const it=arr.find(x=>x.name===nm); if(!it) return prev;
          n[par]=arr.filter(x=>x.name!==nm); if(it.kind==='folder'){ const k=join(par,nm); Object.keys(n).forEach(kk=>{ if(kk===k||kk.startsWith(k+'/')) delete n[kk]; }); } return n; });
        return { result:`Deleted ${p}` }; } },

    { id:'files.open', name:'Open file', desc:'Open a file in the right editor (video→Reel Editor, image→Media Studio).',
      params:{ path:{ type:'string', desc:'Full path of the file', required:true } },
      run:(a,ctx)=>{ const p=norm(a.path); const it=(fresh(ctx)[parent(p)]||[]).find(x=>x.name===baseName(p));
        if(!it) throw new Error('No such file: '+p);
        if(it.kindTag==='video'||['mp4','mov'].includes(it.ext)) ctx.os.launch('video',{ file:it });
        else if(it.kindTag==='image') ctx.os.launch('media',{ file:it });
        else ctx.os.launch('files');
        return { result:`Opened ${p}` }; } },

    { id:'files.search', name:'Search files', desc:'Find files/folders whose name contains a query.',
      params:{ query:{ type:'string', desc:'Text to match in names', required:true } },
      run:(a,ctx)=>{ const fs=fresh(ctx); const q=(a.query||'').toLowerCase(); const hits=[];
        Object.keys(fs).forEach(dir=> (fs[dir]||[]).forEach(it=>{ if(it.name.toLowerCase().includes(q)) hits.push(join(dir,it.name)); }));
        return { result:`${hits.length} match(es) for “${a.query}”`, data:hits.slice(0,20) }; } },
  ]);
})();
