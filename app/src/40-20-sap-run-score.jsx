// ─── SAP RUN SCORING (Acer saccharum physiology, Cornell/UVM Proctor research) ──
function _sapRunScore(hiF, loF, windMph, precipIn, sunSec, prevHiF, runStreak) {
  if (loF >= 32 || hiF <= 32) return { score:0, quality:'No Flow', buddyRisk:false };
  let score = 0;
  // Night freeze quality — ideal 18-28°F (-8 to -2°C)
  if      (loF >= 28) score += 5;
  else if (loF >= 18) score += 25;
  else if (loF >= 5)  score += 15;
  else                score += Math.max(0, 3 + (loF - 5) * 0.3);
  // Day thaw quality — ideal 40-46°F (4-8°C); >50°F = buddy risk
  const buddyRisk = hiF >= 50;
  if (!buddyRisk) {
    if      (hiF >= 40 && hiF < 46) score += 25;
    else if (hiF >= 46 && hiF < 50) score += 18;
    else if (hiF >= 33 && hiF < 40) score += 12;
    else                             score += 5;
  }
  // Temperature swing ΔT — bigger is better
  score += Math.min(25, ((hiF - loF) / 35) * 25);
  // Sunshine bonus (max 8 pts at 9h)
  score += Math.min(8, ((sunSec || 0) / 3600) * 0.9);
  // Wind penalty (>15 mph hurts)
  if (windMph > 15) score -= Math.min(8, ((windMph - 15) / 15) * 8);
  // Precip penalty (>0.1" dilutes/washes sap)
  if (precipIn > 0.1) score -= Math.min(10, ((precipIn - 0.1) / 0.8) * 10);
  // Previous warm day — builds toward bud break
  if (prevHiF != null && prevHiF > 48) score -= Math.min(10, (prevHiF - 48) * 0.8);
  // Consecutive run days — trees need a refreeze between runs
  if ((runStreak || 0) >= 3) score -= Math.min(12, (runStreak - 2) * 4);
  score = Math.max(0, Math.min(100, Math.round(score)));
  let quality;
  if      (score >= 80) quality = 'Excellent';
  else if (score >= 62) quality = 'Good';
  else if (score >= 44) quality = 'Fair';
  else if (score >= 22) quality = 'Poor';
  else                  quality = 'No Flow';
  return { score, quality, buddyRisk };
}

