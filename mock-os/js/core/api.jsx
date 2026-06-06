/* ============================================================
   api.jsx — os-rr Cloud API contract (the VPS boundary)

   One interface, two adapters:
     • MockAdapter  — in-browser simulation (default; what the prototype uses)
     • HttpAdapter  — real REST/SSE calls to your VPS daemon (flip mode → Live)

   Every method below maps 1:1 to an HTTP endpoint documented in "os-rr API.html".
   To go live: run the os-rr daemon on your VPS, point baseUrl at it, set a
   token, switch mode to "live". No UI code changes required.

   Exposes (window): makeApi, OSApi_ENDPOINTS
   ============================================================ */

const API_VERSION = 'v1';

/* canonical endpoint map — also rendered in the reference doc */
const OSApi_ENDPOINTS = {
  auth:   { token:'POST /auth/token', me:'GET /auth/me' },
  fs:     { list:'GET /fs/list', stat:'GET /fs/stat', read:'GET /fs/read', write:'POST /fs/write',
            upload:'POST /fs/upload', mkdir:'POST /fs/mkdir', move:'POST /fs/move', copy:'POST /fs/copy',
            remove:'DELETE /fs/delete', download:'GET /fs/download', usage:'GET /fs/usage' },
  exec:   { run:'POST /exec/run', stream:'GET /exec/stream (SSE)', kill:'POST /exec/kill', pty:'WS /exec/pty' },
  sys:    { stats:'GET /sys/stats', statsStream:'GET /sys/stats/stream (SSE)', processes:'GET /sys/processes', kill:'POST /sys/process/kill' },
  render: { start:'POST /render/start', status:'GET /render/status', stream:'GET /render/stream (SSE)', cancel:'POST /render/cancel', jobs:'GET /render/jobs' },
  apps:   { list:'GET /apps', manifest:'GET /apps/:slug/manifest', create:'POST /apps', start:'POST /apps/:slug/start', stop:'POST /apps/:slug/stop', remove:'DELETE /apps/:slug', serve:'GET /apps/:slug/serve/*' },
};

/* ───────────────────────── HTTP adapter ───────────────────────── */
function HttpAdapter({ baseUrl, token, getToken }){
  const root = (baseUrl||'').replace(/\/$/, '') + '/api/' + API_VERSION;
  const auth = () => { const t = (getToken && getToken()) || token; return t ? { Authorization:'Bearer '+t } : {}; };

  async function req(method, path, { query, body, form } = {}){
    let url = root + path;
    if (query){ const q=new URLSearchParams(query).toString(); if(q) url+='?'+q; }
    const opts = { method, headers:{ ...auth() } };
    if (form){ opts.body = form; }                 // FormData → browser sets content-type
    else if (body!==undefined){ opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(body); }
    const res = await fetch(url, opts);
    const ct = res.headers.get('content-type')||'';
    if (!res.ok){ let detail; try{ detail = ct.includes('json') ? (await res.json()).error : await res.text(); }catch(e){}
      throw new ApiError(res.status, detail?.code||'http_error', detail?.message||res.statusText, detail); }
    if (res.status===204) return null;
    return ct.includes('application/json') ? res.json() : res.blob();
  }
  // Server-Sent-Events helper → returns an unsubscribe fn
  function sse(path, query, onEvent){
    let url = root + path; const q=new URLSearchParams({ ...query, access_token:(getToken&&getToken())||token||'' }).toString();
    if(q) url+='?'+q;
    const es = new EventSource(url);
    es.onmessage = (e)=>{ try{ onEvent(JSON.parse(e.data)); }catch(_){ onEvent(e.data); } };
    es.onerror = ()=>{ /* caller may resubscribe */ };
    return ()=>es.close();
  }

  return {
    mode:'live', root,
    auth:{
      token:(username,password)=>req('POST','/auth/token',{body:{username,password}}),
      me:()=>req('GET','/auth/me'),
    },
    fs:{
      list:(path)=>req('GET','/fs/list',{query:{path}}),
      stat:(path)=>req('GET','/fs/stat',{query:{path}}),
      read:(path)=>req('GET','/fs/read',{query:{path}}),
      write:(path,content,encoding='utf8')=>req('POST','/fs/write',{body:{path,content,encoding}}),
      upload:(path,files)=>{ const fd=new FormData(); fd.append('path',path); [...files].forEach(f=>fd.append('files',f)); return req('POST','/fs/upload',{form:fd}); },
      mkdir:(path)=>req('POST','/fs/mkdir',{body:{path}}),
      move:(from,to)=>req('POST','/fs/move',{body:{from,to}}),
      copy:(from,to)=>req('POST','/fs/copy',{body:{from,to}}),
      remove:(path,toTrash=true)=>req('DELETE','/fs/delete',{body:{path,toTrash}}),
      downloadUrl:(path)=>root+'/fs/download?path='+encodeURIComponent(path),
      usage:()=>req('GET','/fs/usage'),
    },
    exec:{
      run:(cmd,opts={})=>req('POST','/exec/run',{body:{cmd,...opts}}),
      stream:(pid,onEvent)=>sse('/exec/stream',{pid},onEvent),
      kill:(pid)=>req('POST','/exec/kill',{body:{pid}}),
    },
    sys:{
      stats:()=>req('GET','/sys/stats'),
      statsStream:(onEvent)=>sse('/sys/stats/stream',{},onEvent),
      processes:()=>req('GET','/sys/processes'),
      kill:(pid)=>req('POST','/sys/process/kill',{body:{pid}}),
    },
    render:{
      start:(spec)=>req('POST','/render/start',{body:spec}),
      status:(jobId)=>req('GET','/render/status',{query:{jobId}}),
      stream:(jobId,onEvent)=>sse('/render/stream',{jobId},onEvent),
      cancel:(jobId)=>req('POST','/render/cancel',{body:{jobId}}),
      jobs:()=>req('GET','/render/jobs'),
    },
    apps:{
      list:()=>req('GET','/apps'),
      manifest:(slug)=>req('GET',`/apps/${slug}/manifest`),
      create:(manifest)=>req('POST','/apps',{body:{manifest}}),
      start:(slug)=>req('POST',`/apps/${slug}/start`),
      stop:(slug)=>req('POST',`/apps/${slug}/stop`),
      remove:(slug)=>req('DELETE',`/apps/${slug}`),
      serveUrl:(slug,p='')=>root+`/apps/${slug}/serve/`+p,
    },
  };
}

/* ───────────────────────── Mock adapter ───────────────────────── */
function MockAdapter(ctx={}){
  const delay = (v,ms=180)=>new Promise(r=>setTimeout(()=>r(v), ms+Math.random()*120));
  const fsRef = ctx.fsRef || { current:{} };          // live filesystem (from React)
  const jobs = {};                                     // render jobs in flight
  let pidSeq = 400;

  return {
    mode:'mock',
    auth:{
      token:(u)=>delay({ token:'mock.'+btoa(u||'root'), expires_at:Date.now()+36e5, user:{ name:u||'root' } }),
      me:()=>delay({ user:{ name:'root', id:'u_local' }, vps:{ host:'mock', region:'local', cores:8, ram:'16 GB' } }),
    },
    fs:{
      list:(path)=>delay({ path, entries:(fsRef.current[path]||[]).map(e=>({ name:e.name, kind:e.kind==='folder'?'dir':'file', size:e.size||0, ext:e.ext, mime:e.meta })) }),
      stat:(path)=>delay({ path, kind:'file' }),
      read:()=>delay('// mock file contents'),
      write:(path)=>delay({ path, ok:true }),
      upload:(path,files)=>delay({ uploaded:[...files].map(f=>({ name:f.name, size:f.size })) }, 500),
      mkdir:(path)=>delay({ path, kind:'dir' }),
      move:(from,to)=>delay({ from, to, ok:true }),
      copy:(from,to)=>delay({ from, to, ok:true }),
      remove:(path)=>delay({ path, ok:true }),
      downloadUrl:(path)=>'data:text/plain,'+encodeURIComponent('mock://'+path),
      usage:()=>delay({ used:289*1e9, total:460*1e9 }),
    },
    exec:{
      run:(cmd)=>delay({ pid:++pidSeq, cmd, state:'running' }),
      stream:(pid,onEvent)=>{ let n=0; const iv=setInterval(()=>{ onEvent({ type:'stdout', data:'· step '+(++n) }); if(n>=3){ onEvent({ type:'exit', code:0 }); clearInterval(iv); } },400); return ()=>clearInterval(iv); },
      kill:(pid)=>delay({ pid, ok:true }),
    },
    sys:{
      stats:()=>delay({ cpu:{ pct:20+Math.random()*60, cores:8 }, mem:{ used:6.4e9, total:16e9 }, disk:{ used:289e9, total:460e9 }, gpu:{ pct:Math.random()*40 }, net:{ rx:Math.random()*70, tx:Math.random()*20 }, uptime:14*864e5 }, 60),
      statsStream:(onEvent)=>{ const iv=setInterval(()=>onEvent({ cpu:{ pct:20+Math.random()*60 } }),900); return ()=>clearInterval(iv); },
      processes:()=>delay([{ pid:142,name:'reel-render',status:'rendering',cpu:38,mem:540 },{ pid:201,name:'file-daemon',status:'running',cpu:7,mem:142 }]),
      kill:(pid)=>delay({ pid, ok:true }),
    },
    render:{
      start:(spec)=>{ const jobId='job_'+Math.random().toString(36).slice(2,8); jobs[jobId]={ t0:Date.now(), dur:2600, spec }; return delay({ jobId, state:'queued' }, 250); },
      status:(jobId)=>{ const j=jobs[jobId]; if(!j) return delay({ jobId, state:'error', message:'unknown job' });
        const p=Math.min(1,(Date.now()-j.t0)/j.dur); const total=j.spec?.duration||300;
        return delay({ jobId, state:p>=1?'done':'rendering', progress:p, frame:Math.round(p*total), totalFrames:total, output:p>=1?('/Media/render-'+jobId+'.mp4'):null }, 40); },
      stream:(jobId,onEvent)=>{ const iv=setInterval(()=>{ const j=jobs[jobId]; if(!j)return; const p=Math.min(1,(Date.now()-j.t0)/j.dur); onEvent({ jobId, state:p>=1?'done':'rendering', progress:p }); if(p>=1)clearInterval(iv); },120); return ()=>clearInterval(iv); },
      cancel:(jobId)=>{ delete jobs[jobId]; return delay({ jobId, state:'cancelled' }); },
      jobs:()=>delay(Object.keys(jobs).map(id=>({ jobId:id, state:'rendering' }))),
    },
    apps:{
      list:()=>delay((ctx.userApps&&ctx.userApps())||[]),
      manifest:(slug)=>delay({ name:slug, slug, runtime:'html', entry:'index.html' }),
      create:(manifest)=>delay({ ...manifest, ok:true }, 400),
      start:(slug)=>delay({ slug, url:'about:blank', state:'running' }, 400),
      stop:(slug)=>delay({ slug, ok:true }),
      remove:(slug)=>delay({ slug, ok:true }),
      serveUrl:(slug,p='')=>'about:blank',
    },
  };
}

class ApiError extends Error { constructor(status,code,message,detail){ super(message); this.status=status; this.code=code; this.detail=detail; } }

/* selector */
function makeApi(cfg={}){
  return cfg.mode==='live' ? HttpAdapter(cfg) : MockAdapter(cfg);
}

Object.assign(window, { makeApi, HttpAdapter, MockAdapter, OSApi_ENDPOINTS, ApiError, API_VERSION });
