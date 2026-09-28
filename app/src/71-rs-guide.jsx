// ─── Sugaring guide (Phase 6; replaces SugarSageTab) ────────────────────────
// Same knowledge base (SS_KB) and the same search (ssSearch, with the RO /
// vacuum / business nudges from your season). Answers are reference text and
// are shown through srPlain. The season dashboard that sat here lives on Recap
// (score) and Diagnose (insights); break-even has its own Shack screen.
const SR_KB_CATS = ['biology','tapping','vacuum','ro','evaporation','finishing','weather','tree_health','business','lines','troubleshooting'];
const SR_KB_SUGGEST = ['sugSap','sugRo','sugVac','sugNiter','sugYield','sugOff'];
function RsGuide({ c }) {
  const L = c.lang;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [res, setRes] = useState(null);
  const logs = useSrLogs();
  const slog = logs[c.season] || {};
  const ctx = { hasRO: (slog.sapRO || []).reduce((s, e) => s + (parseFloat(e.val) || 0), 0) > 0, hasVacuum: ls.get('sg_dx_vac', 'gravity') !== 'gravity', trees: c.trees || 0 };
  useEffect(() => {
    const id = setTimeout(() => {
      if (!q.trim() && cat === 'all') { setRes(null); return; }
      // ssSearch adds its context nudge (RO, vacuum, business) even to entries
      // that match no word of the query, so nonsense returned the RO answers
      // and the 5-result cap could push real matches out. Search without the
      // nudge, then apply the same nudge as a re-sort of the real matches.
      const nudge = e => (ctx.hasRO && e.cat === 'ro' ? 1 : 0) + (ctx.hasVacuum && e.cat === 'vacuum' ? 1 : 0) + (ctx.trees > 0 && e.cat === 'business' ? 0.5 : 0);
      let r = q.trim() ? ssSearch(q, null).sort((a, b) => (b.score + nudge(b)) - (a.score + nudge(a))) : SS_KB.filter(e => e.cat === cat);
      if (cat !== 'all') r = r.filter(e => e.cat === cat);
      setRes(r);
    }, 250);
    return () => clearTimeout(id);
  }, [q, cat]);
  const count = k => SS_KB.filter(e => e.cat === k).length;
  const month = new Date().getMonth();
  return (
    <div className="rs-inner">
      <RsShackHead c={c} title={rt(L,'sc_guide')} eyebrow={rt(L,'secGuide')} lede={rt(L,'kbLede', { n: SS_KB.length })} />
      <RsBanners c={c} />
      <form className="rs-inline" role="search" onSubmit={e => { e.preventDefault(); }}>
        <input className="rs-field" type="search" aria-label={rt(L,'kbAsk')} placeholder={rt(L,'kbAskPh')} value={q} onChange={e => setQ(e.target.value)} id="rs-kb-q" />
        {q && <RsBtn kind="secondary" onClick={() => { setQ(''); setCat('all'); }}>{rt(L,'clearW')}</RsBtn>}
      </form>
      {!q && cat === 'all' && <div className="rs-chips wrap" style={{ marginTop:10 }} aria-label={rt(L,'kbTry')}>
        {SR_KB_SUGGEST.map(k => <button key={k} type="button" className="rs-chip" onClick={() => setQ(rt('en', k))}>{rt(L, k)}</button>)}</div>}
      <div className="rs-chips scroll" style={{ marginTop:10 }} role="group" aria-label={rt(L,'kbTopics')}>
        {['all', ...SR_KB_CATS].map(k => <button key={k} type="button" className={`rs-chip${cat === k ? ' on' : ''}`} aria-pressed={cat === k} onClick={() => setCat(k)}>
          {rt(L, 'cat_' + k)}{k !== 'all' && <span className="n tn">{count(k)}</span>}</button>)}
      </div>
      {res && res.length === 0 && <div className="rs-empty" style={{ marginTop:14 }}><b>{rt(L,'kbNoneT')}</b><p>{rt(L,'kbNoneP')}</p></div>}
      {res && res.length > 0 && <div className="rs-stack" style={{ marginTop:14 }}>
        {res.map((e, i) => <RsDisclose key={e.id} defaultOpen={!!q.trim() && i === 0} kicker={rt(L, 'cat_' + e.cat)} title={e.q} sub={srPlain(e.a).slice(0, 110).replace(/\s+\S*$/, '') + '...'}>
          <RsPlain text={e.a} />
          {e.tip && <div className="rs-card rs-tip"><b>{rt(L,'kbTip')}</b><p>{srPlain(e.tip)}</p></div>}
          <p className="rs-note">{rt(L,'kbSource', { s: srPlain(e.src) })}</p>
        </RsDisclose>)}
      </div>}
      {!res && <div className="rs-cols rs-after-btns">
        <div>
          <h2 className="rs-sec">{rt(L,'kbMonthT', { m: MON[L === 'fr' ? 'fr' : 'en'][month] })}</h2>
          <div className="rs-card rs-tip"><p>{rt(L, 'kbMonth' + month)}</p></div>
          <h2 className="rs-sec">{rt(L,'kbTools')}</h2>
          <div className="rs-list">
            <RsRow icon="calc" family="power" title={rt(L,'bevTitle')} sub={rt(L,'bevSub')} href={rsHref('shack/breakeven')} />
            <RsRow icon="chart" family="recap" title={rt(L,'sc_diagnose')} sub={rt(L,'kbDxSub')} href={rsHref('stage/recap/diagnose')} />
            <RsRow icon="chart" family="recap" title={rt(L,'sc_recap')} sub={rt(L,'kbRecapSub')} href={rsHref('stage/recap/season')} />
          </div>
        </div>
        <div>
          <h2 className="rs-sec">{rt(L,'kbTopics')}</h2>
          <div className="rs-list">{SR_KB_CATS.map(k => <RsRow key={k} title={rt(L, 'cat_' + k)} sub={rt(L, 'kbArticles', { n: count(k) })} onClick={() => setCat(k)} />)}</div>
          <p className="rs-note">{rt(L,'kbSources')}</p>
        </div>
      </div>}
    </div>
  );
}
