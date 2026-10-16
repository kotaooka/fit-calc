// はめあい（ISO 286 / JIS B 0401）とメートルねじ（ISO 965-1 / JIS B 0209-1）の計算。Node でも読み込み可
// 寸法は mm、寸法許容差・すきま・膜厚は µm で扱う
(function (root) {
  'use strict';

  // ================= ISO 286 =================
  // 基準寸法の区分（細分）。B[i] < D ≤ B[i+1] が区分 i
  const B = [0, 3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];
  // 細分 → 主区分（13 区分：≤3, 3-6, 6-10, 10-18, 18-30, 30-50, 50-80, 80-120, 120-180, 180-250, 250-315, 315-400, 400-500）
  const MAIN = [0, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12];
  const RANGE_LABEL = i => `${B[i]}を超え${B[i + 1]}以下`;

  // 基本公差 IT1〜IT16 [µm]（主区分 13 個）
  const IT = {
    1: [0.8, 1, 1, 1.2, 1.5, 1.5, 2, 2.5, 3.5, 4.5, 6, 7, 8],
    2: [1.2, 1.5, 1.5, 2, 2.5, 2.5, 3, 4, 5, 7, 8, 9, 10],
    3: [2, 2.5, 2.5, 3, 4, 4, 5, 6, 8, 10, 12, 13, 15],
    4: [3, 4, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20],
    5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
    6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
    7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
    8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
    9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
    10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
    11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
    12: [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
    13: [140, 180, 220, 270, 330, 390, 460, 540, 630, 720, 810, 890, 970],
    14: [250, 300, 360, 430, 520, 620, 740, 870, 1000, 1150, 1300, 1400, 1550],
    15: [400, 480, 580, 700, 840, 1000, 1200, 1400, 1600, 1850, 2100, 2300, 2500],
    16: [600, 750, 900, 1100, 1300, 1600, 1900, 2200, 2500, 2900, 3200, 3600, 4000]
  };
  const fine = main13 => MAIN.map(m => main13[m]);

  // 軸の基礎となる寸法許容差 [µm]（細分 25 個）。a〜h は上の許容差 es、j〜zc は下の許容差 ei
  const SHAFT_FD = {
    c: [-60, -70, -80, -95, -95, -110, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480],
    d: fine([-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230]),
    e: fine([-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135]),
    f: fine([-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68]),
    g: fine([-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20]),
    h: fine([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    m: fine([2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23]),
    n: fine([4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40]),
    p: fine([6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]),
    r: [10, 15, 19, 23, 23, 28, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132],
    s: [14, 19, 23, 28, 28, 35, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252],
    t: [null, null, null, null, null, null, 41, 48, 54, 66, 75, 91, 104, 122, 134, 146, 166, 180, 196, 218, 240, 268, 294, 330, 360],
    u: [18, 23, 28, 33, 33, 41, 48, 60, 70, 87, 102, 124, 144, 170, 190, 210, 236, 258, 284, 315, 350, 390, 435, 490, 540]
  };
  // k の ei：IT4〜IT7 のときだけ正、それ以外（IT3 以下・IT8 以上・3 mm 以下）は 0
  const K_EI = fine([0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5]);
  // j の ei（IT5・IT6 / IT7 / IT8）。IT8 は 3 mm 以下だけ
  const J_EI = { 56: fine([-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20]), 7: fine([-4, -4, -5, -6, -8, -10, -12, -15, -18, -21, -26, -28, -32]) };
  // 穴 J の上の許容差 ES（J6 / J7 / J8）
  const J_ES = {
    6: fine([2, 5, 5, 6, 8, 10, 13, 16, 18, 22, 25, 29, 33]),
    7: fine([4, 6, 8, 10, 12, 14, 18, 22, 26, 30, 36, 39, 43]),
    8: fine([6, 10, 12, 15, 20, 24, 28, 34, 41, 47, 55, 60, 66])
  };
  // Δ（穴 K〜ZC の補正値）IT3〜IT8
  const DELTA = [
    [0, 0, 0, 0, 0, 0], [1, 1.5, 1, 3, 4, 6], [1, 1.5, 2, 3, 6, 7], [1, 2, 3, 3, 7, 9], [1.5, 2, 3, 4, 8, 12], [1.5, 3, 4, 5, 9, 14],
    [2, 3, 5, 6, 11, 16], [2, 4, 5, 7, 13, 19], [3, 4, 6, 7, 15, 23], [3, 4, 6, 9, 17, 26], [4, 4, 7, 9, 20, 29], [4, 5, 7, 11, 21, 32], [5, 5, 7, 13, 23, 34]
  ];
  const delta = (iFine, g) => (g >= 3 && g <= 8 ? DELTA[MAIN[iFine]][g - 3] : 0);

  const SHAFT_LETTERS = ['c', 'd', 'e', 'f', 'g', 'h', 'js', 'j', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u'];
  const HOLE_LETTERS = SHAFT_LETTERS.map(l => l.toUpperCase());
  const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

  function rangeIndex(D) {
    if (!(D > 0 && D <= 500)) return -1;
    for (let i = 0; i < B.length - 1; i++) if (D <= B[i + 1]) return i;
    return -1;
  }
  // 「H7」「js6」などを { letter, grade } に分ける
  function parseFitClass(s) {
    const m = String(s || '').trim().match(/^(js|JS|[a-zA-Z])\s*(\d{1,2})$/);
    if (!m) return null;
    return { letter: m[1], grade: Number(m[2]) };
  }

  // 公差域クラス 1 つの上・下の寸法許容差 [µm]
  function tolZone(letter, grade, D) {
    const i = rangeIndex(D);
    if (i < 0) return { error: '基準寸法は 0 を超え 500 mm 以下で入れてください。' };
    if (!IT[grade]) return { error: `公差等級 IT${grade} は扱っていません（IT1〜IT16）。` };
    const it = IT[grade][MAIN[i]];
    const hole = letter === letter.toUpperCase();
    const l = letter.toLowerCase();
    const name = `${letter}${grade}`;
    const na = why => ({ error: `${name} は ${RANGE_LABEL(i)} mm では${why || '規格に値がありません'}。` });
    let up, lo;
    if (l === 'js') { up = it / 2; lo = -it / 2; }
    else if (!hole) {
      if (l === 'j') {
        if (grade === 5 || grade === 6) lo = J_EI[56][i];
        else if (grade === 7) lo = J_EI[7][i];
        else if (grade === 8 && i === 0) lo = -6;
        else return na('定められていません（j は 5〜7 級、8 級は 3 mm 以下）');
        up = lo + it;
      } else if (l === 'k') { lo = grade >= 4 && grade <= 7 ? K_EI[i] : 0; up = lo + it; }
      else {
        const fd = SHAFT_FD[l];
        if (!fd) return { error: `${name} は扱っていません。` };
        if (fd[i] == null) return na();
        if ('cdefgh'.includes(l)) { up = fd[i]; lo = up - it; } else { lo = fd[i]; up = lo + it; }
      }
    } else {
      // 穴：A〜H は EI = −es、J は表、K〜ZC は ES = −ei（+Δ）
      if (l === 'j') {
        if (!J_ES[grade]) return na('定められていません（J は 6〜8 級）');
        up = J_ES[grade][i]; lo = up - it;
      } else if ('cdefgh'.includes(l)) { lo = -SHAFT_FD[l][i]; up = lo + it; }
      else if (l === 'k') {
        if (grade <= 8) up = -(i === 0 ? 0 : K_EI[i]) + delta(i, grade); else up = 0;
        lo = up - it;
      } else if (l === 'm') {
        up = grade <= 8 ? -SHAFT_FD.m[i] + delta(i, grade) : -SHAFT_FD.m[i];
        lo = up - it;
      } else if (l === 'n') {
        if (i === 0) up = -4; else up = grade <= 8 ? -SHAFT_FD.n[i] + delta(i, grade) : 0;
        lo = up - it;
      } else {
        const fd = SHAFT_FD[l];
        if (!fd) return { error: `${name} は扱っていません。` };
        if (fd[i] == null) return na();
        up = grade <= 7 ? -fd[i] + delta(i, grade) : -fd[i];
        lo = up - it;
      }
    }
    return { name, hole, letter, grade, it, up: round3(up), lo: round3(lo), range: RANGE_LABEL(i) };
  }
  const round3 = v => Math.round(v * 1000) / 1000;

  const fitType = (cmin, cmax) => (cmin >= 0 ? 'clearance' : cmax <= 0 ? 'interference' : 'transition');

  // 平行部のはめあい。膜厚は片側の厚さ [µm]（直径では 2 倍に効く）
  // coat.h：穴の内面の膜厚 [最小, 最大]、coat.s：軸の外面の膜厚 [最小, 最大]、creq：必要な最小すきま [µm]
  function fit({ D, hole, shaft, coat = {}, creq = 0 }) {
    const H = tolZone(hole.letter, hole.grade, D), S = tolZone(shaft.letter, shaft.grade, D);
    if (H.error) return { error: H.error };
    if (S.error) return { error: S.error };
    if (!H.hole) return { error: '穴の公差域クラスは大文字で入れてください（例：H7）。' };
    if (S.hole) return { error: '軸の公差域クラスは小文字で入れてください（例：g6）。' };
    const [th0, th1] = coat.h || [0, 0], [ts0, ts1] = coat.s || [0, 0];
    const bare = { cmax: H.up - S.lo, cmin: H.lo - S.up };
    const coated = { cmax: (H.up - 2 * th0) - (S.lo + 2 * ts0), cmin: (H.lo - 2 * th1) - (S.up + 2 * ts1) };
    bare.type = fitType(bare.cmin, bare.cmax); coated.type = fitType(coated.cmin, coated.cmax);
    // 膜厚の余裕：最悪の組み合わせ（穴最小・軸最大）で必要な最小すきまを残せる片側膜厚の合計
    const room = (H.lo - S.up - creq) / 2;
    return {
      D, hole: H, shaft: S, coat: { h: [th0, th1], s: [ts0, ts1] }, creq,
      bare, coated,
      room,                         // 穴＋軸の片側膜厚の合計の上限 [µm]
      allowShaft: room - th1,       // 穴側の膜厚（最大）を入れたうえで、軸側に塗ってよい膜厚
      allowHole: room - ts1,        // 軸側の膜厚（最大）を入れたうえで、穴側に塗ってよい膜厚
      interference: Math.max(0, -coated.cmin), // 最悪の干渉量（直径） [µm]
      factor: 2
    };
  }

  // ================= ISO 965-1 =================
  // 表 1：基礎となる寸法許容差 [µm]（ピッチごと）。e・f・g は es（負）、G は EI（正）
  const T_FD = {
    0.2: [null, null, -17, 17], 0.25: [null, null, -18, 18], 0.3: [null, null, -18, 18], 0.35: [null, -34, -19, 19],
    0.4: [null, -34, -19, 19], 0.45: [null, -35, -20, 20], 0.5: [-50, -36, -20, 20], 0.6: [-53, -36, -21, 21],
    0.7: [-56, -38, -22, 22], 0.75: [-56, -38, -22, 22], 0.8: [-60, -38, -24, 24], 1: [-60, -40, -26, 26],
    1.25: [-63, -42, -28, 28], 1.5: [-67, -45, -32, 32], 1.75: [-71, -48, -34, 34], 2: [-71, -52, -38, 38],
    2.5: [-80, -58, -42, 42], 3: [-85, -63, -48, 48], 3.5: [-90, -70, -53, 53], 4: [-95, -75, -60, 60],
    4.5: [-100, -80, -63, 63], 5: [-106, -85, -71, 71], 5.5: [-112, -90, -75, 75], 6: [-118, -95, -80, 80]
  };
  // 表 2：めねじの内径の公差 TD1 [µm]（4〜8 級）
  const T_TD1 = {
    0.2: [38, null, null, null, null], 0.25: [45, 56, null, null, null], 0.3: [53, 67, 85, null, null], 0.35: [63, 80, 100, null, null],
    0.4: [71, 90, 112, null, null], 0.45: [80, 100, 125, null, null], 0.5: [90, 112, 140, 180, null], 0.6: [100, 125, 160, 200, null],
    0.7: [112, 140, 180, 224, null], 0.75: [118, 150, 190, 236, null], 0.8: [125, 160, 200, 250, 315], 1: [150, 190, 236, 300, 375],
    1.25: [170, 212, 265, 335, 425], 1.5: [190, 236, 300, 375, 475], 1.75: [212, 265, 335, 425, 530], 2: [236, 300, 375, 475, 600],
    2.5: [280, 355, 450, 560, 710], 3: [315, 400, 500, 630, 800], 3.5: [355, 450, 560, 710, 900], 4: [375, 475, 600, 750, 950],
    4.5: [425, 530, 670, 850, 1060], 5: [450, 560, 710, 900, 1120], 5.5: [475, 600, 750, 950, 1180], 6: [500, 630, 800, 1000, 1250]
  };
  // 表 3：おねじの外径の公差 Td [µm]（4 / 6 / 8 級）
  const T_TD = {
    0.2: [36, 56, null], 0.25: [42, 67, null], 0.3: [48, 75, null], 0.35: [53, 85, null], 0.4: [60, 95, null], 0.45: [63, 100, null],
    0.5: [67, 106, null], 0.6: [80, 125, null], 0.7: [90, 140, null], 0.75: [90, 140, null], 0.8: [95, 150, 236], 1: [112, 180, 280],
    1.25: [132, 212, 335], 1.5: [150, 236, 375], 1.75: [170, 265, 425], 2: [180, 280, 450], 2.5: [212, 335, 530], 3: [236, 375, 600],
    3.5: [265, 425, 670], 4: [300, 475, 750], 4.5: [315, 500, 800], 5: [335, 530, 850], 5.5: [355, 560, 900], 6: [375, 600, 950]
  };
  // 表 4・5：有効径の公差。呼び径の区分ごと、ピッチごと。めねじ TD2（4〜8 級）、おねじ Td2（3〜9 級）
  const D_RANGES = [[1.5, 2.8], [2.8, 5.6], [5.6, 11.2], [11.2, 22.4], [22.4, 45], [45, 90], [90, 180], [180, 355]];
  const T_TD2 = [
    { 0.2: [42, null, null, null, null], 0.25: [48, 60, null, null, null], 0.35: [53, 67, 85, null, null], 0.4: [56, 71, 90, null, null], 0.45: [60, 75, 95, null, null] },
    { 0.35: [56, 71, 90, null, null], 0.5: [63, 80, 100, 125, null], 0.6: [71, 90, 112, 140, null], 0.7: [75, 95, 118, 150, null], 0.75: [75, 95, 118, 150, null], 0.8: [80, 100, 125, 160, 200] },
    { 0.75: [85, 106, 132, 170, null], 1: [95, 118, 150, 190, 236], 1.25: [100, 125, 160, 200, 250], 1.5: [112, 140, 180, 224, 280] },
    { 1: [100, 125, 160, 200, 250], 1.25: [112, 140, 180, 224, 280], 1.5: [118, 150, 190, 236, 300], 1.75: [125, 160, 200, 250, 315], 2: [132, 170, 212, 265, 335], 2.5: [140, 180, 224, 280, 355] },
    { 1: [106, 132, 170, 212, null], 1.5: [125, 160, 200, 250, 315], 2: [140, 180, 224, 280, 355], 3: [170, 212, 265, 335, 425], 3.5: [180, 224, 280, 355, 450], 4: [190, 236, 300, 375, 475], 4.5: [200, 250, 315, 400, 500] },
    { 1.5: [132, 170, 212, 265, 335], 2: [150, 190, 236, 300, 375], 3: [180, 224, 280, 355, 450], 4: [200, 250, 315, 400, 500], 5: [212, 265, 335, 425, 530], 5.5: [224, 280, 355, 450, 560], 6: [236, 300, 375, 475, 600] },
    { 2: [160, 200, 250, 315, 400], 3: [190, 236, 300, 375, 475], 4: [212, 265, 335, 425, 530], 6: [250, 315, 400, 500, 630] },
    { 3: [212, 265, 335, 425, 530], 4: [236, 300, 375, 475, 600], 6: [265, 335, 425, 530, 670] }
  ];
  const T_TD2_EXT = [
    { 0.2: [25, 32, 40, 50, null, null, null], 0.25: [28, 36, 45, 56, null, null, null], 0.35: [32, 40, 50, 63, 80, null, null], 0.4: [34, 42, 53, 67, 85, null, null], 0.45: [36, 45, 56, 71, 90, null, null] },
    { 0.35: [34, 42, 53, 67, 85, null, null], 0.5: [38, 48, 60, 75, 95, null, null], 0.6: [42, 53, 67, 85, 106, null, null], 0.7: [45, 56, 71, 90, 112, null, null], 0.75: [45, 56, 71, 90, 112, null, null], 0.8: [48, 60, 75, 95, 118, 150, 190] },
    { 0.75: [50, 63, 80, 100, 125, null, null], 1: [56, 71, 90, 112, 140, 180, 224], 1.25: [60, 75, 95, 118, 150, 190, 236], 1.5: [67, 85, 106, 132, 170, 212, 265] },
    { 1: [60, 75, 95, 118, 150, 190, 236], 1.25: [67, 85, 106, 132, 170, 212, 265], 1.5: [71, 90, 112, 140, 180, 224, 280], 1.75: [75, 95, 118, 150, 190, 236, 300], 2: [80, 100, 125, 160, 200, 250, 315], 2.5: [85, 106, 132, 170, 212, 265, 335] },
    { 1: [63, 80, 100, 125, 160, 200, 250], 1.5: [75, 95, 118, 150, 190, 236, 300], 2: [85, 106, 132, 170, 212, 265, 335], 3: [100, 125, 160, 200, 250, 315, 400], 3.5: [106, 132, 170, 212, 265, 335, 425], 4: [112, 140, 180, 224, 280, 355, 450], 4.5: [118, 150, 190, 236, 300, 375, 475] },
    { 1.5: [80, 100, 125, 160, 200, 250, 315], 2: [90, 112, 140, 180, 224, 280, 355], 3: [106, 132, 170, 212, 265, 335, 425], 4: [118, 150, 190, 236, 300, 375, 475], 5: [125, 160, 200, 250, 315, 400, 500], 5.5: [132, 170, 212, 265, 335, 425, 530], 6: [140, 180, 224, 280, 355, 450, 560] },
    { 2: [95, 118, 150, 190, 236, 300, 375], 3: [112, 140, 180, 224, 280, 355, 450], 4: [125, 160, 200, 250, 315, 400, 500], 6: [150, 190, 236, 300, 375, 475, 600] },
    { 3: [125, 160, 200, 250, 315, 400, 500], 4: [140, 180, 224, 280, 355, 450, 560], 6: [160, 200, 250, 315, 400, 500, 630] }
  ];

  // 選べるねじ（ISO 261 / JIS B 0205 の並目と、よく使う細目）
  const COARSE = [[1.6, 0.35], [2, 0.4], [2.5, 0.45], [3, 0.5], [3.5, 0.6], [4, 0.7], [5, 0.8], [6, 1], [8, 1.25], [10, 1.5], [12, 1.75], [14, 2], [16, 2], [18, 2.5], [20, 2.5], [22, 2.5], [24, 3], [27, 3], [30, 3.5], [33, 3.5], [36, 4], [39, 4], [42, 4.5], [45, 4.5], [48, 5], [52, 5], [56, 5.5], [60, 5.5], [64, 6]];
  const FINE = [[1.6, 0.2], [2, 0.25], [2.5, 0.35], [3, 0.35], [3.5, 0.35], [4, 0.5], [5, 0.5], [6, 0.75], [8, 0.75], [8, 1], [10, 0.75], [10, 1], [10, 1.25], [12, 1], [12, 1.25], [12, 1.5], [14, 1], [14, 1.25], [14, 1.5], [16, 1], [16, 1.5], [18, 1], [18, 1.5], [18, 2], [20, 1], [20, 1.5], [20, 2], [22, 1], [22, 1.5], [22, 2], [24, 1], [24, 1.5], [24, 2], [27, 1.5], [27, 2], [30, 1.5], [30, 2], [30, 3], [33, 1.5], [33, 2], [33, 3], [36, 1.5], [36, 2], [36, 3], [39, 1.5], [39, 2], [39, 3], [42, 1.5], [42, 2], [42, 3], [42, 4], [45, 1.5], [45, 2], [45, 3], [45, 4], [48, 1.5], [48, 2], [48, 3], [48, 4], [52, 1.5], [52, 2], [52, 3], [52, 4], [56, 1.5], [56, 2], [56, 3], [56, 4], [60, 1.5], [60, 2], [60, 3], [60, 4], [64, 1.5], [64, 2], [64, 3], [64, 4]];
  const THREADS = [
    ...COARSE.map(([d, P]) => ({ d, P, coarse: true, name: `M${d}` })),
    ...FINE.map(([d, P]) => ({ d, P, coarse: false, name: `M${d}×${P}` }))
  ];

  const EXT_CLASSES = ['3h4h', '4g', '4h', '5g4g', '5g6g', '5h4h', '5h6h', '6e', '6f', '6g', '6h', '7e6e', '7g6g', '7h6h', '8e', '8g', '9e8e', '9g8g'];
  const INT_CLASSES = ['4H', '5H', '6H', '7H', '8H', '5G', '6G', '7G', '8G'];

  // JIS B 0209-1（ISO 965-1）の推奨公差域クラス。精度の区分 × はめあい長さ（S / N / L の順）
  // null は推奨表にないもの。括弧付き（第 2・第 3 選択）も含めて持つ
  const THREAD_REC = {
    int: {
      fine: { G: [null, null, null], H: ['4H', '5H', '6H'] },
      medium: { G: ['5G', '6G', '7G'], H: ['5H', '6H', '7H'] },
      coarse: { G: [null, '7G', '8G'], H: [null, '7H', '8H'] }
    },
    ext: {
      fine: { e: [null, null, null], f: [null, null, null], g: [null, '4g', '5g4g'], h: ['3h4h', '4h', '5h4h'] },
      medium: { e: [null, '6e', '7e6e'], f: [null, '6f', null], g: ['5g6g', '6g', '7g6g'], h: ['5h6h', '6h', '7h6h'] },
      coarse: { e: [null, '8e', '9e8e'], f: [null, null, null], g: [null, '8g', '9g8g'], h: [null, null, null] }
    }
  };
  const QUALITY_JA = { fine: '精', medium: '中', coarse: '粗' };
  const LENGTHS = ['S', 'N', 'L'];
  const LENGTH_JA = { S: '短い（S）', N: '並（N）', L: '長い（L）' };
  // 位置の組み合わせ。めねじの位置 + おねじの位置
  const THREAD_POS = [
    { v: 'Hg', ip: 'H', ep: 'g', ja: 'H/g（一般用）' },
    { v: 'Hh', ip: 'H', ep: 'h', ja: 'H/h（すきまなし）' },
    { v: 'Gh', ip: 'G', ep: 'h', ja: 'G/h（めねじ側にすきま）' },
    { v: 'Hf', ip: 'H', ep: 'f', ja: 'H/f（膜厚を見込む）' },
    { v: 'He', ip: 'H', ep: 'e', ja: 'H/e（厚い膜厚を見込む）' }
  ];

  // 精度の区分・はめあい長さ・位置から標準の公差域クラスを選ぶ。d・P を渡すとそのねじで定められているかも確かめる
  function standardThreadClass({ quality, length = 'N', pos = 'Hg', d, P }) {
    const q = THREAD_REC.int[quality], li = LENGTHS.indexOf(length), tp = THREAD_POS.find(x => x.v === pos);
    if (!q || li < 0 || !tp) return { error: '精度の区分・はめあい長さ・位置の指定が正しくありません。' };
    const ic = q[tp.ip][li], ec = THREAD_REC.ext[quality][tp.ep][li];
    const lab = `${QUALITY_JA[quality]}・${LENGTH_JA[length]}`;
    if (!ic || !ec) {
      const miss = [!ic && `めねじの ${tp.ip}`, !ec && `おねじの ${tp.ep}`].filter(Boolean).join('・');
      return { error: `${lab}では${miss} は推奨されていません（JIS B 0209-1 の推奨公差域クラス）。`, int: ic, ext: ec };
    }
    if (d != null && P != null) {
      const z = threadZones({ d, P, int: parseThreadClass(ic, false), ext: parseThreadClass(ec, true) });
      if (z.error) return { error: `${lab}の ${ic}/${ec} は、このねじでは使えません。${z.error}`, int: ic, ext: ec };
    }
    return { int: ic, ext: ec, label: lab };
  }
  // 公差域クラスの組み合わせが推奨表のどれにあたるか（はめあい長さは N を優先して探す）
  function findStandardThread(ic, ec) {
    const out = [];
    for (const quality of ['medium', 'fine', 'coarse']) for (const length of ['N', 'S', 'L']) for (const tp of THREAD_POS) {
      const r = standardThreadClass({ quality, length, pos: tp.v });
      if (!r.error && r.int === ic && r.ext === ec) out.push({ quality, length, pos: tp.v });
    }
    return out;
  }

  // 「6g」「5g6g」→ { pos, g2（有効径の等級）, gd（外径の等級） }、「6H」→ { pos, g }
  function parseThreadClass(s, ext) {
    const t = String(s || '').trim();
    if (ext) {
      const m = t.match(/^(\d)([efgh])(?:(\d)([efgh]))?$/);
      if (!m || (m[4] && m[4] !== m[2])) return null;
      return { pos: m[2], g2: Number(m[1]), gd: Number(m[3] || m[1]) };
    }
    const m = t.match(/^(\d)([GH])(?:(\d)([GH]))?$/);
    if (!m || (m[4] && m[4] !== m[2])) return null;
    return { pos: m[2], g2: Number(m[1]), g1: Number(m[3] || m[1]) };
  }
  const dRange = d => D_RANGES.findIndex(([a, b]) => d > a && d <= b);
  const fdOf = (P, pos) => {
    const r = T_FD[P]; if (!r) return undefined;
    return { e: r[0], f: r[1], g: r[2], h: 0, G: r[3], H: 0 }[pos];
  };

  function threadZones({ d, P, int: ic, ext: ec }) {
    if (!(d > 0) || !(P > 0)) return { error: '呼び径とピッチを入れてください。' };
    if (!T_FD[P]) return { error: `ピッチ ${P} mm は ISO 965-1 の表にありません。` };
    const ri = dRange(d);
    if (ri < 0) return { error: '呼び径は 1.5 mm を超え 355 mm 以下で入れてください。' };
    const rlab = `${D_RANGES[ri][0]}を超え${D_RANGES[ri][1]}以下`;
    if (!T_TD2[ri][P]) return { error: `呼び径 ${rlab} mm にピッチ ${P} mm の組み合わせは ISO 965-1 の表にありません。` };
    const H = 0.8660254037844386 * P;
    const d2 = d - 0.75 * H, D1 = d - 1.25 * H, d3 = d - 1.25 * H - H / 6;
    // めねじ
    const EI = fdOf(P, ic.pos);
    if (EI == null) return { error: `位置 ${ic.pos} はピッチ ${P} mm では定められていません。` };
    const TD2 = T_TD2[ri][P][ic.g2 - 4], TD1 = T_TD1[P][ic.g1 - 4];
    if (TD2 == null || TD1 == null) return { error: `めねじの ${ic.g2}${ic.pos} はこのねじ（ピッチ ${P} mm）では定められていません。` };
    // おねじ
    const es = fdOf(P, ec.pos);
    if (es == null) return { error: `位置 ${ec.pos} はピッチ ${P} mm では定められていません（e は 0.5 mm 以上、f は 0.35 mm 以上）。` };
    const Td2 = T_TD2_EXT[ri][P][ec.g2 - 3], Td = T_TD[P][[4, 6, 8].indexOf(ec.gd)];
    if (Td2 == null || Td == null || ![4, 6, 8].includes(ec.gd)) return { error: `おねじの ${ec.g2}${ec.pos}${ec.gd !== ec.g2 ? ec.gd + ec.pos : ''} はこのねじ（ピッチ ${P} mm）では定められていません（外径の等級は 4・6・8）。` };
    return {
      d, P, H, d2, D1, d3, rlab,
      int: { EI, TD2, TD1, name: `${ic.g2}${ic.pos}${ic.g1 !== ic.g2 ? ic.g1 + ic.pos : ''}`,
        D2: [d2 + EI / 1000, d2 + (EI + TD2) / 1000], D1: [D1 + EI / 1000, D1 + (EI + TD1) / 1000], D: [d + EI / 1000, null] },
      ext: { es, Td2, Td, name: `${ec.g2}${ec.pos}${ec.gd !== ec.g2 ? ec.gd + ec.pos : ''}`,
        d2: [d2 + (es - Td2) / 1000, d2 + es / 1000], d: [d + (es - Td) / 1000, d + es / 1000], d3: [null, d3 + es / 1000] }
    };
  }

  // ねじのはめあい。膜厚はフランク面に直角な片側の厚さ [µm]
  // 60° ねじではフランクの膜厚 t で有効径が 4t 変わる（t ÷ sin30° = 2t が半径、直径で 4t）。外径・内径は 2t
  function threadFit({ d, P, int, ext, coat = {}, creq = 0 }) {
    const z = threadZones({ d, P, int, ext });
    if (z.error) return z;
    const [ti0, ti1] = coat.i || [0, 0], [te0, te1] = coat.e || [0, 0];
    const I = z.int, E = z.ext;
    // 有効径のすきま（直径） [µm]
    const bare = { cmin: I.EI - E.es, cmax: (I.EI + I.TD2) - (E.es - E.Td2) };
    const coated = { cmin: bare.cmin - 4 * ti1 - 4 * te1, cmax: bare.cmax - 4 * ti0 - 4 * te0 };
    bare.type = fitType(bare.cmin, bare.cmax); coated.type = fitType(coated.cmin, coated.cmax);
    // 外径（おねじの山とめねじの谷）：めねじの谷径の最小は d + EI（ISO 965 では最大を定めない）
    const major = { cmin: I.EI - E.es - 2 * ti1 - 2 * te1 };
    // 内径（めねじの山とおねじの谷）：おねじの谷径の最大は d3 + es
    const minor = { cmin: ((z.D1 * 1000 + I.EI) - (z.d3 * 1000 + E.es)) - 2 * ti1 - 2 * te1 };
    const room = (bare.cmin - creq) / 4;
    return {
      ...z, coat: { i: [ti0, ti1], e: [te0, te1] }, creq, bare, coated, major, minor,
      room,                       // めねじ＋おねじの膜厚の合計の上限 [µm]
      allowExt: room - ti1,
      allowInt: room - te1,
      interference: Math.max(0, -coated.cmin),
      factor: 4
    };
  }

  // 位置ごとの膜厚の余裕（相手が H のめねじ、または h のおねじのとき）
  function coatingRoomByPosition(P) {
    const r = T_FD[P]; if (!r) return null;
    return {
      ext: ['e', 'f', 'g', 'h'].map(pos => ({ pos, es: fdOf(P, pos), room: fdOf(P, pos) == null ? null : -fdOf(P, pos) / 4 })),
      int: ['G', 'H'].map(pos => ({ pos, EI: fdOf(P, pos), room: fdOf(P, pos) / 4 }))
    };
  }

  const api = {
    tolZone, fit, parseFitClass, rangeIndex, SHAFT_LETTERS, HOLE_LETTERS, GRADES, IT,
    threadZones, threadFit, parseThreadClass, coatingRoomByPosition, THREADS, EXT_CLASSES, INT_CLASSES, fitType,
    standardThreadClass, findStandardThread, THREAD_REC, THREAD_POS, QUALITY_JA, LENGTH_JA, LENGTHS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FitCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
