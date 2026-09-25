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
async function exportSeasonPDF({ season, trees, units, logs, brixLog, sapBrix }) {
  try { await srLoadJsPDF(); }
  catch { alert(t(ls.get('sg_lang','en'),'pdfOffline')); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const u = units === 'L' ? 'L' : 'gal';
  const conv = v => units === 'L' ? (v*3.78541).toFixed(1) : v.toFixed(1);
  const slog = logs[season] || {};
  const tot  = k => ((slog[k]||[]).reduce((s,e)=>s+(parseFloat(e.val)||0),0));
  const sapT = tot('sapCollected'), syT = tot('syrupMade');
  const ratio = syT > 0 ? (sapT/syT).toFixed(1) : '—';
  const goal  = trees * yieldMidOf(yieldModelSaved());     // gallons
  const syGal = toGal(syT, units);                          // syT is display units; goal is gallons
  const pctGoal = goal > 0 ? Math.round((syGal/goal)*100) : 0;

  // Grade breakdown from syrup entries
  const gradeTotals = {};
  (slog.syrupMade||[]).forEach(e => {
    if (e.grade && e.grade !== '—') gradeTotals[e.grade] = (gradeTotals[e.grade]||0) + (parseFloat(e.val)||0);
  });

  const W = 210, M = 18;
  let y = M;

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(19, 46, 38);
  doc.roundedRect(M, y, W - M*2, 28, 4, 4, 'F');
  doc.setTextColor(45, 212, 167);
  doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text('SweetRun', M+8, y+11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.setTextColor(180,210,200);
  doc.text('MAPLE PRODUCTION SEASON REPORT', M+8, y+19);
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text(String(season), W - M - 8, y+16, { align:'right' });
  y += 36;

  // ── Season Summary ───────────────────────────────────────────
  doc.setTextColor(30,30,30);
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Season Summary', M, y); y += 6;
  doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;

  const summaryRows = [
    ['Trees Tapped',    `${trees} trees`],
    ['Sap Collected',   `${(+sapT).toFixed(0)} ${u}`],
    ['Syrup Produced',  `${(+syT).toFixed(1)} ${u}`],
    ['Sap:Syrup Ratio', `${ratio}:1`],
    ['Season Target',   `${conv(goal)} ${u}  (${syT>0?pctGoal:'0'}% of goal)`],
    ['Sap °Brix',       `${sapBrix}° avg`],
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
    doc.text('Syrup Grade Breakdown', M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    Object.entries(gradeTotals).forEach(([grade, vol]) => {
      const pct = syT > 0 ? ((vol/syT)*100).toFixed(0) : 0;
      doc.setTextColor(100,100,100); doc.text(grade, M, y);
      doc.setTextColor(20,20,20); doc.setFont('helvetica','bold');
      doc.text(`${(+vol).toFixed(1)} ${u}  (${pct}%)`, W/2, y);
      doc.setFont('helvetica','normal'); y += 7;
    });
    y += 4;
  }

  // ── Brix Trend ──────────────────────────────────────────────
  if (brixLog.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(30,30,30);
    doc.text('Sap Brix Readings', M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const peak = Math.max(...brixLog.map(e=>e.brix));
    const last = brixLog[brixLog.length-1].brix;
    doc.setTextColor(100,100,100); doc.text('Peak Brix', M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${peak.toFixed(1)}°`, W/2, y);
    doc.setFont('helvetica','normal'); y += 7;
    doc.setTextColor(100,100,100); doc.text('Final Brix', M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${last.toFixed(1)}°`, W/2, y);
    doc.setFont('helvetica','normal'); y += 7;
    doc.setTextColor(100,100,100); doc.text('Readings logged', M, y);
    doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.text(`${brixLog.length}`, W/2, y);
    doc.setFont('helvetica','normal'); y += 10;
  }

  // ── Batch Log ───────────────────────────────────────────────
  const batches = (slog.syrupMade||[]);
  if (batches.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.setTextColor(30,30,30);
    doc.text('Syrup Batch Log', M, y); y += 6;
    doc.setDrawColor(200,200,200); doc.line(M, y, W-M, y); y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.setTextColor(120,120,120);
    doc.text('Date', M, y); doc.text(`${u.toUpperCase()}`, M+40, y);
    doc.text('Grade', M+70, y); doc.text('Note', M+110, y);
    y += 5; doc.setTextColor(30,30,30);
    batches.forEach(b => {
      if (y > 270) { doc.addPage(); y = M; }
      doc.text(b.date||'', M, y);
      doc.text(fmt(b.val,1), M+40, y);
      doc.text(b.grade&&b.grade!=='—'?b.grade:'', M+70, y);
      doc.text((b.note||'').slice(0,30), M+110, y);
      y += 6;
    });
    y += 4;
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setFontSize(8); doc.setTextColor(160,160,160);
  doc.text(`Generated by SweetRun · ${new Date().toLocaleDateString()}`, M, 287);
  doc.text(`sugarcalc.netlify.app`, W-M, 287, { align:'right' });

  doc.save(`SweetRun-Season-${season}.pdf`);
}


