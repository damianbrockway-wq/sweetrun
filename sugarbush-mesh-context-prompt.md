# Sugarbush Mesh Project — Context Prompt

Paste the contents below at the start of any new Claude conversation to bring it fully up to speed on this project. Keep this file as a living document — update it whenever a decision changes.

---

## SweetRun Mesh Monitoring — Project Context

This is a companion project to **SweetRun** (sweetrun.app), Damian Brockway's maple syrup production PWA. The goal: build a Meshtastic-based LoRa sensor mesh that monitors vacuum, tank level, and temperature across a hobbyist maple sugarbush, with live readings landing on the existing SweetRun sugarbush map. Eventually multi-tenant so any SweetRun subscriber can bring their own hardware.

### Producer & woodlot specifics

- **Damian Brockway** (damian.brockway@gmail.com).
- **Woodlot**: about 2,000 ft from sugarhouse to furthest taps.
- **Power available in the woods**: battery only (no AC).
- **Existing hardware on hand**: one Heltec / Meshnology T114 (HT-n5262) kit — board + 3000 mAh battery + N36 green case + 915 MHz stub antenna.
- **Units**: feet, yards, miles. Convert metric if you encounter it.

### Reference documents (all in workspace)

- **maple-sugarbush-mesh-project.docx** — The build doc. Rev 2, 26 pages. Hardware build, BOM, wiring, firmware, calibration. Living doc — update revision history when material changes.
- **sweetrun-mesh-integration.docx** — Cloud architecture. Rev 1, 18 pages. Worker code skeleton, D1 schema, API contract, multi-tenant model, phased roadmap.
- **architecture.png / integration-arch.png / wiring-vacuum.png / wiring-tank.png / data-flow.png / timeline.png** — Diagrams.

### Hardware decisions (Rev 2, locked unless we learn more)

- **Sensor nodes**: Heltec T114 + Seeed XIAO ESP32-C3 companion MCU. XIAO reads sensors over I²C/1-Wire/UART, sends JSON to T114 over UART, T114 wraps into Meshtastic text packet via Serial module.
- **Vacuum sensor**: Adafruit MPRLS (Honeywell MPRLS0025PA00001A) over I²C. ~$15. Same sensor Jeff Wiles used in his real-world ClusterDuck maple build. Replaces analog transducer that was in Rev 1 (kills voltage divider, kills calibration headache).
- **Tank level**: DFRobot A02YYUW ultrasonic in a 3" PVC stilling well. Stilling well is critical — foam blinds bare ultrasonic at 40–50% surface coverage.
- **Temperature**: DS18B20 waterproof, 1-Wire.
- **Battery chemistry**: **LiFePO4 only** (Eve IFR18650 1500 mAh). LiPo is forbidden in this project — it suffers permanent damage when charged below 32 °F / 0 °C, which is every freezing night of maple season.
- **Charger**: CN3065 LiFePO4 solar charger module with 10 kΩ NTC thermistor on the TEMP pin to disable charging below 35–40 °F. Thermistor is **not optional**.
- **Repeater node**: one battery-only T114 mid-bush to bridge the 2,000-ft gap. Realistic LoRa range through hardwoods is ~1,640 ft per hop (Smartrek's field data).
- **Gateway**: Heltec WiFi LoRa 32 V3 or V4 in the sugarhouse on USB-C power, Meshtastic MQTT module enabled.
- **Antenna mounting rule**: vertical, on a separate stake or wood strip. Never zip-tied to vertical sap tubing — that cross-polarizes and loses ~20 dB.
- **Freeze-drain plumbing**: saddle tee at a high point, sensing line sloped 1.2 in/ft back to the main, drain valve at low point, MPRLS port pointing down.

### Cloud architecture decisions (Rev 1, working assumptions)

- **MQTT broker**: managed (EMQX Cloud or HiveMQ Cloud), free tier, webhook output. Cloudflare Workers cannot subscribe to MQTT directly (no outbound TCP), so a managed broker with webhook is the cleanest path.
- **Ingest**: Cloudflare Worker `/ingest` endpoint, authenticated by shared secret in `X-Sweetrun-Auth` header.
- **Storage**: Cloudflare D1 (edge SQLite). Skip KV (free tier is only 1,000 writes/day, blown immediately). D1's 100,000 writes/day fits comfortably.
- **Live push**: Cloudflare Durable Objects with WebSocket Hibernation API. One DO instance per user. Worker pushes to DO after each ingest; DO fans out to open SweetRun browser tabs.
- **Multi-tenant routing**: per-user MQTT credentials + per-user root topic (`sweetrun/<user_id>/...`).
- **Cost**: $0 at hobbyist scale. Move to Workers Paid ($5/mo) only when subscriber count justifies it.
- **SweetRun frontend additions**: new `useSensorData()` hook, new `SensorPin.jsx` component, new "Live sensors" settings section in app/src/app.jsx.

### Current status / phase (updated May 29, 2026)

- **Hardware on hand:** 3× Heltec V4 32 (one named "Home Gateway", node 4b70, on house WiFi + MQTT bridge; two spares "V4 Spare-A" cased, "V4 Spare-B" bare), 1× Heltec/Meshnology T114 in N36 green case (handheld, node 6822), 1× LILYGO T-Echo "MT01" w/ BME280 (handheld, node e324), 2× iPads, 2× phones.
- **Mesh state:** all 5 nodes on Meshtastic 2.7.x, joined to private encrypted channel "Private Mesh" (uplink/downlink ON). Home Gateway bridges to mqtt.meshtastic.org via house 2.4 GHz WiFi. Nodes visible on meshmap.net.
- **Working:** end-to-end LoRa + encryption + MQTT proven. iPad TCP to Home Gateway works (flaky enough to want cloud backend). T-Echo's BME280 reports environmental telemetry through the mesh.
- **No repeater needed** for the ~2,000-ft sugarbush-to-sugarhouse hop on Long Fast (will fall back to Long Slow if loss is bad).
- **V4 Spare-B earmarked for Phase 5 pump controller** (DIY Shurflo control via Meshtastic Remote Hardware module + relay board).
- **Next move = SweetRun rollout in three sub-phases:**
  - **Phase A (NOW):** vacuum sensor (XIAO + MPRLS) → Meshtastic Serial Module → mesh → Home Gateway → MQTT broker (EMQX/HiveMQ free) → Cloudflare Worker /ingest → D1 → Durable Object WebSocket → SweetRun `useSensorData()` + `SensorPin.jsx`.
  - **Phase B:** add tank level (A02YYUW ultrasonic in stilling well), reuse backend.
  - **Phase C:** add DS18B20 temperature, reuse backend.
- **Docs need bumping:** build doc Rev 2 → Rev 3, integration doc Rev 1 → Rev 2.
- **Latest status doc:** `project-status-may-2026.md` — single source of truth for current state.

### Key open questions

- SweetRun user identity: add a real account system, or ride on Stripe customer_id? Blocks V3 multi-tenant.
- Broker pick: EMQX vs HiveMQ. Both work.
- When to introduce a `sugarbush-mesh` GitHub repo alongside SweetRun.

### What this Claude conversation should help with

If the user starts a new chat and pastes this prompt, the right opening move is: ask which phase they're in, what they're stuck on, and reference the appropriate doc. Don't re-derive the design from scratch — the design exists, this prompt summarises it, the docs have the detail.

### Git workflow (when the repo exists)

- Likely repo: `github.com/damianbrockway-wq/sugarbush-mesh` (not yet created).
- Will hold: firmware (XIAO sketches per node type), Cloudflare Worker code, wrangler.toml, D1 schema, project docs, BOM in structured form.
- SweetRun's React patch lives in the existing `github.com/damianbrockway-wq/sweetrun` repo, in `app/src/app.jsx` plus a new `app/src/components/SensorPin.jsx` and `app/src/hooks/useSensorData.js`.

---

*End of context prompt.*
