// 検算テスト：JIS B 0401-2 / ISO 286-2 と ISO 965-2 の表の値、膜厚の効き方を確かめる。node tests/test.js
'use strict';
const F = require('../js/fit.js');
let fail = 0, n = 0;
function eq(name, got, want, tol = 1e-6) {
  n++;
  const ok = Array.isArray(want) ? want.every((w, i) => Math.abs(got[i] - w) <= tol) : Math.abs(got - want) <= tol;
  if (!ok) { fail++; console.log(`✕ ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
}
function zone(cls, D, want) {
  const p = F.parseFitClass(cls), z = F.tolZone(p.letter, p.grade, D);
  if (z.error) { fail++; n++; console.log(`✕ ${cls} ${D}: ${z.error}`); return; }
  eq(`${cls} @${D} 上`, z.up, want[0]); eq(`${cls} @${D} 下`, z.lo, want[1]);
}

// ---- ISO 286-2 の表の値（上の許容差, 下の許容差） [µm] ----
zone('H7', 25, [21, 0]); zone('H7', 50, [25, 0]); zone('H8', 25, [33, 0]); zone('H11', 100, [220, 0]);
zone('g6', 25, [-7, -20]); zone('f7', 10, [-13, -28]); zone('e8', 25, [-40, -73]); zone('d9', 40, [-80, -142]); zone('c11', 100, [-170, -390]);
zone('h6', 25, [0, -13]); zone('js6', 25, [6.5, -6.5]); zone('j6', 25, [9, -4]); zone('j5', 10, [4, -2]); zone('k6', 25, [15, 2]); zone('k6', 3, [6, 0]);
zone('m6', 25, [21, 8]); zone('n6', 25, [28, 15]); zone('p6', 25, [35, 22]); zone('r6', 25, [41, 28]); zone('s6', 25, [48, 35]);
zone('s6', 70, [78, 59]); zone('t6', 25, [54, 41]); zone('u6', 25, [61, 48]); zone('u6', 20, [54, 41]);
zone('F7', 25, [41, 20]); zone('G7', 25, [28, 7]); zone('J7', 25, [12, -9]); zone('JS7', 25, [10.5, -10.5]);
zone('K7', 25, [6, -15]); zone('K6', 25, [2, -11]); zone('K8', 25, [10, -23]); zone('K6', 10, [2, -7]); zone('K7', 5, [3, -9]);
zone('M7', 25, [0, -21]); zone('M6', 10, [-3, -12]); zone('M8', 25, [4, -29]);
zone('N7', 25, [-7, -28]); zone('N7', 10, [-4, -19]); zone('N9', 25, [0, -52]); zone('N7', 2, [-4, -14]);
zone('P7', 25, [-14, -35]); zone('P6', 25, [-18, -31]); zone('P8', 25, [-22, -55]); zone('R7', 25, [-20, -41]); zone('R7', 90, [-38, -73]);
zone('S7', 25, [-27, -48]); zone('U7', 20, [-33, -54]); zone('U7', 25, [-40, -61]);
n++; if (!F.tolZone('t', 6, 20).error) { fail++; console.log('✕ t6 は 24 mm 以下で値がないはず'); }
n++; if (!F.tolZone('J', 9, 20).error) { fail++; console.log('✕ J9 は定められていないはず'); }

// ---- はめあいと膜厚 ----
{
  const r = F.fit({ D: 25, hole: { letter: 'H', grade: 7 }, shaft: { letter: 'g', grade: 6 } });
  eq('H7/g6 最小すきま', r.bare.cmin, 7); eq('H7/g6 最大すきま', r.bare.cmax, 41);
  n++; if (r.bare.type !== 'clearance') { fail++; console.log('✕ H7/g6 はすきまばめ'); }
  eq('H7/g6 膜厚の余裕（片側の合計）', r.room, 3.5);
  const c = F.fit({ D: 25, hole: { letter: 'H', grade: 7 }, shaft: { letter: 'g', grade: 6 }, coat: { s: [10, 20] } });
  eq('軸に 10〜20 µm 塗った最小すきま', c.coated.cmin, 7 - 40); eq('最大すきま', c.coated.cmax, 41 - 20); eq('干渉量', c.interference, 33);
  const h = F.fit({ D: 25, hole: { letter: 'H', grade: 7 }, shaft: { letter: 'g', grade: 6 }, coat: { h: [5, 5], s: [0, 0] }, creq: 2 });
  eq('穴に 5 µm、必要すきま 2', h.coated.cmin, 7 - 10 - 2 + 2); eq('軸に塗れる膜厚', h.allowShaft, (7 - 2) / 2 - 5);
  const p = F.fit({ D: 25, hole: { letter: 'H', grade: 7 }, shaft: { letter: 'p', grade: 6 } });
  eq('H7/p6', [p.bare.cmin, p.bare.cmax], [-35, -1]); n++; if (p.bare.type !== 'interference') { fail++; console.log('✕ H7/p6 はしまりばめ'); }
  const k = F.fit({ D: 25, hole: { letter: 'H', grade: 7 }, shaft: { letter: 'k', grade: 6 } });
  n++; if (k.bare.type !== 'transition') { fail++; console.log('✕ H7/k6 は中間ばめ'); }
}

// ---- ISO 965-2 の 6H / 6g の値 [mm] ----
function thr(d, P, ic, ec) { return F.threadFit({ d, P, int: F.parseThreadClass(ic, false), ext: F.parseThreadClass(ec, true) }); }
{
  const t = thr(8, 1.25, '6H', '6g');
  eq('M8 6H D2', t.int.D2, [7.188, 7.348], 5e-4); eq('M8 6H D1', t.int.D1, [6.647, 6.912], 5e-4);
  eq('M8 6g d2', t.ext.d2, [7.042, 7.160], 5e-4); eq('M8 6g d', t.ext.d, [7.760, 7.972], 5e-4);
  eq('M8 6H/6g 有効径の最小すきま', t.bare.cmin, 28); eq('最大すきま', t.bare.cmax, 28 + 160 + 118);
  eq('M8 6g に塗れる膜厚', t.room, 7);
  const c = F.threadFit({ d: 8, P: 1.25, int: F.parseThreadClass('6H'), ext: F.parseThreadClass('6g', true), coat: { e: [8, 12] } });
  eq('M8 6g に 8〜12 µm', c.coated.cmin, 28 - 48); eq('干渉量', c.interference, 20); eq('最大すきま', c.coated.cmax, 306 - 32);
  eq('M10 6H D2', thr(10, 1.5, '6H', '6g').int.D2, [9.026, 9.206], 5e-4);
  eq('M10 6H D1', thr(10, 1.5, '6H', '6g').int.D1, [8.376, 8.676], 5e-4);
  eq('M6 6g d', thr(6, 1, '6H', '6g').ext.d, [5.794, 5.974], 5e-4); eq('M6 6g d2', thr(6, 1, '6H', '6g').ext.d2, [5.212, 5.324], 5e-4);
  eq('M10×1.25 6g d2', thr(10, 1.25, '6H', '6g').ext.d2, [9.042, 9.160], 5e-4);
  eq('M3 6g d / d2', [...thr(3, 0.5, '6H', '6g').ext.d, ...thr(3, 0.5, '6H', '6g').ext.d2], [2.874, 2.980, 2.580, 2.655], 5e-4);
  eq('M12 6H D1', thr(12, 1.75, '6H', '6g').int.D1, [10.106, 10.441], 5e-4);
  eq('M5 6g d2', thr(5, 0.8, '6H', '6g').ext.d2, [4.361, 4.456], 5e-4);
  eq('M8 6h の膜厚の余裕は 0', thr(8, 1.25, '6H', '6h').room, 0);
  eq('M8 5g6g d2 公差', thr(8, 1.25, '6H', '5g6g').ext.Td2, 95);
  eq('M8 6G/6g 最小すきま', thr(8, 1.25, '6G', '6g').bare.cmin, 56);
  n++; if (thr(4, 0.7, '6H', '6g').error) { fail++; console.log('✕ M4 は計算できるはず'); }
  n++; if (!F.threadFit({ d: 8, P: 2, int: F.parseThreadClass('6H'), ext: F.parseThreadClass('6g', true) }).error) { fail++; console.log('✕ M8×2 は表にないはず'); }
  n++; if (!thr(2, 0.4, '6H', '6e').error) { fail++; console.log('✕ P0.4 の e は定められていないはず'); }
}

// ---- 推奨公差域クラス（JIS B 0209-1 / ISO 965-1） ----
{
  const std = (quality, length, pos, d, P) => F.standardThreadClass({ quality, length, pos, d, P });
  const same = (name, r, want) => { n++; const got = r.error ? 'error' : `${r.int}/${r.ext}`; if (got !== want) { fail++; console.log(`✕ ${name}: ${got} ≠ ${want}`); } };
  same('中・N・H/g', std('medium', 'N', 'Hg'), '6H/6g'); same('中・N・H/h', std('medium', 'N', 'Hh'), '6H/6h');
  same('中・N・G/h', std('medium', 'N', 'Gh'), '6G/6h'); same('中・N・H/e', std('medium', 'N', 'He'), '6H/6e'); same('中・N・H/f', std('medium', 'N', 'Hf'), '6H/6f');
  same('中・S・H/g', std('medium', 'S', 'Hg'), '5H/5g6g'); same('中・L・H/g', std('medium', 'L', 'Hg'), '7H/7g6g');
  same('精・N・H/h', std('fine', 'N', 'Hh'), '5H/4h'); same('精・S・H/h', std('fine', 'S', 'Hh'), '4H/3h4h'); same('精・L・H/g', std('fine', 'L', 'Hg'), '6H/5g4g');
  same('粗・N・H/g', std('coarse', 'N', 'Hg'), '7H/8g'); same('粗・L・H/g', std('coarse', 'L', 'Hg'), '8H/9g8g');
  same('精・S・H/g は推奨表にない', std('fine', 'S', 'Hg'), 'error'); same('粗・N・H/h は推奨表にない', std('coarse', 'N', 'Hh'), 'error');
  same('M8 粗・N・H/g は使える', std('coarse', 'N', 'Hg', 8, 1.25), '7H/8g');
  same('M3 の 8g は定められていない', std('coarse', 'N', 'Hg', 3, 0.5), 'error');
  // 推奨表の組み合わせはすべて EXT_CLASSES・INT_CLASSES にあり、M10 で計算できる
  for (const q of ['fine', 'medium', 'coarse']) for (const l of F.LENGTHS) for (const p of F.THREAD_POS) {
    const r = std(q, l, p.v); if (r.error) continue;
    n++; if (!F.INT_CLASSES.includes(r.int) || !F.EXT_CLASSES.includes(r.ext)) { fail++; console.log(`✕ ${r.int}/${r.ext} が選択肢にない`); }
    n++; if (std(q, l, p.v, 10, 1.5).error) { fail++; console.log(`✕ M10 で ${r.int}/${r.ext} が計算できない`); }
  }
  n++; if (F.findStandardThread('6H', '6g')[0]?.quality !== 'medium' || F.findStandardThread('6H', '6g')[0]?.length !== 'N') { fail++; console.log('✕ 6H/6g は 中・N'); }
  n++; if (F.findStandardThread('6H', '8g').length) { fail++; console.log('✕ 6H/8g は推奨表の組み合わせではない'); }
  eq('M10 9e8e の外径公差', thr(10, 1.5, '8H', '9e8e').ext.Td, 375); eq('M10 4g の有効径公差', thr(10, 1.5, '5H', '4g').ext.Td2, 85);
}

console.log(fail ? `\n${fail} / ${n} 件が不一致` : `${n} 件すべて一致`);
process.exit(fail ? 1 : 0);
