// ─── PDF SEASON REPORT ─────────────────────────────────────────────────────────
// jsPDF is 356 KB and only a fraction of users ever export. Instead of blocking
// every cold start on it, load it once on the first export and cache the promise.
let _jspdfPromise = null;
function srLoadJsPDF() {
  if (window.jspdf) return Promise.resolve();
  if (!_jspdfPromise) {
    _jspdfPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = res;
      s.onerror = () => { _jspdfPromise = null; rej(new Error('pdf-lib-failed')); };
      document.head.appendChild(s);
    });
  }
  return _jspdfPromise;
}
// Fix pass 1: taps (srTaps), Brix (srBrixSource) and grades (srGradeMix, batches included) come in
// from srPdfArgs, the same numbers the screens show.
async function exportSeasonPDF({ season, trees, units, logs, brixLog, sapBrix, taps, brix, batches: batchList }) {
  // Fix pass 2 (item 33, P2): the report is in his language (and number format), the footer
  // names sweetrun.app on every page, and notes wrap in full instead of stopping at 30 characters.
  const LG = ls.get('sg_lang', 'en') === 'fr' ? 'fr' : 'en';
  try { await srLoadJsPDF(); }
  catch { alert(t(LG,'pdfOffline')); return; }
  const { jsPDF } = window.jspdf;
  const loc0 = SR_NUM_LOC; SR_NUM_LOC = LG === 'fr' ? 'fr-CA' : 'en-US';
  // Helvetica in jsPDF has no narrow no-break space (fr-CA's thousands mark): plain spaces.
  const P = x => String(x == null ? '' : x).replace(/[\u202f\u00a0]/g, ' ');
  const R = k => P(rt(LG, k));
  try {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const u = units === 'L' ? 'L' : 'gal';
  const conv = v => fmt(units === 'L' ? v*3.78541 : v, 1);
  const slog = logs[season] || {};
  const tot  = k => ((slog[k]||[]).reduce((s,e)=>s+(parseFloat(e.val)||0),0));
  const sapT = tot('sapCollected'), syT = tot('syrupMade');
  const ratio = syT > 0 ? fmt(sapT/syT, 1) : '0';
  const T = taps || srTaps({ trees });
  const B = brix || srBrixSource({ slog: (logs || {})[season] || {}, brixlog: brixLog, season, setting: sapBrix });
  const goal  = T.taps * yieldMidOf(yieldModelSaved());     // gallons
  const syGal = toGal(syT, units);                          // syT is display units; goal is gallons
  const pctGoal = goal > 0 ? Math.round((syGal/goal)*100) : 0;

  // Grade breakdown: syrup entries, and batch grades for syrup logged without one (srGradeMix)
  const gm = srGradeMix(slog.syrupMade, batchList || [], season).grades;
  const gradeTotals = {};
  Object.keys(gm).forEach(g => { if (g !== 'none') gradeTotals[g] = gm[g]; });

  const W = 210, M = 18;
  let y = M;
  const footer = () => {
    doc.setFontSize(8); doc.setTextColor(160,160,160); doc.setFont('helvetica','normal');
    doc.text(P(rt(LG, 'pdfGenerated', { d: srDateMid(srToday(), LG) })), M, 287);
    doc.text(R('pdfFooter'), W-M, 287, { align:'right' });
  };
  const page = need => { if (y + (need || 0) > 272) { footer(); doc.addPage(); y = M; } };

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(19, 46, 38);
  doc.roundedRect(M, y, W - M*2, 28, 4, 4, 'F');
  doc.setTextColor(45, 212, 167);
  doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text('SweetRun', M+8, y+11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.setTextColor(180,210,200);
  doc.text(R('pdfKicker'), M+8, y+19);
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(String(season), W - M - 8, y+16, { align:'right' });
  y += 36;

  // ── Season Summary ───────────────────────────────────────────
  doc.setTextColor(30,30,30);
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text(R('pdfSummary'), M, y); y += 6;
  doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;

  const summaryRows = [
    [R('pdfTaps'),      T.differ ? P(rt(LG, 'tapsPlanMap', { p: fmt(T.planned, 0), m: fmt(T.mapped, 0) })) : P(rt(LG, T.taps === 1 ? 'tapsN1' : 'tapsN', { n: fmt(T.taps, 0) }))],
    [R('pdfSap'),       `${P(fmt(sapT, 0))} ${u}`],
    [R('pdfSyrup'),     `${P(fmt(syT, 1))} ${u}`],
    [R('pdfRatio'),     `${P(ratio)}:1`],
    [R('pdfTarget'),    P(rt(LG, 'pdfTargetV', { v: conv(goal), u, p: syT > 0 ? pctGoal : 0 }))],
    [R('pdfPerTap'),    T.taps > 0 ? `${P(fmt(syT / T.taps, 3))} ${u}` : '0'],
    [R('pdfBrix'),      `${P(fmt(+B.season, 1))}° ${R(B.seasonFrom === 'sap' ? 'pdfBrixSap' : B.seasonFrom === 'tree' ? 'pdfBrixTree' : 'pdfBrixSet')}`],
  ];

  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  summaryRows.forEach(([label, value]) => {
    doc.setTextColor(100,100,100); doc.text(label, M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold');
    doc.text(value, W/2, y); doc.setFont('helvetica','normal');
    y += 7;
  });
  y += 4;

  // ── Grade Breakdown ─────────────────────────────────────────
  if (Object.keys(gradeTotals).length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(30,30,30);
    page(30); doc.text(R('pdfGrades'), M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    Object.entries(gradeTotals).forEach(([grade, vol]) => {
      const pct = syT > 0 ? ((vol/syT)*100).toFixed(0) : 0;
      doc.setTextColor(100,100,100); doc.text(P(srGradeLabel(grade, LG)), M, y);
      doc.setTextColor(20,20,20); doc.setFont('helvetica','bold');
      doc.text(`${P(fmt(+vol, 1))} ${u}  (${pct}%)`, W/2, y);
      doc.setFont('helvetica','normal'); y += 7;
    });
    y += 4;
  }

  // ── Brix Trend ──────────────────────────────────────────────
  const bser = B.series || [];
  if (bser.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(30,30,30);
    page(30); doc.text(R('pdfBrixT'), M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const peak = Math.max(...bser.map(e=>e.brix));
    const last = bser[bser.length-1].brix;
    doc.setTextColor(100,100,100); doc.text(R('pdfPeak'), M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${P(fmt(peak, 1))}°`, W/2, y);
    doc.setFont('helvetica','normal'); y += 7;
    doc.setTextColor(100,100,100); doc.text(R('pdfFinal'), M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${P(fmt(last, 1))}°`, W/2, y);
    doc.setFont('helvetica','normal'); y += 7;
    doc.setTextColor(100,100,100); doc.text(R('pdfReadings'), M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${B.n}`, W/2, y);
    doc.setFont('helvetica','normal'); y += 10;
  }

  // ── Batch Log ───────────────────────────────────────────────
  const batches = (slog.syrupMade||[]);
  if (batches.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(30,30,30);
    page(24); doc.text(R('pdfBatches'), M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.setTextColor(120,120,120);
    doc.text(R('date'), M, y); doc.text(u, M+34, y);
    doc.text(R('grade'), M+52, y); doc.text(R('noteW'), M+96, y);
    y += 5; doc.setTextColor(30,30,30);
    batches.forEach(b => {
      const lines = doc.splitTextToSize(P(b.note || ''), W - M - (M + 96));
      page(6 * Math.max(1, lines.length));
      doc.text(P(srDateShort(b.date, LG)), M, y);
      doc.text(P(fmt(b.val,1)), M+34, y);
      doc.text(b.grade&&b.grade!=='—'?P(srGradeLabel(b.grade, LG)):'', M+52, y);
      if (lines.length) doc.text(lines, M+96, y);
      y += 5 * Math.max(1, lines.length) + 1;
    });
    y += 4;
  }

  // ── Footer ──────────────────────────────────────────────────
  footer();

  doc.save(`SweetRun-Season-${season}.pdf`);
  } finally { SR_NUM_LOC = loc0; }
}


