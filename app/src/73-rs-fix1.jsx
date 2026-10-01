// ─── Fix pass 1: shared pieces the screens use to say the same thing ────────
// rtTapsLine: the one way a tap count is written ("640 taps", or "640 planned ·
// 28 mapped" when the setup plan and the Bush map disagree).
// RsCloseSeason: close (or reopen) a season, on Recap.

function rtTapsLine(L, T) {
  if (!T) return '';
  if (T.differ) return rt(L, 'tapsPlanMap', { p: fmt(T.planned, 0), m: fmt(T.mapped, 0) });
  return rt(L, T.taps === 1 ? 'tapsN1' : 'tapsN', { n: fmt(T.taps, 0) });
}
// Where the count comes from, for a note under it.
const rtTapsSrc = (L, T) => rt(L, 'tapsSrc_' + (T ? T.src : 'trees'), { n: fmt(T ? T.trees : 0, 0) });

// Close the season: the stage moves to Recap and the Season card stops counting
// run days. Stored in sg_season_closed { [season]: date }; reopening removes it.
function RsCloseSeason({ c }) {
  const L = c.lang;
  const v = useSrDataVersion();
  const closed = React.useMemo(() => selClosed(), [v]);
  const when = closed[c.season];
  const [armed, setArmed] = useState(false);
  const [fail, setFail] = useState(false);
  useEffect(() => { if (!armed) return; const tm = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(tm); }, [armed]);
  const write = next => { if (!ls.set('sg_season_closed', next)) { setFail(true); return false; } setFail(false); srDataChanged(); return true; };
  const close = () => { if (!armed) { setArmed(true); return; } if (write({ ...closed, [c.season]: srToday() })) { setArmed(false); srToast(rt(L, 'seasonClosedT', { y: c.season })); } };
  const reopen = () => { const n = { ...closed }; delete n[c.season]; if (write(n)) srToast(rt(L, 'seasonReopened', { y: c.season })); };
  return (
    <div className="rs-card" id="rs-close-season" style={{ marginTop: 12 }}>
      {when ? <>
        <b className="rs-cardt">{rt(L, 'seasonClosedT', { y: c.season })}</b>
        <p className="rs-meta">{rt(L, 'seasonClosedP', { d: srDateShort(when, L), n: c.season + 1 })}</p>
        <div style={{ marginTop: 10 }}><RsBtn kind="secondary" onClick={reopen} id="rs-reopen-season">{rt(L, 'reopenSeason')}</RsBtn></div>
      </> : <>
        <b className="rs-cardt">{rt(L, 'closeSeasonT', { y: c.season })}</b>
        <p className="rs-meta">{rt(L, 'closeSeasonP')}</p>
        <div style={{ marginTop: 10 }}><RsBtn kind="secondary" icon="check" onClick={close} id="rs-close-season-btn">{rt(L, armed ? 'closeSeasonArm' : 'closeSeasonB', { y: c.season })}</RsBtn></div>
      </>}
      {fail && <p className="rs-errline" role="alert">{rt(L, 'bNotSavedT')}. {rt(L, srFailKey(SR_WRITE_FAIL))}</p>}
    </div>
  );
}

// Inputs refused rather than clamped (item 14): the screens' save buttons call this
// before saving; it focuses the first field showing a problem and says so.
function srFormBlocked(rootId) {
  try {
    // Default scope: the sheet on top, else the page.
    const sheets = document.querySelectorAll('.rs-sheet');
    const root = rootId ? document.getElementById(rootId) : (sheets.length ? sheets[sheets.length - 1] : document);
    const bad = root && root.querySelector('input[aria-invalid="true"]');
    if (bad) { bad.focus(); return true; }
  } catch {}
  return false;
}

// Everything the season PDF reports, from the same sources as the screens.
function srPdfArgs(c) {
  const logs = srReadLogs(c.units), slog = logs[c.season] || {}, brixLog = ls.get('sg_brixlog', []) || [];
  return { season: c.season, trees: c.trees, units: c.units, logs, brixLog, sapBrix: c.sapBrix,
    taps: selTaps(c.trees), brix: srBrixSource({ slog, brixlog: brixLog, season: c.season, setting: c.sapBrix }),
    batches: srBatchesInUnit(ls.get('sg_batches', []) || [], c.units, srLegacyUnits()) };
}

// A tank's "full at", stopping the fill below freezing (srTankFull on the hourly forecast).
// null without a level. { fullH, paused } with fullH null when it does not fill in the forecast.
function useRsTankFull(t) {
  const loc = React.useMemo(() => selLocation(), []);
  const has = !!(t && t.levelGal != null);
  const hourly = useSrHourly(has ? loc : null);
  if (!has) return null;
  const now = Date.now();
  const H = srHourlyRows(hourly);
  const tf = srTankFull({ levelGal: t.levelGal, capGal: t.capGal, fillGalH: t.fillGalH, now, hourly: H.rows, tempF: H.cur });
  return { paused: tf.paused, fullH: tf.atMs != null ? Math.max(0, (tf.atMs - now) / 3600000) : null };
}
