/* ============================================================
   persist.jsx — tiny localStorage store + hook
   Exposes (window): LS, usePersistent
   ============================================================ */

const LS = {
  ns: 'osrr.',
  get(k, fb){ try{ const v=localStorage.getItem(LS.ns+k); return v==null?fb:JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem(LS.ns+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(LS.ns+k); }catch(e){} },
  clear(){ try{ Object.keys(localStorage).filter(x=>x.startsWith(LS.ns)).forEach(x=>localStorage.removeItem(x)); }catch(e){} },
};

// useState that mirrors to localStorage under `key`
function usePersistent(key, initial){
  const [v, setV] = React.useState(()=>{
    const s = LS.get(key, undefined);
    if (s !== undefined && s !== null) return s;
    return typeof initial === 'function' ? initial() : initial;
  });
  const first = React.useRef(true);
  React.useEffect(()=>{ if(first.current){ first.current=false; } LS.set(key, v); }, [key, v]);
  return [v, setV];
}

Object.assign(window, { LS, usePersistent });
