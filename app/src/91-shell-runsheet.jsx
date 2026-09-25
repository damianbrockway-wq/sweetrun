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

// ── Season (home) ─────────────────────────────────────────────────────────────
function RsSeason({ c, go }) {
  const L = c.lang;
  const now = useRsNow();
  const part = srDayPart(srMinutesOf(now));
  return (
    <>
      <RsHero photo={SR_GREET_PHOTO[part]} />
      <div className="rs-inner">
        <header className="rs-phead">
          <div className="rs-topbar">
            <div className="rs-greet"><RsBrandMark /><span className="rs-gname" data-part={part}>{srGreeting(part, c.firstName, L)}</span></div>
          </div>
          <div className="rs-whenrow">
            <span className="rs-when tn">{rsWhen(now, L)}</span>
            <RsLicenseChip c={c} />
          </div>
          <div className="rs-eyebrow">{rt(L,'seasonN', { y:c.season })}</div>
          <h1>{rt(L,'today')}</h1>
        </header>
        <RsBanners c={c} />
        <section className="rs-card" aria-label={rt(L,'stages')}>
          <div className="rs-eyebrow plain">{rt(L,'stages')}</div>
          <div className="rs-spills">
            {RS_STAGES.map(s => (
              <a key={s.id} className="rs-sp" href={rsHref('stage/' + s.id)} style={{ textDecoration:'none' }}>
                <RsTile icon={s.icon} family={s.family} size={36} />
                <span>{rt(L, 'st_' + s.id + '_s')}</span>
              </a>
            ))}
          </div>
        </section>
        <h2 className="rs-sec">{rt(L,'todayCard')}</h2>
        <div className="rs-classic">
          <TodayTab lang={c.lang} units={c.units} season={c.season} trees={c.trees} sapBrix={c.sapBrix} go={go} />
          <RsNotifPrompt c={c} />
        </div>
      </div>
    </>
  );
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

// ── Stage hub ─────────────────────────────────────────────────────────────────
function RsStage({ c, id }) {
  const L = c.lang;
  const i = RS_STAGES.findIndex(s => s.id === id);
  const st = RS_STAGES[i];
  if (!st) return <RsNotFound c={c} />;
  const rows = (RS_STAGE_SCREENS[id] || []).filter(p => p === '#bush' ? BETA_FEATURES : !(RS_SCREENS[p].beta && !BETA_FEATURES));
  return (
    <>
      <RsHero photo={st.photo} />
      <div className="rs-inner">
        <header className="rs-phead">
          <RsPushBar href={rsHref('season')} label={rt(L,'tabSeason')} />
          <div className="rs-eyebrow">{rt(L,'stageOf', { n:i + 1 })}</div>
          <h1 className="sm">{rt(L, 'st_' + id)}</h1>
          <p className="rs-lede">{rt(L, 'st_' + id + '_l')}</p>
        </header>
        <RsBanners c={c} />
        <div className="rs-list">
          {rows.map(p => p === '#bush'
            ? <RsRow key={p} icon="map" family="lines" title={rt(L,'sc_map')} sub={rt(L,'sc_map_s')} href={rsHref('bush')} />
            : <RsRow key={p} icon={RS_SCREENS[p].icon} family={RS_SCREENS[p].family} title={rt(L, RS_SCREENS[p].title)} sub={rt(L, RS_SCREENS[p].sub)} href={rsHref(p)} />)}
        </div>
      </div>
    </>
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

// ── Sugar Shack ───────────────────────────────────────────────────────────────
function RsShack({ c }) {
  const L = c.lang;
  const row = p => <RsRow key={p} icon={RS_SCREENS[p].icon} family={RS_SCREENS[p].family}
    title={rt(L, RS_SCREENS[p].title)} sub={rt(L, RS_SCREENS[p].sub)} href={rsHref(p)} />;
  const s = c.lic.status;
  const passTitle = s === 'licensed' ? rt(L,'pass_licensed') : s === 'expired' ? rt(L,'pass_expired')
    : s === 'trial' ? rt(L,'pass_trial', { n:c.lic.daysLeft }) : rt(L,'pass_checking');
  const [nameDraft, setNameDraft] = useState(c.firstName || '');
  const toClassic = () => {
    try { localStorage.setItem('sg_look', JSON.stringify('classic')); } catch {}
    location.href = '/app/?look=classic';
  };
  return (
    <div className="rs-inner">
      <header className="rs-phead">
        <h1>{rt(L,'shackTitle')}</h1>
        <p className="rs-lede">{rt(L,'shackLede')}</p>
      </header>
      <RsBanners c={c} />
      <div className="rs-cols three">
        <div>
          <h2 className="rs-sec">{rt(L,'secCalc')}</h2>
          <div className="rs-list">
            {['shack/sap','stage/boil/evaporator','stage/collect/ro','stage/boil/draw-off','stage/boil/finishing','stage/lines/tubing'].map(row)}
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'secRecords')}</h2>
          <div className="rs-list">{['shack/log','shack/equipment','shack/checklists'].map(row)}</div>
          <h2 className="rs-sec">{rt(L,'secGuide')}</h2>
          <div className="rs-list">{['shack/guide'].map(row)}</div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'secPass')}</h2>
          <div className="rs-list">
            <RsRow icon="pass" family={s === 'expired' ? 'bad' : 'power'} title={passTitle} sub={rt(L,'pass_sub')} onClick={()=>c.setShowLicense(true)} />
          </div>
          <h2 className="rs-sec">{rt(L,'secSettings')}</h2>
          <div className="rs-card" style={{ marginBottom:12 }}>
            <label className="rs-fl" htmlFor="rs-first-name">{rt(L,'firstName')}</label>
            <input id="rs-first-name" className="rs-field" type="text" autoComplete="given-name" maxLength={24}
              value={nameDraft} onChange={e=>setNameDraft(e.target.value)} onBlur={()=>c.setFirstName(srGreetName(nameDraft))} />
            <div className="rs-note">{rt(L,'firstNameHint')}</div>
          </div>
          <div className="rs-list">
            <RsRow icon="gear" title={rt(L,'set_prefs')} sub={rt(L,'set_prefs_s')} onClick={()=>c.setShowSettings(true)} />
            <RsRow icon="tree" family="tap" title={rt(L,'set_wizard')} sub={rt(L,'set_wizard_s')} onClick={()=>c.setShowWizard(true)} />
            <RsRow icon="data" title={rt(L,'set_backup')} sub={rt(L,'set_backup_s')} onClick={()=>c.setShowBackup(true)} />
            <RsRow icon="up" title={rt(L,'set_import')} sub={rt(L,'set_import_s')} href={rsHref('shack/log')} />
            <RsRow icon="back" title={rt(L,'set_look')} sub={rt(L,'set_look_s')} onClick={toClassic} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RsNotFound({ c }) {
  useEffect(() => { rsGo('season'); }, []);
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
  // Log, from the tab bar or side nav: open Log history and ask LogTab for its
  // entry sheet, exactly as the classic "Log a run" button does.
  const onLog = () => {
    const already = location.hash === rsHref('shack/log');
    rsGo('shack/log');
    setTimeout(() => window.dispatchEvent(new Event('sr-log-a-run')), already ? 0 : 150);
  };
  // Recap's ratio-check card jumps to the entry list.
  useEffect(() => {
    const h = () => rsGo('shack/log');
    window.addEventListener('sr-goto-entries', h);
    return () => window.removeEventListener('sr-goto-entries', h);
  }, []);
  useEffect(() => { try { window.scrollTo(0, 0); } catch {} }, [path]);

  let view;
  if (!seg.length || top === 'season') view = <RsSeason c={c} go={go} />;
  else if (top === 'stage' && seg.length === 2) view = <RsStage c={c} id={seg[1]} />;
  else if (RS_SCREENS[path] && !(RS_SCREENS[path].beta && !BETA_FEATURES)) view = <RsClassicScreen c={c} path={path} go={go} />;
  else if (path === 'bush') view = <RsBush c={c} />;
  else if (path === 'pumps') view = <RsPumps c={c} />;
  else if (path === 'watch') view = <RsWatch c={c} />;
  else if (path === 'shack') view = <RsShack c={c} />;
  else view = <RsNotFound c={c} />;

  const hasHero = !seg.length || top === 'season' || (top === 'stage' && seg.length === 2) || path === 'pumps' || path === 'watch';
  return (
    <div className={`rs-app${hasHero ? ' rs-hashero' : ''}`} data-route={path || 'season'}>
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
      {c.showLicense && <LicenseModal lic={c.lic} onClose={()=>c.setShowLicense(false)}
        onLicenseSaved={p=>c.setLic({ status:'licensed', until:p.x })} />}
    </div>
  );
}
