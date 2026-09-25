// ─── BOIL DAY (Pass 6) ────────────────────────────────────────────────────────
// COMMITTED DIRECTION — written before the screen was built (Law 1).
//
//  Direction: "the instrument on the arch." One screen that lives on the
//  sugarhouse iPad for eight hours and reads from three metres. It is Boil
//  Pt's amber card grown into a full instrument: amber owns the draw-off
//  target (the app's one signature colour-moment), teal stays on controls,
//  red appears only past the band. Chrome recedes to 10–11px tracked caps in
//  the map-HUD language; the DATA is 44–56px tabular monospace.
//
//  Density: sparse-and-huge. Pan temp 52px, counters 34px, every control
//  ≥48px for a gloved thumb. One primary action per state: idle → Start
//  boil; boiling → the temp steppers (End boil is quiet at the foot);
//  summary sheet → Log this boil.
//
//  Component vocabulary: existing .card/.scrim/.sheet/.btn-primary/.eyebrow/
//  .data-row + NumInput; new bd-* classes (dial band, needle, steppers,
//  counter chips, HUD strip, steam wisps) defined once in app/index.html.
//  The dial is inline SVG; the target band and needle are the only glowing
//  things in the app outside the map, and that is deliberate.
//
//  Temperature unit: display follows sg_units — GAL → °F primary, L → °C
//  primary (Québec boils in Celsius) — while everything is STORED in °F so
//  srBoilState/finTemp never fork. Steppers move ±0.5/±0.1 in the display
//  unit. The band is ±0.3°F ≡ ±0.17°C (thermometer resolution).
//
//  State machine (formula band, tested): warming → near (fin−2°F) →
//  draw (fin±0.3°F) → over. Wisps + band pulse + needle transition are the
//  only motion; all of it dies under prefers-reduced-motion (CSS kills the
//  keyframes; the JS also skips rendering wisps). Vibration fires once on
//  entering the band, if the device offers it.
//
//  Session: sg_boil_session { start:epoch-ms, sap, syrup, tempF } — epoch
//  timestamp per invariant 6, values in the user's display unit per the
//  Pass-1 litre-semantics decision, one key inside the sg_* backup sweep.
//  "Log this boil" appends sapEvap + syrupMade + boilHours entries to
//  sg_logs2 in exactly LogTab's entry shape through ls.set (invariant 5);
//  totals everywhere then flow through seasonTotals (invariant 4).
//
// Module scope, not inside the tab — a per-render component identity would
// remount its DOM on every clock tick (the BevInput lesson, Pass 2 H5).
function BDCounter({ label, value, dp, u, steps, onAdd, onUndo, canUndo, undoAmt, undoLabel }) {
  return (
    <div className="card bd-panel" style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{label}</div>
          <div className="bd-count-val">{fmt(value, dp)}<span className="bd-count-u"> {u}</span></div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          <div style={{ display:'flex', gap:8 }}>
            {steps.map(n => (
              <button key={n} className="bd-count-btn" onClick={() => onAdd(n)} aria-label={`+${n} ${u} ${label}`}>+{n}</button>
            ))}
          </div>
          <button className="bd-undo" onClick={onUndo} disabled={!canUndo} aria-label={`${undoLabel} ${label}`}>
            {undoLabel}{canUndo ? ` (−${undoAmt})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
function BoilDayTab({ units, season, sapBrix, waterBP, lang='en', go }) {
  const isC   = units === 'L';                       // Québec metric producers boil in °C
  const u     = isC ? 'L' : 'gal';
  const f2d   = f => isC ? (f - 32) * 5 / 9 : f;     // display unit
  const d2f   = d => isC ? d * 9 / 5 + 32 : d;
  const round1 = n => Math.round(n * 10) / 10;

  const finT  = Math.round(finTemp(waterBP) * 10) / 10;
  const loF   = waterBP - 2, hiF = finT + 4;         // dial range, °F

  // ── The session ──
  const [sess, setSess] = useState(() => ls.get('sg_boil_session', null));
  const active = !!(sess && sess.start);
  const persist = s => { setSess(s); ls.set('sg_boil_session', s); };
  const tempF  = active ? sess.tempF : null;
  const state  = active ? srBoilState(tempF, waterBP) : 'idle';

  // Clock: one ticking second while boiling (drives elapsed + rate).
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [active]);
  const elapsedMs = active ? Math.max(0, nowTs - sess.start) : 0;
  const hrs = elapsedMs / 3600000;
  const fmtHMS = ms => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  };

  // Wake lock while boiling — progressive enhancement, re-acquired when the
  // tab becomes visible again, released on end/unmount. Failure is silent:
  // an unsupported browser just dims as it always did.
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null, gone = false;
    const req = async () => {
      try { if (!gone && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); }
      catch {}
    };
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    req();
    document.addEventListener('visibilitychange', onVis);
    return () => { gone = true; document.removeEventListener('visibilitychange', onVis); try { lock && lock.release(); } catch {} };
  }, [active]);

  // One short buzz on entering the band — a physical "look up now."
  const prevState = React.useRef(state);
  useEffect(() => {
    if (state === 'draw' && prevState.current !== 'draw' && navigator.vibrate) {
      try { navigator.vibrate([180, 90, 180]); } catch {}
    }
    prevState.current = state;
  }, [state]);

  // ── Controls ──
  // Temp stored at 0.01°F so °C steps (±0.18°F) don't drift; shown at 0.1.
  const roundT = f => Math.round(f * 100) / 100;
  const clampF = f => Math.min(hiF + 4, Math.max(loF - 2, f));
  const bump = dDisp => persist({ ...sess, tempF: roundT(clampF(d2f(f2d(sess.tempF) + dDisp) )) });
  const setTempDisp = d => persist({ ...sess, tempF: roundT(clampF(d2f(d))) });
  const [lastSap, setLastSap] = useState(null);
  const [lastSyr, setLastSyr] = useState(null);
  const addSap = n => { setLastSap(n); persist({ ...sess, sap: round1((sess.sap || 0) + n) }); };
  const addSyr = n => { setLastSyr(n); persist({ ...sess, syrup: round1((sess.syrup || 0) + n) }); };
  const undoSap = () => { if (lastSap) { persist({ ...sess, sap: round1(Math.max(0, sess.sap - lastSap)) }); setLastSap(null); } };
  const undoSyr = () => { if (lastSyr) { persist({ ...sess, syrup: round1(Math.max(0, sess.syrup - lastSyr)) }); setLastSyr(null); } };

  // ── Derived instruments ──
  const theor = RULE_DIVISOR / (parseFloat(sapBrix) || 2);
  const ratio = active && sess.sap > 0 && sess.syrup > 0 ? sess.sap / sess.syrup : null;
  const rate  = active && hrs >= 0.25 && sess.sap > 0 ? sess.sap / hrs : null;   // honest after 15 min
  // Expected GPH from the producer's own pan (same keys EvapTab persists).
  const panIdx = ls.get('sg_panIdx', 0);
  const pan    = PAN_SIZES[panIdx] || PAN_SIZES[0];
  const panGal = panIdx === CUSTOM_PAN_IDX
    ? Math.round(((parseFloat(ls.get('sg_panW','')) || 0) * (parseFloat(ls.get('sg_panH','')) || 0)) * 2.5)
    : pan.rate;
  const expRate = panGal > 0 ? (isC ? panGal * 3.78541 : panGal) : null;   // in display units/hr
  const panLabel = panIdx === CUSTOM_PAN_IDX
    ? ((parseFloat(ls.get('sg_panW','')) || 0) > 0 ? `${ls.get('sg_panW','')}×${ls.get('sg_panH','')} ft` : null)
    : pan.label.replace(/ \(.*\)/, '');

  // ── End-of-boil sheet ──
  const [showEnd, setShowEnd] = useState(false);
  const [discardArmed, setDiscardArmed] = useState(false);
  useEffect(() => {
    if (!showEnd) return;
    const h = e => { if (e.key === 'Escape') setShowEnd(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showEnd]);
  const [justLogged, setJustLogged] = useState(null);
  useEffect(() => {
    if (!justLogged) return;
    const tm = setTimeout(() => setJustLogged(null), 6000);
    return () => clearTimeout(tm);
  }, [justLogged]);

  const startBoil = () => persist({ start: Date.now(), sap: 0, syrup: 0, tempF: round1(waterBP) });
  const clearSession = () => { setSess(null); ls.set('sg_boil_session', null); setShowEnd(false); setDiscardArmed(false); };
  const logBoil = () => {
    // Append through the sanctioned writer, in exactly LogTab's entry shape
    // (locale date string matches every existing entry; the ISO migration is
    // debt #6 and converts all entries at once — a mixed store would be worse).
    const all  = ls.get('sg_logs2', {});
    const slog = { ...(all[season] || {}) };
    const date = srToday();
    const note = lang === 'fr' ? 'Bouillée' : 'Boil Day';
    let id = Date.now();
    const dur = round1(hrs);
    if (sess.sap   > 0)  slog.sapEvap   = [...(slog.sapEvap   || []), { id: id++, date, val: sess.sap,   note }];
    if (sess.syrup > 0)  slog.syrupMade = [...(slog.syrupMade || []), { id: id++, date, val: sess.syrup, note }];
    if (dur >= 0.1)      slog.boilHours = [...(slog.boilHours || []), { id: id++, date, val: dur,        note }];
    const ok = ls.set('sg_logs2', { ...all, [season]: slog });
    if (!ok) { setShowEnd(false); return; }   // locked/quota: banner is up, session kept
    setJustLogged({ syrup: sess.syrup, sap: sess.sap });
    clearSession();
  };

  // ── Dial geometry (240° arc; angles in standard math degrees).
  // Measured, not eyeballed: endpoints sit at y = CY + R·sin30° = 209, so the
  // viewBox is 230 tall; the temp readout occupies y≈101–177 SVG units, so the
  // pointer is a rim stub (r 82→106) that can never cross the numerals. ──
  const CX = 150, CY = 150, R = 118;
  const pt  = (r, a) => [CX + r * Math.cos(a * Math.PI / 180), CY - r * Math.sin(a * Math.PI / 180)];
  const arc = (r, f0, f1) => {
    const a0 = 210 - 240 * f0, a1 = 210 - 240 * f1;
    const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${(a0 - a1) > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const fracOfF = f => srGaugeFrac(f, loF, hiF);
  // Ticks in the DISPLAY unit: °F minor 1 / labels every 2; °C minor 0.5 / labels every 1.
  const ticks = [];
  {
    const step = isC ? 0.5 : 1, lblEvery = isC ? 1 : 2;
    const dLo = f2d(loF), dHi = f2d(hiF);
    for (let v = Math.ceil(dLo / step) * step; v <= dHi + 1e-9; v += step) {
      const val = Math.round(v * 2) / 2;
      ticks.push({ f: fracOfF(d2f(val)), val, major: Math.abs(val / lblEvery - Math.round(val / lblEvery)) < 1e-9 });
    }
  }
  const bandF0 = fracOfF(finT - BD_BAND_F), bandF1 = fracOfF(finT + BD_BAND_F);
  const needleFrac = active ? fracOfF(tempF) : 0;
  const needleDeg  = 240 * needleFrac - 120;
  const stateColor = state === 'over' ? '#f85149' : (state === 'draw' || state === 'near') ? '#EB9A33' : '#2dd4a7';
  const dispTemp = active ? f2d(tempF) : null;
  const deltaDisp = active ? f2d(finT) - f2d(tempF) : null;
  const uT = isC ? '°C' : '°F', uT2 = isC ? '°F' : '°C';
  const altTemp = v => isC ? v * 9 / 5 + 32 : (v - 32) * 5 / 9;   // the other unit, for the small line
  const stateLabel = state === 'draw' ? t(lang,'bdDraw') : state === 'over' ? t(lang,'bdOver')
    : state === 'near' ? t(lang,'bdNear') : state === 'warming' ? t(lang,'bdWarming') : t(lang,'bdTargetLbl');
  const reduced = srReducedMotion();

  const stepBtn = dDisp => (
    <button key={dDisp} className="bd-step" onClick={() => bump(dDisp)}
      aria-label={`${dDisp > 0 ? '+' : '−'}${Math.abs(dDisp)}${uT}`}>
      {dDisp > 0 ? '+' : '−'}{Math.abs(dDisp)}
    </button>
  );

  return (
    <div className="bd-screen" style={{ paddingBottom: 32 }}>

      {/* ── HUD strip: the one-line state of the boil (session only —
           idle keeps a single home for each number: the dial + card) ── */}
      {active && (
        <div className="bd-hud">
          <span className="bd-dot" aria-hidden="true" />
          <span>{t(lang,'bdBoiling')}</span>
          <span className="sep">·</span>
          <b>{fmtHMS(elapsedMs)}</b>
          <span className="sep">·</span>
          <span>{t(lang,'bdTargetLbl')}</span>
          <b>{fmt(f2d(finT),1)}{uT}</b>
        </div>
      )}

      {/* ── The dial ── */}
      <div className="bd-dial-wrap">
        {active && !reduced && state !== 'idle' && (
          <div className="bd-steam" aria-hidden="true">
            <span className="bd-wisp w1" /><span className="bd-wisp w2" /><span className="bd-wisp w3" />
          </div>
        )}
        <svg viewBox="0 0 300 230" width="100%" role="img"
          aria-label={active ? `${t(lang,'bdPanTemp')} ${fmt(dispTemp,1)}${uT} — ${stateLabel}` : t(lang,'bdTargetLbl')}>
          {/* track */}
          <path d={arc(R, 0, 1)} fill="none" stroke="#131e2c" strokeWidth="12" strokeLinecap="round" />
          {/* temp fill */}
          {active && needleFrac > 0.004 && (
            <path d={arc(R, 0, needleFrac)} fill="none" stroke={stateColor} strokeWidth="12"
              strokeLinecap="round" opacity="0.5" className="bd-fill" />
          )}
          {/* target band — the signature amber */}
          <path d={arc(R, bandF0, bandF1)} fill="none" stroke="#EB9A33" strokeWidth="14" strokeLinecap="butt"
            className={`bd-band${state === 'near' ? ' near' : ''}${state === 'draw' ? ' draw' : ''}${state === 'over' ? ' past' : ''}`} />
          {/* ticks */}
          {ticks.map((tk, i) => {
            const a = 210 - 240 * tk.f;
            const [x0, y0] = pt(104, a), [x1, y1] = pt(tk.major ? 92 : 98, a);
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
              stroke={tk.major ? '#54677c' : '#26344a'} strokeWidth={tk.major ? 1.6 : 1} />;
          })}
          {/* labels OUTSIDE the bezel (r136): inside at r76 they sat 79px from
              centre and the 52px numeral's half-width is ~95px — collision */}
          {ticks.filter(tk => tk.major).map((tk, i) => {
            const [x, y] = pt(136, 210 - 240 * tk.f);
            return <text key={i} x={x} y={y + 3} textAnchor="middle" className="bd-tick-lbl">{isC ? fmt(tk.val,0) : tk.val}</text>;
          })}
          {/* pointer: a rim stub riding the tick zone — never crosses the readout */}
          {active && (
            <g className="bd-needle" style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
              <line x1={CX} y1={CY - 82} x2={CX} y2={CY - 106} stroke="#e6edf3" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}
        </svg>
        {/* centre readout */}
        <div className="bd-readout">
          {active ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 2 }}>{t(lang,'bdPanTemp')}</div>
              <div className={`bd-temp s-${state}`}>{fmt(dispTemp,1)}<span className="bd-temp-u">{uT}</span></div>
              <div className={`bd-state s-${state}`} aria-live="polite">{stateLabel}</div>
              <div className="bd-alt">
                {state === 'warming' || state === 'near'
                  ? `${fmt(Math.abs(deltaDisp),1)}° ${t(lang,'bdToGo')} · ${fmt(altTemp(dispTemp),1)}${uT2}`
                  : `= ${fmt(altTemp(dispTemp),1)}${uT2}`}
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ marginBottom: 2 }}>{t(lang,'bdTargetLbl')}</div>
              <div className="bd-temp s-idle">{fmt(f2d(finT),1)}<span className="bd-temp-u">{uT}</span></div>
              <div className="bd-alt">= {fmt(altTemp(f2d(finT)),1)}{uT2}</div>
            </>
          )}
        </div>
      </div>

      {active ? (
        <>
          {/* ── Temp steppers: the working control ── */}
          <div className="bd-steps" role="group" aria-label={t(lang,'bdPanTemp')}>
            {stepBtn(-0.5)}{stepBtn(-0.1)}
            <div className="bd-temp-field">
              <NumInput label={t(lang,'bdPanTemp')} value={round1(dispTemp)} onChange={setTempDisp}
                min={round1(f2d(loF - 2))} max={round1(f2d(hiF + 4))} step={0.1} />
            </div>
            {stepBtn(0.1)}{stepBtn(0.5)}
          </div>

          {/* ── Counters ── */}
          <BDCounter label={t(lang,'bdSapIn')} value={sess.sap || 0} dp={0} u={u} steps={[1,5,10]}
            onAdd={addSap} onUndo={undoSap} canUndo={!!lastSap} undoAmt={lastSap} undoLabel={t(lang,'msUndo')} />
          <BDCounter label={t(lang,'bdSyrupDrawn')} value={sess.syrup || 0} dp={1} u={u} steps={[0.5,1,5]}
            onAdd={addSyr} onUndo={undoSyr} canUndo={!!lastSyr} undoAmt={lastSyr} undoLabel={t(lang,'msUndo')} />

          {/* ── Session ratio + boil rate vs their own rig ── */}
          <div className="card bd-panel">
            <div className="two-col">
              <div>
                <div className="eyebrow">{t(lang,'bdRatio')}</div>
                <div className="bd-inst-val">{ratio ? `${fmt(ratio,0)}:1` : '—'}</div>
                <div className="bd-inst-sub">{t(lang,'theoryPrefix')} {fmt(theor,0)}:1 · {fmt(parseFloat(sapBrix)||2,1)}°Bx</div>
              </div>
              <div>
                <div className="eyebrow">{t(lang,'bdRate')}</div>
                <div className="bd-inst-val">{rate ? `${fmt(rate,0)}` : '—'}<span className="bd-count-u"> {u}/h</span></div>
                <div className="bd-inst-sub">
                  {rate == null ? t(lang,'bdRateSoon')
                    : expRate ? `${fmt(expRate,0)} ${u}/h ${t(lang,'bdExpected')}${panLabel ? ` · ${panLabel}` : ''}` : ''}
                </div>
              </div>
            </div>
          </div>

          <button className="btn-secondary" style={{ marginTop: 14 }} onClick={() => { setDiscardArmed(false); setShowEnd(true); }}>
            {t(lang,'bdEnd')}
          </button>
        </>
      ) : (
        <>
          {/* ── Pre-flight: idle is a designed state, not a void ── */}
          {justLogged && (
            <div className="bd-logged" role="status">
              <I.check size={16} color="#3fb950" /> {t(lang,'bdLogged')} — {fmt(justLogged.syrup,1)} {u}
            </div>
          )}
          <div className="card bd-panel" style={{ marginTop: 4 }}>
            <div className="data-row">
              <span className="data-label">{t(lang,'bdWaterToday')}</span>
              <span className="data-value bd-mono">{fmt(f2d(waterBP),1)}{uT}</span>
            </div>
            <div className="data-row" style={{ marginBottom: 2 }}>
              <span className="data-label">{t(lang,'bdEvaporator')}</span>
              <span className="data-value bd-mono">{expRate ? `${panLabel} · ${fmt(expRate,0)} ${u}/h` : '—'}</span>
            </div>
            <div style={{ fontSize:13, color:'#7f92a6', lineHeight:1.5, margin:'10px 2px 2px' }}>
              {t(lang,'bdIdleSub')}{' '}
              <button className="bd-link" onClick={() => go && go('boilpt')}>{t(lang,'bdAdjustBP')}</button>
            </div>
          </div>
          <div className="primary-bar">
            <button className="btn-primary" onClick={startBoil}>
              <I.flame size={18} color="#07090f" /> {t(lang,'bdStart')}
            </button>
          </div>
        </>
      )}

      {/* ── End-of-boil sheet ── */}
      {showEnd && active && (
        <div className="scrim" onClick={e => { if (e.target === e.currentTarget) setShowEnd(false); }}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t(lang,'bdSummaryTitle')}>
            <div className="sheet-handle" />
            <div style={{ fontWeight:800, fontSize:18, marginBottom:14 }}>{t(lang,'bdSummaryTitle')}</div>
            <div className="data-row"><span className="data-label">{t(lang,'bdDuration')}</span>
              <span className="data-value bd-mono">{fmtHMS(elapsedMs)}</span></div>
            <div className="data-row"><span className="data-label">{t(lang,'bdSapIn')}</span>
              <span className="data-value bd-mono">{fmt(sess.sap||0,0)} {u}</span></div>
            <div className="data-row"><span className="data-label">{t(lang,'bdSyrupDrawn')}</span>
              <span className="data-value bd-mono">{fmt(sess.syrup||0,1)} {u}</span></div>
            <div className="data-row"><span className="data-label">{t(lang,'bdRatio')}</span>
              <span className="data-value bd-mono">{ratio ? `${fmt(ratio,0)}:1` : '—'}</span></div>
            <div className="sheet-foot">
              <button className="btn-primary" onClick={logBoil}>
                <I.clipboard size={17} color="#07090f" /> {t(lang,'bdLogBoil')}
              </button>
              <button className={`sheet-delete${discardArmed ? ' armed' : ''}`}
                onClick={() => discardArmed ? clearSession() : setDiscardArmed(true)}>
                {discardArmed ? t(lang,'bdDiscardArm') : t(lang,'bdDiscard')}
              </button>
              <button className="sheet-cancel" onClick={() => setShowEnd(false)}>{lang==='fr' ? 'Annuler' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

