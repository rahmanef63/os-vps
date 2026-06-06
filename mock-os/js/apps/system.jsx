/* ============================================================
   apps-system.jsx — Terminal + System Monitor
   Exposes (window): Terminal, SystemMonitor
   ============================================================ */

function Terminal({ fs, setFs, notify }){
  const [lines, setLines] = React.useState([
    { t:'sys', v:'os-rr shell · type "help" for commands' },
  ]);
  const [cwd, setCwd] = React.useState('/');
  const [input, setInput] = React.useState('');
  const [hist, setHist] = React.useState([]); const [hp, setHp] = React.useState(-1);
  const bodyRef = React.useRef(null), inRef = React.useRef(null);
  fs = fs || {};

  React.useEffect(()=>{ if(bodyRef.current) bodyRef.current.scrollTop=bodyRef.current.scrollHeight; },[lines]);

  const resolve = (arg)=>{ if(!arg) return cwd; if(arg.startsWith('/')) return arg;
    if(arg==='..'){ const p=cwd.split('/').filter(Boolean); p.pop(); return '/'+p.join('/'); }
    return (cwd==='/'?'/':cwd+'/')+arg; };
  const base = ()=> cwd==='/'?'/':cwd+'/';
  const rekey = (n,oldP,newP)=>{ if(oldP===newP)return; Object.keys(n).forEach(k=>{ if(k===oldP||k.startsWith(oldP+'/')){ n[newP+k.slice(oldP.length)]=n[k]; delete n[k]; } }); };
  const cloneFolder = (n,src,dst)=>{ const kids=(n[src]||[]).map(k=>({...k,id:uid('f')})); n[dst]=kids; (n[src]||[]).forEach((k,i)=>{ if(k.kind==='folder') cloneFolder(n, src+'/'+k.name, dst+'/'+kids[i].name); }); };
  const gtag = (nm)=>{ const e=(nm.split('.').pop()||'').toLowerCase();
    if(['mp4','mov','webm'].includes(e))return'video'; if(['png','jpg','jpeg','gif','svg'].includes(e))return'image';
    if(['wav','mp3'].includes(e))return'audio'; if(['js','ts','py','sh','html','json','css','md'].includes(e))return'code'; return null; };

  const run = (cmd)=>{ const [c,...args]=cmd.trim().split(/\s+/); const out=[];
    const push=(v,t='out')=>out.push({t,v});
    switch(c){
      case '': break;
      case 'help': push('Files: ls · cd · pwd · cat · mkdir · touch · rm [-r] · mv · cp\nSystem: clear · echo · whoami · date · uname · df · ps · neofetch · open <app>'); break;
      case 'ls': { const items=fs[resolve(args[0])]; if(!items){ push('ls: no such directory','err'); break; }
        push(items.map(i=>i.kind==='folder'?i.name+'/':i.name).join('   ')||'(empty)'); break; }
      case 'cd': { const p=resolve(args[0]||'/'); if(fs[p]){ setCwd(p==='/'?'/':p.replace(/\/$/,'')); } else push('cd: not a directory: '+args[0],'err'); break; }
      case 'pwd': push(cwd); break;
      case 'cat': { const it=(fs[cwd]||[]).find(x=>x.name===args[0]); if(!it){push('cat: '+(args[0]||'')+': No such file','err');break;}
        if(it.ext==='md') push('# '+it.name.replace('.md','')+'\n\nManaged by os-rr. Open in an editor for the full view.'); 
        else if(it.ext==='json') push('{\n  "name": "'+it.name.replace('.json','')+'",\n  "runtime": "html",\n  "entry": "index.html"\n}');
        else push('[binary or large file — open in an app]'); break; }
      case 'echo': push(args.join(' ')); break;
      case 'whoami': push('root@os-rr'); break;
      case 'date': push(new Date().toString()); break;
      case 'uname': push('os-rr 2.7.1 (web-kernel) x86_64'); break;
      case 'clear': setLines([]); return;
      case 'df': push('Filesystem   Size   Used  Avail  Use%\n/dev/vps0    460G   289G   171G   63%'); break;
      case 'ps': push('  PID  CPU  MEM  COMMAND\n    1  0.4  12M  os-rr-init\n  142  6.1  88M  reel-render\n  201  1.2  54M  file-daemon\n  377  0.3  22M  monitor'); break;
      case 'neofetch': push('NEOFETCH', 'fetch'); break;
      case 'open': { notify && notify('Launching '+(args[0]||'app')); push('opening '+(args[0]||'')+'…'); break; }
      case 'mkdir': { const nm=args[0]; if(!nm){push('mkdir: missing operand','err');break;} if((fs[cwd]||[]).some(x=>x.name===nm)){push('mkdir: '+nm+': exists','err');break;}
        setFs(prev=>{ const n={...prev}; n[cwd]=[...(n[cwd]||[]),{id:uid('f'),name:nm,kind:'folder'}]; n[base()+nm]=[]; return n; }); break; }
      case 'touch': { const nm=args[0]; if(!nm){push('touch: missing operand','err');break;} if((fs[cwd]||[]).some(x=>x.name===nm)) break;
        setFs(prev=>{ const n={...prev}; n[cwd]=[...(n[cwd]||[]),{id:uid('f'),name:nm,kind:'file',ext:(nm.split('.').pop()||'').toLowerCase(),size:'0 B',meta:'File',kindTag:gtag(nm)}]; return n; }); break; }
      case 'rm': { const rec=args.some(a=>/^-.*r/.test(a)); const nm=args.filter(a=>!a.startsWith('-'))[0]; const it=(fs[cwd]||[]).find(x=>x.name===nm);
        if(!it){push('rm: '+(nm||'')+': no such file or directory','err');break;}
        if(it.kind==='folder'&&!rec){push('rm: '+nm+': is a directory (use -r)','err');break;}
        setFs(prev=>{ const n={...prev}; n[cwd]=n[cwd].filter(x=>x.name!==nm); if(it.kind==='folder'){ const k=base()+nm; Object.keys(n).forEach(kk=>{ if(kk===k||kk.startsWith(k+'/')) delete n[kk]; }); } return n; }); break; }
      case 'mv': { const a=args[0], b=args[1]; const it=(fs[cwd]||[]).find(x=>x.name===a);
        if(!it||!b){push('mv: usage: mv <src> <dst>','err');break;}
        const into=(fs[cwd]||[]).find(x=>x.name===b&&x.kind==='folder');
        setFs(prev=>{ const n={...prev};
          if(into){ n[cwd]=n[cwd].filter(x=>x.name!==a); n[base()+b]=[...(n[base()+b]||[]),it]; if(it.kind==='folder') rekey(n, base()+a, base()+b+'/'+a); }
          else { n[cwd]=n[cwd].map(x=>x.name===a?{...x,name:b}:x); if(it.kind==='folder') rekey(n, base()+a, base()+b); }
          return n; }); break; }
      case 'cp': { const a=args[0], b=args[1]; const it=(fs[cwd]||[]).find(x=>x.name===a);
        if(!it||!b){push('cp: usage: cp <src> <dst>','err');break;}
        setFs(prev=>{ const n={...prev}; const copy={...it,id:uid('f'),name:b}; n[cwd]=[...n[cwd],copy]; if(it.kind==='folder') cloneFolder(n, base()+a, base()+b); return n; }); break; }
      default: push(c+': command not found','err');
    }
    return out;
  };

  const submit=()=>{ const cmd=input; const out=run(cmd)||[];
    setLines(l=>[...l, { t:'cmd', v:cmd, cwd }, ...out]); if(cmd.trim()) setHist(h=>[cmd,...h]); setHp(-1); setInput(''); };

  // expose to the AI command bus
  const runRef = React.useRef(null);
  runRef.current = (cmd)=>{ const out=run(cmd)||[]; setLines(l=>[...l,{ t:'cmd', v:cmd, cwd }, ...out]); if(cmd&&cmd.trim()) setHist(h=>[cmd,...h]);
    return out.filter(o=>o.t!=='fetch').map(o=>o.v).join('\n') || '(ok)'; };
  React.useEffect(()=>{ if(!window.OSBus) return; return OSBus.register('terminal', { run:(cmd)=>runRef.current(cmd) }); },[]);

  const onKey=(e)=>{ if(e.key==='Enter') submit();
    else if(e.key==='ArrowUp'){ e.preventDefault(); const n=Math.min(hist.length-1,hp+1); if(hist[n]!=null){setHp(n);setInput(hist[n]);} }
    else if(e.key==='ArrowDown'){ e.preventDefault(); const n=hp-1; if(n<0){setHp(-1);setInput('');}else{setHp(n);setInput(hist[n]);} } };

  const prompt=(cw)=> <span style={{color:'#5be0c8'}}>root@os-rr<span style={{color:'#7a8aff'}}>:{cw}</span>$ </span>;
  return (
    <div onClick={()=>inRef.current&&inRef.current.focus()} ref={bodyRef}
         style={{width:'100%',height:'100%',background:'#0d0e12',color:'#dfe3ea',fontFamily:'var(--font-mono)',fontSize:12.5,lineHeight:1.55,padding:14,overflowY:'auto',userSelect:'text'}}>
      {lines.map((l,i)=>{
        if(l.t==='fetch') return <Neofetch key={i}/>;
        if(l.t==='cmd') return <div key={i} style={{whiteSpace:'pre-wrap'}}>{prompt(l.cwd)}{l.v}</div>;
        return <div key={i} style={{whiteSpace:'pre-wrap',color:l.t==='err'?'#ff7a7a':l.t==='sys'?'#7a8aff':'#cfd4de'}}>{l.v}</div>;
      })}
      <div style={{display:'flex',whiteSpace:'pre'}}>{prompt(cwd)}
        <input ref={inRef} autoFocus value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
          style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#fff',fontFamily:'inherit',fontSize:'inherit'}}/></div>
    </div>
  );
}
function Neofetch(){ return (
  <div style={{display:'flex',gap:18,margin:'6px 0'}}>
    <div style={{color:'#5be0c8',fontWeight:700,lineHeight:1.3}}>{`  ___  ___ \n / _ \\/ __|\n| (_) \\__ \\\n \\___/|___/\n  -rr`}</div>
    <div style={{lineHeight:1.5}}>
      <div style={{color:'#7a8aff'}}>root@os-rr</div>
      <div>os-------- os-rr 2.7.1 web-kernel</div>
      <div>shell----- rr-sh 1.4</div>
      <div>cpu------- 8 vCPU @ 3.1GHz</div>
      <div>memory---- 6.4G / 16G</div>
      <div>disk------ 289G / 460G</div>
      <div>uptime---- 14d 6h</div>
    </div></div>); }

/* ---------------- System Monitor ---------------- */
function SystemMonitor(){
  const [cpu,setCpu]=React.useState(()=>Array.from({length:40},()=>20+Math.random()*20));
  const [net,setNet]=React.useState(()=>Array.from({length:40},()=>Math.random()*30));
  const [v,setV]=React.useState({cpu:32,mem:40,disk:63,gpu:18});
  React.useEffect(()=>{ const iv=setInterval(()=>{
    setV(p=>({ cpu:clamp(p.cpu+(Math.random()-.5)*22), mem:clamp(p.mem+(Math.random()-.5)*7), disk:63, gpu:clamp(p.gpu+(Math.random()-.5)*26) }));
    setCpu(a=>[...a.slice(1), clamp(a[a.length-1]+(Math.random()-.5)*30)]);
    setNet(a=>[...a.slice(1), Math.max(0,Math.random()*70)]);
  },900); return ()=>clearInterval(iv); },[]);
  function clamp(n){ return Math.max(3,Math.min(98,n)); }

  const procs=[
    ['reel-render','rendering',38,540],['file-daemon','running',7,142],['os-rr-shell','running',4,88],
    ['monitor','running',2,46],['nginx','running',3,64],['node · color-picker','running',5,72],['postgres','running',6,210]];

  return (
    <div style={{width:'100%',height:'100%',overflow:'auto',padding:16,background:'var(--window-bg)'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:14}}>
        <Gauge label="CPU" val={v.cpu} sub="8 vCPU" color="#3aa0ff"/>
        <Gauge label="Memory" val={v.mem} sub={`${(v.mem/100*16).toFixed(1)} / 16 GB`} color="#7a5cff"/>
        <Gauge label="Disk" val={v.disk} sub="289 / 460 GB" color="#ffb13b"/>
        <Gauge label="GPU" val={v.gpu} sub="render accel" color="#ff6a9b"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
        <Card title="CPU load" right={Math.round(v.cpu)+'%'}><Spark data={cpu} color="#3aa0ff" fill/></Card>
        <Card title="Network" right={Math.round(net[net.length-1])+' MB/s'}><Spark data={net} color="#34d39a" fill/></Card>
      </div>
      <Card title="Processes">
        <div style={{display:'grid',gridTemplateColumns:'1fr 90px 70px 60px',gap:8,fontSize:11,fontWeight:700,letterSpacing:'.03em',textTransform:'uppercase',color:'var(--text-faint)',padding:'2px 4px 8px'}}>
          <span>Process</span><span>Status</span><span style={{textAlign:'right'}}>CPU</span><span style={{textAlign:'right'}}>MEM</span></div>
        {procs.map(([n,s,c,m])=>(
          <div key={n} style={{display:'grid',gridTemplateColumns:'1fr 90px 70px 60px',gap:8,alignItems:'center',padding:'7px 4px',borderTop:'.5px solid var(--sep)',fontSize:12.5}}>
            <span style={{fontWeight:600,fontFamily:'var(--font-mono)',fontSize:12}}>{n}</span>
            <span><span style={{fontSize:11,padding:'2px 7px',borderRadius:20,background:s==='rendering'?'rgba(255,106,155,.18)':'var(--inset)',color:s==='rendering'?'#ff6a9b':'var(--text-dim)',fontWeight:600}}>{s}</span></span>
            <span style={{textAlign:'right',fontVariantNumeric:'tabular-nums',color:'var(--text-dim)'}}>{c}%</span>
            <span style={{textAlign:'right',fontVariantNumeric:'tabular-nums',color:'var(--text-dim)'}}>{m}M</span></div>))}
      </Card>
    </div>
  );
}
function Gauge({ label, val, sub, color }){
  const r=26, c=2*Math.PI*r, off=c*(1-val/100);
  return <div style={{background:'var(--glass-panel)',border:'.5px solid var(--sep)',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
    <div style={{position:'relative',width:64,height:64,flex:'0 0 auto'}}>
      <svg viewBox="0 0 64 64" style={{transform:'rotate(-90deg)'}}><circle cx="32" cy="32" r={r} fill="none" stroke="var(--inset)" strokeWidth="7"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{transition:'stroke-dashoffset .8s ease'}}/></svg>
      <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontWeight:700,fontSize:15,fontVariantNumeric:'tabular-nums'}}>{Math.round(val)}%</div></div>
    <div><div style={{fontWeight:700,fontSize:14}}>{label}</div><div style={{fontSize:11,color:'var(--text-faint)',marginTop:2}}>{sub}</div></div>
  </div>;
}
function Card({ title, right, children }){ return <div style={{background:'var(--glass-panel)',border:'.5px solid var(--sep)',borderRadius:12,padding:'12px 14px'}}>
  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontWeight:700,fontSize:12.5}}>{title}</span>{right&&<span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-dim)'}}>{right}</span>}</div>{children}</div>; }
function Spark({ data, color, fill }){ const max=Math.max(...data,1), W=300,H=54;
  const pts=data.map((d,i)=>`${(i/(data.length-1))*W},${H-(d/max)*H}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:54}}>
    {fill&&<polygon points={`0,${H} ${pts} ${W},${H}`} fill={color} opacity=".14"/>}
    <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>; }

Object.assign(window, { Terminal, SystemMonitor });
