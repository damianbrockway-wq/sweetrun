// ─── SVG Icon Library ────────────────────────────────────────────────────────
// The stroke-icon set of the pre-cutover UI was removed at cutover; the new
// screens draw RsIcon (32-rs-kit). The maple leaf stays byte-identical.
const I = {
  mapleLeaf:   ({size=20,color='currentColor'}) => (
    <svg width={size} height={size} viewBox="321.4 314.2 1403.6 1403.6">
      <path fill={color} stroke="none" fillRule="evenodd" d="M 800.396 504.198 C 820.501 524.293 838.073 542.786 866.997 550.765 C 934.572 569.406 974.549 491.946 997.363 441.266 C 1009.53 414.242 1017.26 383.304 1024.88 353.922 C 1038.85 428.846 1099.01 599.379 1204.03 541.936 C 1221.44 532.416 1234.85 518.644 1248.85 504.839 C 1237.81 548.566 1222.93 591.757 1210.09 636.402 C 1192.17 698.752 1169.68 763.034 1173.85 828.785 C 1176.48 870.122 1220.94 869.024 1244.83 847.019 C 1279.87 814.744 1305.57 770.398 1331.67 730.534 C 1347.2 707.136 1363.03 683.936 1379.16 660.94 C 1378.15 726.945 1381.72 797.106 1468.38 788.344 C 1522.24 782.897 1568.65 763.178 1617.19 740.577 C 1575.02 790.594 1542.71 835.26 1529.4 901.77 C 1515.68 970.3 1555.89 992.648 1615.85 1003.53 C 1617.75 1003.72 1637.81 1005.46 1624.2 1007.87 C 1600.41 1017.54 1576.18 1025.68 1552.57 1035.93 C 1504.11 1056.98 1382.54 1116.45 1361.08 1167.07 C 1355.98 1179.12 1356.31 1191.26 1361.34 1203.3 C 1376.15 1238.77 1422.55 1267.43 1455.62 1285.22 C 1467.48 1291.6 1480.65 1297.14 1491.94 1304.36 C 1509.43 1309.78 1472.19 1307.17 1470.4 1307.05 C 1462.49 1308.1 1435.11 1307.16 1424.41 1307.43 C 1377.44 1308.91 1329.72 1309.74 1283.99 1321.78 C 1217.71 1339.24 1223.41 1388.2 1238.79 1441.14 C 1194.24 1398.39 1151.9 1352.21 1106.71 1309.87 C 1082.27 1286.97 1067.54 1269.78 1035.17 1257.19 C 1033.59 1396.57 1034.4 1539.2 1046.17 1677.91 L 1002.72 1678.07 C 1003.28 1661.25 1005.61 1640.86 1006.67 1623.49 L 1013.51 1493.42 C 1016.96 1416 1016.94 1334.88 1017.02 1257.36 C 978.704 1270.11 939.897 1312.72 911.046 1340.97 L 810.058 1441.34 C 815.058 1425.09 819.003 1408.92 819.756 1391.87 C 820.538 1374.17 816.494 1356.32 803.887 1343.13 C 765.227 1302.67 637.048 1308.97 582.666 1306.89 C 580.278 1306.99 553.035 1307.49 552.789 1307.36 L 552.744 1307.01 C 553.354 1305.88 554.802 1305.24 555.91 1304.63 C 598.236 1282.69 672.491 1248 689.489 1200.63 C 693.965 1188.16 693.263 1175.56 687.513 1163.63 C 664.367 1115.59 547.86 1058.49 500.193 1037.74 C 473.078 1025.93 445.336 1015.93 417.47 1006.07 C 496.327 993.531 540.886 971.14 514.859 884.501 C 497.355 826.235 471.254 784.53 430.347 740.17 C 469.957 759.094 502.646 773.116 545.505 782.946 C 651.906 807.349 671.513 756.861 669.799 661.467 C 687.606 685.418 704.537 710.006 720.56 735.184 C 743.406 770.357 775.458 828.074 811.075 851.388 C 822.227 858.688 837.348 864.226 850.713 861.076 C 859.59 858.984 868.107 854.137 872.718 846.057 C 895.423 806.259 842.57 650.972 829.314 605.915 L 800.396 504.198 z"/>
    </svg>
  ),
};


// ─── Brand marks ─────────────────────────────────────────────────────────────
// The hand-cut marks from brand/assets/marks/mark-*.svg, transcribed faithfully:
// 48×48 grid, currentColor bodies, teal #2DD4A7 reserved for sap drops,
// fill-rule evenodd holes. These are the "moment" tier (empty states, first-run
// furniture); the stroke icons in `I` above remain the control tier. Amber
// #EB9A33 on dark surfaces per brand/BIBLE.md. Readable at 48, survive 32 —
// never render below 32.
const MARK_TEAL = '#2DD4A7';
function Mark({ size = 48, color = 'currentColor', children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ color }}>
      {children}
    </svg>
  );
}
// The tree's geometry, hoisted so the share card can draw the SAME paths on
// canvas via Path2D (Pass 7). M.tree below stays the source of truth — these
// are its literal d strings, byte-identical.
const M_TREE_CROWN_D = "M 17.8 7.1 C 18.4 7.6 18.8 8.1 19.6 8.4 C 21.5 8.9 22.6 6.8 23.2 5.4 C 23.5 4.6 23.7 3.8 23.9 3.0 C 24.3 5.0 25.9 9.7 28.8 8.1 C 29.3 7.9 29.6 7.5 30.0 7.1 C 29.7 8.3 29.3 9.5 29.0 10.7 C 28.5 12.4 27.9 14.1 28.0 15.9 C 28.0 17.0 29.3 17.0 29.9 16.4 C 30.9 15.5 31.6 14.3 32.3 13.2 C 32.7 12.6 33.1 12.0 33.6 11.3 C 33.5 13.1 33.6 15.0 36.0 14.8 C 37.4 14.7 38.7 14.1 40.0 13.5 C 38.9 14.9 38.0 16.1 37.6 17.9 C 37.3 19.8 38.4 20.4 40.0 20.7 C 40.0 20.7 40.6 20.7 40.2 20.8 C 39.6 21.0 38.9 21.3 38.3 21.5 C 37.0 22.1 33.6 23.7 33.1 25.1 C 32.9 25.4 32.9 25.8 33.1 26.1 C 33.5 27.1 34.7 27.8 35.6 28.3 C 36.0 28.5 36.3 28.6 36.6 28.8 C 37.1 29.0 36.1 28.9 36.0 28.9 C 35.8 28.9 35.1 28.9 34.8 28.9 C 33.5 29.0 32.2 29.0 31.0 29.3 C 29.2 29.8 29.3 31.1 29.7 32.6 C 28.5 31.4 27.4 30.1 26.1 29.0 C 25.5 28.4 25.1 27.9 24.2 27.6 C 24.2 31.3 24.2 35.2 24.5 39.0 L 23.3 39.0 C 23.3 38.5 23.4 38.0 23.4 37.5 L 23.6 34.0 C 23.7 31.9 23.7 29.7 23.7 27.6 C 22.7 27.9 21.6 29.1 20.8 29.8 L 18.1 32.6 C 18.2 32.1 18.3 31.7 18.3 31.2 C 18.4 30.7 18.3 30.3 17.9 29.9 C 16.9 28.8 13.4 29.0 11.9 28.9 C 11.8 28.9 11.1 28.9 11.1 28.9 L 11.1 28.9 C 11.1 28.9 11.1 28.9 11.2 28.8 C 12.3 28.3 14.3 27.3 14.8 26.0 C 14.9 25.7 14.9 25.3 14.8 25.0 C 14.1 23.7 11.0 22.2 9.7 21.6 C 8.9 21.3 8.2 21.0 7.4 20.7 C 9.6 20.4 10.8 19.8 10.1 17.4 C 9.6 15.8 8.9 14.7 7.8 13.5 C 8.8 14.0 9.7 14.4 10.9 14.7 C 13.8 15.3 14.3 14.0 14.3 11.4 C 14.8 12.0 15.2 12.7 15.7 13.4 C 16.3 14.3 17.1 15.9 18.1 16.5 C 18.4 16.7 18.8 16.9 19.2 16.8 C 19.4 16.7 19.7 16.6 19.8 16.4 C 20.4 15.3 19.0 11.1 18.6 9.9 L 17.8 7.1 Z";
const M_TREE_GROUND_D = "M19.5 43.5 Q24 41 28.5 43.5";
const M = {
  // OUTLINE set v4 (2026-09-20): drawn, not diagrammed — curves match the tree's organic hand.
  // Solid originals kept at brand/assets/marks/mark-*-solid.svg.
  // Sugar maple — the proven brand-leaf silhouette, outlined, rooted.
  tree: (p) => <Mark {...p}>
    <path stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" d={M_TREE_CROWN_D}/>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d={M_TREE_GROUND_D}/>
  </Mark>,
  // Sap bucket on spile: trunk line, spout, bail, tapered bucket, teal drop.
  bucket: (p) => <Mark {...p}>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M9 4 C7.5 12 7.5 20 9 28 C10 36 9.6 40 8.6 44 M9.5 14 C14 14.8 17.5 15.4 19 16.4 Q20.4 17.4 19.8 19 M14.5 28.5 C20 27.6 27.5 27.6 33 28.5 M16 28.7 C16.8 34 17.6 39 18.4 41.8 Q18.8 43.3 20.2 43.3 L27.4 43.3 Q28.8 43.3 29.2 41.8 C30 39 30.8 34 31.5 28.7 M17 27.4 C17.5 22 18.4 19.7 19.5 18.9"/>
    <path fill={MARK_TEAL} d="M23.5 20.5 C24.8 22.5 25.6 23.7 25.6 24.9 A2.1 2.1 0 1 1 21.4 24.9 C21.4 23.7 22.2 22.5 23.5 20.5 Z"/>
  </Mark>,
  // Tubing run: two trunks, sagging mainline, tank, teal drop.
  tubing: (p) => <Mark {...p}>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M8.5 5 C7.3 14 7.3 24 8.2 33 C8.6 37 8.9 40 8.7 42 M23 11 C22 18 22 26 22.6 33 C22.9 36.5 23.1 39.5 23 42 M8.6 13.5 C15 21 19 21.5 23.5 21.5 C29.5 21.5 30.5 24 33 28.5"/>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M32.5 31 C36 30.3 39.5 30.3 43 31 C43.5 34.5 43.5 38 43 41 C39.5 41.7 36 41.7 32.5 41 C32 38 32 34.5 32.5 31 Z"/>
    <path fill={MARK_TEAL} d="M37.5 21.5 C38.7 23.3 39.4 24.4 39.4 25.5 A1.9 1.9 0 1 1 35.6 25.5 C35.6 24.4 36.3 23.3 37.5 21.5 Z"/>
  </Mark>,
  // Evaporator: steam, pan, arched firebox, stack.
  evaporator: (p) => <Mark {...p}>
    <path stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" d="M13.5 15 Q15.8 12 13.5 9 M21 15 Q23.3 12 21 9 M28.5 15 Q30.8 12 28.5 9"/>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M6 21 C12 20.2 31.5 20.2 37.5 21 L37.6 25.8 C31.5 26.6 12 26.6 5.9 25.8 Z M8.5 26.8 C8.3 32 8.4 37 9 40 Q9.4 42 11 42 L15.5 42 V36.5 A6 6 0 0 1 27.5 36.5 V42 L32 42 Q33.8 42 34.2 40 C34.8 37 34.9 32 34.7 26.8 M39.5 26.5 C40 20.5 39.8 14 39.5 8.5 M36.5 8.8 C38.5 8.2 40.8 8.2 42.7 8.8"/>
  </Mark>,
  // Syrup jug: cap, neck, round body, ear handle.
  jug: (p) => <Mark {...p}>
    <rect stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" x="18.5" y="4.5" width="9" height="4" rx="2" fill="none"/>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M20.7 8.5 C20.5 10.3 20.5 12 20.6 13.5 M25.3 8.5 C25.5 10.3 25.5 12 25.4 13.5 M23 14 C30.5 14 36 20 36 28.5 C36 37.5 30.5 43 23 43 C15.5 43 10 37.5 10 28.5 C10 20 15.5 14 23 14 Z M35 18.5 Q40 19.5 39.5 24 Q39.2 27 35.8 27.5"/>
  </Mark>,
  // Sugarhouse: gable, cupola, steam, arched door.
  sugarhouse: (p) => <Mark {...p}>
    <path stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M6 26 C12 20.5 18 15.8 24 11 C30 15.8 36 20.5 42 26 M10 23 C9.8 29 9.8 35.5 10.2 41 Q10.4 43 12.2 43 L35.8 43 Q37.6 43 37.8 41 C38.2 35.5 38.2 29 38 23 M20.5 43 V35 A3.5 3.5 0 0 1 27.5 35 V43"/>
    <rect stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" x="20.5" y="5" width="7" height="5" rx="1" fill="none"/>
    <path stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" d="M18.5 5 C22 4.4 26 4.4 29.5 5 M20.8 2.6 Q21.7 1.8 20.8 1 M26.2 2.6 Q27.1 1.8 26.2 1"/>
  </Mark>,
};

