/* ============================================================
   data.jsx — icon glyphs, app registry, mock filesystem
   Exposes (window): Glyph, AppIcon, OS_APPS, makeFS, uid
   ============================================================ */

const uid = (() => { let n = 1; return (p = 'id') => `${p}${(n++).toString(36)}${Date.now().toString(36).slice(-3)}`; })();

/* simple geometric glyphs — white strokes/fills on colored icons */
const GLYPHS = {
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l1.6 1.7H19.5A1.5 1.5 0 0 1 21 8.2V17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17z" fill="#fff"/>,
  film: <g fill="none" stroke="#fff" strokeWidth="1.7"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 5v14M15 5v14M4 9.5h5M15 9.5h5M4 14.5h5M15 14.5h5" strokeWidth="1.3"/></g>,
  image: <g><rect x="4" y="5" width="16" height="14" rx="2.5" fill="none" stroke="#fff" strokeWidth="1.7"/><circle cx="9" cy="10" r="1.6" fill="#fff"/><path d="M5.5 17l4-4 3 3 3.5-3.5 3 3.5" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"/></g>,
  terminal: <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7l4 5-4 5"/><path d="M12 17h7"/></g>,
  gauge: <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M5 17a8 8 0 1 1 14 0"/><path d="M12 14l4-3.5"/><circle cx="12" cy="14" r="1.4" fill="#fff" stroke="none"/></g>,
  grid: <g fill="#fff"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></g>,
  store: <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"><path d="M5 8h14l-1 11H6z"/><path d="M8.5 8a3.5 3.5 0 0 1 7 0"/></g>,
  gear: <g fill="none" stroke="#fff" strokeWidth="1.6"><circle cx="12" cy="12" r="2.6"/><path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7"/></g>,
  cloud: <g fill="#fff"><path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.4 9.2 3.8 3.8 0 0 1 17 18z"/></g>,
  code: <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></g>,
  music: <g fill="#fff"><path d="M10 6.5l8-1.6v9.3a2.6 2.6 0 1 1-1.6-2.4V8L11.6 9v6.7A2.6 2.6 0 1 1 10 13.3z"/></g>,
  globe: <g fill="none" stroke="#fff" strokeWidth="1.6"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.2 2.5 13.8 0 16M12 4c-2.5 2.2-2.5 13.8 0 16"/></g>,
  py: <text x="12" y="16.5" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="800" fontSize="11" fill="#fff">py</text>,
  js: <text x="12" y="16.5" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="800" fontSize="11" fill="#fff">JS</text>,
  sh: <text x="12" y="16.5" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="800" fontSize="10" fill="#fff">$_</text>,
  html: <text x="12" y="16.5" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="800" fontSize="9" fill="#fff">{'</>'}</text>,
  plus: <path d="M12 5v14M5 12h14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>,
  doc: <g fill="none" stroke="#fff" strokeWidth="1.6"><path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4M9.5 12h5M9.5 15h5"/></g>,
  trash: <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/></g>,
  spark: <g fill="#fff"><path d="M12 2.6l1.9 6.1 6.1 1.9-6.1 1.9L12 18.6l-1.9-6.1L4 10.6l6.1-1.9z"/><circle cx="18.5" cy="5.5" r="1.5"/><circle cx="5.5" cy="17.5" r="1.2"/></g>,
  play: <g fill="none" stroke="#fff" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" stroke="none"/></g>,
};

function Glyph({ name }){ return <svg viewBox="0 0 24 24" aria-hidden="true">{GLYPHS[name] || GLYPHS.grid}</svg>; }

function AppIcon({ app, size }){
  const st = size ? { width:size, height:size } : null;
  return (
    <div className="appicon" style={{ background: app.color, ...st }}>
      <Glyph name={app.glyph} />
    </div>
  );
}

/* gradients tuned to read as multi-color over neutral chrome */
const OS_APPS = [
  { id:'assistant',name:'Alfa',         glyph:'spark',    color:'linear-gradient(160deg,#9b5cff,#5b2fe0)',  w:820, h:640, dock:true },
  { id:'files',   name:'Files',          glyph:'folder',   color:'linear-gradient(160deg,#3aa0ff,#1f6dff)',  w:880, h:560, dock:true },
  { id:'video',   name:'Reel Editor',    glyph:'film',     color:'linear-gradient(160deg,#ff6a9b,#c5318f)',  w:1080,h:660, dock:true },
  { id:'media',   name:'Media Studio',   glyph:'image',    color:'linear-gradient(160deg,#ffb13b,#ff6a3d)',  w:920, h:600, dock:true },
  { id:'editor',  name:'Code',           glyph:'code',     color:'linear-gradient(160deg,#3a8ef0,#1f5fd6)',  w:980, h:660, dock:true },
  { id:'preview', name:'Preview',        glyph:'play',     color:'linear-gradient(160deg,#9aa0ac,#5b6070)',  w:820, h:600 },
  { id:'browser', name:'Browser',        glyph:'globe',    color:'linear-gradient(160deg,#4aa3ff,#2f6df0)',  w:1040,h:700, dock:true },
  { id:'terminal',name:'Terminal',       glyph:'terminal', color:'linear-gradient(160deg,#3a3f4b,#16181d)',  w:680, h:440, dock:true },
  { id:'monitor', name:'System Monitor', glyph:'gauge',    color:'linear-gradient(160deg,#34d39a,#0f9e6a)',  w:760, h:520, dock:true },
  { id:'launcher',name:'Launchpad',      glyph:'grid',     color:'linear-gradient(160deg,#8a8f9c,#5b6070)',  w:0,   h:0,   dock:true, special:'launchpad' },
  { id:'store',   name:'App Store',      glyph:'store',    color:'linear-gradient(160deg,#7a5cff,#4f2fd6)',  w:880, h:600, dock:true },
  { id:'settings',name:'Settings',       glyph:'gear',     color:'linear-gradient(160deg,#aeb4c0,#6b7180)',  w:720, h:520, dock:true },
  { id:'create',  name:'Create App',     glyph:'plus',     color:'linear-gradient(160deg,#16c2c2,#0a8a8a)',  w:760, h:560 },
];

/* ---------------- mock filesystem ---------------- */
function f(name, kind, extra={}){ return { id:uid('f'), name, kind, ...extra }; }
function makeFS(){
  return {
    '/': [
      f('Media', 'folder'),
      f('Projects', 'folder'),
      f('Downloads', 'folder'),
      f('Documents', 'folder'),
      f('apps', 'folder'),
      f('readme.md', 'file', { ext:'md', size:'2 KB', meta:'Markdown' }),
    ],
    '/Media': [
      f('intro-render.mp4', 'file', { ext:'mp4', size:'48 MB', meta:'1080p · 00:24', kindTag:'video' }),
      f('logo-anim.mov', 'file', { ext:'mov', size:'72 MB', meta:'4K · 00:08', kindTag:'video' }),
      f('hero-shot.png', 'file', { ext:'png', size:'4.2 MB', meta:'2400×1600', kindTag:'image' }),
      f('thumbnail.jpg', 'file', { ext:'jpg', size:'820 KB', meta:'1280×720', kindTag:'image' }),
      f('voiceover.wav', 'file', { ext:'wav', size:'9.1 MB', meta:'00:42', kindTag:'audio' }),
      f('raw', 'folder'),
    ],
    '/Media/raw': [
      f('clip-001.mp4', 'file', { ext:'mp4', size:'120 MB', meta:'4K · 00:31', kindTag:'video' }),
      f('clip-002.mp4', 'file', { ext:'mp4', size:'98 MB', meta:'4K · 00:27', kindTag:'video' }),
    ],
    '/Projects': [
      f('launch-promo', 'folder' ),
      f('q3-explainer', 'folder' ),
      f('remotion.config.ts', 'file', { ext:'ts', size:'1.4 KB', meta:'TypeScript', kindTag:'code' }),
    ],
    '/Projects/launch-promo': [
      f('Root.tsx', 'file', { ext:'tsx', size:'3.2 KB', meta:'Remotion composition', kindTag:'code' }),
      f('assets', 'folder'),
    ],
    '/Projects/launch-promo/assets': [],
    '/Projects/q3-explainer': [],
    '/Downloads': [
      f('build-2.7.1.tar.gz', 'file', { ext:'gz', size:'212 MB', meta:'Archive' }),
      f('invoice-may.pdf', 'file', { ext:'pdf', size:'320 KB', meta:'PDF document' }),
      f('font-pack.zip', 'file', { ext:'zip', size:'18 MB', meta:'Archive' }),
    ],
    '/Documents': [
      f('roadmap.md', 'file', { ext:'md', size:'6 KB', meta:'Markdown' }),
      f('budget.csv', 'file', { ext:'csv', size:'44 KB', meta:'Spreadsheet' }),
    ],
    '/apps': [
      f('color-picker', 'folder', { appPkg:true, runtime:'html' }),
      f('backup.sh', 'file', { ext:'sh', size:'1.1 KB', meta:'Shell script', kindTag:'code' }),
      f('scraper.py', 'file', { ext:'py', size:'2.8 KB', meta:'Python', kindTag:'code' }),
    ],
    '/apps/color-picker': [
      f('manifest.json', 'file', { ext:'json', size:'480 B', meta:'App manifest', kindTag:'code' }),
      f('index.html', 'file', { ext:'html', size:'5.6 KB', meta:'Entry point', kindTag:'code' }),
    ],
  };
}

Object.assign(window, { Glyph, AppIcon, OS_APPS, makeFS, uid });
