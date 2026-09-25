// ─── SUGARSAGE KNOWLEDGE BASE + AI ────────────────────────────────────────────

const SS_KB = [
  // ── BIOLOGY & SAP FLOW ──────────────────────────────────────────────────────
  { id:'bio_01', cat:'biology',
    q:'Why does maple sap flow in spring?',
    kw:['sap flow','spring','freeze thaw','pressure','why sap flows','when does sap flow'],
    a:`Maple sap flow is driven by a unique stem pressure mechanism tied to freeze-thaw cycles. When temperatures drop below freezing at night, gas in wood fibers dissolves into the cooling xylem fluid and CO₂ is absorbed by living ray cells — creating negative pressure (tension) that draws water from the soil into the tree. When daytime temperatures rise above freezing, that dissolved CO₂ re-expands, building positive pressure (up to 30 psi in a healthy tree) that pushes sap outward through any tap hole. Sugar maples (Acer saccharum) are unique in generating this pressure; most other hardwoods rely on root pressure alone, which is far weaker. The result is a gravity-defying flow that can yield 1–2 gallons per tap on an ideal run day.`,
    src:'Tyree & Zimmermann, Xylem Structure and Function (2002); UVM Proctor Maple Research Center, Tech Report 2019',
    tip:'Runs stop when either daytime highs stay below freezing (no thaw) or nights stay above freezing (no recharge). The sweet spot is 20–24°F nights and 40–45°F days.' },

  { id:'bio_02', cat:'biology',
    q:'How is sugar stored in a maple tree, and how does it affect sap sugar content?',
    kw:['sucrose','starch','sugar storage','brix','sap sweetness','sugar content'],
    a:`In late summer and fall, sugar maples convert photosynthate to starch and store it in ray parenchyma cells throughout the wood. During the winter thaw cycle, amylase enzymes convert that starch back to sucrose, which dissolves into sap water. The tree's stored starch reserve — built during the previous growing season — is the primary determinant of sap sugar concentration. A tree that lost canopy to disease or had a poor growing season will have lower starch reserves and thinner sap (often <1.5°Brix). Average commercial sap runs 2–2.5°Brix; exceptional taps on well-sited trees can reach 3–4°Brix.`,
    src:'Perkins & van den Berg, "Maple Syrup — Sucrose Composition and Tree Physiology," Cornell Sugar Maple Research (2016)',
    tip:'Fertilizing around the drip line with a balanced 10-10-10 in early fall can modestly improve starch reserves the following season.' },

  { id:'bio_03', cat:'biology',
    q:'What is the ideal age and size of a maple tree for tapping?',
    kw:['tree size','tapping age','diameter','when to tap','tree health','minimum size'],
    a:`The standard guideline is a minimum trunk diameter of 10 inches (25 cm) measured at breast height (DBH, ~4.5 ft off the ground). A tree that size is typically 40+ years old. At 10–17 in DBH, one tap is appropriate. At 18–24 in, two taps. Above 25 in, three taps maximum — though modern low-wound research supports staying at two taps even on large trees to maximize long-term health. Over-tapping creates excessive wound wood (walling-off tissue), reducing future tap yield and potentially shortening the tree's productive lifespan.`,
    src:'Cornell Maple Program, "Maple Tapping Guidelines" (2021); Vermont Agency of Agriculture Best Management Practices',
    tip:'Never tap a tree showing crown dieback, heavy lichen growth, or prior heavy tap-hole clustering — these signal stress that tapping will worsen.' },

  { id:'bio_04', cat:'biology',
    q:'How does vacuum affect sap yield at the cellular level?',
    kw:['vacuum','yield','sap flow','cellular','how vacuum works','suction'],
    a:`Under gravity, sap exits a tap hole only when internal stem pressure exceeds atmospheric pressure (~14.7 psi). Vacuum tapping reverses this by creating a pressure differential: applied vacuum (typically 15–27 in Hg) reduces the pressure at the tap hole outlet below atmospheric, allowing sap to flow even when stem pressure is neutral or slightly negative. Research shows that each additional inch of vacuum above ~15 in Hg yields roughly 1.5–2% more sap per tap, up to a practical ceiling around 26–27 in Hg. Beyond that, diminishing returns occur and lateral tube freeze-ups become more frequent at high vacuum on marginal-temperature days.`,
    src:'UVM Proctor Maple Research Center, "Vacuum and Sap Yield" (2018); Perkins et al., NJAS Wageningen Journal (2019)',
    tip:'Leak management matters more than adding pump capacity. A system losing 5 in Hg to leaks will never hit 25 in Hg regardless of pump size.' },

  { id:'bio_05', cat:'biology',
    q:'Why does sap turn buddy (buddy sap) near the end of the season, and can it still be used?',
    kw:['buddy sap','end of season','off flavor','buds','sap quality','maple buddy'],
    a:`As temperatures consistently warm in late season, maple trees break dormancy and begin activating their buds. During this process, microorganisms in the sap increase rapidly, and the tree's own metabolism shifts — producing compounds like tyrosine-derived amino acids that degrade into phenolic compounds during evaporation. The result is a distinctly unpleasant, bitter, "buddy" flavor that cannot be removed by filtration or any processing method. Buddy sap is not dangerous, but the resulting syrup is commercially and culinary unacceptable. The best field test: foam the sap vigorously and smell it — a faint grassy or barnyard note is an early warning sign. Once detectable in taste, that run should be discarded.`,
    src:'Perkins, T.D., "Sap Quality and Season Termination," UVM Proctor (2014); Quebec IRDA Maple Research Bulletin No. 7',
    tip:'Watch bud swell, not calendar date. On a warm spring, buddy sap can arrive 2–3 weeks earlier than your historical average.' },

  // ── TAPPING TECHNIQUE ───────────────────────────────────────────────────────
  { id:'tap_01', cat:'tapping',
    q:'What is the correct tap hole diameter, depth, and placement?',
    kw:['tap hole','drill','spout size','tapping depth','where to tap','placement','5/16'],
    a:`The industry has largely moved from 7/16 in to 5/16 in spouts (sometimes called "health spouts"). Research from UVM Proctor shows that 5/16 in tap holes produce only marginally less sap than 7/16 in holes on vacuum systems, while generating dramatically less wound wood — roughly 30% less discolored sapwood per tap. Optimal depth is 1.5–2 in into sound white wood (stop before heartwood). Placement: select a fresh spot 4–6 in horizontally and 12–18 in vertically from any prior tap hole scar. On high-vacuum systems (>20 in Hg), many operations now use 19/64 in or specialized check-valve spouts that further reduce wound wood.`,
    src:'UVM Proctor Maple Research Center, "Spout Size and Tree Wound Response" (2017); Cornell Maple Program Best Practices',
    tip:'Drill slightly upward (~5° angle) so that sap drains naturally by gravity even before full vacuum builds.' },

  { id:'tap_02', cat:'tapping',
    q:'When should I tap — date vs. weather cues?',
    kw:['when to tap','tapping date','timing','late tap','early tap','optimal timing'],
    a:`Date-based tapping is less reliable than weather-based. The goal is to tap as close as possible to the first freeze-thaw cycle that will produce sap flow — but not so early that tap holes desiccate and dry out before the season begins. In the northeastern US, this typically means 4–6 weeks before the expected first run (late January to mid-February in Zone 5, late February to early March in colder zones). Check-valve spouts reduce the desiccation risk, allowing tapping 2–3 weeks earlier with minimal sap quality penalty. Never tap into frozen wood — wait until daytime temperatures reach at least 34–36°F so the outer sapwood is thawed and you're drilling into active tissue.`,
    src:'Cornell Maple Program, "Optimizing Tap Timing" (2020); Vermont Maple Industry Council Producers Guide',
    tip:'A test tap on a south-facing tree 2 weeks before your planned tapping date is the best real-world predictor of season start.' },

  { id:'tap_03', cat:'tapping',
    q:'How many taps can I safely put on a tree without harming it?',
    kw:['tap number','how many taps','over-tapping','tree stress','taps per tree'],
    a:`UVM and Cornell research consistently recommends: 1 tap for 10–17 in DBH; 2 taps for 18–24 in DBH; and a maximum of 3 taps for trees above 25 in — though current best practice suggests staying at 2 taps even for very large trees. Studies show that beyond 2 taps, incremental sap gain is small (often <15%) while the cumulative wound wood area increases substantially. On high-vacuum tubing systems, the original "2-tap threshold" should be lowered: the elevated yield per tap on vacuum means 1 tap per tree is often more profitable and healthier long-term.`,
    src:'Perkins et al., "Tapping Intensity and Long-Term Tree Health," Forest Ecology and Management (2018)',
    tip:'Track tap hole location on a simple tree map. Efficient vertical and horizontal spacing adds up to measurable yield gains over a 20-year rotation.' },

  { id:'tap_04', cat:'tapping',
    q:'What causes dry or slow-flowing taps, and how do I fix it?',
    kw:['dry tap','slow tap','no sap','tap not flowing','stuck tap','low flow'],
    a:`The most common causes of dry or underperforming taps: (1) Tap hole dried out — the inner wood surface exposed by drilling desiccates within days if temperatures don't support sap flow. Remedy: retap 1 in beside or below the old hole. (2) Vacuum leak at the spout — a loose spout or cracked drop line kills flow. Check-valve spouts mitigate this. (3) Tapping into wounded wood — drilling into a prior-year scar or stained heartwood yields little sap. (4) Tree stress — a declining tree has lower stem pressure and starch reserves. (5) Late-season sap check — once the tree fully leafs out, sap sugar drops and flow becomes erratic.`,
    src:'Cornell Maple Program Field Diagnostics Guide (2019)',
    tip:'On a vacuum system, any tap that shows consistently lower vacuum than neighbors (5+ in Hg difference) is either leaking or in compromised wood.' },

  // ── VACUUM & TUBING ─────────────────────────────────────────────────────────
  { id:'vac_01', cat:'vacuum',
    q:'What vacuum level should I target, and how do I measure it?',
    kw:['vacuum level','target vacuum','inches hg','vacuum gauge','how much vacuum'],
    a:`Most commercial operations target 25–27 in Hg at the pump, with the goal of maintaining 22–25 in Hg at the bush lateral lines. Each inch of Hg of vacuum above gravity corresponds to roughly 1.5–2% additional sap yield per tap, making vacuum one of the highest-ROI investments in maple production. Vacuum is measured with a Dwyer magnehelic gauge or a liquid manometer; digital vacuum gauges are increasingly common and allow remote monitoring. The key measurement is at the end of long lateral runs, not at the pump — pump vacuum tells you what you're generating, lateral vacuum tells you what trees actually experience.`,
    src:'UVM Proctor Maple Research Center, "Vacuum System Management" (2020)',
    tip:'Install a vacuum gauge at the furthest point in your system. If you see >3 in Hg drop from pump to that point, prioritize leak hunting before adding more pump capacity.' },

  { id:'vac_02', cat:'vacuum',
    q:'How do I find and fix vacuum leaks?',
    kw:['vacuum leak','leak detection','leak hunting','hissing','low vacuum','fix leaks'],
    a:`Vacuum leaks are the #1 yield killer in tubing systems. Systematic leak detection: (1) Isolate sections — close off mainline valves one lateral at a time and watch the vacuum gauge. A section that jumps 3+ in Hg when isolated has a significant leak. (2) Walk the lines on a quiet morning — hissing is audible from 10–15 ft in calm conditions. (3) Use a smoke generator or soap solution on fittings. (4) Inspect drop lines first — freeze-crack, woodpecker damage, and UV brittleness cluster on drop lines. (5) Check all union fittings, tees, and saddle connections — these fail more than straight tubing. After repairs, verify vacuum recovery before moving to the next section.`,
    src:'Cornell Maple Program, "Vacuum Tubing System Troubleshooting" (2021)',
    tip:'A systematic spring leak walk before tapping — not mid-season — saves the most sap. Fix leaks when the lines are empty and you can see clearly.' },

  { id:'vac_03', cat:'vacuum',
    q:'What size vacuum pump do I need for my operation?',
    kw:['pump size','vacuum pump','cfm','how big a pump','pump capacity','pump selection'],
    a:`Pump sizing is based on CFM (cubic feet per minute) of air removal capacity, not horsepower alone. The rule of thumb is 1 CFM per 100 taps at 25 in Hg, but this assumes a tight (low-leak) system. A leaky system can demand 3–5x that CFM. For a new installation: start with 1.5 CFM/100 taps to give yourself margin. Oil-sealed rotary vane pumps are the industry standard for reliability and high vacuum; liquid ring pumps are common in large operations. For <500 taps, a 1–1.5 HP oil rotary vane pump (e.g., Gast, Welch) is adequate. Variable-speed drives (VFDs) on larger pumps allow vacuum modulation to match weather conditions — worth the investment above 2,000 taps.`,
    src:'UVM Extension, "Vacuum Pump Selection for Maple Operations" (2019)',
    tip:'Always size up one model rather than running a pump at its rated limit — pump longevity doubles when run at 70–80% capacity.' },

  { id:'vac_04', cat:'vacuum',
    q:'How does temperature affect vacuum performance and sap yield on vacuum?',
    kw:['vacuum temperature','cold weather vacuum','vacuum sap yield','marginal run day'],
    a:`Cold temperatures thicken the sap and increase viscosity, reducing flow rates through small-diameter tubing even at the same vacuum. Below about 30°F ambient, sap may freeze in lateral lines before reaching the mainline — this is especially common in 3/16 in laterals on north-facing slopes. Conversely, on days when temperatures stay above freezing all night, stem pressure cannot recharge and vacuum has little to pull. The optimal vacuum benefit is on days when temperatures cross the freezing threshold twice (classic freeze-thaw). On purely warm days with no freezing, vacuum provides minimal additional yield over gravity.`,
    src:'UVM Proctor, "Temperature Effects on Vacuum Tubing Performance" (2017)',
    tip:'Consider installing a vacuum controller (e.g., Sap Sucker Automation) that modulates pump speed to reduce freeze-up risk on near-freezing nights.' },

  // ── REVERSE OSMOSIS ─────────────────────────────────────────────────────────
  { id:'ro_01', cat:'ro',
    q:'How does reverse osmosis work for maple sap concentration?',
    kw:['reverse osmosis','ro','how ro works','concentration','membrane','osmosis'],
    a:`Reverse osmosis (RO) forces sap at high pressure (typically 150–300 psi) through semi-permeable membranes that block sucrose molecules while allowing water to pass. The result is two streams: permeate (nearly pure water, removed from the process) and concentrate (sap with elevated sugar content). A standard single-pass RO can take 2°Brix sap to 8–10°Brix; a double-pass can reach 14–18°Brix. Because evaporating water is by far the largest energy cost in maple production (it takes ~1 lb of wood or fuel to evaporate roughly 1 lb of water), pre-concentrating sap with RO dramatically reduces boiling time and fuel use. Modern high-efficiency RO membranes can remove 60–75% of the water from raw sap in a single pass.`,
    src:'Perkins & van den Berg, "Reverse Osmosis in Maple Syrup Production," Vermont Maple Bulletin (2018)',
    tip:'RO membranes are sensitive to bacterial biofilm. Sanitize thoroughly with a citric acid wash after every use and store membranes in a food-grade preservative solution (bisulfite) between seasons.' },

  { id:'ro_02', cat:'ro',
    q:'What concentration level should I target with my RO before boiling?',
    kw:['ro concentration','target brix','ro brix','how concentrated','double pass','ro output'],
    a:`The sweet spot for concentrate Brix depends on your evaporator and goals. Most operations target 8–12°Brix for single-pass systems. Going above 16°Brix risks sucrose crystallization in the RO circuit and concentrate tanks, especially in cold ambient conditions. For flavor quality, there is ongoing debate: some producers and researchers argue that over-concentrating (>16°Brix) can slightly depress flavor development during the Maillard reactions in the evaporator; others find no detectable difference through 18°Brix. The consensus from UVM sensory studies is that up to 14–16°Brix, flavor impact is minimal. Beyond 18°Brix, very fast boils at high Brix can mute some volatile aromatics.`,
    src:'UVM Proctor, "RO Concentration Levels and Syrup Flavor" (2019); IMSI Technical Bulletin No. 4',
    tip:'If your raw sap runs >2.5°Brix naturally (lucky tree site!), a single-pass RO to 8–10°Brix may give you a better Maillard reaction profile than pushing to 14+°Brix.' },

  { id:'ro_03', cat:'ro',
    q:'How do I maintain RO membranes and prevent fouling?',
    kw:['ro membrane','fouling','clean ro','membrane maintenance','sanitize ro','ro care'],
    a:`RO membrane longevity is almost entirely maintenance-dependent. Critical practices: (1) Flush with clean cold water immediately after each use — never let concentrate sap sit in membranes. (2) Perform a citric acid clean (0.5% solution, 30-min recirculation) at least weekly during heavy production periods. (3) Sanitize with sodium metabisulfite or food-grade chloramine solution for storage between runs. (4) End-of-season: flush with RO permeate, do a final citric acid clean, then store wet in a bisulfite preservative (0.5% sodium metabisulfite) at 35–40°F. Never allow membranes to freeze. (5) Monitor permeate flow rate — a >15% drop from baseline indicates fouling that requires a caustic clean (sodium hydroxide 0.1% solution, food grade).`,
    src:'DOW Water Solutions, "Filmtec Membrane Maintenance Manual"; Cornell Maple Program RO Maintenance Guide (2020)',
    tip:'Keep a logbook of permeate flow rate, feed pressure, and temperature at each use. Gradual fouling is invisible without trending data.' },

  { id:'ro_04', cat:'ro',
    q:'What is the payback period for a small-farm RO system?',
    kw:['ro cost','ro payback','return on investment','ro worth it','buy ro','small ro'],
    a:`For a 500–2,000 tap operation, a quality single-pass RO system (e.g., CDL, Leader, H2O Innovation) typically costs $8,000–$18,000 installed. The payback calculation hinges on your current fuel cost per gallon of syrup. If you're burning $80/cord of wood and your evaporator uses ~0.8 cords per gallon of syrup without RO, that's $64/gallon in fuel alone. A good RO at 8°Brix concentrate cuts boiling water by ~70%, reducing fuel cost to ~$19/gallon — a $45/gallon saving. At 500 gallons/season, that's $22,500/year in fuel savings, yielding a payback of under one season for most mid-scale operations. Labor savings from reduced boiling time typically add another 20–30% to the effective ROI.`,
    src:'Cornell Maple Program, "Economic Analysis of RO Systems" (2021)',
    tip:'Don\'t overlook the "phantom RO" benefit: with less boiling time, your evaporator pans accumulate niter (mineral deposits) more slowly, reducing cleaning labor significantly.' },

  // ── EVAPORATION ─────────────────────────────────────────────────────────────
  { id:'evap_01', cat:'evaporation',
    q:'What is a standard evaporation rate and how do I improve mine?',
    kw:['evaporation rate','gallons per hour','evaporator efficiency','boil rate','slow evaporator'],
    a:`Standard evaporation rates for arch-fired flat-pan evaporators run 10–15 gal/hr per square foot of pan surface area — so a 2×6 ft evaporator (12 sq ft) should theoretically produce 120–180 gal/hr water evaporation. In practice, most operations see 40–70% of theoretical due to firebox efficiency, pan fouling, and sap feed rate management. Key improvements: (1) Preheat incoming sap — adding a condensate preheater above the stack can raise incoming sap from 40°F to 160°F, reducing the energy cost of bringing sap to boil. (2) Keep pans clean — niter (calcium compounds) insulates pan surfaces and can reduce heat transfer by 15–30%. (3) Optimize air-fuel ratio — clean, hot fire with good draft outperforms a smothered, slow fire every time. (4) Use a steamaway or hood to capture latent heat. (5) Ensure pan depth is correct: syrup pan 2–3 in, sap pan 4–6 in.`,
    src:'IMSI Evaporator Operations Guide (2020); UVM Extension, "Improving Evaporator Efficiency" (2018)',
    tip:'A quick test: if your stack exhaust is dark brown or black smoke, you have incomplete combustion — you\'re wasting 20–30% of your fuel energy as soot.' },

  { id:'evap_02', cat:'evaporation',
    q:'How do I properly finish syrup to correct density?',
    kw:['finishing','density','hydrometer','syrup density','66.9 brix','proper density','thermometer finish'],
    a:`Maple syrup must be packed at 66–68.9°Brix (66°Brix is the USDA/Canadian regulatory minimum for "maple syrup"). Below 66°Brix, syrup is under-density and will ferment in the container. Above 68.9°Brix, it will crystallize (sugar sand / niter formation is accelerated, and sucrose crystallization can occur in the jar). Measurement methods: (1) Hydrometer: read at 211°F (water boils at ~212°F at sea level; syrup finishes at 219°F at sea level, adjusting for altitude). (2) Refractometer: read Brix at room temperature — far more practical for small-batch finishing. (3) Temperature method: syrup finishes at exactly 7.1°F above the current water boiling point (measure water boiling that same day — it varies with elevation and barometric pressure).`,
    src:'Vermont Agency of Agriculture, "Maple Syrup Density Standards" (2022); IMSI Technical Bulletin No. 2',
    tip:'Always use the temperature method as a double-check alongside a refractometer. Refractometers can drift with temperature and calibration. A $15 digital instant-read thermometer pays for itself the first time you avoid a under-density pack.' },

  { id:'evap_03', cat:'evaporation',
    q:'What causes niter (sugar sand) and how do I reduce it?',
    kw:['niter','sugar sand','grit','sediment','cloudy syrup','niter filter','calcium'],
    a:`Niter (also called sugar sand or bloom) is primarily calcium malate and calcium phosphate precipitated from sap during evaporation. All maple syrup contains some niter; the goal is to remove it before packing. Formation is influenced by: (1) Sap mineral content — varies by soil geology, soil pH, and season timing. Early-season sap typically has lower mineral content. (2) Boiling temperature and time — prolonged high-heat boiling at the finishing stage precipitates more niter. (3) pH — slightly acidic sap (pH 6.0–6.5) forms less niter than alkaline sap. Reduction strategies: hot-pack filter through orlon felt filters immediately after finishing while syrup is above 180°F. Cold-filtering is ineffective. Replace filters frequently — niter-saturated filters restrict flow and can introduce off-flavors.`,
    src:'Perkins & van den Berg, "Niter Formation in Maple Syrup" (2015); Cornell Maple Program Finishing Guide',
    tip:'If your syrup consistently has heavy niter, test your sap pH. A pH above 7.0 is unusual and may indicate contamination. Ideal sap pH is 6.5–7.0.' },

  { id:'evap_04', cat:'evaporation',
    q:'What wood species is best for firing an arch evaporator?',
    kw:['firewood','best wood','cord wood','wood species','btu','hardwood','softwood evaporator'],
    a:`Hardwoods with high BTU content and low moisture are the gold standard: sugar maple, yellow birch, beech, red oak, and ash all deliver 23–27 million BTU/cord (air-dried). Softwoods (pine, spruce, fir) deliver only 15–19 million BTU/cord and burn faster with more creosote buildup. The critical variable is moisture content — "seasoned" wood (≤20% moisture content) burns 40–50% more efficiently than green wood (40–60% moisture). A moisture meter (cheap, $20–40) is one of the best investments for firewood management. Split smaller (3–4 in diameter) for faster, hotter burns in an evaporator arch compared to fireplace-sized logs.`,
    src:'USFS Forest Products Lab, "Wood as Fuel" (2020); IMSI Fuel Guide',
    tip:'Weigh your wood at the start of a season and track gallons of syrup produced. This gives you a real $/gallon fuel cost that beats any estimate.' },

  { id:'evap_05', cat:'evaporation',
    q:'What is a steam-away preheater and is it worth adding?',
    kw:['preheater','steam away','condensate','heat recovery','preheater value','energy savings'],
    a:`A condensate preheater (commonly called a steam-away or stack preheater) recycles the thermal energy from steam rising off the evaporator pans to preheat incoming cold sap before it enters the back pan. Without a preheater, incoming sap at 34–40°F must be heated to boiling (~212°F) entirely by firebox energy. A well-designed preheater can deliver incoming sap at 150–180°F, reducing the firebox load for that thermal lift by 60–70%. In practice, most operators report 10–20% reduction in fuel use. Stack preheaters (using exhaust gas heat) can supplement this further. Cost: $800–$2,500 installed depending on evaporator size. Payback at $80/cord and 200 cords/season is typically 1–2 seasons.`,
    src:'UVM Extension, "Evaporator Heat Recovery Systems" (2019); IMSI Technical Bulletin No. 8',
    tip:'Measure inlet sap temperature before and after installing a preheater for one season. Real-world data will confirm (or disprove) your specific efficiency gain.' },

  // ── FINISHING & GRADING ─────────────────────────────────────────────────────
  { id:'fin_01', cat:'finishing',
    q:'How does the new USDA/Canadian maple syrup grading system work?',
    kw:['grading','grade a','grade b','amber','dark','golden','color class','light transmittance'],
    a:`Since 2015, both the USDA and Canada adopted a unified grading system based on light transmittance measured in percent light transmission (%Tc) through a 10mm sample at 560 nm wavelength: Grade A Golden Color / Delicate Taste: >75%Tc. Grade A Amber Color / Rich Taste: 44–74.9%Tc. Grade A Dark Color / Robust Taste: 25–43.9%Tc. Grade A Very Dark / Strong Taste: <25%Tc. All syrup sold to consumers must be Grade A. Syrup below Grade A density standards or with off-flavors is Grade B (processing/commercial grade). In practice, Golden syrup is rare and commands a premium; Amber is the most widely sold; Dark and Very Dark are popular for cooking and with consumers who prefer strong maple flavor.`,
    src:'USDA Agricultural Marketing Service, "United States Standards for Grades of Maple Syrup" (2015); Agriculture and Agri-Food Canada Maple Syrup Standards',
    tip:'Color is primarily determined by season timing: early-season sap produces lighter (Golden/Amber) syrup; late-season produces darker (Dark/Very Dark) syrup. Temperature during boiling also affects color.' },

  { id:'fin_02', cat:'finishing',
    q:'What causes off-flavors in maple syrup and how do I prevent them?',
    kw:['off flavor','bad syrup','sour syrup','buddy','fermented','metallic','plastic taste','off flavors'],
    a:`Common off-flavors and their causes: (1) Sour / fermented: sap held too long or too warm before processing — bacteria (Pseudomonas, Enterobacter spp.) consume sucrose and produce lactic/acetic acid. Process within 24 hours of collection in warm weather. (2) Buddy: late-season sap from trees beginning to bud — unmistakable bitter phenolic taste. No fix; discard. (3) Metallic: zinc or iron contamination from galvanized or old steel equipment. Use only food-grade stainless, food-safe poly, or aluminum. (4) Caramelized / burned: overheating in the syrup pan or finishing pan — keep syrup moving and finish at correct temperature. (5) Plastic / solvent: contaminated tubing or fittings — replace with food-grade poly or NSF-certified materials. (6) Smoky: incomplete combustion or smoke infiltrating the pan — check stack draft and firebox seals.`,
    src:'Cornell Maple Program, "Maple Syrup Flavor Defects and Solutions" (2020)',
    tip:'Do a fresh taste test on each batch before packing. Trust your palate — experienced tasters detect off-notes at concentrations too low for any instrument.' },

  { id:'fin_03', cat:'finishing',
    q:'What is the best way to pack and store maple syrup?',
    kw:['packing','hot pack','storage','shelf life','jars','containers','syrup storage'],
    a:`Hot-pack at 180–185°F (82–85°C) minimum into clean, sterilized containers (glass or food-grade HDPE) and seal immediately. The heat kills any residual bacteria and creates a vacuum seal as the syrup cools. Syrup properly packed this way is shelf-stable for 4+ years unopened. Once opened, refrigerate and use within 1–2 years; freeze for longer storage. Containers: glass is ideal for retail quality and flavor neutrality; HDPE jugs are durable and lighter for bulk. Never pack in reclaimed containers not designed for food use. For bulk drums (30 or 55 gal), hot-pack at 185°F, bung immediately, and flip upside-down for 5 minutes to sterilize the headspace.`,
    src:'Vermont Agency of Agriculture, "Maple Syrup Packing Standards" (2022); NSF/ANSI 61 Food Safety Standard',
    tip:'Glass containers lose their vacuum seal if packed under 180°F. Use a digital thermometer in the syrup — surface temperature lags by 3–5°F.' },

  // ── WEATHER & SEASON FORECASTING ────────────────────────────────────────────
  { id:'wea_01', cat:'weather',
    q:'What weather conditions produce the best maple sap runs?',
    kw:['run day','weather','forecast','best runs','ideal conditions','freeze thaw','sap run weather'],
    a:`The classic "run day" requires: nights below freezing (ideally 20–28°F) followed by days above freezing (ideally 38–45°F) with moderate sun. These conditions allow stem pressure to recharge overnight (freeze phase dissolves CO₂, builds tension) and discharge during the warm day. The best runs often follow a sunny day after a cold night, with light winds (strong wind cools trees and suppresses pressure buildup). Extended cloudy periods with temperatures oscillating near 32°F produce erratic, low-volume runs. Snow cover on the ground is beneficial — it insulates the root zone and moderates soil temperature swings. Late-season runs after sustained warm nights produce shorter, lower-sugar flows.`,
    src:'UVM Proctor Maple Research Center, "Weather and Sap Flow" (2016); NRCC Northeast Climate Center, Maple Season Analysis',
    tip:'A 7-day forecast showing at least 3 nights below 26°F and 3 days above 38°F is your best predictor of a productive week. Watch for the pattern, not individual days.' },

  { id:'wea_02', cat:'weather',
    q:'How is climate change affecting maple syrup production?',
    kw:['climate change','warming','season length','shorter season','maple future','climate'],
    a:`Long-term data from UVM Proctor and USDA show maple sap seasons in the northeastern US and Canada have shifted 7–10 days earlier since the 1970s, and season length has shortened by an average of 8–10 days over the same period. Higher minimum winter temperatures reduce the frequency of deep-freeze recharge nights that prime the pressure system. In some years, the entire January–February recharge period is truncated. Northward range shift of optimal climate conditions is occurring: Vermont and Quebec currently have among the most favorable climates, but models project that by 2080, only the northern portions of these regions and areas farther north (Ontario, New Brunswick) will have reliable freeze-thaw seasons. Producers at southern margins (Pennsylvania, Ohio, New York south) are already experiencing shorter, less reliable seasons.`,
    src:'Rapp et al., "Phenological shifts in northeastern maple production," International Journal of Biometeorology (2019); USDA Forest Service, "Vulnerability of Maple to Climate Change" (2018)',
    tip:'Consider planting diversity: red maple (Acer rubrum) is more cold-tolerant and stress-resistant than sugar maple, and while sap sugar is lower, red maple may outlast sugar maple at marginal sites as climate shifts.' },

  { id:'wea_03', cat:'weather',
    q:'What is the impact of a late freeze on already-tapped trees?',
    kw:['late freeze','freeze after tapping','cold snap','post-tap freeze','refreeze'],
    a:`A hard freeze after tapping (below ~20°F) affects sap flow but does not harm the tree. Sap in the lateral lines and drop lines may freeze, temporarily halting flow or causing line pressure buildup. On gravity systems, frozen lines simply don't flow until they thaw. On vacuum systems, ice plugs can displace liquid and sometimes cause check-valve spouts to unseat — inspect spouts after a hard freeze. For the tree itself, refreezing after the tap hole has been drilled causes no additional damage. The tap wound's biological response (callus formation) is purely temperature-driven and pauses in the cold. Prolonged freezes in March can actually improve late-season sap quality by inhibiting microbial growth in the collection system.`,
    src:'Cornell Maple Program, "Cold Weather Impacts on Tapped Trees" (2018)',
    tip:'After a hard freeze with tubing systems, do a quick walkthrough to check for ice plugs at low points in main lines — these create pressure differentials that stress fittings.' },

  // ── TREE HEALTH & FOREST MANAGEMENT ────────────────────────────────────────
  { id:'tree_01', cat:'tree_health',
    q:'What is maple decline, and what causes it?',
    kw:['maple decline','dieback','crown dieback','dying maple','tree decline','forest health'],
    a:`Maple decline is a syndrome of gradual crown dieback and reduced vigor observed in sugar maples, particularly in the northeastern US and eastern Canada. Causes are multifactorial: (1) Acid deposition (acid rain) depletes base cations (calcium, magnesium) from soil, stressing trees through nutrient deficiency. (2) Defoliation by insects (forest tent caterpillar, gypsy moth) reduces carbon reserves. (3) Drought stress, particularly in summer, limits starch accumulation. (4) Repeated over-tapping. (5) Frost damage in late spring after bud break. Affected trees show: crown transparency, dead branches in upper crown, smaller-than-normal leaves, and off-color foliage in late summer. Declined trees yield less sap, lower Brix, and are more susceptible to opportunistic pathogens.`,
    src:'Long et al., "Sugar Maple Decline in the Northeastern United States," USDA Forest Service Gen. Tech. Report NE-261 (1997); ongoing monitoring by Harvard Forest',
    tip:'Calcium application (limestone or wollastonite) to declining woodlots can measurably improve tree health and sap yield over a 5–10 year period. UVM\'s Hubbard Brook research showed 10–15% sap yield improvement after wollastonite treatment.' },

  { id:'tree_02', cat:'tree_health',
    q:'Should I fertilize my maple trees, and if so, how?',
    kw:['fertilize maple','fertilizer','calcium','soil pH','maple nutrition','lime','wollastonite'],
    a:`Direct fertilization of tapped sugar maples is not standard practice and can have unintended effects — excess nitrogen stimulates competing vegetation. However, lime or calcium application to acidified soils is well-supported by research as beneficial. Target soil pH of 5.0–6.0 (slightly acidic) — below 4.5, nutrient availability drops sharply and fine root mortality increases. Wollastonite (calcium silicate) is preferred over agricultural lime in research settings because it releases calcium slowly and doesn't raise pH as rapidly. Application rate: 2–4 tons/acre wollastonite for severely acidic sites, surface-broadcast. The effect is gradual — expect measurable tree response over 5–10 years. Avoid applying directly over tap root zones.`,
    src:'Juice et al., "Long-term response of sugar maple to calcium addition at Hubbard Brook," Ecosystems (2006)',
    tip:'Get a soil test before any amendment. Cornell Cooperative Extension or UVM Extension can advise on maple-specific soil management for your specific region.' },

  { id:'tree_03', cat:'tree_health',
    q:'What pests and diseases most threaten maple sugar orchards?',
    kw:['pests','disease','insects','gypsy moth','tent caterpillar','maple threat','invasive','fungal'],
    a:`Key threats to maple sugar bushes: (1) Forest Tent Caterpillar (Malacosoma disstria): cyclical outbreaks defoliate maples in June; 3+ consecutive defoliation years can kill weakened trees. (2) Spongy Moth (Lymantria dispar): expanding its range northward; maples are a secondary host but can be heavily defoliated in outbreak years. (3) Asian Longhorned Beetle (Anoplophora glabripennis): regulated pest in NY and MA; kills maples; report suspected sightings immediately. (4) Armillaria root rot: opportunistic decay fungus that colonizes stressed trees; no cure, manage by maintaining tree vigor. (5) Eutypella canker: fungal canker on sugar maple stems, identifiable by elliptical target-shaped dead bark areas. Not fatal alone but creates structural weakness. (6) Drought: increasing drought frequency is the emerging threat that amplifies all other stressors.`,
    src:'USDA Forest Service, "Common Insects and Diseases of Sugar Maple" (2019); Cornell University Maple IPM Guide',
    tip:'An annual walk-through in late summer, when stress symptoms are most visible, catches problems when management options are still available.' },

  // ── BUSINESS & ECONOMICS ────────────────────────────────────────────────────
  { id:'biz_01', cat:'business',
    q:'What is the typical yield of maple syrup per tap?',
    kw:['yield per tap','production','gallons per tap','how much syrup','tap yield','average yield'],
    a:`Industry averages: gravity tapping yields 0.1–0.25 gallons of syrup per tap per season. Vacuum tapping (20–26 in Hg) yields 0.3–0.6 gallons per tap. Exceptional high-vacuum operations in optimal conditions report up to 0.7–0.8 gal/tap. The conversion ratio from sap to syrup depends on Brix: the classic ratio is 86.4 ÷ sap°Brix = gallons of sap per gallon of syrup (e.g., 2°Brix sap: 86.4÷2 = 43.2 gal sap/gal syrup). At 2°Brix, 0.4 gal/tap translates to roughly 17 gallons of sap collected per tap per season — a reasonable benchmark for a good vacuum system. Track your own ratio: sap collected ÷ syrup made each season tells you your actual effective Brix.`,
    src:'IMSI, "Production Benchmarks for Maple Operations" (2021); Vermont Maple Industry Council Annual Statistics',
    tip:'Your yield per tap is the single most useful efficiency metric. Set a benchmark at the start of each season and compare year-over-year to catch equipment or forest health issues early.' },

  { id:'biz_02', cat:'business',
    q:'What does maple syrup sell for, and what pricing strategy makes sense?',
    kw:['maple syrup price','selling price','retail price','bulk price','pricing','value','direct sales'],
    a:`Pricing varies significantly by channel: Bulk/wholesale (drums to processors): $1.00–$1.40/lb ($28–$40 per gallon equivalent), highly commoditized and subject to Quebec board pricing. Direct-to-consumer retail (farm stand, farmers market, online): $10–$16 per 8 oz, or $60–$90/gallon — representing 2–3x the bulk price. Specialty/premium (single-source, organic certified, specialty grades like Golden): up to $20+ per 8 oz retail. The economics of maple production strongly favor direct sales — shifting even 20% of volume from bulk to direct retail can increase total revenue by 50%. Value-added products (maple cream, candy, sugar, infused syrups) command even higher margins per pound of maple sugar solids.`,
    src:'Cornell Maple Program, "Maple Syrup Marketing and Pricing" (2022); Vermont Agency of Agriculture Market Report (2023)',
    tip:'Calculate your true cost per gallon before setting prices. Most small operations underestimate labor. Include your time at a real market wage — you may find bulk pricing generates a loss.' },

  { id:'biz_03', cat:'business',
    q:'What certifications can I get for my maple syrup and are they worth it?',
    kw:['organic certification','certified organic','usda organic','certifications','label','maple certification'],
    a:`Key certifications available to maple producers: (1) USDA Organic: requires certified organic land management (no synthetic pesticides/herbicides for 3 years, buffer zones, compliant equipment). Premiums vary: 15–30% over conventional at direct retail; not always achievable in bulk markets. Application through an accredited certifying agency ($500–$2,000/year). (2) Kosher: relatively easy to obtain for maple syrup (it is naturally kosher); opens institutional and specialty retail markets. (3) Non-GMO Project Verified: meaningful for some retailers. (4) Vermont Seal of Quality / other state programs: low cost, useful for direct market differentiation. Worth it? Organic certification pencils out primarily if selling >60% direct-to-consumer at premium prices or supplying natural food distributors. For bulk operations, the cost rarely pays back.`,
    src:'USDA AMS National Organic Program; Cornell Maple Program, "Value-Added and Certification Guide" (2021)',
    tip:'Before pursuing organic certification, survey your direct sales customers — many consumers can\'t distinguish certified organic from traditional maple production and won\'t pay a premium for the label.' },

  // ── TROUBLESHOOTING ──────────────────────────────────────────────────────────
  { id:'trb_01', cat:'troubleshooting',
    q:'Why is my sap yield low this year compared to last year?',
    kw:['low yield','bad year','less sap','sap down','poor production','why less sap'],
    a:`Year-over-year yield variation of 20–40% is normal in maple production. Key diagnostic factors: (1) Weather: insufficient freeze-thaw cycles, too-warm nights, or drought the previous summer reducing starch reserves. (2) Tap hole placement: tapping into old scars or wounded wood significantly reduces flow per tap. (3) Vacuum system leaks: a system that maintained 22 in Hg last year may be at 17 in Hg this year due to accumulated fittings failures. (4) Tree health changes: crown dieback from a hard winter or summer drought. (5) Season length: was your season structurally shorter this year (fewer run days)? Segment your analysis — sap per run-day comparison removes weather variability and isolates equipment/tree issues.`,
    src:'Cornell Maple Program, "Diagnosing Production Variation" (2019)',
    tip:'Compare "sap gallons per run day" not just total season sap. This normalizes for weather and makes year-over-year equipment and management comparisons valid.' },

  { id:'trb_02', cat:'troubleshooting',
    q:'My syrup is cloudy even after filtering. What is wrong?',
    kw:['cloudy syrup','hazy syrup','turbid','filter','clarity','why cloudy syrup'],
    a:`Persistent cloudiness after filtering has several causes: (1) Filtering while too cool — niter filters only when syrup is above 180°F. Cold syrup allows small niter particles to pass through orlon felt. Always filter hot and replace filters when flow slows. (2) Pectin haze: gel-like cloudiness from high-pectin late-season sap. More common in buddy season sap; not fixable by filtration. (3) Yeast / microbial haze: occurs when syrup is packed below 180°F or in a contaminated container. These syrups may also ferment. (4) Mineral haze from very high-mineral sap: more filtering passes through denser filter pads may help. (5) Under-density syrup: syrup packed below 66°Brix will develop haze and eventually ferment. Check density every batch.`,
    src:'Cornell Maple Program, "Syrup Clarity and Filtration" (2020)',
    tip:'Use a filter press with pressure if volume justifies it. Gravity orlon filtration is adequate for small batches but requires careful hot-pack management.' },

  { id:'trb_03', cat:'troubleshooting',
    q:'My evaporator is boiling slower than it used to. What should I check?',
    kw:['slow boil','slow evaporator','evaporator efficiency','boil rate down','sluggish evaporator'],
    a:`Declining evaporator performance is almost always one of four things: (1) Niter buildup on pan surfaces — even 1/16 in of calcium scale dramatically reduces heat transfer. Annual muriatic acid cleaning of sap and syrup pans is essential. (2) Firebox/arch refractory deterioration — cracked firebrick or failed arch seals allow cold air infiltration, cooling the firebox and reducing flame intensity. Inspect and repair with refractory cement before season. (3) Wet/green firewood — moisture content above 25% steals enormous energy as steam before combustion heat is released. (4) Stack draft issues — blocked stack cap, creosote buildup, or downdraft from nearby trees. Check draft by holding a smoke source at the firebox door.`,
    src:'IMSI, "Evaporator Maintenance and Performance" (2019)',
    tip:'Keep a running average of gallons evaporated per cord of wood (or BTU per gallon). A 15%+ drop from baseline is your trigger to diagnose before the next season.' },

  { id:'trb_04', cat:'troubleshooting',
    q:'My vacuum is lower than expected at the lines. How do I systematically find the problem?',
    kw:['low vacuum','vacuum troubleshooting','vacuum drop','vacuum system','debug vacuum'],
    a:`Systematic vacuum troubleshooting: (1) Start at the pump — record vacuum at pump discharge. If it matches spec, proceed. If pump vacuum is low, check pump oil, belt tension, inlet filter, and pump temperature. (2) Isolate mainline sections — close ball valves one lateral at a time while watching the central vacuum gauge. A section that shows 2+ in Hg gain when isolated has a significant leak. (3) Walk the isolated section — listen for hissing, look for disconnected lines, check all tee and saddle connections, inspect check-valve spouts for cracks. (4) Inspect low points — sap or ice accumulation at low points blocks vacuum transmission. Verify release points are clear. (5) Measure vacuum at the end of each lateral with a portable gauge — document drop from mainline to lateral end for every run in a new system.`,
    src:'UVM Proctor Maple Research Center, "Vacuum System Troubleshooting Flowchart" (2021)',
    tip:'Create a vacuum map of your system — note the gauge reading at 5–6 key points every season. This is your baseline for detecting year-over-year changes before they become major losses.' },

  { id:'trb_05', cat:'troubleshooting',
    q:'Why does my sap ferment in the collection tank before I can boil it?',
    kw:['fermented sap','sour sap','sap fermentation','bacteria','warm weather sap','spoiled sap'],
    a:`Sap fermentation is caused by naturally present bacteria (primarily Leuconostoc and Pseudomonas species) that consume sucrose and produce lactic acid. Fermentation rate doubles roughly every 10°F of temperature increase above 32°F. Prevention: (1) Collect sap daily when ambient temperatures exceed 40°F. (2) Store sap cold — maintain collection tank temperature below 38°F. Shading the collection tank and using ice packs extends safe hold time. (3) Keep collection equipment scrupulously clean — biofilm in tanks and lines dramatically accelerates fermentation. (4) Process promptly — "fresh" is relative: at 34°F, sap stays clean for 3–4 days; at 50°F, 12–24 hours. (5) Check sap pH — normal fresh sap pH is 6.5–7.0; below 6.0 indicates significant bacterial activity.`,
    src:'Perkins, T.D., "Sap Microbiology and Fermentation Prevention," UVM Proctor (2013)',
    tip:'A refractometer doubles as a freshness test — compare Brix at collection vs. at the evaporator. A drop of >0.2°Brix indicates significant bacterial sucrose consumption.' },

  // ── LINES & COLLECTION SYSTEMS ──────────────────────────────────────────────
  { id:'lin_01', cat:'lines',
    q:'What tubing sizes should I use for my tubing system?',
    kw:['tubing size','3/16','5/16','mainline','lateral','drop line','tubing layout','line sizing'],
    a:`The standard maple tubing hierarchy: Drop lines (from spout to lateral): 5/16 in ID tubing, 6–24 in length. Lateral lines (tree to tree): 5/16 in or 3/16 in. The 3/16 in lateral creates higher internal vacuum from sap column weight but has less flow capacity — best for slopes of 10%+ where gravity assist adds to vacuum. 5/16 in laterals work better on flatter terrain. Sub-mainlines (lateral to mainline): 3/4 in or 1 in tubing. Mainlines (to collection tank): 1.5 in, 2 in, or 3 in depending on tap count. Rough rule: 1 in mainline handles up to ~500 taps; 1.5 in up to ~1,200 taps; 2 in up to ~3,000 taps. Oversizing mainlines reduces velocity, allowing sap to stagnate and warm — go with the minimum that doesn't restrict flow.`,
    src:'Cornell Maple Program, "Tubing System Design Guide" (2021)',
    tip:'Never mix 3/16 in and 5/16 in laterals on the same vacuum circuit without accounting for the differential pressure — 3/16 in lines generate higher column vacuum that can backflow into 5/16 in laterals.' },

  { id:'lin_02', cat:'lines',
    q:'How do I sanitize my tubing system at the end of the season?',
    kw:['sanitize lines','clean tubing','end of season lines','chemical clean','tubing sanitation'],
    a:`End-of-season tubing sanitation is critical for preventing microbial biofilm that would contaminate next season's sap. Standard protocol: (1) Hot water flush — push 140°F+ water through the entire system within 48 hours of pulling taps. This softens and flushes biofilm. (2) Peroxyacetic acid (PAA) treatment: circulate 200 ppm PAA solution through lines for 30 minutes. PAA is food-safe, breaks down to water and oxygen, and is more effective than bleach on biofilm. (3) Rinse with clean cold water. (4) Blow out with compressed air to prevent standing water (bacterial growth medium). Never use chlorine bleach above 100 ppm — it degrades polyethylene tubing rapidly, releasing flavor-contaminating breakdown products. Replace any sections showing UV brittleness, cracking, or persistent off-odor.`,
    src:'Cornell Maple Program, "Tubing Sanitation Protocols" (2020); NSF food safety guidelines for polyethylene tubing',
    tip:'On a small system (<200 taps), individual soaking of spouts and fittings in PAA solution is practical. On larger systems, a recirculating chemical pump on the mainline saves hours of labor.' },

  // ── ADDITIONAL ADVANCED TOPICS ───────────────────────────────────────────────
  { id:'adv_01', cat:'biology',
    q:'What is the relationship between sap Brix and syrup yield?',
    kw:['brix formula','sap to syrup','conversion ratio','jones rule','66 brix','yield calculation'],
    a:`The standard calculation for sap-to-syrup conversion is derived from the "Rule of 86" (sometimes called Jones' Rule): Gallons of sap needed per gallon of syrup = 86.4 ÷ Brix of raw sap. This assumes a final syrup density of 66°Brix. Example: 2.0°Brix sap → 86.4 ÷ 2.0 = 43.2 gal sap/gal syrup. At 2.5°Brix → 34.6 gal/gallon. At 3.0°Brix → 28.8 gal/gallon. The variation is enormous and has a direct impact on boiling time and fuel costs. This is why measuring sap Brix accurately and daily is one of the most valuable habits in maple production — it directly predicts your fuel and labor requirements for that run.`,
    src:'Jones, C.E., "A Simple Formula for Determining the Amount of Sap Required to Make a Given Amount of Maple Syrup," VT Agr. Exp. Sta. Bulletin 13 (1946); still in standard use',
    tip:'On a vacuum system, Brix can vary significantly between taps — low-performing taps often have lower Brix as well, dragging down your average. Testing individual taps during diagnostics can reveal high-value vs. low-value tap zones.' },

  { id:'adv_02', cat:'evaporation',
    q:'What is the Maillard reaction in maple syrup and how does it affect flavor?',
    kw:['maillard','flavor development','browning','color','maple flavor chemistry','taste','aroma'],
    a:`The characteristic flavor and color of maple syrup are largely products of Maillard reactions — non-enzymatic browning reactions between reducing sugars (primarily fructose and glucose, minor sucrose hydrolysis products) and amino acids during evaporation at high temperatures. These reactions produce hundreds of flavor compounds including furans, pyrazines, and volatile phenolics responsible for maple's caramel, vanilla, and woody notes. Higher boiling temperatures and longer evaporation times intensify these reactions, producing darker, more robustly flavored syrup. Early-season sap (cold, fresh, lower amino acid content) undergoes fewer Maillard reactions, yielding lighter, more delicate Golden/Amber syrup. Late-season sap is richer in amino acids and produces more Maillard products, hence the darker, stronger Very Dark grade.`,
    src:'Filion et al., "Flavor Compounds in Maple Syrup," Journal of Agricultural and Food Chemistry (2019)',
    tip:'If you want to produce premium Golden syrup, boil fresh early-season sap quickly at controlled temperature and pack immediately. Prolonged boiling or reheating amplifies Maillard browning.' },

  { id:'adv_03', cat:'ro',
    q:'Can RO concentrate be held overnight before boiling?',
    kw:['store concentrate','ro concentrate overnight','hold ro concentrate','delay boiling','ro storage'],
    a:`RO concentrate is significantly more susceptible to microbial spoilage than raw sap because bacterial populations grow proportionally with sugar concentration — the bacteria have more food available per volume. At 8°Brix concentrate, fermentation can begin meaningfully within 12–18 hours at 40°F. The safe storage guidelines: process RO concentrate the same day whenever possible. If you must hold overnight, keep concentrate at 34–36°F (just above freezing) and never exceed 24 hours before boiling. Never hold concentrate above 40°F. Some producers use a food-grade acid wash (citric acid to pH 6.0) for short-term holds, though this must be fully boiled off — follow your state's regulations. Airtight covered tanks reduce surface oxidation and microbial contamination from airborne sources.`,
    src:'UVM Proctor, "RO Concentrate Handling and Food Safety" (2020)',
    tip:'Taste test your concentrate before every boil. Off-flavor in concentrate means off-flavor in syrup — no amount of filtration will remove bacterial metabolites once formed.' },

  { id:'adv_04', cat:'finishing',
    q:'What is maple cream and how is it made?',
    kw:['maple cream','maple butter','spread','crystallization','how to make cream','maple products'],
    a:`Maple cream (also called maple butter) is made by controlled crystallization of maple syrup into a smooth, spreadable paste with fine crystal structure. Process: (1) Start with a light Amber or Golden syrup (darker grades produce acceptable cream but with stronger flavor). (2) Cook to 22–24°F above the local water boiling point (about 234°F at sea level) — this concentrates syrup to ~69–71°Brix. (3) Cool rapidly (ice bath) without stirring to ~65°F. (4) Stir vigorously (by hand or stand mixer) until the syrup "turns" — it will change from glossy to opaque and thicken dramatically. Stir until a smooth, spreadable consistency is achieved (~15–30 minutes). (5) Pack into clean containers; store refrigerated. Shelf life: 6–12 months refrigerated, 1–2 years frozen.`,
    src:'Cornell Maple Program, "Value-Added Maple Products: Cream, Candy, Sugar" (2019)',
    tip:'The exact temperature target for cream is critical — 2°F too high produces dry, crumbly cream; 2°F too low produces grainy or liquid cream. Use a calibrated digital thermometer.' },

  { id:'adv_05', cat:'tapping',
    q:'What are check-valve spouts and should I switch to them?',
    kw:['check valve','spout','check valve spout','flush spout','modern spout','spout type'],
    a:`Check-valve spouts (e.g., CDL Extreme, Leader EZ Tap, Health Check spout) contain a small one-way valve that opens when vacuum pulls sap but closes when vacuum drops (e.g., at night, during freezing). Benefits: (1) Prevents backflow of ambient air into the tap hole, dramatically reducing tap hole desiccation and bacterial intrusion. (2) Allows earlier tapping (2–3 weeks) with minimal quality impact since the check valve protects the tap hole between runs. (3) Reduces niter and sap contamination from reverse flow events. (4) Can add 5–10% more sap per tap in research comparisons versus standard spouts, primarily from reduced desiccation. Cost: check-valve spouts cost $0.50–$1.00 more per unit than standard spouts but pay back quickly in yield and quality improvements. Suitable for all vacuum levels.`,
    src:'UVM Proctor Maple Research Center, "Check Valve Spout Evaluation" (2018)',
    tip:'If switching to check-valve spouts, ensure your vacuum pump can achieve consistent vacuum — check valves open only above a threshold vacuum, so a leaky system below that threshold gets no benefit.' },

  { id:'adv_06', cat:'vacuum',
    q:'What is the difference between a releaser and a vacuum collection tank?',
    kw:['releaser','vacuum releaser','collection tank','sap releaser','vacuum vs gravity','releaser vs tank'],
    a:`A releaser is a device that automatically breaks vacuum momentarily to discharge collected sap from the vacuum tubing system into an atmospheric collection tank, then reseals to restore vacuum. This allows vacuum lines to drain continuously without flooding the system. Types: (1) Mechanical float releaser: a float-actuated valve that opens when sap reaches a set level — passive, reliable, requires maintenance. (2) Electronic releaser: timed or sensor-controlled solenoid valve — more controllable but requires power. (3) Vacuum collection tank (direct-to-tank): the mainline ends directly into a sealed tank that itself maintains vacuum, with a pump transferring sap to an atmospheric holding tank. This "closed" system avoids the vacuum break of a traditional releaser, maintaining higher average vacuum at the taps. Most modern large operations use vacuum collection tanks for highest yield.`,
    src:'Cornell Maple Program, "Collection System Design: Releasers vs. Vacuum Tanks" (2021)',
    tip:'If using a mechanical releaser, inspect the float valve gasket at the start of every season — a worn gasket allows perpetual air bleed that will cost you 3–5 in Hg across the entire system.' },

  { id:'adv_07', cat:'weather',
    q:'How does barometric pressure affect sap runs?',
    kw:['barometric pressure','pressure drop','weather front','barometer','sap run predictor'],
    a:`Barometric pressure has a documented but modest effect on sap flow. Falling barometric pressure (approaching weather fronts) corresponds to reduced atmospheric pressure, which slightly reduces the pressure differential needed for sap to exit the tap hole — potentially increasing flow during the early phase of a pressure drop. Rising pressure after a cold front can briefly enhance flow as freeze conditions intensify. However, temperature dominates over pressure in most studies. The practical take: a falling barometer combined with the correct temperature pattern (cold night, warm day approaching) is a positive indicator for an upcoming run. A rising barometer following a warm spell may signal the end of a run as cold air returns.`,
    src:'Tyree, M.T., "Stem Pressure and Weather Effects on Sap Flow," Tree Physiology (1995); UVM field data compilation',
    tip:'Some experienced producers use a simple barometer (aneroid or digital) alongside temperature forecasting. Combined, they provide a more complete picture than temperature alone.' },

  { id:'adv_08', cat:'business',
    q:'What production records should I keep for a maple operation?',
    kw:['record keeping','logs','production records','track','data','accounting','maple records'],
    a:`Recommended records for a well-managed maple operation: (1) Daily: sap collected (gallons), sap Brix, syrup produced (gallons), syrup grade/color class, fuel used (cords or gallons), labor hours, and ambient temperature high/low. (2) Seasonal: tap count, tapping date, first run date, last run date, vacuum levels at key points, total sap collected, total syrup produced, total fuel used, RO permeate/concentrate volumes. (3) Financial: revenue by channel (bulk, direct, value-added), fuel cost/gallon of syrup, labor cost/gallon, packaging cost, total cost/gallon. (4) Tree health: annual crown assessment, tap hole spacing records, new tap locations. This data enables year-over-year benchmarking, tax reporting, food safety documentation, and operational improvement.`,
    src:'Vermont Agency of Agriculture, "Good Agricultural Practices for Maple Operations" (2022); Cornell Maple Program Record-Keeping Templates',
    tip:'Even a simple spreadsheet tracking daily sap and syrup production, with season totals, pays dividends. Within 3 seasons you\'ll have enough data to spot trends invisible in a single year.' },

  { id:'adv_09', cat:'tree_health',
    q:'How do I regenerate a maple sugar bush that has become overstocked or declined?',
    kw:['sugarbush management','regeneration','thinning','overstocked','forest management','logging','silviculture'],
    a:`A well-managed sugar bush maintains 60–80% crown closure, with healthy, well-spaced trees. In overstocked stands, trees compete for light and water, resulting in smaller crowns, lower starch reserves, and reduced sap yield per tree. Management approaches: (1) Improvement thinning: remove competing species (beech, ironwood, poplar) and crowded, low-quality maples to release crop trees. Target final spacing of 15–20 ft between canopy trees. (2) Release crop trees: a tree with a full, symmetrical crown produces 2–3x the sap of a suppressed tree of the same DBH. (3) Encourage regeneration: modest canopy gaps (0.25–0.5 acres) encourage maple seedling establishment in the understory. (4) Control invasives: beech scale disease, buckthorn, and barberry competition all reduce maple regeneration success.`,
    src:'USDA Forest Service, "Silvicultural Guide for Sugar Maple" (2013); Quebec IRDA Sugarbush Management Bulletin',
    tip:'Engage a licensed forester before any timber harvest in your sugarbush. Improper logging (heavy equipment, soil compaction, slash handling) is a leading cause of long-term sugarbush decline.' },

  { id:'adv_10', cat:'evaporation',
    q:'What is a divided flow evaporator and how does it improve efficiency?',
    kw:['divided flow','drop flue','flue pan','divided pan','evaporator design','leader','CDL evaporator'],
    a:`A divided-flow (or "drop flue") evaporator pan design routes incoming raw sap in a longer, back-and-forth flow path across the hottest parts of the firebox, maximizing heat exposure time before reaching the syrup pan. In a flat-pan design, fresh sap enters the back pan and is continuously displaced toward the syrup pan by new incoming sap. In a divided-flow design, internal baffles and flue channels create a long serpentine flow path, increasing residence time in the heat zone by 40–60% compared to an open flat pan of the same size. This improves evaporation rate per BTU and produces more consistent syrup density. Combined with a syrup pan with cross-flow channels, a well-designed divided-flow evaporator can achieve 20–35% higher efficiency than an equivalent flat-pan setup.`,
    src:'IMSI, "Evaporator Design and Efficiency" (2020); CDL / Leader Evaporator technical guides',
    tip:'If purchasing or upgrading an evaporator, request evaporation rate data from the manufacturer at your firebox depth and wood species — spec sheet numbers assume ideal conditions that rarely exist in the field.' },

  { id:'adv_11', cat:'finishing',
    q:'How do I test and adjust the density of my syrup accurately in the field?',
    kw:['density test','hydrometer','refractometer','brix check','syrup density field','calibrate'],
    a:`Three methods for field density testing: (1) Hydrometers: a maple syrup hydrometer (reads 59°–67° Baumé or 56–67° Brix) is the traditional tool. Read at 211°F for the most accurate result — the scale is calibrated for this temperature. If reading at a different temperature, apply a correction factor (+0.5°Brix per 10°F below 211°F, -0.5 per 10°F above). (2) Refractometer: digital or optical, reads at room temperature. Highly practical for finished syrup; check calibration against distilled water (0°Brix) at least seasonally. Temperature compensation is essential for accurate readings. (3) Thermometer method: measure the current boiling point of water, then finish syrup at exactly 7.1°F above that point (e.g., if water boils at 210°F, finish syrup at 217.1°F). This method is independent of any instrument calibration and is extremely reliable.`,
    src:'Vermont Agency of Agriculture, "Maple Density Testing Methods" (2022)',
    tip:'On humid days, water boils at a slightly lower temperature. Always measure water boiling point the same day you\'re finishing syrup — don\'t rely on a boiling point table from last week.' },

  { id:'adv_12', cat:'ro',
    q:'What membrane type and configuration is best for small farm RO systems?',
    kw:['ro membrane type','spiral wound','plate frame','small ro','membrane selection','ro configuration'],
    a:`For small farm maple RO systems (100–2,000 taps), spiral-wound polyamide thin-film composite (TFC) membranes are the standard. These are the same membrane technology used in municipal RO and food processing. Key specs for maple applications: (1) Rejection rate: >99% sucrose rejection — commercial food-grade membranes easily meet this. (2) Operating pressure: 150–250 psi for single-pass to 8–10°Brix; double-pass to 16°Brix requires 250–350 psi. (3) Membrane size: 2.5×40 in membranes (common in small farm systems) handle roughly 200–500 gal/hr of raw sap. 4×40 in handles 700–1,500 gal/hr. (4) System configuration: most small-farm commercial units (Leader, CDL, H2O Innovation) come pre-configured in stainless housings with pressure gauges and flow controls — buying a complete system is strongly preferred over DIY for food safety compliance.`,
    src:'DOW Water Solutions Filmtec Product Guide; H2O Innovation Maple RO Technical Specifications',
    tip:'Always buy membranes from reputable maple equipment suppliers — membranes marketed for water treatment may lack NSF 61 food-safety certification required by most state maple programs.' },

  { id:'adv_13', cat:'biology',
    q:'How does red maple compare to sugar maple for syrup production?',
    kw:['red maple','acer rubrum','sugar maple vs red maple','red maple sap','alternative maple'],
    a:`Red maple (Acer rubrum) can be tapped for syrup, but differs from sugar maple (Acer saccharum) in important ways. Sap sugar content: red maple averages 1.5–2.0°Brix vs. 2.0–2.5°Brix for sugar maple — producing proportionally more sap to make a gallon of syrup. Season timing: red maple buds break 1–3 weeks earlier than sugar maple, ending the productive sap season sooner. Flavor: red maple syrup is considered by many to have a lighter, slightly different flavor profile — quality varies considerably by tree. Yield: research shows red maple sap volume per tap is comparable to sugar maple, but lower Brix means 25–35% more sap to process. Opportunity: red maple's greater climate tolerance makes it increasingly relevant as a backup or supplemental species in operations at the warm edge of the maple belt.`,
    src:'UVM Proctor Maple Research Center, "Red Maple for Syrup Production" (2017)',
    tip:'If you have a mixed sugarbush, consider tracking sap Brix from red vs. sugar maple taps separately for one season. The data will tell you whether red maple taps are worth the processing overhead.' },

  { id:'adv_14', cat:'tapping',
    q:'What is spout sanitization and why does it matter?',
    kw:['spout sanitation','clean spouts','sanitize spouts','spout bacteria','spout hygiene'],
    a:`Research from UVM Proctor demonstrates that new or properly sanitized spouts increase sap yield by 10–20% compared to used, unsanitized spouts. Biofilm that accumulates on spout surfaces from the previous season, combined with residual sap and exposed wood surface at the tap hole, creates a bacterial colony that colonizes the new tap wound immediately and reduces sap flow. Sanitization protocols: (1) Replace spouts annually (most cost-effective approach at $0.10–0.25/spout for standard plastic). (2) Alternatively, soak used spouts in 200 ppm peroxyacetic acid (PAA) solution for 30 minutes and rinse before installation. (3) Never reuse spouts that show visible discoloration, biofilm, or off-odor — these harbor resistant biofilm that PAA alone won't fully eliminate.`,
    src:'UVM Proctor Maple Research Center, "Spout Sanitation and Sap Yield" (2016)',
    tip:'The cost of replacing all spouts annually on a 500-tap system is roughly $50–$125. The yield benefit typically represents hundreds of dollars in additional syrup — arguably the best ROI of any single maintenance task.' },

  { id:'adv_15', cat:'weather',
    q:'What is "second-season" or "fall maple" tapping and is it worthwhile?',
    kw:['fall tapping','second season','autumn tapping','late season','fall sap','second run'],
    a:`"Fall tapping" or second-season tapping (September–November) exploits the same freeze-thaw pressure mechanism as spring, but in reverse seasonal context. In some years, particularly after early fall frosts followed by warm spells, sap does flow from fall taps. However, the practice is controversial: (1) Fall-tapped trees have significantly more wound wood and pathogen exposure going into winter, potentially reducing spring yield at the same wound site. (2) Sap quality in fall can be highly variable — often lower sugar content and higher microbial load. (3) Season length is unpredictable. (4) Most state extension programs do not recommend routine fall tapping for commercial operations. For research or curiosity, a test of 20–30 taps in a diverse section of the bush can be informative without meaningfully impacting the following spring.`,
    src:'Cornell Maple Program, "Fall Tapping: Risks and Rewards" (2018)',
    tip:'If you do try fall tapping, tap fresh sites — do not use spring tap holes, which are already in a healing state and should not be disturbed.' },
];

const SS_STOP = new Set(['the','and','is','it','a','an','of','to','in','for','on','with','are','was','be','or','at','by','from','that','this','but','not','have','has','can','will','do','does','how','what','why','when','where','should','would','my','i','we','you','your']);

function ssSearch(query, ctx) {
  const tokens = query.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !SS_STOP.has(w));
  if (!tokens.length) return [];
  return SS_KB.map(e => {
    const hay = `${e.q} ${e.kw.join(' ')} ${e.a}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      const matches = (hay.match(new RegExp(t,'g'))||[]).length;
      score += matches;
      if (e.q.toLowerCase().includes(t)) score += 4;
      if (e.kw.some(k => k.includes(t))) score += 3;
    }
    if (ctx) {
      if (ctx.hasRO && e.cat === 'ro') score += 1;
      if (ctx.hasVacuum && e.cat === 'vacuum') score += 1;
      if (ctx.trees > 0 && e.cat === 'business') score += 0.5;
    }
    return { ...e, score };
  }).filter(e => e.score > 0).sort((a,b) => b.score - a.score).slice(0, 5);
}

const SS_CATS = [
  { id:'all',            label:'All Topics',        Icon:I.mapleLeaf },
  { id:'biology',        label:'Sap Biology',       Icon:I.tree },
  { id:'tapping',        label:'Tapping',           Icon:I.hammer },
  { id:'vacuum',         label:'Vacuum & Tubing',   Icon:I.wind },
  { id:'ro',             label:'Reverse Osmosis',   Icon:I.filter },
  { id:'evaporation',    label:'Evaporation',       Icon:I.flame },
  { id:'finishing',      label:'Finishing & Grade', Icon:I.trophy },
  { id:'weather',        label:'Weather & Climate', Icon:I.cloudSun },
  { id:'tree_health',    label:'Tree Health',       Icon:I.leaf },
  { id:'business',       label:'Business & Econ',   Icon:I.barChart },
  { id:'lines',          label:'Lines & Collection',Icon:I.network },
  { id:'troubleshooting',label:'Troubleshoot',      Icon:I.wrench },
];

function SubScoreBar({ label, score, color }) {
  return (
    <div className="sage-fadein">
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:12,color:'#7f92a6',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</span>
        <span style={{fontSize:12,color,fontWeight:800}}>{score}%</span>
      </div>
      <div style={{height:5,background:'#1e2d3d',borderRadius:3,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${score}%`,background:color,borderRadius:3,transition:'width 0.4s cubic-bezier(.2,.8,.2,1)'}} />
      </div>
    </div>
  );
}

function InsightRow({ ins }) {
  const [open, setOpen] = React.useState(false);
  const borderColor = ins.type==='success'?'#3fb950':ins.type==='warn'?'#e0a44a':'#58a6ff';
  const icon = ins.type==='success'?'✓':ins.type==='warn'?'!':'→';
  return (
    <div className="sage-fadein" style={{borderLeft:`3px solid ${borderColor}`,background:'#07090f',borderRadius:'0 8px 8px 0',padding:'8px 12px',cursor:'pointer',transition:'background 0.15s'}}
      onClick={()=>setOpen(v=>!v)}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:13,fontWeight:900,color:borderColor,width:14,textAlign:'center',lineHeight:1}}>{icon}</span>
          <span style={{fontSize:13,fontWeight:600,color:'#c9d1d9'}}>{ins.title}</span>
        </div>
        <span style={{fontSize:12,color:'#7f92a6',marginLeft:8}}>{open?'▲':'▼'}</span>
      </div>
      <div style={{fontSize:13,color:'#7f92a6',marginTop:3,marginLeft:22,lineHeight:1.5}}>{ins.body}</div>
      {open && (
        <div style={{marginTop:8,marginLeft:22,background:'#0d1a2b',borderRadius:6,padding:'8px 10px',border:`1px solid ${borderColor}30`}}>
          <div style={{fontSize:12,color:borderColor,fontWeight:700,letterSpacing:'0.06em',marginBottom:3}}>WHAT TO DO</div>
          <div style={{fontSize:12,color:'#7f92a6',lineHeight:1.6}}>{ins.action}</div>
        </div>
      )}
    </div>
  );
}

function BrixSparkline({ data }) {
  if (data.length < 2) return null;
  const min = Math.min(...data) * 0.85;
  const max = Math.max(...data) * 1.15;
  const H = 44, W = 260;
  const pts = data.map((v,i)=>{
    const x = (i/(data.length-1))*W;
    const y = H - ((v-min)/(max-min||1))*H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[data.length-1];
  const first = data[0];
  const trend = last > first+0.1 ? '↑' : last < first-0.1 ? '↓' : '→';
  const trendColor = trend==='↑'?'#e0a44a':trend==='↓'?'#3fb950':'#58a6ff';
  const trendLabel = trend==='↑'?'Rising':'↓'===trend?'Falling':'Stable';
  return (
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{flex:1}}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e2d3d"/>
            <stop offset="100%" stopColor="#58a6ff"/>
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#sparkGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {data.map((v,i)=>{
          const x=(i/(data.length-1))*W;
          const y=H-((v-min)/(max-min||1))*H;
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill="#58a6ff" stroke="#0d1a2b" strokeWidth="1.5"/>;
        })}
      </svg>
      <div style={{textAlign:'right',flexShrink:0,minWidth:52}}>
        <div style={{fontSize:22,fontWeight:900,color:trendColor,lineHeight:1}}>{trend}</div>
        <div style={{fontSize:13,fontWeight:700,color:trendColor}}>{trendLabel}</div>
        <div style={{fontSize:12,color:'#7f92a6'}}>{last}° Brix</div>
      </div>
    </div>
  );
}

function SeasonIntelligence({ season, sapBrix, trees, units }) {
  const [analyzing, setAnalyzing] = React.useState(true);
  const [condHigh,  setCondHigh]  = React.useState('');
  const [condLow,   setCondLow]   = React.useState('');

  React.useEffect(()=>{
    const t = setTimeout(()=>setAnalyzing(false), 1100);
    return ()=>clearTimeout(t);
  },[season]);

  const slog     = ls.get('sg_logs2',{})[season]||{};
  // Scored against gal/tap and gal-per-cord benchmarks, so the totals must be
  // gallons; this screen never received `units` and so never converted them.
  const { sapGal, syrupGal, roGal, fuelT: fuelGal } = seasonTotalsGal(slog, units);
  const taps  = parseInt(trees)||0;
  const brix  = parseFloat(sapBrix)||2.0;
  const runLogs  = slog.sapCollected||[];
  const brixLog  = ls.get('sg_brixlog', []);   // flat array — same shape SeasonTab writes
  const sparkData= brixLog.map(e=>parseFloat(e.brix)||0).filter(v=>v>0).slice(-12);
  const dataPoints=[sapGal>0,syrupGal>0,taps>0,brixLog.length>2,fuelGal>0,roGal>0].filter(Boolean).length;
  const confidence= dataPoints<=1?'low':dataPoints<=3?'medium':'high';
  const confColor = confidence==='high'?'#3fb950':confidence==='medium'?'#e0a44a':'#7f92a6';

  if (taps===0&&sapGal===0) return (
    <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:16,padding:'20px 24px',marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#7f92a6'}}/>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:'0.1em',color:'#7f92a6'}}>SEASON INTELLIGENCE</span>
      </div>
      <div style={{textAlign:'center',padding:'20px 0'}}>
        <div style={{marginBottom:10,display:'flex',justifyContent:'center'}}><I.brain size={34} color="#2dd4a7" /></div>
        <div style={{fontSize:14,fontWeight:600,color:'#7f92a6'}}>Awaiting season data</div>
        <div style={{fontSize:12,color:'#7f92a6',marginTop:4,lineHeight:1.6}}>Log taps, sap, and syrup in the Log tab<br/>to activate intelligence.</div>
      </div>
    </div>
  );

  if (analyzing) return (
    <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:16,padding:'20px 24px',marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div className="sage-pulse" style={{width:8,height:8,borderRadius:'50%',background:'#3fb950'}}/>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:'0.1em',color:'#3fb950'}}>ANALYZING SEASON DATA…</span>
      </div>
      {[75,55,85,65].map((w,i)=>(
        <div key={i} style={{height:13,background:'#1e2d3d',borderRadius:6,marginBottom:9,overflow:'hidden'}}>
          <div className="shimmer-line" style={{height:'100%',width:`${w}%`,borderRadius:6}}/>
        </div>
      ))}
    </div>
  );

  // ── scores — ONE model, shared with Recap's SweetRun Score (seasonScore) ────
  const fuelDef = FUELS.find(f=>f.label===ls.get('sg_fuel','Firewood (cord)'))||FUELS[0];
  const sc = seasonScore({ sapT:sapGal, syT:syrupGal, fuelT:fuelGal, taps, brix, yieldModel:yieldModelSaved(), fuelSpu:fuelDef.spu });
  const { yieldScore, effScore, fuelScore } = sc;
  const insights=[];

  if (taps>0&&syrupGal>0) {
    const ypp=syrupGal/taps;
    if (ypp>=0.3)       insights.push({type:'success',title:'Strong yield per tap',       body:`${ypp.toFixed(2)} gal syrup/tap — above the 0.25–0.3 industry benchmark. Excellent season.`,action:'Document your tap placement and vacuum settings — replicate this exact setup next year.'});
    else if (ypp>=0.2)  insights.push({type:'neutral',title:'Average yield per tap',       body:`${ypp.toFixed(2)} gal syrup/tap — near industry average. Room to grow.`,                    action:'Upgrade to check-valve spouts and audit vacuum leaks at each lateral connection.'});
    else                insights.push({type:'warn',   title:'Below-average yield per tap', body:`${ypp.toFixed(2)} gal syrup/tap is below the 0.25 benchmark.`,                              action:'Inspect spout health, verify tap placement in fresh white wood, and test vacuum at the tree.'});
  }
  if (sapGal>0&&syrupGal>0) {
    const ratio=sapGal/syrupGal;
    const eff=effScore;
    if (eff>=95)       insights.push({type:'success',title:'Excellent evaporation efficiency',  body:`${ratio.toFixed(0)}:1 ratio — ${eff}% of theoretical max for ${brix}°Brix sap.`,       action:'Document your evaporator setup — this is benchmark-quality operation.'});
    else if (eff>=80)  insights.push({type:'neutral',title:'Good evaporation efficiency',       body:`${ratio.toFixed(0)}:1 at ${eff}% of theoretical.`,                                      action:'Check float valve levels and flue pan draw-off. Small adjustments can recover 5–10%.'});
    else               insights.push({type:'warn',   title:'Evaporation efficiency concern',    body:`${ratio.toFixed(0)}:1 is ${100-eff}% below theoretical for ${brix}°Brix sap.`,          action:'Check flue pan flow rate, evaporator level, and finisher draw-off timing.'});
  }
  if (fuelGal>0&&syrupGal>0) {
    const fuelU=fuelDef.unit;
    const fr=fuelGal/syrupGal;
    const bench=(RULE_DIVISOR/brix)/fuelDef.spu;
    if (fr < bench*0.8)   insights.push({type:'success',title:'Fuel-efficient operation',  body:`${fr.toFixed(2)} ${fuelU}/gal syrup — below the ${bench.toFixed(2)} expected for your fuel.`,  action:'If not already using RO, your evaporator is dialed in. Consider adding a preheater.'});
    else if(fr > bench*1.5) insights.push({type:'warn', title:'High fuel consumption',     body:`${fr.toFixed(2)} ${fuelU}/gal syrup — above the ${bench.toFixed(2)} expected for your fuel.`,                   action:'RO preconcentration to 8–10°Brix could cut fuel use 60–70%.'});
  }
  if (roGal>0&&sapGal>0) {
    const pct=Math.round((roGal/sapGal)*100);
    insights.push({type:'success',title:'RO contributing to efficiency',body:`${pct}% of sap processed through RO this season.`,action:'Push RO concentration to 10–12°Brix for maximum fuel savings if membranes allow.'});
  }

  const activeSc=[yieldScore,effScore,fuelScore].filter(s=>s!==null);
  const overall = sc.overall;
  const graded  = sc.graded;
  const grade   = sc.grade;
  // No failing red before there is a season to judge — neutral until graded.
  const gradeColor = !graded ? '#7f92a6' : overall>=90?'#3fb950':overall>=80?'#58a6ff':overall>=70?'#e0a44a':'#f85149';

  const bestRun = runLogs.length>0 ? runLogs.reduce((b,e)=>(parseFloat(e.val)||0)>(parseFloat(b.val)||0)?e:b, runLogs[0]) : null;

  // flow forecast
  const high=parseFloat(condHigh), low=parseFloat(condLow);
  let flowScore=0,flowLabel='',flowColor='#7f92a6';
  if (!isNaN(high)&&!isNaN(low)) {
    if      (low<=28&&high>=36&&high<=50) { flowScore=95; flowLabel='Excellent run expected';    flowColor='#3fb950'; }
    else if (low<=32&&high>=34&&high<=55) { flowScore=72; flowLabel='Good flow likely';           flowColor='#58a6ff'; }
    else if (high>=32&&low<=35)           { flowScore=40; flowLabel='Marginal conditions';        flowColor='#e0a44a'; }
    else                                  { flowScore=8;  flowLabel='Poor conditions for flow';   flowColor='#f85149'; }
  }

  // tip of the month
  const monthTips=['Inspect all fittings & replace cracked tubing before the freeze.',
    'Sharpen drill bits and sort spouts — fresh holes drill cleaner and seal better.',
    'Peak season: check vacuum at the pump daily — even 2″ Hg loss cuts yield.',
    'Watch sap color carefully. Buddy sap appears when trees bud — stop immediately.',
    'Pull taps promptly. Leaving spouts in damages cambium and reduces next-year yield.',
    'Service RO membranes now — flush and store in food-safe preservative solution.',
    'Inspect mainline for UV damage and wildlife chews. Replace any cracked sections.',
    'Great time to scout new taps — healthy maples 10″+ DBH.',
    'Install new tubing runs before leaves fall. Grade-check all mainlines.',
    'Blow out all lines with compressed air before the first hard freeze.',
    'Order supplies early — spouts and tubing sell out by February.',
    'Review this season\'s logs and set yield targets for next year.'];
  const tip = monthTips[new Date().getMonth()];

  return (
    <div style={{background:'#0d1a2b',border:'1px solid #1e2d3d',borderRadius:16,padding:'20px 24px',marginBottom:20}} className="sage-fadein">

      {/* ── header row ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="sage-pulse" style={{width:8,height:8,borderRadius:'50%',background:'#3fb950'}}/>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:'0.1em',color:'#3fb950'}}>SEASON INTELLIGENCE</span>
          <span style={{fontSize:13,color:'#7f92a6'}}>· {season}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'#07090f',borderRadius:20,padding:'3px 10px',border:'1px solid #1e2d3d'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:confColor}}/>
          <span style={{fontSize:12,color:'#7f92a6',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{confidence} confidence · {dataPoints} signals</span>
        </div>
      </div>

      {/* ── grade + sub-scores ── */}
      <div style={{display:'flex',gap:14,marginBottom:16,alignItems:'stretch'}}>
        <div style={{background:'#07090f',borderRadius:12,padding:'14px 18px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:76,border:`1.5px solid ${gradeColor}50`,flexShrink:0}}>
          <div style={{fontSize:28,fontWeight:800,color:gradeColor,lineHeight:1}}>{grade}</div>
          <div style={{fontSize:12,color:'#7f92a6',fontWeight:700,letterSpacing:'0.1em',marginTop:4,textTransform:'uppercase'}}>Season Score</div>
          {graded
            ? <div style={{fontSize:13,color:gradeColor,fontWeight:700,marginTop:2}}>{overall}%</div>
            : <div style={{fontSize:11,color: sc.suspect ? '#e0a44a' : '#7f92a6',fontWeight:600,marginTop:2,textAlign:'center',lineHeight:1.35}}>
                {t(ls.get('sg_lang','en'), sc.suspect ? 'ratioCheck' : 'tooEarlyGrade')}
              </div>}
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:9,justifyContent:'center'}}>
          {yieldScore!==null && <SubScoreBar label="Yield / Tap" score={yieldScore} color="#3fb950"/>}
          {effScore!==null   && <SubScoreBar label="Efficiency"  score={effScore}   color="#58a6ff"/>}
          {fuelScore!==null  && <SubScoreBar label="Fuel Use"    score={fuelScore}   color="#e0a44a"/>}
          {activeSc.length===0 && <div style={{fontSize:12,color: sc.suspect ? '#9fb0c0' : '#7f92a6',lineHeight:1.5}}>
            {sc.suspect
              ? `Your sap and syrup totals read ${(sapGal/syrupGal).toFixed(1)}:1, which is below what any sap can make. Check the Recap for what to look at.`
              : 'Log syrup & sap to generate scores'}
          </div>}
        </div>
      </div>

      {/* ── insights ── */}
      {insights.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
          {insights.map((ins,i)=><InsightRow key={i} ins={ins}/>)}
        </div>
      )}

      {/* ── best run ── */}
      {bestRun&&parseFloat(bestRun.val)>0 && (
        <div style={{background:'#07090f',border:'1px solid #1e2d3d',borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}} className="sage-fadein">
          <div>
            <div style={{fontSize:12,color:'#7f92a6',fontWeight:700,letterSpacing:'0.1em',marginBottom:2}}>BEST RUN THIS SEASON</div>
            <div style={{fontSize:16,fontWeight:800,color:'#c9d1d9'}}>{parseFloat(bestRun.val).toFixed(1)} gal sap</div>
            <div style={{fontSize:13,color:'#7f92a6'}}>{bestRun.date||'Date not logged'}</div>
          </div>
          <div style={{display:'flex'}}><I.trophy size={28} color="#e0a44a" /></div>
        </div>
      )}

      {/* ── brix sparkline ── */}
      {sparkData.length>=3 && (
        <div style={{background:'#07090f',border:'1px solid #1e2d3d',borderRadius:10,padding:'10px 14px',marginBottom:12}} className="sage-fadein">
          <div style={{fontSize:12,color:'#7f92a6',fontWeight:700,letterSpacing:'0.1em',marginBottom:8}}>BRIX TREND THIS SEASON</div>
          <BrixSparkline data={sparkData}/>
        </div>
      )}

      {/* ── flow forecast ── */}
      <div style={{background:'#07090f',border:'1px solid #1e2d3d',borderRadius:10,padding:'12px 14px',marginBottom:12}}>
        <div style={{fontSize:12,color:'#7f92a6',fontWeight:700,letterSpacing:'0.1em',marginBottom:10}}>TODAY'S FLOW FORECAST</div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:'#7f92a6',marginBottom:4}}>Night low (°F)</div>
            <input aria-label="e.g. 28" type="number" value={condLow} onChange={e=>setCondLow(e.target.value)} placeholder="e.g. 28"
              style={{width:'100%',boxSizing:'border-box',background:'#131e2c',border:'1px solid #1e2d3d',borderRadius:8,padding:'8px 10px',color:'#c9d1d9',fontSize:13,outline:'none'}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:'#7f92a6',marginBottom:4}}>Day high (°F)</div>
            <input aria-label="e.g. 42" type="number" value={condHigh} onChange={e=>setCondHigh(e.target.value)} placeholder="e.g. 42"
              style={{width:'100%',boxSizing:'border-box',background:'#131e2c',border:'1px solid #1e2d3d',borderRadius:8,padding:'8px 10px',color:'#c9d1d9',fontSize:13,outline:'none'}}/>
          </div>
          {flowScore>0 && (
            <div style={{textAlign:'center',minWidth:58,paddingBottom:2}}>
              <div style={{fontSize:24,fontWeight:900,color:flowColor,lineHeight:1}}>{flowScore}%</div>
              <div style={{fontSize:12,color:flowColor,fontWeight:700,letterSpacing:'0.05em'}}>FLOW</div>
            </div>
          )}
        </div>
        {flowScore>0 && (
          <div style={{marginTop:10}}>
            <div style={{height:6,background:'#1e2d3d',borderRadius:3,overflow:'hidden',marginBottom:6}}>
              <div style={{height:'100%',width:`${flowScore}%`,background:flowColor,borderRadius:3,transition:'width 0.6s ease'}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:flowColor}}>{flowLabel}</div>
            <div style={{fontSize:13,color:'#7f92a6',marginTop:3}}>Based on freeze-thaw science: best flow requires overnight freeze (≤32°F) + daytime thaw (36–50°F).</div>
          </div>
        )}
        {flowScore===0 && <div style={{fontSize:13,color:'#7f92a6',marginTop:6}}>Enter tonight's low and tomorrow's high to get a flow prediction.</div>}
      </div>

      {/* ── tip of the month ── */}
      <div style={{borderLeft:'3px solid #58a6ff',background:'#07090f',borderRadius:'0 10px 10px 0',padding:'10px 14px'}}>
        <div style={{fontSize:12,color:'#58a6ff',fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>TIP OF THE MONTH</div>
        <div style={{fontSize:12,color:'#7f92a6',lineHeight:1.65}}>{tip}</div>
      </div>
    </div>
  );
}


