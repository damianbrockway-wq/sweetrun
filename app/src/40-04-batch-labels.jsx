// ─── BATCH LABEL HELPERS ──────────────────────────────────────────────────────
const BATCH_GRADES = {
  golden: { name:'Golden Delicate',  color:'#f5c842' },
  amber:  { name:'Amber Rich',       color:'#e0a44a' },
  dark:   { name:'Dark Robust',      color:'#c47a28' },
  vdark:  { name:'Very Dark Strong', color:'#8b4513' },
};

function _buildBatchURL(b, batchNum, season, trees) {
  const p = new URLSearchParams();
  if (batchNum)   p.set('b',   batchNum);
  if (b.date)     p.set('d',   b.date);
  if (b.grade)    p.set('g',   b.grade);
  if (b.sapIn)    p.set('sap', b.sapIn);
  if (b.syrupOut) p.set('syr', b.syrupOut);
  if (b.loc)      p.set('loc', b.loc);
  if (trees)      p.set('taps', trees);
  if (season)     p.set('s',   season);
  if (b.notes)    p.set('n',   b.notes);
  return `https://sweetrun.app/batch.html?${p.toString()}`;
}

async function _downloadBatchLabel(b, batchNum, season, trees, units) {
  const u   = units === 'L' ? 'L' : 'gal';
  const g   = BATCH_GRADES[b.grade] || BATCH_GRADES.amber;
  const url = _buildBatchURL(b, batchNum, season, trees);
  const W = 400, H = 580;
  const cvs = document.createElement('canvas');
  cvs.width = W * 2; cvs.height = H * 2;
  const c = cvs.getContext('2d');
  c.scale(2, 2);

  // BG
  c.fillStyle = '#07090f'; c.fillRect(0, 0, W, H);

  // Header
  const hg = c.createLinearGradient(0, 0, W, 72);
  hg.addColorStop(0, '#1a3d2b'); hg.addColorStop(1, '#0f2318');
  c.fillStyle = hg; c.fillRect(0, 0, W, 72);
  c.fillStyle = '#fff';
  c.font = 'bold 22px Arial, sans-serif'; c.fillText('SweetRun', 20, 42);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.font = '700 9px Arial, sans-serif'; c.fillText('MAPLE PROVENANCE', 20, 58);
  c.fillStyle = '#2dd4a7'; c.font = 'bold 12px Arial, sans-serif';
  c.textAlign = 'right';
  c.fillText(`Batch #${batchNum}${season ? ' · '+season : ''}`, W-16, 38);
  c.textAlign = 'left';

  // Grade band
  const [gr,gg,gb] = [parseInt(g.color.slice(1,3),16), parseInt(g.color.slice(3,5),16), parseInt(g.color.slice(5,7),16)];
  c.fillStyle = `rgba(${gr},${gg},${gb},0.12)`; c.fillRect(0, 72, W, 52);
  c.fillStyle = g.color;
  c.beginPath(); c.arc(36, 98, 16, 0, Math.PI*2); c.fill();
  c.fillStyle = '#7f92a6'; c.font = '700 8px Arial, sans-serif'; c.fillText('USDA GRADE A', 64, 90);
  c.fillStyle = g.color; c.font = 'bold 17px Arial, sans-serif'; c.fillText(g.name, 64, 112);

  // Stats
  const stats = [
    b.sapIn    ? { label:'SAP IN',    val:`${parseFloat(b.sapIn).toLocaleString()} ${u}` }  : null,
    b.syrupOut ? { label:'SYRUP OUT', val:`${parseFloat(b.syrupOut).toFixed(1)} ${u}` }    : null,
    (b.sapIn && b.syrupOut) ? { label:'RATIO', val:`${(b.sapIn/b.syrupOut).toFixed(1)}:1` } : null,
    trees      ? { label:'TREES',     val:`${parseInt(trees).toLocaleString()}` }           : null,
  ].filter(Boolean);
  c.fillStyle = '#131e2c'; c.fillRect(0, 124, W, 1);
  const cw = W / Math.max(stats.length, 1);
  stats.forEach((s, i) => {
    const x = i*cw + 14;
    if (i > 0) { c.fillStyle = '#131e2c'; c.fillRect(i*cw, 125, 1, 54); }
    c.fillStyle = '#7f92a6'; c.font = '700 8px Arial, sans-serif'; c.fillText(s.label, x, 144);
    c.fillStyle = '#e6edf3'; c.font = 'bold 17px Arial, sans-serif'; c.fillText(s.val, x, 166);
  });
  c.fillStyle = '#131e2c'; c.fillRect(0, 179, W, 1);

  // Details
  let dy = 202;
  const details = [
    b.date ? (p=>p?new Date(p.y,p.mo-1,p.d,12).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):null)(srDateParts(b.date)) : null,
    b.loc  ? b.loc : null,
    b.notes ? b.notes : null,
  ].filter(Boolean);
  c.fillStyle = '#7f92a6'; c.font = '13px Arial, sans-serif';
  details.forEach(d => { c.fillText(d, 20, dy); dy += 24; });

  // QR
  const qrSize = 160, qrX = (W - qrSize) / 2, qrY = H - 210;
  const qrImg = new Image(); qrImg.crossOrigin = 'anonymous';
  await new Promise((res, rej) => {
    qrImg.onload = res; qrImg.onerror = rej;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(url)}&color=1a3d2b&bgcolor=ffffff&margin=4`;
  });
  c.fillStyle = '#fff';
  if (c.roundRect) { c.beginPath(); c.roundRect(qrX-8, qrY-8, qrSize+16, qrSize+16, 8); c.fill(); }
  else { c.fillRect(qrX-8, qrY-8, qrSize+16, qrSize+16); }
  c.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  c.fillStyle = '#7f92a6'; c.font = '10px Arial, sans-serif'; c.textAlign = 'center';
  c.fillText('Scan to verify batch provenance', W/2, qrY + qrSize + 18);
  c.fillStyle = '#2dd4a7'; c.font = 'bold 10px Arial, sans-serif';
  c.fillText('sweetrun.app', W/2, qrY + qrSize + 33);

  // Footer
  c.fillStyle = '#0a1018'; c.fillRect(0, H-40, W, 40);
  c.fillStyle = '#2a3a4a'; c.font = '9px Arial, sans-serif';
  c.fillText('Scan the QR to see this batch’s story', W/2, H-14);
  c.textAlign = 'left';

  const a = document.createElement('a');
  a.href = cvs.toDataURL('image/png');
  a.download = `sweetrun-batch-${batchNum}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

