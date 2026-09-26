// ─── Run Sheet shell ──────────────────────────────────────────────────────────
// The new responsive shell (Phase 4). Tabs: Season · Bush · Log (+) · Pumps ·
// Shack; side nav at >=1100px adds Watch. Every classic screen is mounted under
// its new home (RS_SCREENS in 81-rs-routes.jsx), so nothing is lost on day one.
// Later phases swap a route's render for the rebuilt screen; the shell, banner
// slot and routes stay.

// ── Global banner slot: directly above every screen ──────────────────────────
// Same triggers, same meaning and same actions as the classic banners
// (90-shell-classic.jsx): write refused, trial expired, first-season setup,
// sap-run alert. Ordered by urgency: a refused write is the one that loses data.
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

// ── A classic screen mounted under its new home ───────────────────────────────
function RsClassicScreen({ c, path, go }) {
  const L = c.lang;
  const sc = RS_SCREENS[path];
  const segs = path.split('/');
  const parent = segs.slice(0, -1).join('/');
  const parentLabel = segs[0] === 'shack' ? rt(L,'shackTitle') : rt(L, 'st_' + segs[1]);
  return (
    <div className="rs-inner">
      <header className="rs-phead">
        <RsPushBar href={rsHref(parent)} label={parentLabel} />
        <h1 className="sm">{rt(L, sc.title)}</h1>
      </header>
      <RsBanners c={c} />
      <div className="rs-classic rs-classic-wrap">{sc.render(c, go)}</div>
    </div>
  );
}

// ── Bush (the map) ────────────────────────────────────────────────────────────
function RsBush({ c }) {
  return (
    <div className="rs-inner">
      <header className="rs-phead"><h1 className="sm">{rt(c.lang,'bushTitle')}</h1></header>
      <RsBanners c={c} />
      <div className="rs-classic">{BETA_FEATURES ? <LinesTab lang={c.lang} /> : null}</div>
    </div>
  );
}

// ── Pumps: designed empty state until Phase 8 (never sample data) ─────────────
function RsPumps({ c }) {
  const L = c.lang;
  return (
    <>
      <RsHero photo="pumphouse" />
      <div className="rs-inner">
        <header className="rs-phead">
          <h1>{rt(L,'pumpsTitle')}</h1>
          <p className="rs-lede">{rt(L,'pumpsLede')}</p>
        </header>
        <RsBanners c={c} />
        <div className="rs-empty">
          <div className="rs-mk"><M.tubing size={48} /></div>
          <b>{rt(L,'pumpsEmptyT')}</b>
          <p>{rt(L,'pumpsEmptyP')}</p>
        </div>
        <h2 className="rs-sec">{rt(L,'tabPumps')}</h2>
        <div className="rs-list">
          <RsRow icon="pump" family="collect" title={rt(L,'openEquip')} sub={rt(L,'openEquipSub')} href={rsHref('shack/equipment')} />
          <RsRow icon="watch" family="lines" title={rt(L,'watchTitle')} sub={rt(L,'watchLede')} href={rsHref('watch')} />
        </div>
      </div>
    </>
  );
}

// ── Watch mode: empty state until Phase 8 ─────────────────────────────────────
function RsWatch({ c }) {
  const L = c.lang;
  return (
    <>
      <RsHero photo="hillside-panorama" />
      <div className="rs-inner">
        <header className="rs-phead">
          <h1>{rt(L,'watchTitle')}</h1>
          <p className="rs-lede">{rt(L,'watchLede')}</p>
        </header>
        <RsBanners c={c} />
        <div className="rs-empty">
          <div className="rs-mk"><M.tree size={48} /></div>
          <b>{rt(L,'watchEmptyT')}</b>
          <p>{rt(L,'watchEmptyP')}</p>
        </div>
        <div className="rs-list" style={{ marginTop:12 }}>
          <RsRow icon="map" family="lines" title={rt(L,'openBush')} href={rsHref('bush')} />
        </div>
      </div>
    </>
  );
}

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
    <nav className={side ? 'rs-side' : 'rs-tabs'} aria-label="Main">
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

  // Classic screens navigate with classic tab ids (go('boilpt')); send them home.
  const go = React.useCallback(id => rsGo(CLASSIC_ROUTE[id] || 'season'), []);
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

  let view;
  const SV = top === 'stage' && seg.length === 2 ? RS_STAGE_VIEW[seg[1]] : null;
  const sc = RS_SCREENS[path] && !(RS_SCREENS[path].beta && !BETA_FEATURES) ? RS_SCREENS[path] : null;
  if (!seg.length || top === 'season') view = <RsSeason c={c} go={go} openLog={openLog} />;
  else if (SV) view = <SV c={c} openLog={openLog} />;
  else if (sc && sc.view) view = sc.view(c, go, openLog);
  else if (sc) view = <RsClassicScreen c={c} path={path} go={go} />;
  else if (path === 'stage/boil/day') view = <RsNotFound c={c} to="stage/boil" />;
  else if (path === 'bush') view = <RsBush c={c} />;
  else if (path === 'pumps') view = <RsPumps c={c} />;
  else if (path === 'watch') view = <RsWatch c={c} />;
  else if (path === 'shack') view = <RsShack c={c} />;
  else view = <RsNotFound c={c} />;

  const hasHero = !seg.length || top === 'season' || !!SV || path === 'pumps' || path === 'watch';
  return (
    <div className={`rs-app${hasHero ? ' rs-hashero' : ''}${path === 'stage/boil' ? ' rs-boilroute' : ''}`} data-route={path || 'season'}>
      <RsNav side active={active} lang={c.lang} onLog={onLog} />
      <main className="rs-main" key={path}>
        {(c.onboard || c.showWizard) && (
          <div className="rs-classic">
            <FirstSeasonWizard
              onClose={()=>{ ls.set('sg_onboarded', true); c.setOnboard(false); c.setShowWizard(false); }}
              onComplete={data=>{
                if(data.trees > 0) { c.setTrees(data.trees); ls.set('sg_trees', data.trees); }
                if(data.fuelType) { c.setFuelType(data.fuelType); ls.set('sg_fuel', data.fuelType); }
                c.setOnboard(false); c.setShowWizard(false);
              }}
            />
          </div>
        )}
        {view}
      </main>
      <RsNav active={active} lang={c.lang} onLog={onLog} />
      {c.showSettings && <SettingsSheet units={c.units} setUnits={c.setUnits} lang={c.lang} setLang={c.setLang}
        season={c.season} setSeason={c.setSeason} onWizard={()=>c.setShowWizard(true)}
        onBackup={()=>c.setShowBackup(true)} onClose={()=>c.setShowSettings(false)} />}
      {c.showBackup && <BackupModal onClose={()=>c.setShowBackup(false)} />}
      {logSheet && <RsLogSheet key={logSheet.n} c={c} kind={logSheet.kind} onClose={() => setLogSheet(null)} />}
      <RsToast />
      {c.showLicense && <LicenseModal lic={c.lic} onClose={()=>c.setShowLicense(false)}
        onLicenseSaved={p=>c.setLic({ status:'licensed', until:p.x })} />}
    </div>
  );
}
