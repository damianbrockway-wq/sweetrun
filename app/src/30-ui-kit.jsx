// ─── Shared UI pieces ─────────────────────────────────────────────────────────
// Accepts a comma decimal ("2,5" is how a French-Canadian producer types 2.5 —
// parseFloat used to read that as 25). Rejects letters and a leading minus.
// Clamps to the field's own min/max on blur.
function srParseNum(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, '');
  // "1,500" / "12,345.67" are US thousands groups — strip the commas.
  // A lone comma not forming 3-digit groups is a French decimal ("2,5" → 2.5).
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  if (s === '' || s === '.' || s === '-') return null;
  if (!/^-?\d*\.?\d*$/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
