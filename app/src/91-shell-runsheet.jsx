// ─── Run Sheet shell ──────────────────────────────────────────────────────────
// The new responsive shell (Phase 4). Tabs: Season · Bush · Log (+) · Pumps ·
// Shack; side nav at >=1100px adds Watch. The only shell since cutover: every
// screen is a route in RS_SCREENS (81-rs-routes.jsx) or a branch below.

// ── Global banner slot: directly above every screen ──────────────────────────
// Same triggers, meaning and actions as the pre-cutover app's banners: write
// refused, trial expired, first-season setup, sap-run alert. Ordered by urgency: a refused write is the one that loses data.
function RsBanners({ c }) {
  const L = c.lang;
  const out = [];
  if (c.writeFail) out.push(
    <div key="wf" className="rs-banner bad" role="alert">
      <span className="rs-bic"><RsIcon name="alert" size={26} sw={2.4} /></span>
      <span className="rs-bt"><b>{rt(L,'bNotSavedT')}</b><span>{rt(L, c.writeFail === 'locked' ? 'bLockedP' : 'bQuotaP')}</span></span>
      {c.writeFail === 'locked'
        ? <button type="button" className="rs-bbtn" onClick={()=>c.setShowLicense(true)}>{rt(L,'bEnterKey')}</button>
        : <button type="button" className="rs-bbtn" onClick={()=>c.setShowBackup(true)}>{rt(L,'bBackup')}</button>}
      <button type="button" className="rs-bx" aria-label={rt(L,'dismiss')} onClick={()=>c.setWriteFail(null)}><RsIcon name="x" size={20} /></button>
    </div>);
  if (c.lic.status === 'expired') out.push(
    <div key="ex" className="rs-banner">
      <span className="rs-bic"><RsIcon name="lock" size={24} /></span>
      <span className="rs-bt"><b>{rt(L,'bExpiredT')}</b><span>{rt(L,'bExpiredP')}</span></span>
      <button type="button" className="rs-bbtn primary" onClick={()=>c.setShowLicense(true)}>{rt(L,'bGetPass')}</button>
    </div>);
  if (!ls.get('sg_wizard_done', false) && parseInt(c.trees) === 0 && !c.onboard && !c.showWizard) out.push(
    <div key="fs" className="rs-banner tap">
      <span className="rs-bic"><RsIcon name="tree" size={26} /></span>
      <span className="rs-bt"><b>{rt(L,'bFirstT')}</b><span>{rt(L,'bFirstP')}</span></span>
      <button type="button" className="rs-bbtn" onClick={()=>c.setShowWizard(true)}>{rt(L,'bFirstBtn')}</button>
    </div>);
  if (c.notifBanner) out.push(
    <div key="run" className="rs-banner ok">
      <span className="rs-bic"><RsIcon name="drop" size={24} /></span>
      <span className="rs-bt"><b>{c.notifBanner}</b></span>
      <button type="button" className="rs-bx" aria-label={rt(L,'dismiss')} onClick={()=>c.setNotifBanner(null)}><RsIcon name="x" size={20} /></button>
    </div>);
  return out.length ? <div className="rs-banners">{out}</div> : null;
}

// ── License chip: "Trial · 12 days" / "Season Pass" / "Unlock" ────────────────
function RsLicenseChip({ c }) {
  const s = c.lic.status;
  if (s === 'checking') return null;
  const L = c.lang;
  const label = s === 'licensed' ? rt(L,'chipPass') : s === 'expired' ? rt(L,'chipUnlock')
    : c.lic.daysLeft === 1 ? rt(L,'chipTrial1') : rt(L,'chipTrial', { n:c.lic.daysLeft });
  return (
    <button type="button" className={`rs-lic${s === 'licensed' ? ' ok' : s === 'expired' ? ' bad' : ''}`}
      onClick={()=>c.setShowLicense(true)}>{label}</button>
  );
}

// The device clock, re-read every 30 s so the greeting turns over while the app is open.
function useRsNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  return now;
}
function rsWhen(d, lang) {
  const L = lang === 'fr' ? 'fr' : 'en';
  const day = `${DAY[L][d.getDay()]} ${d.getDate()} ${MON[L][d.getMonth()]}`;
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  const time = L === 'fr' ? `${h} h ${m}` : `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
  return `${day} · ${time}`;
}

// The classic run-alert permission prompt, carried over unchanged in behaviour.
function RsNotifPrompt({ c }) {
  if (!('Notification' in window) || Notification.permission !== 'default' || !ls.get('sg_ddlat', null)) return null;
  return (
    <div className="rs-banner" style={{ marginTop:12 }}>
      <span className="rs-bic"><RsIcon name="sun" size={24} /></span>
      <span className="rs-bt"><b>{t(c.lang,'runAlertTitle')}</b><span>{t(c.lang,'runAlertDesc')}</span></span>
      <button type="button" className="rs-bbtn" onClick={()=>Notification.requestPermission()}>{t(c.lang,'enable')}</button>
    </div>
  );
}

// Bush, Pumps and Watch are built in 50-rs-bush.jsx, 51-rs-pumps.jsx and 52-rs-watch.jsx (Phases 7-8).

function RsNotFound({ c, to }) {
  useEffect(() => { rsGo(to || 'season'); }, []);
  return null;
}

// ── Navigation: bottom tabs (phone, iPad portrait) and side nav (>=1100) ─────
const RS_NAV = [
  { id:'season', icon:'season', label:'tabSeason', path:'season' },
  { id:'bush',   icon:'bush',   label:'tabBush',   path:'bush' },
  { id:'log',    icon:'plus',   label:'tabLog' },
  { id:'pumps',  icon:'pump',   label:'tabPumps',  path:'pumps' },
  { id:'watch',  icon:'watch',  label:'tabWatch',  path:'watch', sideOnly:true },
  { id:'shack',  icon:'shack',  label:'tabShack',  path:'shack' },
];
function RsNav({ side, active, lang, onLog }) {
  const items = RS_NAV.filter(n => side || !n.sideOnly);
  return (
    <nav className={side ? 'rs-side' : 'rs-tabs'} aria-label={rt(lang, 'navMain')}>
      {side && <div className="rs-navbrand"><RsBrandMark /><b>SweetRun</b></div>}
      {items.map(n => n.id === 'log'
        ? <button key={n.id} type="button" className="log" style={side ? { order:-1 } : undefined} aria-label={rt(lang,'logAria')} onClick={onLog}>
            <RsIcon name="plus" size={26} sw={2.6} />{rt(lang,n.label)}
          </button>
        : <button key={n.id} type="button" className={active === n.id ? 'on' : ''} aria-current={active === n.id ? 'page' : undefined}
            onClick={()=>rsGo(n.path)}>
            <RsIcon name={n.icon} size={25} sw={2.5} />{rt(lang,n.label)}
          </button>)}
    </nav>
  );
}

function RunSheetApp() {
  const c = useSrCore();
  const seg = useRsRoute();
  const path = seg.join('/');
  const top = seg[0] || 'season';
  const active = ['bush','pumps','watch','shack'].includes(top) ? top : 'season';

  // Log, from the tab bar or side nav: the Run Sheet log sheet opens over the
  // current screen on the kind used last (sg_log_last_kind), as LogTab's did.
  const [logSheet, setLogSheet] = useState(null);
  const openLog = React.useCallback(kind => setLogSheet({ kind: kind || ls.get('sg_log_last_kind', 'sapCollected'), n: Date.now() }), []);
  const onLog = () => openLog(null);
  useEffect(() => {
    const h = () => openLog(null);
    window.addEventListener('sr-log-a-run', h);
    return () => window.removeEventListener('sr-log-a-run', h);
  }, []);
  // Recap's ratio-check card jumps to the entry list.
  useEffect(() => {
    const h = () => rsGo('shack/log');
    window.addEventListener('sr-goto-entries', h);
    return () => window.removeEventListener('sr-goto-entries', h);
  }, []);
  useEffect(() => { try { window.scrollTo(0, 0); } catch {} }, [path]);
  // Watch mode's Exit goes back to the screen it was opened from.
  const lastPath = React.useRef(path);
  useEffect(() => { if (lastPath.current !== path) { srPrevRoute = lastPath.current; lastPath.current = path; } }, [path]);

  let view;
  const SV = top === 'stage' && seg.length === 2 ? RS_STAGE_VIEW[seg[1]] : null;
  const sc = RS_SCREENS[path] && !(RS_SCREENS[path].beta && !BETA_FEATURES) ? RS_SCREENS[path] : null;
  if (!seg.length || top === 'season') view = <RsSeason c={c} openLog={openLog} />;
  else if (SV) view = <SV c={c} openLog={openLog} />;
  else if (sc) view = sc.view(c, openLog);
  else if (path === 'stage/boil/day') view = <RsNotFound c={c} to="stage/boil" />;
  else if (top === 'bush') view = <RsBush c={c} sub={seg.slice(1)} />;
  else if (top === 'pumps') view = <RsPumps c={c} sub={seg.slice(1)} openLog={openLog} />;
  else if (top === 'watch') view = <RsWatch c={c} sub={seg.slice(1)} />;
  else if (path === 'shack') view = <RsShack c={c} />;
  else view = <RsNotFound c={c} />;

  const hasHero = !seg.length || top === 'season' || !!SV || path === 'pumps' || (top === 'pumps' && seg[1] === 'tank');
  const cls = `rs-app${hasHero ? ' rs-hashero' : ''}${path === 'stage/boil' ? ' rs-boilroute' : ''}${top === 'bush' ? ' rs-bushroute' : ''}${top === 'watch' ? ' rs-watchroute' : ''}`;
  return (
    <div className={cls} data-route={path || 'season'}>
      <RsNav side active={active} lang={c.lang} onLog={onLog} />
      <main className="rs-main" key={path}>
        {(c.onboard || c.showWizard) && (
          <RsWizard c={c}
            onClose={()=>{ ls.set('sg_onboarded', true); c.setOnboard(false); c.setShowWizard(false); }}
            onComplete={data=>{
              if(data.trees > 0) { c.setTrees(data.trees); ls.set('sg_trees', data.trees); }
              if(data.fuelType) { c.setFuelType(data.fuelType); ls.set('sg_fuel', data.fuelType); }
              c.setOnboard(false); c.setShowWizard(false); srToast(rt(c.lang,'wzSaved'));
            }}
          />
        )}
        {view}
      </main>
      <RsNav active={active} lang={c.lang} onLog={onLog} />
      {(c.showBackup || c.showSettings) && <RsBackupSheet c={c} onClose={()=>{ c.setShowBackup(false); c.setShowSettings(false); }} />}
      {logSheet && <RsLogSheet key={logSheet.n} c={c} kind={logSheet.kind} onClose={() => setLogSheet(null)} />}
      <RsToast />
      {c.showLicense && <RsPassSheet c={c} onClose={()=>c.setShowLicense(false)} />}
    </div>
  );
}
