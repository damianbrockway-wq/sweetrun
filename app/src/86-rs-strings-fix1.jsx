// ─── Run Sheet strings: fix pass 1 (season test items 1 to 22) ──────────────
// English and French together. Same rules as 82 to 85: no em or en dashes,
// placeholders match exactly, numbers arrive formatted. French follows the 85
// glossary (entaille, eau d'érable, osmose, casseroles, soutirer, érablière).
Object.assign(RS_TR.en, {
  // 1 · one tap count
  tapsN:'{n} taps', tapsN1:'1 tap', tapsPlanMap:'{p} planned · {m} mapped', bushCountsT2:'{t}\u00a0· {l} lines',
  tapsSrc_plan:'From your season setup', tapsSrc_map:'The taps on your mapped trees', tapsSrc_trees:'From your tree count ({n})',
  tapsRule:'One tap count for the whole app: your season setup\'s taps when you ran it, else the taps on your mapped trees, else your tree count.',
  nPerTapOf:'{v} {u} a tap · {t}', goalLine2:'Goal {g} {u}: {t} at the middle of the {m} range.', tgTotalSeason:'Your taps this season',
  dxTapsLine:'Graded on {t}.',
  // 2 · setup choices
  wzPanRate:'Boils about {v} {u} an hour. This is the pan the Boil and Evaporator screens use.',
  // 3 · Brix
  nBrixSubSet:'{r} to 1 · your Brix setting', lastReadingSap:'Last sap entry, {d}', brixFromBoth:'From {s} sap entries with a Brix and {t} tree readings.',
  // 4 · Diagnose
  dxLaborUnset:'Set a labor rate to see what your time costs. Until then it is left out.',
  // 5 · boil
  bpAheadFirst:'Drawn is {d} {u} ahead of what the pan makes in this time. Check the syrup Brix and how you counted the sap in.',
  estNoteSap:'Expected is the syrup in the sap you fed in, at {b}% Brix. Syrup drawn is the real number.',
  estNoteSapRo:'Expected is the syrup in the concentrate you fed in, at {b}% Brix. Syrup drawn is the real number.',
  estNoteRo:'Expected is worked out from your pan\'s rate boiling {b}% concentrate. Syrup drawn is the real number.',
  // 6 · tanks below freezing
  fillPaused:'Paused, below freezing', fullAfterThaw:'After it thaws',
  // 8 · RO against a straight boil
  rdUtilSap:'{p}% of your sap', rdUtilOver:'More than the sap logged. Check the RO entries.',
  roSavFuel:'Fuel burned, {f}', roSavedF:'Fuel saved', roInputsSub2:'{e} {u}/h, {f}, RO to {x}%',
  roFuelNote:'Fuel from the same model as the Evaporator screen: one unit boils about {n} {u} of sap ({fu}).',
  // 9 · yield gap
  gapAtTop:'At the top of the range',
  // 11 · seasons
  readyFor:'Getting ready for {y}', readyShort:'Getting ready', seasonClosedE:'{y} season closed',
  ctxReady:'Getting ready for {y}. Your {p} record is in Recap.', ctxOver:'The {y} run lasted {n} days. {v} {u} of syrup.',
  runLasted:'Ran {n} days', closeSeasonT:'Close the {y} season', closeSeasonP:'When the sap is done, close the season. Recap becomes the stage and the run stops counting days. You can reopen it.',
  closeSeasonB:'Close the {y} season', closeSeasonArm:'Tap again to close it', seasonClosedT:'{y} season closed',
  seasonClosedP:'Closed {d}. New entries from July on go into {n}.', reopenSeason:'Reopen this season', seasonReopened:'{y} season reopened',
  // 13 · fuel and service
  dryOvernight:'Runs dry overnight',
  jSvcT:'{name} is due for service', jSvcW:'{over} h past its {every} h service interval. Log the service when it is done.', jSvcB:'Open the pump', jSvcS:'{over} h overdue',
  // 14 · numbers
  numBad:'Type a number, like 12 or 2.5. Not saved.', numHigh:'The highest this takes is {v}. Not saved.', numLow:'The lowest this takes is {v}. Not saved.',
  sapDayHigh:'That is {v} {u} a tap today. A great vacuum day gives under 3. Check the number, or tap again to save it.',
  saveAnyway:'Save {v} {u} anyway',
  // 15 · dates
  dateOutside:'The {y} season runs {a} to {b}. Pick a date in it.',
  outsideT:'{n} entries are dated outside the {y} season', outsideT1:'1 entry is dated outside the {y} season',
  outsideP:'They count in the totals but not in the dates. Fix their dates in Log history.',
  // 16 · boil
  boilLongP:'This boil started {t} on {d}, {h} h ago. If it was left running, set the hours you really boiled.', hoursToLog:'Hours boiled',
  logBoilNoteD:'Adds the sap boiled, the syrup drawn and the hours to your log, dated {d}, the day it started.',
  // 12 · draw-off in °C
  drawOffPC:'Water\'s boiling point plus 3.9°C. Check the hydrometer before you jar it.', drawOffF:'{f}°F',
  drawOffRuleF:'7.1°F above the temperature water boils at today.', drawOffRuleC:'3.9°C above the temperature water boils at today.',
  waterBoilsAtLC:'Water boils at, °C', corrAddC:'At {t}°C, add {v} to the reading.', corrSubC:'At {t}°C, take {v} off the reading.', altRowC:'{bp}°C, draw off {fin}°C',
  // 18 · CSV import
  impNoDate:'No date column found. Each row needs a date, like 2027-03-15.', impBadDates:'None of the rows had a date SweetRun can read. Use a date like 2027-03-15.',
  impBadDateRows:'{n} rows had no readable date and are left out.',
  // 19 · boundary import
  impKeptBoundary:'Your boundary is kept. {n} lines from the file were added.', impReplaceQ:'This file has its own boundary. Replace the one you saved?',
  impReplaceB:'Replace my boundary', impKeptOld:'Kept your saved boundary. Nothing changed.',
  // 20 · restore
  restoreWarnX:'Your data on this device is replaced by the backup, exactly. Kept from this device: your Season Pass key, your trial and your language. The app reloads after.',
  restoreRemoves:'{n} settings or records on this device are not in the backup and will be removed.',
  backupCorrupt:'That backup is damaged ({k}). Nothing was restored.', restoreFailed:'The restore could not finish. Your data is back the way it was.',
  // 21 · license
  passCantCheck:'This browser can\'t check a Season Pass key, so it isn\'t accepted here. Update to iOS or Safari 17 or later, or use Chrome or Firefox. Email hello@sweetrun.app if you\'re stuck.',
  passCantCheckT:'Your Season Pass key can\'t be checked here',
  passCheckOffline:'Checking a key on this browser needs a connection. Try again when you have signal.',
});
Object.assign(RS_TR.fr, {
  tapsN:'{n} entailles', tapsN1:'1 entaille', tapsPlanMap:'{p} prévues · {m} sur la carte', bushCountsT2:'{t}\u00a0· {l} lignes',
  tapsSrc_plan:'Selon votre plan de saison', tapsSrc_map:'Les entailles de vos arbres sur la carte', tapsSrc_trees:'Selon votre nombre d\'arbres ({n})',
  tapsRule:'Un seul nombre d\'entailles dans toute l\'appli : celui de votre plan de saison, sinon les entailles des arbres sur la carte, sinon votre nombre d\'arbres.',
  nPerTapOf:'{v} {u} par entaille · {t}', goalLine2:'Objectif {g} {u} : {t} au milieu de la fourchette {m}.', tgTotalSeason:'Vos entailles cette saison',
  dxTapsLine:'Évalué sur {t}.',
  wzPanRate:'Bout environ {v} {u} à l\'heure. C\'est la casserole des écrans Bouillage et Évaporateur.',
  nBrixSubSet:'{r} pour 1 · votre réglage de Brix', lastReadingSap:'Dernière entrée d\'eau d\'érable, {d}', brixFromBoth:'Selon {s} entrées d\'eau d\'érable avec un Brix et {t} lectures aux arbres.',
  dxLaborUnset:'Indiquez un taux horaire pour voir ce que coûte votre temps. D\'ici là, il n\'est pas compté.',
  bpAheadFirst:'Le sirop soutiré dépasse de {d} {u} ce que la casserole fait en ce temps. Vérifiez le Brix du sirop et l\'eau d\'érable comptée à l\'entrée.',
  estNoteSap:'L\'attendu est le sirop contenu dans l\'eau d\'érable versée, à {b} % Brix. Le sirop soutiré est le vrai chiffre.',
  estNoteSapRo:'L\'attendu est le sirop contenu dans le concentré versé, à {b} % Brix. Le sirop soutiré est le vrai chiffre.',
  estNoteRo:'L\'attendu vient du débit de votre casserole avec un concentré à {b} %. Le sirop soutiré est le vrai chiffre.',
  fillPaused:'En pause, sous le point de congélation', fullAfterThaw:'Après le dégel',
  rdUtilSap:'{p} % de votre eau d\'érable', rdUtilOver:'Plus que l\'eau d\'érable notée. Vérifiez les entrées d\'osmose.',
  roSavFuel:'Combustible brûlé, {f}', roSavedF:'Combustible économisé', roInputsSub2:'{e} {u}/h, {f}, osmose à {x} %',
  roFuelNote:'Combustible selon le même modèle que l\'écran Évaporateur : une unité fait bouillir environ {n} {u} d\'eau d\'érable ({fu}).',
  gapAtTop:'Au haut de la fourchette',
  readyFor:'On se prépare pour {y}', readyShort:'On se prépare', seasonClosedE:'Saison {y} fermée',
  ctxReady:'On se prépare pour {y}. Votre bilan {p} est dans Bilan.', ctxOver:'La coulée {y} a duré {n} jours. {v} {u} de sirop.',
  runLasted:'{n} jours de coulée', closeSeasonT:'Fermer la saison {y}', closeSeasonP:'Quand la coulée est finie, fermez la saison. Le bilan devient l\'étape et les jours de coulée s\'arrêtent. Vous pouvez la rouvrir.',
  closeSeasonB:'Fermer la saison {y}', closeSeasonArm:'Touchez encore pour fermer', seasonClosedT:'Saison {y} fermée',
  seasonClosedP:'Fermée le {d}. Les nouvelles entrées à partir de juillet vont dans {n}.', reopenSeason:'Rouvrir cette saison', seasonReopened:'Saison {y} rouverte',
  dryOvernight:'À sec durant la nuit',
  jSvcT:'{name} doit être entretenu', jSvcW:'{over} h passé son intervalle d\'entretien de {every} h. Notez l\'entretien une fois fait.', jSvcB:'Ouvrir la pompe', jSvcS:'{over} h en retard',
  numBad:'Tapez un nombre, comme 12 ou 2,5. Rien d\'enregistré.', numHigh:'Le maximum ici est {v}. Rien d\'enregistré.', numLow:'Le minimum ici est {v}. Rien d\'enregistré.',
  sapDayHigh:'Ça fait {v} {u} par entaille aujourd\'hui. Une excellente journée sous vacuum donne moins de 3. Vérifiez le chiffre, ou touchez encore pour l\'enregistrer.',
  saveAnyway:'Enregistrer {v} {u} quand même',
  dateOutside:'La saison {y} va du {a} au {b}. Choisissez une date dedans.',
  outsideT:'{n} entrées sont datées hors de la saison {y}', outsideT1:'1 entrée est datée hors de la saison {y}',
  outsideP:'Elles comptent dans les totaux, pas dans les dates. Corrigez leurs dates dans l\'historique.',
  boilLongP:'Ce bouillage a commencé à {t} le {d}, il y a {h} h. S\'il est resté ouvert, indiquez les heures vraiment bouillies.', hoursToLog:'Heures bouillies',
  logBoilNoteD:'Ajoute l\'eau d\'érable bouillie, le sirop soutiré et les heures à votre registre, en date du {d}, le jour où il a commencé.',
  drawOffPC:'Point d\'ébullition de l\'eau plus 3,9°C. Vérifiez à l\'hydromètre avant d\'embouteiller.', drawOffF:'{f}°F',
  drawOffRuleF:'7,1°F au-dessus de la température où l\'eau bout aujourd\'hui.', drawOffRuleC:'3,9°C au-dessus de la température où l\'eau bout aujourd\'hui.',
  waterBoilsAtLC:'L\'eau bout à, °C', corrAddC:'À {t}°C, ajoutez {v} à la lecture.', corrSubC:'À {t}°C, retirez {v} de la lecture.', altRowC:'{bp}°C, soutirer à {fin}°C',
  impNoDate:'Aucune colonne de date. Chaque ligne a besoin d\'une date, comme 2027-03-15.', impBadDates:'Aucune ligne n\'a une date lisible. Utilisez une date comme 2027-03-15.',
  impBadDateRows:'{n} lignes sans date lisible sont laissées de côté.',
  impKeptBoundary:'Votre limite est gardée. {n} lignes du fichier ont été ajoutées.', impReplaceQ:'Ce fichier a sa propre limite. Remplacer celle que vous avez enregistrée?',
  impReplaceB:'Remplacer ma limite', impKeptOld:'Votre limite enregistrée est gardée. Rien n\'a changé.',
  restoreWarnX:'Vos données sur cet appareil sont remplacées par la sauvegarde, exactement. Gardés de cet appareil : votre clé de Passe saison, votre essai et votre langue. L\'appli se recharge ensuite.',
  restoreRemoves:'{n} réglages ou registres de cet appareil ne sont pas dans la sauvegarde et seront retirés.',
  backupCorrupt:'Cette sauvegarde est abîmée ({k}). Rien n\'a été restauré.', restoreFailed:'La restauration n\'a pas pu finir. Vos données sont revenues comme avant.',
  passCantCheck:'Ce navigateur ne peut pas vérifier une clé de Passe saison, elle n\'est donc pas acceptée ici. Passez à iOS ou Safari 17 ou plus récent, ou utilisez Chrome ou Firefox. Écrivez à hello@sweetrun.app au besoin.',
  passCantCheckT:'Votre clé de Passe saison ne peut pas être vérifiée ici',
  passCheckOffline:'Vérifier une clé sur ce navigateur demande une connexion. Réessayez quand vous avez du réseau.',
});
