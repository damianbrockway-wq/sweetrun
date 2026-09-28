// ─── Run Sheet strings and routes ─────────────────────────────────────────────
// Shell strings, English and French, written together (PORT-PLAN rule: every new
// string gets its fr at the time it is written). rt(lang, key, vars).
const RS_TR = {
  en: {
    tabSeason:'Season', tabBush:'Bush', tabLog:'Log', tabPumps:'Pumps', tabShack:'Shack', tabWatch:'Watch',
    logAria:'Log sap, syrup, RO, evaporator, fuel or hours',
    back:'Back', stageOf:'Stage {n} of 6', seasonN:'Season {y}', today:'Today', stages:'The season, stage by stage',
    todayCard:'Right now',
    shackTitle:'Sugar Shack', shackLede:'Calculators, records, settings and your Season Pass.',
    secCalc:'Calculators', secRecords:'Records', secGuide:'Guide', secSettings:'Settings', secPass:'Season Pass',
    bushTitle:'Bush', pumpsTitle:'Pumps', pumpsLede:'Vacuum, transfer pump, power and freeze jobs in one place.',
    pumpsEmptyT:'Add your releaser and Tank 1', pumpsEmptyP:'The pump center reads your own vacuum pump, transfer pump, tanks and gauges. Setting them up arrives in a coming update; nothing here is sample data.',
    watchTitle:'Watch the bush', watchLede:'A live view of lines, pumps and tanks, readable across the room.',
    watchEmptyT:'Watch mode needs your lines and gauges', watchEmptyP:'Once your mainlines, tanks and gauges are set up, this screen shows them live. Your mainlines are drawn on the Bush tab today.',
    openBush:'Open the Bush tab', openEquip:'Equipment and transfer time', openEquipSub:'Pump rate and how long a tank takes to move',
    // stages
    st_weather:'Weather watch', st_weather_s:'Weather', st_weather_l:'Freeze and thaw, the 10-day run outlook, and degree days.',
    st_tap:'Plan & tap', st_tap_s:'Tap', st_tap_l:'Taps per tree, spouts and vacuum, tree notes and rotation.',
    st_lines:'Lines & tanks', st_lines_s:'Lines', st_lines_l:'Mainlines on the Bush tab, tubing and materials.',
    st_collect:'Collect & RO', st_collect_s:'Collect', st_collect_l:'RO timing, sap freshness and the day\'s log.',
    st_boil:'Boil', st_boil_s:'Boil', st_boil_l:'Boil day, evaporator rate, draw-off temperature and finishing.',
    st_recap:'Recap', st_recap_s:'Recap', st_recap_l:'The season in numbers, the score, and why a season ran slow.',
    // screens
    sc_forecast:'Sap run forecast', sc_forecast_s:'Freeze and thaw, 10-day outlook',
    sc_degree:'Degree days and Brix trend', sc_degree_s:'Season timing and sugar content',
    sc_tapping:'Tapping guide', sc_tapping_s:'Taps per diameter, spouts, vacuum, tree notes',
    sc_map:'Bush', sc_map_s:'Pins, mainlines, property, offline tiles',
    sc_tubing:'Tubing and materials', sc_tubing_s:'Mainline size, vacuum and materials',
    sc_ro:'RO planner', sc_ro_s:'Concentrate, time and fuel saved',
    sc_log:'Log history', sc_log_s:'Every entry, import, CSV export',
    sc_boilday:'Boil day', sc_boilday_s:'Session timer and draw-off dial',
    sc_evap:'Evaporator and boil time', sc_evap_s:'Pans, boil time, fuel, cost a gallon, retail',
    sc_finish:'Finishing', sc_finish_s:'Grades, canning and maple candy',
    sc_boilpt:'Draw-off temperature', sc_boilpt_s:'Water boil point and altitude',
    sc_recap:'Season recap', sc_recap_s:'Totals, score, replay, share card, PDF',
    sc_diagnose:'Diagnose a slow season', sc_diagnose_s:'Yield gap and what to change',
    sc_sap:'Sap to syrup', sc_sap_s:'Rule of 86 and yield',
    sc_equip:'Equipment', sc_equip_s:'Inventory, service and transfer time',
    sc_tasks:'Season checklists', sc_tasks_s:'Before and after the season',
    sc_guide:'Sugaring guide', sc_guide_s:'Answers from maple research, by topic',
    // settings and data
    firstName:'First name', firstNameHint:'For the greeting on the Season screen. Leave blank for none.',
    set_prefs:'Units, language and season', set_prefs_s:'Gallons or litres, English or French, season year',
    set_wizard:'Set up your season', set_wizard_s:'Trees, system and fuel, about 2 minutes',
    set_backup:'Backup and restore', set_backup_s:'Save every entry to a file, or bring one back',
    set_import:'Import sap monitor data', set_import_s:'CSV or PDF, on the Log history screen',
    pass_licensed:'Season Pass active', pass_trial:'Season Trial, {n} days left', pass_expired:'Season Trial ended', pass_checking:'Checking your pass',
    pass_sub:'Enter a pass key, or get one',
    // license chip
    chipPass:'Season Pass', chipTrial:'Trial · {n} days', chipTrial1:'Trial · 1 day', chipUnlock:'Unlock',
    // banners (same meaning as the classic banners, restyled)
    bExpiredT:'Season Trial ended', bExpiredP:'Your data is safe and export works, but new entries are not saved.', bGetPass:'Get a Pass',
    bNotSavedT:'That entry was not saved',
    bLockedP:'Your Season Trial has ended. Enter a pass key to keep logging.', bEnterKey:'Enter key',
    bQuotaP:'Phone storage is full. Export a backup from Sugar Shack, Backup and restore, then clear an old season.', bBackup:'Backup',
    bFirstT:'First season?', bFirstP:'Get a personalized season plan in 2 minutes.', bFirstBtn:'Set up season',
    dismiss:'Dismiss',
  },
  fr: {
    tabSeason:'Saison', tabBush:'Érablière', tabLog:'Noter', tabPumps:'Pompes', tabShack:'Cabane', tabWatch:'Veille',
    logAria:'Noter l\'eau d\'érable, le sirop, l\'osmose, l\'évaporateur, le combustible ou les heures',
    back:'Retour', stageOf:'Étape {n} sur 6', seasonN:'Saison {y}', today:'Aujourd\'hui', stages:'La saison, étape par étape',
    todayCard:'En ce moment',
    shackTitle:'Cabane à sucre', shackLede:'Calculateurs, registres, réglages et votre Passe saison.',
    secCalc:'Calculateurs', secRecords:'Registres', secGuide:'Guide', secSettings:'Réglages', secPass:'Passe saison',
    bushTitle:'Érablière', pumpsTitle:'Pompes', pumpsLede:'Vacuum, pompe de transfert, énergie et travaux contre le gel au même endroit.',
    pumpsEmptyT:'Ajoutez votre extracteur et le réservoir 1', pumpsEmptyP:'Le centre des pompes lit votre pompe à vacuum, votre pompe de transfert, vos réservoirs et vos jauges. Leur configuration arrive dans une prochaine mise à jour; rien ici n\'est un exemple.',
    watchTitle:'Surveiller l\'érablière', watchLede:'Les lignes, les pompes et les réservoirs en direct, lisibles de loin.',
    watchEmptyT:'La veille a besoin de vos lignes et de vos jauges', watchEmptyP:'Une fois vos lignes maîtresses, réservoirs et jauges configurés, cet écran les montre en direct. Vos lignes maîtresses sont déjà sur l\'onglet Érablière.',
    openBush:'Ouvrir l\'onglet Érablière', openEquip:'Équipement et temps de transfert', openEquipSub:'Débit de la pompe et temps pour vider un réservoir',
    st_weather:'Météo', st_weather_s:'Météo', st_weather_l:'Gel et dégel, prévision de coulée sur 10 jours, degrés-jours.',
    st_tap:'Planifier et entailler', st_tap_s:'Entaille', st_tap_l:'Entailles par arbre, chalumeaux et vacuum, notes et rotation.',
    st_lines:'Tubulure et réservoirs', st_lines_s:'Tubulure', st_lines_l:'Lignes maîtresses dans l’onglet Érablière, tubulure et matériel.',
    st_collect:'Collecte et osmose', st_collect_s:'Collecte', st_collect_l:'Moment de l\'osmose, fraîcheur de l\'eau et le registre du jour.',
    st_boil:'Bouillage', st_boil_s:'Bouillir', st_boil_l:'Jour de bouillage, débit de l\'évaporateur, température de soutirage et finition.',
    st_recap:'Bilan', st_recap_s:'Bilan', st_recap_l:'La saison en chiffres, le pointage, et pourquoi une saison a été lente.',
    sc_forecast:'Prévision de coulée', sc_forecast_s:'Gel et dégel, 10 jours',
    sc_degree:'Degrés-jours et tendance Brix', sc_degree_s:'Moment de la saison et teneur en sucre',
    sc_tapping:'Guide d\'entaillage', sc_tapping_s:'Entailles selon le diamètre, chalumeaux, vacuum, notes',
    sc_map:'Carte de l\'érablière', sc_map_s:'Repères, lignes maîtresses, terrain, tuiles hors ligne',
    sc_tubing:'Tubulure et matériel', sc_tubing_s:'Calibre, vacuum et matériel',
    sc_ro:'Planificateur d\'osmose', sc_ro_s:'Concentré, durée et combustible épargné',
    sc_log:'Historique du registre', sc_log_s:'Chaque entrée, importation, export CSV',
    sc_boilday:'Jour de bouillage', sc_boilday_s:'Minuterie et cadran de soutirage',
    sc_evap:'Évaporateur et durée', sc_evap_s:'Casseroles, durée, combustible, coût et prix',
    sc_finish:'Finition', sc_finish_s:'Classes, mise en conserve et bonbons',
    sc_boilpt:'Température de soutirage', sc_boilpt_s:'Point d\'ébullition de l\'eau et altitude',
    sc_recap:'Bilan de saison', sc_recap_s:'Totaux, pointage, reprise, carte à partager, PDF',
    sc_diagnose:'Diagnostiquer une saison lente', sc_diagnose_s:'Écart de rendement et quoi changer',
    sc_sap:'De l\'eau d\'érable au sirop', sc_sap_s:'Règle de 86 et rendement',
    sc_equip:'Équipement', sc_equip_s:'Inventaire, entretien et temps de transfert',
    sc_tasks:'Listes de saison', sc_tasks_s:'Avant et après la saison',
    sc_guide:'Guide acéricole', sc_guide_s:'Réponses de la recherche acéricole, par sujet',
    firstName:'Prénom', firstNameHint:'Pour la salutation de l\'écran Saison. Laissez vide pour aucun nom.',
    set_prefs:'Unités, langue et saison', set_prefs_s:'Gallons ou litres, anglais ou français, année de saison',
    set_wizard:'Configurer votre saison', set_wizard_s:'Arbres, système et combustible, environ 2 minutes',
    set_backup:'Sauvegarde et restauration', set_backup_s:'Enregistrer chaque entrée dans un fichier, ou la récupérer',
    set_import:'Importer les données d\'un capteur', set_import_s:'CSV ou PDF, sur l\'écran Historique du registre',
    pass_licensed:'Passe saison active', pass_trial:'Essai de saison, {n} jours restants', pass_expired:'Essai de saison terminé', pass_checking:'Vérification de votre passe',
    pass_sub:'Entrer une clé, ou en obtenir une',
    chipPass:'Passe saison', chipTrial:'Essai · {n} jours', chipTrial1:'Essai · 1 jour', chipUnlock:'Débloquer',
    bExpiredT:'Essai de saison terminé', bExpiredP:'Vos données sont en sécurité et l\'export fonctionne, mais les nouvelles entrées ne sont pas enregistrées.', bGetPass:'Obtenir une passe',
    bNotSavedT:'Cette entrée n\'a pas été enregistrée',
    bLockedP:'Votre essai de saison est terminé. Entrez une clé pour continuer à noter.', bEnterKey:'Entrer la clé',
    bQuotaP:'Le stockage du téléphone est plein. Exportez une sauvegarde depuis Cabane à sucre, Sauvegarde et restauration, puis effacez une ancienne saison.', bBackup:'Sauvegarde',
    bFirstT:'Première saison?', bFirstP:'Obtenez un plan de saison personnalisé en 2 minutes.', bFirstBtn:'Configurer',
    dismiss:'Fermer',
  },
};
function rt(lang, key, vars) {
  let s = (RS_TR[lang] && RS_TR[lang][key]) || RS_TR.en[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
// Hash routes (same scheme as the prototype, so its routes carry over):
//   #/season                    Season home (default)
//   #/stage/<stage>             stage hub          #/stage/<stage>/<screen>  a screen
//   #/bush                      the map            #/pumps  #/watch
//   #/shack                     Sugar Shack hub    #/shack/<screen>
const RS_STAGES = [
  { id:'weather', icon:'therm', family:'weather', photo:'frost-morning' },
  { id:'tap',     icon:'tree',  family:'tap',     photo:'tap-spout' },
  { id:'lines',   icon:'map',   family:'lines',   photo:'bush-aerial' },
  { id:'collect', icon:'drop',  family:'collect', photo:'sap-tank' },
  { id:'boil',    icon:'flame', family:'boil',    photo:'evaporator-steam' },
  { id:'recap',   icon:'chart', family:'recap',   photo:'syrup-bottles' },
];
// c = useSrCore() state; openLog opens the Log sheet.
const RS_SCREENS = {
  'stage/weather/forecast':  { title:'sc_forecast', sub:'sc_forecast_s', icon:'therm', family:'weather',
    view:(c)=> <RsForecast c={c} /> },
  'stage/weather/degree-days': { title:'sc_degree',   sub:'sc_degree_s',   icon:'chart', family:'weather',
    view:(c)=> <RsDegreeDays c={c} /> },
  'stage/tap/guide':         { title:'sc_tapping',  sub:'sc_tapping_s',  icon:'tree',  family:'tap',
    view:(c)=> <RsTapGuide c={c} /> },
  'stage/lines/tubing':      { title:'sc_tubing',   sub:'sc_tubing_s',   icon:'map',   family:'lines',
    view:(c)=> <RsTubing c={c} /> },
  'stage/collect/ro':        { title:'sc_ro',       sub:'sc_ro_s',       icon:'ro',    family:'collect',
    view:(c)=> <RsROPlanner c={c} /> },
  'stage/boil/evaporator':   { title:'sc_evap',     sub:'sc_evap_s',     icon:'flame', family:'boil',
    view:(c)=> <RsEvaporator c={c} /> },
  'stage/boil/finishing':    { title:'sc_finish',   sub:'sc_finish_s',   icon:'filter',family:'boil',
    view:(c)=> <RsFinishing c={c} /> },
  'stage/boil/draw-off':     { title:'sc_boilpt',   sub:'sc_boilpt_s',   icon:'therm', family:'boil',
    view:(c)=> <RsDrawOff c={c} /> },
  'stage/boil/de':           { title:'deCalc',     sub:'deCalcS',       icon:'filter',family:'boil',
    view:(c)=> <RsDE c={c} /> },
  'stage/recap/season':      { title:'sc_recap',    sub:'sc_recap_s',    icon:'chart', family:'recap',
    view:(c)=> <RsRecapDetail c={c} /> },
  'stage/recap/diagnose':    { title:'sc_diagnose', sub:'sc_diagnose_s', icon:'chart', family:'recap', beta:true,
    view:(c)=> <RsDiagnose c={c} /> },
  'shack/log':               { title:'sc_log',      sub:'sc_log_s',      icon:'list',  family:'power',
    view:(c,openLog)=> <RsLogHistory c={c} openLog={openLog} /> },
  'shack/batches':           { title:'batchesTitle', sub:'batchesSub',  icon:'jug',   family:'boil',
    view:(c)=> <RsBatches c={c} /> },
  'shack/sap':               { title:'sc_sap',      sub:'sc_sap_s',      icon:'drop',  family:'power',
    view:(c)=> <RsSapCalc c={c} /> },
  'shack/equipment':         { title:'sc_equip',    sub:'sc_equip_s',    icon:'wrench',family:'power',
    view:(c)=> <RsEquipment c={c} /> },
  'shack/checklists':        { title:'sc_tasks',    sub:'sc_tasks_s',    icon:'check', family:'power',
    view:(c)=> <RsChecklists c={c} /> },
  'shack/guide':             { title:'sc_guide',    sub:'sc_guide_s',    icon:'book',  family:'power',
    view:(c)=> <RsGuide c={c} /> },
  'shack/breakeven':         { title:'bevTitle',    sub:'bevSub',        icon:'calc',  family:'power',
    view:(c)=> <RsBreakeven c={c} /> },
};
// Which screens each stage hub lists, in order. '#/bush' is the map (its own tab).
const RS_STAGE_SCREENS = {
  weather: ['stage/weather/forecast', 'stage/weather/degree-days'],
  tap:     ['stage/tap/guide'],
  lines:   ['#bush', 'stage/lines/tubing'],
  collect: ['stage/collect/ro', 'shack/log'],
  boil:    ['stage/boil/evaporator', 'stage/boil/draw-off', 'stage/boil/de', 'stage/boil/finishing'],
  recap:   ['stage/recap/season', 'stage/recap/diagnose'],
};
// Stage screens (Phase 6 replaces the Phase 4 hub lists).
const RS_STAGE_VIEW = { weather:RsWeatherStage, tap:RsTapStage, lines:RsLinesStage, collect:RsCollectStage, boil:RsBoilStage, recap:RsRecapStage };

function rsHref(path) { return '#/' + path; }
function rsGo(path) { const h = rsHref(path); if (location.hash !== h) location.hash = h; }
function useRsRoute() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return srParseHash(hash);
}
