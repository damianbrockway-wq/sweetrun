// ─── Fix pass 2: shared UI pieces (season test items 23 to 35, P2) ──────────
// The operation profile (what to show a bucket producer), metric display, the
// date chips for a new entry, and the line under a delete that says what goes
// with it. The rules themselves live in 28-rs-truth2 and are tested there.

// Display globals, set by the core on every render before any child renders
// (as RS_LANG is): SR_MEASURE is sg_measure ('us' | 'metric' | null), SR_UNITS the
// volume unit. srMetric() is the one question every screen asks.
let SR_MEASURE = null, SR_UNITS = 'GAL';
const srMetric = () => srMetricOf(SR_MEASURE, SR_UNITS, RS_LANG);
// A stored °F as shown, its unit, and a typed value back to °F.
const srTempShow = (f, dp = 0) => f == null || !isFinite(f) ? '·' : fmt(srMetric() ? srFtoC(+f) : +f, dp);
const srTempUnit = () => srMetric() ? '°C' : '°F';
const srTempTxt = (f, dp = 0) => srTempShow(f, dp) + srTempUnit();
const srTempFromShown = v => srMetric() ? srCtoF(+v) : +v;
const srWindTxt = mph => srMetric() ? `${fmt(srMphToKmh(+mph), 0)} km/h` : `${fmt(+mph, 0)} mph`;
// Tree diameter: stored in inches (dbh), shown in cm in metric.
const srDbhTxt = inches => !(+inches > 0) ? '' : srMetric() ? `${fmt(srInToCm(+inches), 0)} cm` : `${fmt(+inches, 0)} ${srUnitL('in', RS_LANG)}`;
// Rain: stored in inches, shown in mm in metric.
const srRainTxt = inches => srMetric() ? `${fmt(+inches * 25.4, 0)} mm` : `${fmt(+inches, 2)} ${srUnitL('in', RS_LANG)}`;

// Fuel in litre mode (item 33): oil and propane by the litre, natural gas in m³; firewood stays
// in cords. Stored amounts and prices keep the fuel's own unit (gallons, ccf), as always:
// shown = stored * k, and a price shown = stored price / k.
function srFuelShow(fuel, units, lang) {
  const f = fuel || FUELS[0];
  if (units === 'L' && f.unit === 'gal') return { u: 'L', k: 3.785411784 };
  if (units === 'L' && f.unit === 'ccf') return { u: 'm³', k: 2.8316846592 };
  return { u: lang === 'fr' ? (f.unitFr || f.unit) : f.unit, k: 1 };
}

// ── The operation profile (items 24, 35) ─────────────────────────────────────
function selProfile(season) {
  const pins = srArr(ls.get('sg_lines_pins', []));
  const logs = ls.get('sg_logs2', {}) || {};
  const roEntries = Object.values(logs).reduce((n, sl) => n + ((sl && sl.sapRO) || []).length, 0);
  const rd = srObj(ls.get('sg_readings', {}));
  const vacReadings = Object.values(rd).reduce((n, a) => n + srArr(a).filter(r => r && typeof r.s === 'string' && (r.s.startsWith('line:') || r.s.startsWith('pump:'))).length, 0);
  return srOpProfileOf({ wizard: ls.get('sg_wizard_data', {}) || {}, pumps: srArr(ls.get('sg_pumps', [])),
    mainlines: selMainlines(pins).length, roEntries, vacReadings });
}
function useSrProfile() { const v = useSrDataVersion(); return React.useMemo(() => selProfile(), [v]); }
// Words that change for a bucket producer: rt() reads them through RS_ALIAS (81-rs-routes).
// Only labels and empty states change; nothing he entered is hidden.
const SR_ALIAS_BK = { st_lines: 'st_lines_bk', st_lines_s: 'st_lines_s_bk', st_lines_l: 'st_lines_l_bk', linesLede: 'linesLede_bk' };
const SR_ALIAS_NOPUMP = { pumpCenterSub: 'pumpCenterSub_bk', pumpsLedeEmpty: 'pumpsLedeEmpty_bk', pumpsEmptyT2: 'pumpsEmptyT2_bk', watchLede: 'watchLede_bk' };
const SR_ALIAS_NORO = { st_collect: 'st_collect_nr', st_collect_l: 'st_collect_l_nr', collectLede: 'collectLede_nr', tankNoneP: 'tankNoneP_nr' };
function srAliasFor(p) {
  if (!p || !p.simple) return {};
  return { ...(p.showRo ? {} : SR_ALIAS_NORO), ...(p.hasPumps ? {} : { ...SR_ALIAS_NOPUMP, pumpsEmptyP2: p.buckets ? 'pumpsEmptyP2_bk' : 'pumpsEmptyP2_gt' }),
    ...(p.buckets && !p.hasLines ? SR_ALIAS_BK : {}) };
}

// "the RO, the transfer pump and the low spots": a freeze job's list in words.
function rtList(L, keys) {
  const w = (keys || []).map(k => rt(L, k));
  if (w.length < 2) return w.join('');
  return w.slice(0, -1).join(', ') + ' ' + rt(L, 'andW') + ' ' + w[w.length - 1];
}
// "1 line", "3 lines"
const rtLines = (L, n) => rt(L, n === 1 ? 'linesN1' : 'linesN', { n: fmt(n, 0) });

// ── 28 · When: Today, Yesterday or a date (the tank sheet's chips) ───────────
function RsWhenDate({ c, value, onChange, id }) {
  const L = c.lang;
  const R = srLogDateRange(srToday());
  const pick = value !== R.today && value !== R.yesterday;
  const [open, setOpen] = useState(pick);
  const opts = [[R.today, rt(L, 'todayW')], ...(R.yesterday ? [[R.yesterday, rt(L, 'yesterdayW')]] : []), ['pick', rt(L, 'pickDateW')]];
  return <>
    <label className="rs-fl">{rt(L, 'whenLogged')}</label>
    <RsChips label={rt(L, 'whenLogged')} value={open ? 'pick' : value} onChange={x => { if (x === 'pick') { setOpen(true); return; } setOpen(false); onChange(x); }} options={opts} />
    {open && <input id={id} className="rs-field" type="date" value={value} min={R.min} max={R.max} aria-label={rt(L, 'pickDateW')}
      style={{ marginTop: 10 }} onChange={e => { if (e.target.value) onChange(e.target.value); }} />}
    {value !== R.today && <p className="rs-note tn" id="rs-log-when-note">{rt(L, 'loggedFor', { d: srDateLong(value, L) })}</p>}
  </>;
}
// A long date in the language: "Tuesday, March 16, 2027" / "mardi 16 mars 2027".
function srDateLong(iso, L) {
  const p = srDateParts(iso); if (!p) return String(iso || '');
  try { return new Date(p.y, p.mo - 1, p.d, 12).toLocaleDateString(L === 'fr' ? 'fr-CA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso; }
}
// A date without the weekday: "March 16, 2027" / "16 mars 2027".
function srDateMid(iso, L) {
  const p = srDateParts(iso); if (!p) return String(iso || '');
  try { return new Date(p.y, p.mo - 1, p.d, 12).toLocaleDateString(L === 'fr' ? 'fr-CA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return iso; }
}

// ── 27 · A delete that says what goes with it ────────────────────────────────
// The app's one delete control (tap, then tap again within 3 s), with the
// consequence in words above it while it is armed.
function RsDeleteBtn({ c, label, consequence, onDelete, id }) {
  const L = c.lang;
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const tm = setTimeout(() => setArmed(false), 6000); return () => clearTimeout(tm); }, [armed]);
  return <div className="rs-delblock" style={{ marginTop: 12 }}>
    {armed && consequence && <p className="rs-errline" role="alert" id={id ? id + '-what' : undefined}>{consequence}</p>}
    <RsBtn kind="bad" id={id} onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); onDelete(); }}>{armed ? rt(L, 'tapAgainDelete') : label}</RsBtn>
  </div>;
}
