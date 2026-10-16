// 画面処理：入力の読み取り、公差域の図・膜厚のグラフ・組み合わせ一覧、結果の表示、テーマ、オフライン対応
(function () {
  'use strict';
  const FC = window.FitCalc;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // 3 桁区切りで d 桁に丸める
  const fmt = (v, d = 0) => !Number.isFinite(v) ? '―' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
  const dOf = v => (Math.abs(v * 10 - Math.round(v * 10)) > 1e-9 ? 2 : Math.abs(v - Math.round(v)) > 1e-9 ? 1 : 0);
  const fU = v => fmt(v, dOf(v));                                  // µm（整数か 0.5 刻み）
  const sU = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), dOf(v)); // 符号付き µm
  const fM = v => fmt(v, 3);                                       // mm
  function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 2200); }
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 保存できない環境 */ } } };
  const KEY = 'fit-calc-inputs';
  const num = s => { const t = String(s ?? '').trim().replace(/[０-９．－]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/,/g, ''); return t === '' ? NaN : Number(t); };
  const TYPE_JA = { clearance: 'すきまばめ', transition: '中間ばめ', interference: 'しまりばめ' };
  const TYPE_C = { clearance: '--s1', transition: '--s4', interference: '--s2' };

  // ---- 状態 ----
  const FIT_EX = { D: '25', hl: 'H', hg: '7', sl: 'g', sg: '6', th0: '0', th1: '0', ts0: '10', ts1: '20', creq: '0' };
  const THR_EX = { sel: '8|1.25', d: '', P: '', ic: '6H', ec: '6g', ti0: '0', ti1: '0', te0: '5', te1: '8', creq: '0' };
  const DEF = { mode: 'fit', fit: { ...FIT_EX, sweep: 's', list: 'hole' }, thr: { ...THR_EX, sweep: 'e', zone: 'shape' } };
  let st = store.get(KEY);
  if (!st || !st.fit || !st.thr) st = JSON.parse(JSON.stringify(DEF));
  st.fit = { ...DEF.fit, ...st.fit }; st.thr = { ...DEF.thr, ...st.thr };
  const save = () => store.set(KEY, st);

  // ---- 選択肢 ----
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  $('fHl').innerHTML = FC.HOLE_LETTERS.map(l => opt(l, l)).join('');
  $('fSl').innerHTML = FC.SHAFT_LETTERS.map(l => opt(l, l)).join('');
  $('fHg').innerHTML = $('fSg').innerHTML = FC.GRADES.map(g => opt(g, g)).join('');
  const PRESETS = [
    ['', '選んでください'],
    ['H7/f6', 'H7/f6　すきまばめ（よく動く）'], ['H7/g6', 'H7/g6　すきまばめ（精密なすべり）'], ['H7/h6', 'H7/h6　すきまばめ（位置決め）'],
    ['H7/js6', 'H7/js6　中間ばめ'], ['H7/k6', 'H7/k6　中間ばめ'], ['H7/m6', 'H7/m6　中間ばめ'], ['H7/n6', 'H7/n6　中間ばめ'],
    ['H7/p6', 'H7/p6　しまりばめ（軽圧入）'], ['H7/r6', 'H7/r6　しまりばめ'], ['H7/s6', 'H7/s6　しまりばめ（圧入）'], ['H7/u6', 'H7/u6　しまりばめ（焼ばめ）'],
    ['H8/e8', 'H8/e8　すきまばめ'], ['H8/f7', 'H8/f7　すきまばめ'], ['H8/h7', 'H8/h7　すきまばめ'],
    ['H9/d9', 'H9/d9　すきまばめ（大きめ）'], ['H9/e9', 'H9/e9　すきまばめ'], ['H11/c11', 'H11/c11　すきまばめ（ゆるい）'], ['H11/h11', 'H11/h11　すきまばめ'],
    ['G7/h6', 'G7/h6　すきまばめ（軸基準）'], ['K7/h6', 'K7/h6　中間ばめ（軸基準）'], ['N7/h6', 'N7/h6　中間ばめ（軸基準）'], ['P7/h6', 'P7/h6　しまりばめ（軸基準）']
  ];
  $('fPreset').innerHTML = PRESETS.map(([v, t]) => opt(v, t)).join('');
  $('tSel').innerHTML =
    `<optgroup label="並目">${FC.THREADS.filter(t => t.coarse).map(t => opt(`${t.d}|${t.P}`, `${t.name}（P${t.P}）`)).join('')}</optgroup>` +
    `<optgroup label="細目">${FC.THREADS.filter(t => !t.coarse).map(t => opt(`${t.d}|${t.P}`, t.name)).join('')}</optgroup>` +
    `<optgroup label="その他">${opt('custom', '呼び径とピッチを入れる')}</optgroup>`;
  $('tIc').innerHTML = FC.INT_CLASSES.map(c => opt(c, c)).join('');
  $('tEc').innerHTML = FC.EXT_CLASSES.map(c => opt(c, c)).join('');

  // ---- 入力と状態の対応 ----
  const FIT_IN = { fD: 'D', fHl: 'hl', fHg: 'hg', fSl: 'sl', fSg: 'sg', fTh0: 'th0', fTh1: 'th1', fTs0: 'ts0', fTs1: 'ts1', fCreq: 'creq' };
  const THR_IN = { tSel: 'sel', tD: 'd', tP: 'P', tIc: 'ic', tEc: 'ec', tTi0: 'ti0', tTi1: 'ti1', tTe0: 'te0', tTe1: 'te1', tCreq: 'creq' };
  function fillInputs() {
    Object.entries(FIT_IN).forEach(([id, k]) => { $(id).value = st.fit[k] ?? ''; });
    Object.entries(THR_IN).forEach(([id, k]) => { $(id).value = st.thr[k] ?? ''; });
    $('fPreset').value = PRESETS.some(p => p[0] === `${st.fit.hl}${st.fit.hg}/${st.fit.sl}${st.fit.sg}`) ? `${st.fit.hl}${st.fit.hg}/${st.fit.sl}${st.fit.sg}` : '';
  }
  Object.entries(FIT_IN).forEach(([id, k]) => $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', () => { st.fit[k] = $(id).value; save(); render(); }));
  Object.entries(THR_IN).forEach(([id, k]) => $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', () => { st.thr[k] = $(id).value; save(); render(); }));
  $('fPreset').addEventListener('change', () => {
    const v = $('fPreset').value; if (!v) return;
    const [h, s] = v.split('/'), ph = FC.parseFitClass(h), ps = FC.parseFitClass(s);
    Object.assign(st.fit, { hl: ph.letter, hg: String(ph.grade), sl: ps.letter, sg: String(ps.grade) });
    fillInputs(); save(); render();
  });
  $('fExample').addEventListener('click', () => { Object.assign(st.fit, FIT_EX); fillInputs(); save(); render(); });
  $('tExample').addEventListener('click', () => { Object.assign(st.thr, THR_EX); fillInputs(); save(); render(); });
  $('fClearCoat').addEventListener('click', () => { Object.assign(st.fit, { th0: '0', th1: '0', ts0: '0', ts1: '0' }); fillInputs(); save(); render(); });
  $('tClearCoat').addEventListener('click', () => { Object.assign(st.thr, { ti0: '0', ti1: '0', te0: '0', te1: '0' }); fillInputs(); save(); render(); });
  function segs(id, get, set) {
    document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener('click', () => { set(b.dataset.v); save(); render(); }));
    return () => document.querySelectorAll(`#${id} button`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
  }
  // モードのタブ（ヘッダーの nav.tabs。ほかのツールと同じ形）
  const tabBtns = document.querySelectorAll('nav.tabs button');
  tabBtns.forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.tab; save(); render(); window.scrollTo(0, 0); }));
  const tabUpd = () => tabBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === st.mode)));
  const segUpd = [
    tabUpd,
    segs('fSweep', () => st.fit.sweep, v => { st.fit.sweep = v; }),
    segs('fList', () => st.fit.list, v => { st.fit.list = v; }),
    segs('tSweep', () => st.thr.sweep, v => { st.thr.sweep = v; }),
    segs('tZoneSel', () => st.thr.zone, v => { st.thr.zone = v; })
  ];

  // 膜厚の範囲を読む（空欄は 0、最小 > 最大は誤り）
  function readRange(id0, id1, v0, v1, bad) {
    const a = String(v0).trim() === '' ? 0 : num(v0), b = String(v1).trim() === '' ? a : num(v1);
    if (!(a >= 0)) bad.add(id0); if (!(b >= 0) || b < a) bad.add(id1);
    return [a, b];
  }
  function markBad(ids, bad) { ids.forEach(id => $(id).classList.toggle('bad', bad.has(id))); }

  // ---- SVG の共通部品 ----
  const svgOpen = (W, H, label) => `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}" font-family="${esc(css('--f-ui'))}">`;
  function niceTicks(lo, hi, nt = 5) {
    const span = hi - lo || 1, raw = span / nt, p = 10 ** Math.floor(Math.log10(raw));
    const m = [1, 2, 2.5, 5, 10].find(v => v * p >= raw) * p;
    const t = []; for (let v = Math.ceil(lo / m) * m; v <= hi + m * 1e-9; v += m) t.push(+v.toFixed(10));
    return { t, step: m };
  }
  const NUMF = () => esc(css('--f-num'));
  // 公差域の箱。z = { up, lo } は塗装後、b = 塗装前。open: 'up' / 'down' は片側が規格で決まっていない
  function zoneBox(Y, x, w, z, b, color, name, side, opt = {}) {
    const ink2 = css('--ink2'), mut = css('--muted'), nf = NUMF();
    // 四辺のうち、開いた側（規格で決まっていない側）の辺は描かない
    const edges = (top, bot, xx, ww, attr) => {
      let e = `<line x1="${xx}" x2="${xx}" y1="${top}" y2="${bot}" ${attr}/><line x1="${xx + ww}" x2="${xx + ww}" y1="${top}" y2="${bot}" ${attr}/>`;
      if (opt.open !== 'up') e += `<line x1="${xx}" x2="${xx + ww}" y1="${top}" y2="${top}" ${attr}/>`;
      if (opt.open !== 'down') e += `<line x1="${xx}" x2="${xx + ww}" y1="${bot}" y2="${bot}" ${attr}/>`;
      return e;
    };
    const top = opt.open === 'up' ? opt.yTop : Y(z.up), bot = opt.open === 'down' ? opt.yBot : Y(z.lo);
    let s = '';
    const moved = b && ((b.up ?? 0) !== (z.up ?? 0) || (b.lo ?? 0) !== (z.lo ?? 0));
    if (moved) {
      const bt = opt.open === 'up' ? opt.yTop : Y(b.up), bb = opt.open === 'down' ? opt.yBot : Y(b.lo);
      s += edges(bt, bb, x - 4, w + 8, `stroke="${mut}" stroke-width="1.3" stroke-dasharray="4 3"`);
    }
    s += `<rect x="${x}" y="${top}" width="${w}" height="${Math.max(1.5, bot - top)}" fill="${color}" fill-opacity=".28"/>`;
    s += edges(top, bot, x, w, `stroke="${color}" stroke-width="2"`);
    if (opt.open) {
      // 開いた側は矢印で続くことを示す
      const yy = opt.open === 'up' ? top + 12 : bot - 12, dy = opt.open === 'up' ? -6 : 6;
      s += `<path d="M${x + w / 2 - 6} ${yy} L${x + w / 2} ${yy + dy} L${x + w / 2 + 6} ${yy}" fill="none" stroke="${color}" stroke-width="2"/>`;
    }
    const tx = side === 'L' ? x - 8 : x + w + 8, an = side === 'L' ? 'end' : 'start';
    if (opt.open !== 'up') s += `<text x="${tx}" y="${top + 4}" font-size="11" fill="${ink2}" text-anchor="${an}" font-family="${nf}">${esc(sU(z.up))}</text>`;
    if (opt.open !== 'down') s += `<text x="${tx}" y="${bot + 4}" font-size="11" fill="${ink2}" text-anchor="${an}" font-family="${nf}">${esc(sU(z.lo))}</text>`;
    if (name) s += `<text x="${x + w / 2}" y="${(top + bot) / 2 + 4}" font-size="12" font-weight="700" fill="${css('--ink')}" text-anchor="middle" font-family="${nf}">${esc(name)}</text>`;
    return s;
  }
  // 最小すきまの帯（穴の下端と軸の上端の間）
  function gapBand(Y, xa, xb, x0, x1, holeLo, shaftUp, cmin, bad, label) {
    // xa〜xb：両列の外側の端、x0〜x1：列の間
    const y1 = Y(holeLo), y2 = Y(shaftUp), nf = NUMF(), halo = `paint-order="stroke" stroke="${css('--surface')}" stroke-width="4" stroke-linejoin="round"`;
    const top = Math.min(y1, y2), h = Math.abs(y1 - y2), xm = (x0 + x1) / 2;
    let s = '';
    if (cmin < 0) {
      const c = bad ? css('--ng') : css('--ink2');
      s += `<line x1="${xa}" x2="${xb}" y1="${y1}" y2="${y1}" stroke="${c}" stroke-dasharray="3 3"/><line x1="${xa}" x2="${xb}" y1="${y2}" y2="${y2}" stroke="${c}" stroke-dasharray="3 3"/>`;
      s += `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${Math.max(h, 1.5)}" fill="${bad ? css('--ng') : css('--muted')}" fill-opacity="${bad ? .35 : .25}"/>`;
      s += `<text x="${xm}" y="${top + h / 2 + 4}" font-size="11.5" font-weight="700" fill="${c}" text-anchor="middle" ${halo}>${esc(label)}</text>`;
    } else {
      const c = css('--ink2');
      if (h >= 6) s += `<line x1="${xm}" x2="${xm}" y1="${top + 1}" y2="${top + h - 1}" stroke="${c}" stroke-width="1.2" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
      s += `<text x="${xm}" y="${top - 6}" font-size="11" fill="${c}" text-anchor="middle" font-family="${nf}" ${halo}>${esc(label)}</text>`;
    }
    return s;
  }
  const arrowDef = () => `<defs><marker id="ar" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="${css('--ink2')}"/></marker></defs>`;
  function yAxis(Y, lo, hi, L, W, R, unit) {
    const yt = niceTicks(lo, hi, 6), ink2 = css('--ink2'), gr = css('--grid'), mut = css('--muted'), nf = NUMF();
    let s = '';
    yt.t.forEach(v => { const y = Y(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${v === 0 ? mut : gr}" stroke-width="${v === 0 ? 1.4 : 1}"/><text x="${L - 6}" y="${y + 4}" font-size="11" fill="${ink2}" text-anchor="end" font-family="${nf}">${esc(fmt(v, yt.step < 1 ? 1 : 0))}</text>`; });
    s += `<text x="${L - 6}" y="12" font-size="10.5" fill="${ink2}" text-anchor="end">${esc(unit)}</text>`;
    return s;
  }

  // 膜厚を横軸にしたすきまのグラフ。k = 膜厚が直径に効く倍率
  function drawSweep(el, o) {
    const W = el.clientWidth && el.clientWidth < 480 ? 420 : 560, H = 260, L = 56, R = 14, T = 18, Bm = 34;
    const base0 = o.cmin0 - o.k * o.otherMax, base1 = o.cmax0 - o.k * o.otherMin;
    const tCross = (base0 - o.creq) / o.k;
    const xmaxRaw = Math.max(10, o.range[1] * 1.4, tCross > 0 ? tCross * 1.5 : 0);
    const xt0 = niceTicks(0, xmaxRaw, 5), xmax = xt0.t[xt0.t.length - 1] < xmaxRaw ? xt0.t[xt0.t.length - 1] + xt0.step : xt0.t[xt0.t.length - 1];
    const lineMin = t => base0 - o.k * t, lineMax = t => base1 - o.k * t;
    let lo = Math.min(lineMin(xmax), o.creq, 0), hi = Math.max(lineMax(0), o.creq, 0);
    const pad = (hi - lo) * 0.08 || 5; lo -= pad; hi += pad;
    const X = v => L + v / xmax * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (H - T - Bm);
    const ink2 = css('--ink2'), mut = css('--muted'), nf = NUMF();
    let s = svgOpen(W, H, '膜厚とすきまのグラフ');
    s += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - Bm}" fill="${css('--surface')}" stroke="${css('--line')}"/>`;
    // 干渉する側（残したいすきま未満）を淡く塗る
    s += `<rect x="${L}" y="${Y(o.creq)}" width="${W - L - R}" height="${Math.max(0, Y(lo) - Y(o.creq))}" fill="${css('--ng-weak')}" fill-opacity=".6"/>`;
    if (o.range[1] > 0) s += `<rect x="${X(o.range[0])}" y="${T}" width="${Math.max(2, X(o.range[1]) - X(o.range[0]))}" height="${H - T - Bm}" fill="${css('--accent-weak')}" fill-opacity=".9"/>`;
    s += yAxis(Y, lo, hi, L, W, R, 'µm');
    niceTicks(0, xmax, 5).t.forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H - Bm}" stroke="${css('--grid')}"/><text x="${X(v)}" y="${H - Bm + 15}" font-size="11" fill="${ink2}" text-anchor="middle" font-family="${nf}">${esc(fmt(v, 0))}</text>`; });
    s += `<text x="${W - R}" y="${H - 4}" font-size="11" fill="${ink2}" text-anchor="end">${esc(o.xlabel)}</text>`;
    if (o.creq !== 0) s += `<line x1="${L}" x2="${W - R}" y1="${Y(o.creq)}" y2="${Y(o.creq)}" stroke="${css('--ng')}" stroke-dasharray="5 3"/><text x="${W - R - 4}" y="${Y(o.creq) - 4}" font-size="10.5" fill="${css('--ng')}" text-anchor="end">残したいすきま</text>`;
    s += `<path d="M${X(0)} ${Y(lineMax(0))} L${X(xmax)} ${Y(lineMax(xmax))} L${X(xmax)} ${Y(lineMin(xmax))} L${X(0)} ${Y(lineMin(0))} Z" fill="${css('--s1')}" fill-opacity=".08"/>`;
    s += `<line x1="${X(0)}" y1="${Y(lineMax(0))}" x2="${X(xmax)}" y2="${Y(lineMax(xmax))}" stroke="${css('--s1')}" stroke-width="2.2"/>`;
    s += `<line x1="${X(0)}" y1="${Y(lineMin(0))}" x2="${X(xmax)}" y2="${Y(lineMin(xmax))}" stroke="${css('--s2')}" stroke-width="2.4"/>`;
    // 塗れる上限の点
    if (tCross >= 0 && tCross <= xmax) {
      const x = X(tCross), y = Y(o.creq);
      s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - Bm}" stroke="${mut}" stroke-dasharray="4 3"/><circle cx="${x}" cy="${y}" r="4.5" fill="${css('--surface')}" stroke="${css('--s2')}" stroke-width="2.2"/>`;
      const right = x < W - 170;
      s += `<text x="${x + (right ? 8 : -8)}" y="${T + 14}" font-size="11.5" font-weight="700" fill="${css('--ink')}" text-anchor="${right ? 'start' : 'end'}">${esc(fU(Math.max(0, tCross)))} µm まで塗れます</text>`;
    } else if (tCross < 0) {
      s += `<text x="${L + 8}" y="${T + 14}" font-size="11.5" font-weight="700" fill="${css('--ng')}">膜厚 0 でも残したいすきまが取れません</text>`;
    }
    el.innerHTML = s + '</svg>';
  }

  // ================= はめあい =================
  let fitRes = null; const fCopy = [];
  function fitAlt(D, hole, shaft, coat, creq) {
    // 同じ等級で、塗装後も残したいすきまが取れる軸（穴固定）を h → c の向きに探す
    const order = ['h', 'g', 'f', 'e', 'd', 'c'];
    const from = order.indexOf(shaft.letter);
    for (const l of order.slice(from + 1)) {
      const r = FC.fit({ D, hole, shaft: { letter: l, grade: shaft.grade }, coat, creq });
      if (!r.error && r.coated.cmin >= creq) return r;
    }
    return null;
  }
  function renderFit() {
    const f = st.fit, bad = new Set();
    const D = num(f.D); if (!(D > 0 && D <= 500)) bad.add('fD');
    const coat = { h: readRange('fTh0', 'fTh1', f.th0, f.th1, bad), s: readRange('fTs0', 'fTs1', f.ts0, f.ts1, bad) };
    let creq = String(f.creq).trim() === '' ? 0 : num(f.creq); if (!Number.isFinite(creq)) { bad.add('fCreq'); creq = 0; }
    markBad(Object.keys(FIT_IN), bad);
    const hole = { letter: f.hl, grade: Number(f.hg) }, shaft = { letter: f.sl, grade: Number(f.sg) };
    const msgs = [];
    fCopy.length = 0;
    fitRes = bad.has('fD') ? { error: '基準寸法は 0 を超え 500 mm 以下で入れてください。' } : bad.size ? { error: '赤い欄の値を見直してください。膜厚は 0 以上で、最小 ≤ 最大にします。' } : FC.fit({ D, hole, shaft, coat, creq });
    $('fListTitle').textContent = '組み合わせ一覧';
    if (fitRes.error) {
      ['fZone', 'fSweepFig', 'fRes', 'fKpi'].forEach(id => { $(id).innerHTML = ''; });
      $('fMsgs').innerHTML = `<div class="msg err">× ${esc(fitRes.error)}</div>`;
      drawFitList(D, hole, shaft, coat, creq);
      return;
    }
    const r = fitRes, coated = r.coat.h[1] > 0 || r.coat.s[1] > 0;
    // 主な数値
    const intended = r.bare.cmin >= creq;
    const kpi = [
      ['最小すきま' + (coated ? '（塗装後）' : ''), r.coated.cmin >= 0 ? fU(r.coated.cmin) : `−${fU(-r.coated.cmin)}`, 'µm', r.coated.cmin < creq && intended ? 'ng' : ''],
      ['最大すきま' + (coated ? '（塗装後）' : ''), r.coated.cmax >= 0 ? fU(r.coated.cmax) : `−${fU(-r.coated.cmax)}`, 'µm', ''],
      [r.coat.h[1] > 0 && r.coat.s[1] === 0 ? '穴に塗れる膜厚' : '軸に塗れる膜厚', intended ? fU(Math.max(0, r.coat.h[1] > 0 && r.coat.s[1] === 0 ? r.allowHole : r.allowShaft)) : '―', intended ? 'µm' : '', intended && (r.coat.h[1] > 0 && r.coat.s[1] === 0 ? r.allowHole : r.allowShaft) < 0 ? 'ng' : '']
    ];
    $('fKpi').innerHTML = kpi.map(([t, v, u, c]) => `<div class="${c}"><span>${esc(t)}</span><b>${esc(v)}</b> <small>${u}</small></div>`).join('');
    drawFitZone(r, creq, intended);
    drawSweep($('fSweepFig'), {
      k: 2, cmin0: r.bare.cmin, cmax0: r.bare.cmax, creq,
      otherMin: st.fit.sweep === 's' ? r.coat.h[0] : r.coat.s[0], otherMax: st.fit.sweep === 's' ? r.coat.h[1] : r.coat.s[1],
      range: st.fit.sweep === 's' ? r.coat.s : r.coat.h, xlabel: st.fit.sweep === 's' ? '軸の膜厚（片側） [µm]' : '穴の膜厚（片側） [µm]'
    });
    drawFitList(D, hole, shaft, coat, creq);

    // 結果の表
    const H = r.hole, S = r.shaft;
    let h = '<table class="res"><thead><tr><th></th><th>上の許容差</th><th>下の許容差</th><th>最大寸法</th><th>最小寸法</th></tr></thead><tbody>';
    const zrow = (t, z, sub) => { h += `<tr><th>${esc(t)}<small>${esc(sub)}</small></th><td>${esc(sU(z.up))}<span class="u">µm</span></td><td>${esc(sU(z.lo))}<span class="u">µm</span></td><td>${esc(fM(D + z.up / 1000))}</td><td>${esc(fM(D + z.lo / 1000))}</td></tr>`; fCopy.push([t, sU(z.up).replace('−', '-'), sU(z.lo).replace('−', '-'), (D + z.up / 1000).toFixed(3), (D + z.lo / 1000).toFixed(3)]); };
    zrow(`穴 ${H.name}`, H, `IT${H.grade} = ${fU(H.it)} µm`);
    if (r.coat.h[1] > 0) zrow('穴（塗装後）', { up: H.up - 2 * r.coat.h[0], lo: H.lo - 2 * r.coat.h[1] }, `膜厚 ${fU(r.coat.h[0])}〜${fU(r.coat.h[1])} µm`);
    zrow(`軸 ${S.name}`, S, `IT${S.grade} = ${fU(S.it)} µm`);
    if (r.coat.s[1] > 0) zrow('軸（塗装後）', { up: S.up + 2 * r.coat.s[1], lo: S.lo + 2 * r.coat.s[0] }, `膜厚 ${fU(r.coat.s[0])}〜${fU(r.coat.s[1])} µm`);
    h += '</tbody></table><table class="res" style="margin-top:10px"><thead><tr><th></th><th>塗装前</th><th>塗装後</th></tr></thead><tbody>';
    const crow = (t, a, b, u, sub) => { h += `<tr><th>${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</th><td>${esc(a)}<span class="u">${u}</span></td><td>${esc(b)}<span class="u">${u}</span></td></tr>`; fCopy.push([t, a.replace('−', '-').replace(/,/g, ''), b.replace('−', '-').replace(/,/g, ''), u]); };
    crow('はめあいの種類', TYPE_JA[r.bare.type], TYPE_JA[r.coated.type], '');
    crow('最小すきま', sU(r.bare.cmin), sU(r.coated.cmin), 'µm', '負はしめしろ（干渉）。最悪の組み合わせ');
    crow('最大すきま', sU(r.bare.cmax), sU(r.coated.cmax), 'µm');
    crow('最大しめしろ', fU(Math.max(0, -r.bare.cmin)), fU(r.interference), 'µm', '直径での干渉量');
    h += '</tbody></table><table class="res" style="margin-top:10px"><tbody>';
    const arow = (t, v, sub, j) => { h += `<tr><th>${esc(t)}<small>${esc(sub)}</small></th><td>${esc(v)}<span class="u">µm</span>${j || ''}</td></tr>`; fCopy.push([t, v.replace('−', '-'), 'µm']); };
    const judge = (allow, have) => have > 0 ? (have <= allow + 1e-9 ? '<span class="judge ok">○ 入る</span>' : `<span class="judge ng">✕ ${esc(fU(have - allow))} µm 超える</span>`) : '';
    arow('塗れる膜厚の合計（穴＋軸）', sU(r.room), `最小すきま ${fU(r.bare.cmin)} µm から残したいすきま ${fU(creq)} µm を引いて ÷ 2`);
    arow('軸に塗れる膜厚', sU(r.allowShaft), `穴の膜厚を最大 ${fU(r.coat.h[1])} µm としたとき`, judge(r.allowShaft, r.coat.s[1]));
    arow('穴に塗れる膜厚', sU(r.allowHole), `軸の膜厚を最大 ${fU(r.coat.s[1])} µm としたとき`, judge(r.allowHole, r.coat.h[1]));
    h += '</tbody></table>';
    $('fRes').innerHTML = h;
    fCopy.unshift(['基準寸法', String(D), 'mm'], ['はめあい', `${H.name}/${S.name}`, ''], ['穴の膜厚', `${r.coat.h[0]}〜${r.coat.h[1]}`, 'µm'], ['軸の膜厚', `${r.coat.s[0]}〜${r.coat.s[1]}`, 'µm'], ['残したいすきま', String(creq), 'µm']);

    // 注意と判定の理由
    if (intended && r.coated.cmin < creq) {
      const alt = fitAlt(D, hole, shaft, coat, creq);
      msgs.push(['err', `× 膜厚が最大の部品どうしを組むと、直径で ${fU(creq - r.coated.cmin)} µm ${creq > 0 ? '残したいすきまに足りません' : '干渉します'}。軸の膜厚を ${fU(Math.max(0, r.allowShaft))} µm 以下にするか、${alt ? `同じ ${shaft.grade} 級の ${alt.shaft.name}（塗装後の最小すきま ${fU(alt.coated.cmin)} µm）のように軸を細くする` : '軸の公差域を細い側に変える'}か、塗装前の穴を大きくしてください。`]);
      if (r.coated.cmax > creq) msgs.push(['info', `寸法の組み合わせによっては組めます。最大すきま側（穴が最大・軸が最小・膜厚が最小）では ${fU(r.coated.cmax)} µm のすきまがあります。`]);
    } else if (intended && coated) {
      msgs.push(['ok', `○ 膜厚が最大でも最小すきま ${fU(r.coated.cmin)} µm が残ります（軸ならあと ${fU(r.allowShaft - r.coat.s[1])} µm 厚くできます）。`]);
    }
    if (!intended && r.bare.type !== 'clearance') msgs.push(['info', `${H.name}/${S.name} は塗装前から${TYPE_JA[r.bare.type]}です（しめしろ 最大 ${fU(Math.max(0, -r.bare.cmin))} µm）。塗装すると、しめしろがさらに直径で ${fU(2 * (r.coat.h[1] + r.coat.s[1]))} µm 増えます。`]);
    if (!intended && r.bare.type === 'clearance') msgs.push(['warn', `! 塗装前の最小すきま ${fU(r.bare.cmin)} µm が、残したいすきま ${fU(creq)} µm より小さくなっています。`]);
    $('fMsgs').innerHTML = msgs.map(([k, t]) => `<div class="msg ${k}">${esc(t)}</div>`).join('');
  }

  function drawFitZone(r, creq, intended) {
    const el = $('fZone');
    const W = el.clientWidth && el.clientWidth < 480 ? 380 : 560, Hh = 300, L = 56, R = 14, T = 22, Bm = 22;
    const H = r.hole, S = r.shaft;
    const hc = { up: H.up - 2 * r.coat.h[0], lo: H.lo - 2 * r.coat.h[1] }, sc = { up: S.up + 2 * r.coat.s[1], lo: S.lo + 2 * r.coat.s[0] };
    const vals = [H.up, H.lo, S.up, S.lo, hc.up, hc.lo, sc.up, sc.lo, 0];
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.12 || 5; lo -= pad; hi += pad;
    const Y = v => T + (hi - v) / (hi - lo) * (Hh - T - Bm);
    const cw = W < 560 ? 64 : 84, x1 = L + (W - L - R) * 0.2, x2 = L + (W - L - R) * 0.62;
    let s = svgOpen(W, Hh, '穴と軸の公差域の図') + arrowDef();
    s += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${Hh - T - Bm}" fill="${css('--surface')}" stroke="${css('--line')}"/>`;
    s += yAxis(Y, lo, hi, L, W, R, 'µm');
    s += `<text x="${W - R}" y="14" font-size="10.5" fill="${css('--ink2')}" text-anchor="end">0 = 基準寸法 ${esc(fmt(r.D, r.D % 1 ? 2 : 0))} mm</text>`;
    const cm = r.coated.cmin, bad = intended && cm < creq;
    s += gapBand(Y, x1, x2 + cw, x1 + cw, x2, hc.lo, sc.up, cm, bad, cm < 0 ? `${bad ? '✕ ' : ''}${x2 - x1 - cw < 100 ? '' : intended ? '干渉 ' : 'しめしろ '}${fU(-cm)} µm` : `最小すきま ${fU(cm)} µm`);
    s += zoneBox(Y, x1, cw, hc, H, css('--s1'), H.name, 'L');
    s += zoneBox(Y, x2, cw, sc, S, css('--s2'), S.name, 'R');
    s += `<text x="${x1 + cw / 2}" y="${Hh - 6}" font-size="11" fill="${css('--ink2')}" text-anchor="middle">穴</text><text x="${x2 + cw / 2}" y="${Hh - 6}" font-size="11" fill="${css('--ink2')}" text-anchor="middle">軸</text>`;
    el.innerHTML = s + '</svg>';
  }

  function drawFitList(D, hole, shaft, coat, creq) {
    const el = $('fListFig');
    if (!(D > 0 && D <= 500)) { el.innerHTML = ''; return; }
    const fixHole = st.fit.list === 'hole';
    const rows = (fixHole ? FC.SHAFT_LETTERS : FC.HOLE_LETTERS).map(l => {
      const hs = fixHole ? { hole, shaft: { letter: l, grade: shaft.grade } } : { hole: { letter: l, grade: hole.grade }, shaft };
      const r = FC.fit({ D, ...hs, coat, creq });
      return { l, r, name: `${l}${fixHole ? shaft.grade : hole.grade}`, cur: fixHole ? l === shaft.letter : l === hole.letter };
    }).filter(x => !x.r.error);
    $('fListTitle').textContent = fixHole ? `${hole.letter}${hole.grade} に組む軸（${shaft.grade} 級）` : `${shaft.letter}${shaft.grade} に組む穴（${hole.grade} 級）`;
    if (!rows.length) { el.innerHTML = ''; return; }
    const W = el.clientWidth && el.clientWidth < 480 ? 420 : 560, rh = 22, T = 26, Bm = 36, L = 88, R = 14, Hh = T + rows.length * rh + Bm;
    const vals = rows.flatMap(x => [x.r.bare.cmin, x.r.bare.cmax, x.r.coated.cmin, x.r.coated.cmax]).concat([0, creq]);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.04; lo -= pad; hi += pad;
    const X = v => L + (v - lo) / (hi - lo) * (W - L - R);
    const ink2 = css('--ink2'), nf = NUMF();
    let s = svgOpen(W, Hh, 'はめあいの組み合わせ一覧');
    const xt = niceTicks(lo, hi, 6);
    xt.t.forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 4}" y2="${Hh - Bm}" stroke="${v === 0 ? css('--muted') : css('--grid')}" stroke-width="${v === 0 ? 1.4 : 1}"/><text x="${X(v)}" y="${Hh - Bm + 15}" font-size="10.5" fill="${ink2}" text-anchor="middle" font-family="${nf}">${esc(fmt(v, 0))}</text>`; });
    s += `<text x="${W - R}" y="${Hh - 3}" font-size="10.5" fill="${ink2}" text-anchor="end">すきま [µm]（負はしめしろ）</text>`;
    s += `<text x="${X(0) + 4}" y="${T - 10}" font-size="10.5" fill="${ink2}">すきま →</text><text x="${X(0) - 4}" y="${T - 10}" font-size="10.5" fill="${ink2}" text-anchor="end">← しめしろ</text>`;
    if (creq) s += `<line x1="${X(creq)}" x2="${X(creq)}" y1="${T - 4}" y2="${Hh - Bm}" stroke="${css('--ng')}" stroke-dasharray="4 3"/>`;
    rows.forEach((x, i) => {
      const y = T + i * rh, r = x.r, c = css(TYPE_C[r.coated.type]);
      const broke = r.bare.cmin >= creq && r.coated.cmin < creq;
      s += `<g class="pick" data-l="${esc(x.l)}"><rect class="hit" x="0" y="${y}" width="${W}" height="${rh}" fill="${x.cur ? css('--accent-weak') : 'transparent'}"/>`;
      s += `<text x="10" y="${y + 15}" font-size="12" font-weight="700" fill="${css('--ink')}" font-family="${nf}">${esc(x.name)}</text>`;
      if (broke) s += `<text x="${L - 8}" y="${y + 15}" font-size="11" font-weight="700" fill="${css('--ng')}" text-anchor="end">✕</text>`;
      s += `<rect x="${X(r.bare.cmin)}" y="${y + 4}" width="${Math.max(1, X(r.bare.cmax) - X(r.bare.cmin))}" height="${rh - 8}" fill="none" stroke="${css('--muted')}" stroke-dasharray="3 2"/>`;
      s += `<rect x="${X(r.coated.cmin)}" y="${y + 6}" width="${Math.max(2, X(r.coated.cmax) - X(r.coated.cmin))}" height="${rh - 12}" fill="${c}" fill-opacity=".85" rx="2"/>`;
      s += `<title>${esc(`${x.name}：${TYPE_JA[r.coated.type]}、すきま ${sU(r.coated.cmin)}〜${sU(r.coated.cmax)} µm`)}</title></g>`;
    });
    s += `<text x="${L - 8}" y="${T - 10}" font-size="10" fill="${css('--ng')}" text-anchor="end">✕ 塗装で干渉</text>`;
    el.innerHTML = s + '</svg>';
    el.querySelectorAll('.pick').forEach(g => g.addEventListener('click', () => {
      if (fixHole) st.fit.sl = g.dataset.l; else st.fit.hl = g.dataset.l;
      fillInputs(); save(); render();
    }));
  }

  // ================= ねじ =================
  let thrRes = null; const tCopy = [];
  function readThread(bad) {
    const t = st.thr;
    const custom = t.sel === 'custom';
    $('tDf').hidden = $('tPf').hidden = !custom;
    let d, P;
    if (custom) { d = num(t.d); P = num(t.P); if (!(d > 0)) bad.add('tD'); if (!(P > 0)) bad.add('tP'); }
    else[d, P] = String(t.sel).split('|').map(Number);
    return { d, P };
  }
  function renderThr() {
    const t = st.thr, bad = new Set();
    const { d, P } = readThread(bad);
    const coat = { i: readRange('tTi0', 'tTi1', t.ti0, t.ti1, bad), e: readRange('tTe0', 'tTe1', t.te0, t.te1, bad) };
    let creq = String(t.creq).trim() === '' ? 0 : num(t.creq); if (!Number.isFinite(creq)) { bad.add('tCreq'); creq = 0; }
    markBad(Object.keys(THR_IN), bad);
    const ic = FC.parseThreadClass(t.ic, false), ec = FC.parseThreadClass(t.ec, true);
    tCopy.length = 0;
    thrRes = bad.has('tD') || bad.has('tP') ? { error: '呼び径とピッチを mm で入れてください。' } : bad.size ? { error: '赤い欄の値を見直してください。膜厚は 0 以上で、最小 ≤ 最大にします。' } : FC.threadFit({ d, P, int: ic, ext: ec, coat, creq });
    drawRoomTable(P, ec);
    const name = st.thr.sel === 'custom' ? `M${d}×${P}` : (FC.THREADS.find(x => `${x.d}|${x.P}` === st.thr.sel) || {}).name;
    $('tListTitle').textContent = `${t.ic} に組むおねじ`;
    if (thrRes.error) {
      ['tZone', 'tSweepFig', 'tRes', 'tKpi', 'tListFig'].forEach(id => { $(id).innerHTML = ''; });
      $('tMsgs').innerHTML = `<div class="msg err">× ${esc(thrRes.error)}</div>`;
      return;
    }
    const r = thrRes, coated = r.coat.i[1] > 0 || r.coat.e[1] > 0, msgs = [];
    const allowE = r.coat.i[1] > 0 && r.coat.e[1] === 0 ? r.allowInt : r.allowExt;
    $('tKpi').innerHTML = [
      ['有効径の最小すきま' + (coated ? '（塗装後）' : ''), sU(r.coated.cmin), 'µm', r.coated.cmin < creq ? 'ng' : ''],
      ['有効径の最大すきま' + (coated ? '（塗装後）' : ''), sU(r.coated.cmax), 'µm', ''],
      [r.coat.i[1] > 0 && r.coat.e[1] === 0 ? 'めねじに塗れる膜厚' : 'おねじに塗れる膜厚', fU(Math.max(0, allowE)), 'µm', allowE < 0 ? 'ng' : '']
    ].map(([a, v, u, c]) => `<div class="${c}"><span>${esc(a)}</span><b>${esc(v)}</b> <small>${u}</small></div>`).join('');
    drawThrFigure(r, creq);
    drawSweep($('tSweepFig'), {
      k: 4, cmin0: r.bare.cmin, cmax0: r.bare.cmax, creq,
      otherMin: st.thr.sweep === 'e' ? r.coat.i[0] : r.coat.e[0], otherMax: st.thr.sweep === 'e' ? r.coat.i[1] : r.coat.e[1],
      range: st.thr.sweep === 'e' ? r.coat.e : r.coat.i, xlabel: st.thr.sweep === 'e' ? 'おねじの膜厚（フランク面） [µm]' : 'めねじの膜厚（フランク面） [µm]'
    });
    drawThrList(d, P, ic, coat, creq, ec);

    // 結果の表（寸法は mm）
    const I = r.int, E = r.ext;
    let h = `<table class="res"><thead><tr><th>${esc(name)}</th><th>最大</th><th>最小</th><th>公差</th></tr></thead><tbody>`;
    const lrow = (t2, mx, mn, tol, sub) => { h += `<tr><th>${esc(t2)}${sub ? `<small>${esc(sub)}</small>` : ''}</th><td>${mx == null ? '―' : esc(fM(mx))}</td><td>${mn == null ? '―' : esc(fM(mn))}</td><td>${tol == null ? '―' : esc(fU(tol))}<span class="u">${tol == null ? '' : 'µm'}</span></td></tr>`; tCopy.push([t2, mx == null ? '' : mx.toFixed(3), mn == null ? '' : mn.toFixed(3), tol == null ? '' : String(tol)]); };
    lrow(`めねじ ${I.name} 谷の径 D`, null, I.D[0], null, '最大は定めない');
    lrow(`めねじ ${I.name} 有効径 D2`, I.D2[1], I.D2[0], I.TD2, `下の許容差 EI = ${sU(I.EI)} µm`);
    lrow(`めねじ ${I.name} 内径 D1`, I.D1[1], I.D1[0], I.TD1);
    lrow(`おねじ ${E.name} 外径 d`, E.d[1], E.d[0], E.Td, `上の許容差 es = ${sU(E.es)} µm`);
    lrow(`おねじ ${E.name} 有効径 d2`, E.d2[1], E.d2[0], E.Td2);
    lrow(`おねじ ${E.name} 谷の径 d3`, E.d3[1], null, null, '最小は定めない（参考値）');
    h += `</tbody></table><p class="hint" style="margin:6px 0 0">基準寸法：有効径 ${esc(fM(r.d2))} mm、内径 ${esc(fM(r.D1))} mm、とがり山の高さ H = ${esc(fmt(r.H, 4))} mm（呼び径の区分 ${esc(r.rlab)} mm）</p>`;
    h += '<table class="res" style="margin-top:10px"><thead><tr><th>すきま（直径）</th><th>塗装前</th><th>塗装後</th></tr></thead><tbody>';
    const crow = (t2, a, b, sub) => { h += `<tr><th>${esc(t2)}${sub ? `<small>${esc(sub)}</small>` : ''}</th><td>${esc(sU(a))}<span class="u">µm</span></td><td>${esc(sU(b))}<span class="u">µm</span></td></tr>`; tCopy.push([t2, String(a), String(b), 'µm']); };
    crow('有効径の最小すきま', r.bare.cmin, r.coated.cmin, '負は干渉。膜厚の効きは 4t');
    crow('有効径の最大すきま', r.bare.cmax, r.coated.cmax);
    crow('外径側の最小すきま', r.major.cmin + 2 * (r.coat.i[1] + r.coat.e[1]), r.major.cmin, 'おねじの山とめねじの谷。効きは 2t');
    crow('内径側の最小すきま', r.minor.cmin + 2 * (r.coat.i[1] + r.coat.e[1]), r.minor.cmin, 'めねじの山とおねじの谷。効きは 2t');
    h += '</tbody></table><table class="res" style="margin-top:10px"><tbody>';
    const judge = (allow, have) => have > 0 ? (have <= allow + 1e-9 ? '<span class="judge ok">○ 入る</span>' : `<span class="judge ng">✕ ${esc(fU(have - allow))} µm 超える</span>`) : '';
    const arow = (t2, v, sub, j) => { h += `<tr><th>${esc(t2)}<small>${esc(sub)}</small></th><td>${esc(sU(v))}<span class="u">µm</span>${j || ''}</td></tr>`; tCopy.push([t2, String(v), 'µm']); };
    arow('塗れる膜厚の合計（めねじ＋おねじ）', r.room, `有効径の最小すきま ${fU(r.bare.cmin)} µm から残したいすきま ${fU(creq)} µm を引いて ÷ 4`);
    arow('おねじに塗れる膜厚', r.allowExt, `めねじの膜厚を最大 ${fU(r.coat.i[1])} µm としたとき`, judge(r.allowExt, r.coat.e[1]));
    arow('めねじに塗れる膜厚', r.allowInt, `おねじの膜厚を最大 ${fU(r.coat.e[1])} µm としたとき`, judge(r.allowInt, r.coat.i[1]));
    h += '</tbody></table>';
    $('tRes').innerHTML = h;
    tCopy.unshift(['ねじ', name, ''], ['公差域クラス', `${I.name}/${E.name}`, ''], ['めねじの膜厚', `${r.coat.i[0]}〜${r.coat.i[1]}`, 'µm'], ['おねじの膜厚', `${r.coat.e[0]}〜${r.coat.e[1]}`, 'µm']);

    if (r.coated.cmin < creq) {
      // 同じ有効径の等級で、塗装後も組める位置を探す
      const alt = ['g', 'f', 'e'].map(pos => ({ pos, r: FC.threadFit({ d, P, int: ic, ext: { pos, g2: ec.g2, gd: ec.gd }, coat, creq }) }))
        .find(x => !x.r.error && x.r.coated.cmin >= creq && x.pos !== ec.pos && 'hgfe'.indexOf(x.pos) > 'hgfe'.indexOf(ec.pos));
      msgs.push(['err', `× 膜厚が最大のねじどうしを組むと、有効径で ${fU(creq - r.coated.cmin)} µm ${creq > 0 ? '残したいすきまに足りません' : '干渉し、ねじ込めないかゲージが通りません'}。おねじの膜厚を ${fU(Math.max(0, r.allowExt))} µm 以下にするか、${alt ? `${alt.r.ext.name}（塗装後の最小すきま ${fU(alt.r.coated.cmin)} µm）のようにめっき・塗装の分だけ細く仕上げた公差域を使う` : 'めっき・塗装の前のねじを、膜厚の 4 倍だけ有効径を小さく仕上げる'}か、ねじ部をマスキングしてください。`]);
    } else if (coated) {
      msgs.push(['ok', `○ 膜厚が最大でも有効径に ${fU(r.coated.cmin)} µm のすきまが残ります。`]);
    }
    if (r.major.cmin < 0 || r.minor.cmin < 0) msgs.push(['warn', `! ${r.major.cmin < 0 ? '外径' : '内径'}の側でも山と谷が干渉します（${fU(-Math.min(r.major.cmin, r.minor.cmin))} µm）。`]);
    if (coated && r.coat.e[1] > 0) msgs.push(['info', 'めっきしたねじを検査するときは、めっき後に h（めねじは H）の位置の通りゲージが通ることを確かめるのが一般的です（JIS B 1044 / ISO 4042）。']);
    $('tMsgs').innerHTML = msgs.map(([k, x]) => `<div class="msg ${k}">${esc(x)}</div>`).join('');
  }

  function drawRoomTable(P, ec) {
    const R = FC.coatingRoomByPosition(P);
    if (!R) { $('tRoom').innerHTML = ''; return; }
    let h = `<table class="res"><thead><tr><th>ピッチ ${esc(fmt(P, P % 1 ? 2 : 0))} mm</th><th>寸法許容差</th><th>塗れる膜厚</th></tr></thead><tbody>`;
    R.ext.forEach(x => { h += `<tr class="${ec && ec.pos === x.pos ? 'cur' : ''}"><th>おねじ ${x.pos}<small>es</small></th><td>${x.es == null ? '―' : esc(sU(x.es))}<span class="u">${x.es == null ? '' : 'µm'}</span></td><td>${x.room == null ? '定めなし' : esc(fU(x.room))}<span class="u">${x.room == null ? '' : 'µm'}</span></td></tr>`; });
    R.int.forEach(x => { h += `<tr><th>めねじ ${x.pos}<small>EI</small></th><td>${esc(sU(x.EI))}<span class="u">µm</span></td><td>${esc(fU(x.room))}<span class="u">µm</span></td></tr>`; });
    $('tRoom').innerHTML = h + '</tbody></table>';
  }

  function drawThrZone(r, creq) {
    const el = $('tZone');
    const W = el.clientWidth && el.clientWidth < 480 ? 400 : 600, Hh = 320, L = 56, R = 10, T = 24, Bm = 40;
    const I = r.int, E = r.ext, [ti0, ti1] = r.coat.i, [te0, te1] = r.coat.e;
    const rootMax = Math.round(E.es - (r.D1 - r.d3) * 1000); // 内径の基準から見たおねじの谷径の最大（参考値なので µm に丸める）
    // 3 つの径：外径（基準 d）・有効径（基準 d2）・内径（基準 D1）
    const G = [
      { t: '外径', i: { up: null, lo: I.EI }, ic: { up: null, lo: I.EI - 2 * ti1 }, e: { up: E.es, lo: E.es - E.Td }, ec: { up: E.es + 2 * te1, lo: E.es - E.Td + 2 * te0 }, iOpen: 'up', cmin: r.major.cmin },
      { t: '有効径', i: { up: I.EI + I.TD2, lo: I.EI }, ic: { up: I.EI + I.TD2 - 4 * ti0, lo: I.EI - 4 * ti1 }, e: { up: E.es, lo: E.es - E.Td2 }, ec: { up: E.es + 4 * te1, lo: E.es - E.Td2 + 4 * te0 }, cmin: r.coated.cmin, main: true },
      { t: '内径', i: { up: I.EI + I.TD1, lo: I.EI }, ic: { up: I.EI + I.TD1 - 2 * ti0, lo: I.EI - 2 * ti1 }, e: { up: rootMax, lo: null }, ec: { up: rootMax + 2 * te1, lo: null }, eOpen: 'down', cmin: Math.round(r.minor.cmin) }
    ];
    const GS = st.thr.zone === 'all' ? G : [G[1]];
    const vals = [0];
    GS.forEach(g => [g.i, g.ic, g.e, g.ec].forEach(z => { if (z.up != null) vals.push(z.up); if (z.lo != null) vals.push(z.lo); }));
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.1 || 5; lo -= pad; hi += pad;
    const Y = v => T + (hi - v) / (hi - lo) * (Hh - T - Bm);
    const yTop = T + 2, yBot = Hh - Bm - 2;
    let s = svgOpen(W, Hh, 'めねじとおねじの公差域の図') + arrowDef();
    s += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${Hh - T - Bm}" fill="${css('--surface')}" stroke="${css('--line')}"/>`;
    s += yAxis(Y, lo, hi, L, W, R, 'µm');
    const gw = (W - L - R) / GS.length, cw = GS.length > 1 ? Math.min(40, gw * 0.24) : 80;
    GS.forEach((g, k) => {
      const gx = L + gw * k, x1 = gx + gw * (GS.length > 1 ? 0.2 : 0.24), x2 = gx + gw * (GS.length > 1 ? 0.56 : 0.58);
      if (k) s += `<line x1="${gx}" x2="${gx}" y1="${T}" y2="${Hh - Bm}" stroke="${css('--line')}"/>`;
      const bad = g.cmin < creq && g.main || g.cmin < 0, one = GS.length === 1;
      s += gapBand(Y, x1, x2 + cw, x1 + cw, x2, g.ic.lo, g.ec.up, g.cmin, bad, g.cmin < 0 ? `✕ ${one ? '干渉 ' : ''}${fU(-g.cmin)}${one ? ' µm' : ''}` : `${one ? '最小すきま ' : ''}${fU(g.cmin)}${one ? ' µm' : ''}`);
      s += zoneBox(Y, x1, cw, g.ic, g.i, css('--s1'), one ? I.name : '', 'L', { open: g.iOpen, yTop, yBot });
      s += zoneBox(Y, x2, cw, g.ec, g.e, css('--s2'), one ? E.name : '', 'R', { open: g.eOpen, yTop, yBot });
      s += `<text x="${gx + gw / 2}" y="${Hh - Bm + 16}" font-size="12" font-weight="${g.main ? 700 : 400}" fill="${css('--ink')}" text-anchor="middle">${esc(g.t)}</text>`;
      s += `<text x="${x1 + cw / 2}" y="${Hh - Bm + 31}" font-size="10" fill="${css('--ink2')}" text-anchor="middle">めねじ</text><text x="${x2 + cw / 2}" y="${Hh - Bm + 31}" font-size="10" fill="${css('--ink2')}" text-anchor="middle">おねじ</text>`;
    });
    el.innerHTML = s + '</svg>';
  }

  function drawThrList(d, P, ic, coat, creq, ec) {
    const el = $('tListFig');
    const rows = FC.EXT_CLASSES.map(c => ({ c, r: FC.threadFit({ d, P, int: ic, ext: FC.parseThreadClass(c, true), coat, creq }) })).filter(x => !x.r.error);
    if (!rows.length) { el.innerHTML = ''; return; }
    const W = el.clientWidth && el.clientWidth < 480 ? 420 : 560, rh = 22, T = 26, Bm = 36, L = 76, R = 14, Hh = T + rows.length * rh + Bm;
    const vals = rows.flatMap(x => [x.r.bare.cmin, x.r.bare.cmax, x.r.coated.cmin, x.r.coated.cmax]).concat([0, creq]);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.04; lo -= pad; hi += pad;
    const X = v => L + (v - lo) / (hi - lo) * (W - L - R);
    const ink2 = css('--ink2'), nf = NUMF();
    let s = svgOpen(W, Hh, 'ねじの組み合わせ一覧');
    niceTicks(lo, hi, 6).t.forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 4}" y2="${Hh - Bm}" stroke="${v === 0 ? css('--muted') : css('--grid')}" stroke-width="${v === 0 ? 1.4 : 1}"/><text x="${X(v)}" y="${Hh - Bm + 15}" font-size="10.5" fill="${ink2}" text-anchor="middle" font-family="${nf}">${esc(fmt(v, 0))}</text>`; });
    s += `<text x="${W - R}" y="${Hh - 3}" font-size="10.5" fill="${ink2}" text-anchor="end">有効径のすきま [µm]（負は干渉）</text>`;
    if (creq) s += `<line x1="${X(creq)}" x2="${X(creq)}" y1="${T - 4}" y2="${Hh - Bm}" stroke="${css('--ng')}" stroke-dasharray="4 3"/>`;
    rows.forEach((x, i) => {
      const y = T + i * rh, r = x.r, okc = r.coated.cmin >= creq, c = css(okc ? '--s1' : '--s4');
      const cur = ec && FC.parseThreadClass(x.c, true) && x.c === st.thr.ec;
      s += `<g class="pick" data-c="${esc(x.c)}"><rect class="hit" x="0" y="${y}" width="${W}" height="${rh}" fill="${cur ? css('--accent-weak') : 'transparent'}"/>`;
      s += `<text x="10" y="${y + 15}" font-size="12" font-weight="700" fill="${css('--ink')}" font-family="${nf}">${esc(x.c)}</text>`;
      if (!okc) s += `<text x="${L - 8}" y="${y + 15}" font-size="11" font-weight="700" fill="${css('--ng')}" text-anchor="end">✕</text>`;
      s += `<rect x="${X(r.bare.cmin)}" y="${y + 4}" width="${Math.max(1, X(r.bare.cmax) - X(r.bare.cmin))}" height="${rh - 8}" fill="none" stroke="${css('--muted')}" stroke-dasharray="3 2"/>`;
      s += `<rect x="${X(r.coated.cmin)}" y="${y + 6}" width="${Math.max(2, X(r.coated.cmax) - X(r.coated.cmin))}" height="${rh - 12}" fill="${c}" fill-opacity=".85" rx="2"/>`;
      s += `<title>${esc(`${x.c}：有効径のすきま ${sU(r.coated.cmin)}〜${sU(r.coated.cmax)} µm、おねじに塗れる膜厚 ${fU(r.allowExt)} µm`)}</title></g>`;
    });
    s += `<text x="${L - 8}" y="${T - 10}" font-size="10" fill="${css('--ng')}" text-anchor="end">✕ 干渉あり</text>`;
    el.innerHTML = s + '</svg>';
    el.querySelectorAll('.pick').forEach(g => g.addEventListener('click', () => { st.thr.ec = g.dataset.c; fillInputs(); save(); render(); }));
  }

  // ねじとナットの断面（軸を含む断面）。左は実寸の比率、右の円は 1 つのフランクを拡大した図
  // 最も組みにくい状態（めねじの有効径が最小・おねじの有効径が最大・膜厚が最大）で描く
  // 座標は mm。x は軸方向、y は半径方向（有効径の基準の位置を 0、外向きを正）
  function drawThrShape(r, creq) {
    const el = $('tZone');
    const narrow = el.clientWidth && el.clientWidth < 480;
    const W = narrow ? 400 : 600, Hh = narrow ? 270 : 290;
    const P = r.P, H = r.H, tn = Math.tan(Math.PI / 6);
    const te = r.coat.e[1] / 1000, ti = r.coat.i[1] / 1000;          // 膜厚 [mm]
    const se = r.ext.es / 2000, si = r.int.EI / 2000;                // 半径方向のずれ [mm]
    const seL = (r.ext.es - r.ext.Td2) / 2000, siL = (r.int.EI + r.int.TD2) / 2000; // 最小実体
    const yBc = 3 * H / 8, yBr = -H / 3, yNc = -H / 4, yNr = 3 * H / 8; // 山の頂と谷（基準）
    const wBr = P / 4 + (H / 3) * tn;                                  // おねじの谷での山の半幅
    const k0 = -3, k1 = 5;
    const boltPath = sh => {
      let d = `M${k0 * P - P / 2} ${-1.2 * H}`;
      for (let k = k0; k <= k1; k++) {
        d += ` L${k * P - wBr} ${yBr + sh} L${k * P - P / 16} ${yBc + sh} L${k * P + P / 16} ${yBc + sh} L${k * P + wBr} ${yBr + sh}`;
      }
      return d + ` L${k1 * P + P / 2} ${-1.2 * H} Z`;
    };
    const nutPath = sh => {
      let d = `M${k0 * P} ${1.4 * H}`;
      for (let k = k0; k <= k1; k++) {
        const c = k * P + P / 2;
        d += ` L${c - 7 * P / 16} ${yNr + sh} L${c - P / 8} ${yNc + sh} L${c + P / 8} ${yNc + sh} L${c + 7 * P / 16} ${yNr + sh}`;
      }
      return d + ` L${(k1 + 1) * P} ${1.4 * H} Z`;
    };
    const bP = boltPath(se), nP = nutPath(si), bL = boltPath(seL), nL = nutPath(siL);
    const c1 = css('--s1'), c2 = css('--s2'), c3 = css('--s3'), ng = css('--ng'), sf = css('--surface'), ink = css('--ink'), ink2 = css('--ink2'), mut = css('--muted'), nf = NUMF();
    const nsk = 'vector-effect="non-scaling-stroke"';
    const halo = `paint-order="stroke" stroke="${sf}" stroke-width="3.5" stroke-linejoin="round"`;
    // 部品と膜厚と重なりを描く（mm 座標）。hatch：断面のハッチングを付けるか
    const layers = hatch => {
      let s = '';
      // 膜厚：輪郭に幅 2t の線を引き、内側の半分を本体の塗りで隠す
      if (ti > 0) s += `<path d="${nP}" fill="none" stroke="${c3}" stroke-opacity=".75" stroke-width="${2 * ti}" stroke-linejoin="miter"/>`;
      if (te > 0) s += `<path d="${bP}" fill="none" stroke="${c3}" stroke-opacity=".75" stroke-width="${2 * te}" stroke-linejoin="miter"/>`;
      s += `<path d="${nP}" fill="${sf}"/><path d="${nP}" fill="${hatch ? 'url(#fcHatchN)' : c1}" fill-opacity="${hatch ? 1 : .22}" stroke="${c1}" stroke-width="1.6" ${nsk}/>`;
      s += `<path d="${bP}" fill="${sf}"/><path d="${bP}" fill="${hatch ? 'url(#fcHatchB)' : c2}" fill-opacity="${hatch ? 1 : .22}" stroke="${c2}" stroke-width="1.6" ${nsk}/>`;
      // 重なり（干渉）：おねじ（膜厚込み）の形で切り抜いたナット（膜厚込み）を赤で塗る
      s += `<path d="${nP}" fill="${ng}" stroke="${ng}" stroke-width="${2 * ti}" fill-opacity=".9" stroke-opacity=".9" mask="url(#fcMaskB)"/>`;
      // 最小実体の輪郭（有効径が公差の反対側の端のとき）
      s += `<path d="${nL}" fill="none" stroke="${c1}" stroke-width="1" stroke-dasharray="4 3" ${nsk}/><path d="${bL}" fill="none" stroke="${c2}" stroke-width="1" stroke-dasharray="4 3" ${nsk}/>`;
      // 有効径の基準の位置
      s += `<line x1="${k0 * P}" x2="${k1 * P}" y1="0" y2="0" stroke="${ink2}" stroke-width="1" stroke-dasharray="7 3 1.5 3" ${nsk}/>`;
      return s;
    };

    // ---- 配置 ----
    const sx0 = 8, sx1 = narrow ? 250 : 380, sy0 = 26, sy1 = Hh - 26;   // 断面図の枠（px）
    const xa = -0.55 * P, xb = 1.75 * P, ya = -0.62 * H, yb = 0.78 * H; // 見せる範囲（mm）
    const sc = Math.min((sx1 - sx0) / (xb - xa), (sy1 - sy0) / (yb - ya));
    const ox = sx0 + ((sx1 - sx0) - (xb - xa) * sc) / 2 - xa * sc, oy = sy0 + ((sy1 - sy0) - (yb - ya) * sc) / 2 + yb * sc;
    const T = `translate(${ox} ${oy}) scale(${sc} ${-sc})`;
    const toPx = (x, y) => [ox + x * sc, oy - y * sc];

    // 拡大の中心：おねじの山 0 の右のフランクが有効径の基準を横切る点
    const fx = P / 4, fy = 0;
    // 拡大の半径（mm）：フランクのずれと膜厚がちょうど収まる大きさ
    const feat = Math.max(Math.abs(r.ext.es) / 4 + r.coat.e[1], r.int.EI / 4 + r.coat.i[1], Math.abs(r.coated.cmin) / 4, 4) / 1000;
    const Rz = feat * 3.2;
    const zr = narrow ? 66 : 92, zcx = narrow ? W - zr - 10 : W - zr - 28, zcy = Hh / 2 - 6;
    const zs = zr / Rz, mag = zs / sc;
    const TZ = `translate(${zcx - fx * zs} ${zcy + fy * zs}) scale(${zs} ${-zs})`;

    let s = svgOpen(W, Hh, 'ねじとナットの断面の図') + arrowDef();
    // 定義：ハッチング、切り抜き、重なりのマスク（すべて mm 座標）
    const hs = P / 14;
    s += `<defs>
      <pattern id="fcHatchN" patternUnits="userSpaceOnUse" width="${hs}" height="${hs}" patternTransform="rotate(45)"><rect width="${hs}" height="${hs}" fill="${c1}" fill-opacity=".14"/><line x1="0" y1="0" x2="0" y2="${hs}" stroke="${c1}" stroke-opacity=".55" stroke-width="${hs * 0.12}"/></pattern>
      <pattern id="fcHatchB" patternUnits="userSpaceOnUse" width="${hs}" height="${hs}" patternTransform="rotate(-45)"><rect width="${hs}" height="${hs}" fill="${c2}" fill-opacity=".14"/><line x1="0" y1="0" x2="0" y2="${hs}" stroke="${c2}" stroke-opacity=".55" stroke-width="${hs * 0.12}"/></pattern>
      <mask id="fcMaskB" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${k0 * P - P}" y="${-2 * H}" width="${(k1 - k0 + 2) * P}" height="${4 * H}"><path d="${bP}" fill="#fff" stroke="#fff" stroke-width="${2 * te}" stroke-linejoin="miter"/></mask>
      <clipPath id="fcClipS" clipPathUnits="userSpaceOnUse"><rect x="${xa}" y="${ya}" width="${xb - xa}" height="${yb - ya}"/></clipPath>
      <clipPath id="fcClipZ" clipPathUnits="userSpaceOnUse"><circle cx="${fx}" cy="${fy}" r="${Rz}"/></clipPath>
    </defs>`;
    // 断面図
    const [bx0, by0] = toPx(xa, yb), [bx1, by1] = toPx(xb, ya);
    s += `<rect x="${bx0}" y="${by0}" width="${bx1 - bx0}" height="${by1 - by0}" fill="${sf}" stroke="${css('--line')}"/>`;
    s += `<g transform="${T}"><g clip-path="url(#fcClipS)">${layers(true)}</g></g>`;
    s += `<text x="${bx0 + 8}" y="${by0 + 18}" font-size="12.5" font-weight="700" fill="${ink}" ${halo}>ナット（めねじ ${esc(r.int.name)}）</text>`;
    s += `<text x="${bx0 + 8}" y="${by1 - 10}" font-size="12.5" font-weight="700" fill="${ink}" ${halo}>ボルト（おねじ ${esc(r.ext.name)}）</text>`;
    const [lx, ly] = toPx(xa, 0);
    s += `<text x="${lx + 6}" y="${ly - 5}" font-size="10.5" fill="${ink2}" ${halo}>有効径（基準）</text>`;
    s += `<text x="${bx0}" y="${by0 - 8}" font-size="10.5" fill="${mut}">軸を含む断面（P ${esc(fmt(P, P % 1 ? 2 : 0))} mm、実寸の比率）</text>`;
    // 拡大の目印と引出線
    const [px, py] = toPx(fx, fy), pr = Math.max(7, Rz * sc);
    const ang = Math.atan2(zcy - py, zcx - px);
    s += `<circle cx="${px}" cy="${py}" r="${pr}" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    s += `<line x1="${px + pr * Math.cos(ang)}" y1="${py + pr * Math.sin(ang)}" x2="${zcx - zr * Math.cos(ang)}" y2="${zcy - zr * Math.sin(ang)}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3"/>`;
    // 拡大図
    s += `<circle cx="${zcx}" cy="${zcy}" r="${zr}" fill="${sf}"/>`;
    s += `<g transform="${TZ}"><g clip-path="url(#fcClipZ)">${layers(false)}`;
    // 基準のフランクの線（膜厚・寸法差がないときの位置）
    const fl = (x0, y0, sgn) => `<line x1="${x0 - sgn * 2 * Rz * tn}" y1="${y0 - 2 * Rz}" x2="${x0 + sgn * 2 * Rz * tn}" y2="${y0 + 2 * Rz}" stroke="${mut}" stroke-width="1" stroke-dasharray="2 3" ${nsk}/>`;
    s += fl(P / 4, 0, -1) + `</g></g>`;
    s += `<circle cx="${zcx}" cy="${zcy}" r="${zr}" fill="none" stroke="${ink}" stroke-width="1.6"/>`;
    // 拡大図の中の名前
    const zp = (x, y) => [zcx + (x - fx) * zs, zcy - (y - fy) * zs];
    const [nx, ny] = zp(fx + 0.5 * Rz, fy + 0.42 * Rz), [bx2, by2] = zp(fx - 0.5 * Rz, fy - 0.12 * Rz);
    s += `<text x="${nx}" y="${ny}" font-size="11.5" font-weight="700" fill="${ink}" text-anchor="middle" ${halo}>ナット</text><text x="${bx2}" y="${by2}" font-size="11.5" font-weight="700" fill="${ink}" text-anchor="middle" ${halo}>ボルト</text>`;
    // 目盛（µm）
    const barUm = [1, 2, 5, 10, 20, 50, 100].find(v => v / 1000 * zs >= zr * 0.35) || 100;
    const bw = barUm / 1000 * zs, bx = zcx - bw / 2, by = zcy + zr - 16;
    s += `<line x1="${bx}" x2="${bx + bw}" y1="${by}" y2="${by}" stroke="${ink}" stroke-width="2"/><line x1="${bx}" x2="${bx}" y1="${by - 4}" y2="${by + 4}" stroke="${ink}"/><line x1="${bx + bw}" x2="${bx + bw}" y1="${by - 4}" y2="${by + 4}" stroke="${ink}"/>`;
    s += `<text x="${zcx}" y="${by - 6}" font-size="10.5" fill="${ink}" text-anchor="middle" font-family="${nf}" ${halo}>${barUm} µm</text>`;
    s += `<text x="${zcx}" y="${zcy - zr - 8}" font-size="11" fill="${ink2}" text-anchor="middle">フランクを拡大（×${esc(fmt(mag, 0))}）</text>`;
    // フランクのすきま（法線方向）= 有効径のすきま ÷ 4
    const g = r.coated.cmin / 4, bad = r.coated.cmin < creq;
    s += `<text x="${zcx}" y="${zcy + zr + 18}" font-size="12" font-weight="700" fill="${bad ? ng : ink}" text-anchor="middle">${esc(g < 0 ? `✕ フランクが ${fU(-g)} µm 重なる` : `フランクのすきま ${fU(g)} µm`)}</text>`;
    el.innerHTML = s + '</svg>';
  }

  // ねじの図の切り替え
  function drawThrFigure(r, creq) {
    const shape = st.thr.zone === 'shape' || !st.thr.zone;
    $('tFigTitle').textContent = shape ? 'ねじとナットの断面' : '公差域の図';
    $('tLegend').innerHTML = shape
      ? `<span style="--c:var(--s1)">ナット（めねじ）</span><span style="--c:var(--s2)">ボルト（おねじ）</span><span style="--c:var(--s3)">膜厚</span><span style="--c:var(--ng)">重なり（干渉）</span><span class="dash" style="--c:var(--muted)">有効径が反対の端のとき</span>`
      : `<span style="--c:var(--s1)">めねじ（塗装後）</span><span style="--c:var(--s2)">おねじ（塗装後）</span><span class="dash" style="--c:var(--muted)">塗装前</span>`;
    $('tFigHint').textContent = shape
      ? '最も組みにくい状態（めねじの有効径が最小、おねじの有効径が最大、膜厚が最大）で描いています。破線は有効径が公差の反対の端（最もゆるい側）のときです。フランクのすきまは有効径のすきまの 1/4 で、ここに両方の膜厚が入ります。'
      : 'それぞれの径の基準寸法からの寸法許容差 [µm] です。ねじのはめあいを決めるのは有効径です。外径・内径も出すと、めねじの谷の径の最大と、おねじの谷の径の最小は規格で定めていないので、上下に開いた形で描きます。';
    if (shape) drawThrShape(r, creq); else drawThrZone(r, creq);
  }

  // 計算のしかたの図：フランク面の膜厚 t で、山が半径方向に 2t 太り、有効径が 4t 変わる
  function drawHowto() {
    const W = 460, H = 200, ink = css('--ink'), ink2 = css('--ink2'), c2 = css('--s2'), mut = css('--muted'), nf = NUMF();
    const tn = Math.tan(Math.PI / 6), base = 170, top = 60, x0 = 60;
    const xt = x0 + (base - top) * tn, xr = xt + (base - top) * tn, t = 12; // t は誇張した膜厚
    let s = svgOpen(W, H, '膜厚と有効径の関係の図') + arrowDef();
    // 塗装後の山（元の山を半径方向に 2t ずらした形）
    s += `<polygon points="${x0 - 2 * t * tn},${base} ${xt},${top - 2 * t} ${xr + 2 * t * tn},${base}" fill="${c2}" fill-opacity=".3" stroke="${c2}" stroke-width="1.5"/>`;
    s += `<polygon points="${x0},${base} ${xt},${top} ${xr},${base}" fill="${css('--surface')}" stroke="${ink}" stroke-width="1.6"/>`;
    s += `<line x1="${x0 - 40}" x2="${xr + 40}" y1="${base}" y2="${base}" stroke="${mut}"/>`;
    // 法線方向の t（左のフランクの中ほど）
    const ym = (base + top) / 2, xm = x0 + (base - ym) * tn, nx = -Math.cos(Math.PI / 6), ny = -Math.sin(Math.PI / 6);
    s += `<line x1="${xm}" y1="${ym}" x2="${xm + t * nx}" y2="${ym + t * ny}" stroke="${ink}" stroke-width="1.3"/>`;
    s += `<text x="${xm + t * nx - 5}" y="${ym + t * ny + 2}" font-size="13" fill="${ink}" text-anchor="end" font-family="${nf}">t</text>`;
    // 半径方向の 2t（頂の右）
    const xd = xt + 26;
    s += `<line x1="${xt + 4}" x2="${xd + 6}" y1="${top}" y2="${top}" stroke="${mut}"/><line x1="${xt + 4}" x2="${xd + 6}" y1="${top - 2 * t}" y2="${top - 2 * t}" stroke="${mut}"/>`;
    s += `<line x1="${xd}" x2="${xd}" y1="${top - 2 * t + 1}" y2="${top - 1}" stroke="${ink}" stroke-width="1.2" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
    s += `<text x="${xd + 8}" y="${top - t + 4}" font-size="13" fill="${ink}" font-family="${nf}">2t</text>`;
    s += `<line x1="${x0 - 40}" x2="${xr + 40}" y1="${ym}" y2="${ym}" stroke="${mut}" stroke-dasharray="5 3"/><text x="${xr + 40}" y="${ym - 5}" font-size="10.5" fill="${mut}" text-anchor="end">有効径の位置</text>`;
    s += `<text x="${xt}" y="${base - 10}" font-size="11" fill="${ink2}" text-anchor="middle">60°</text>`;
    const tx = 250;
    s += `<text x="${tx}" y="60" font-size="12" fill="${ink}">フランクに直角に t 付くと、</text>`;
    s += `<text x="${tx}" y="80" font-size="12" fill="${ink}">山は半径方向に t ÷ sin 30° = 2t 太る</text>`;
    s += `<text x="${tx}" y="108" font-size="12.5" font-weight="700" fill="${ink}">有効径は両側で 4t 変わる</text>`;
    s += `<text x="${tx}" y="130" font-size="11" fill="${ink2}">外径・内径（円筒面）は 2t</text>`;
    s += `<text x="${tx}" y="150" font-size="11" fill="${ink2}">平行部のはめあいも 2t</text>`;
    $('howtoFig').innerHTML = s + '</svg>';
  }
  // ---- 表示の切り替え ----
  function render() {
    segUpd.forEach(f => f());
    $('fitPanel').hidden = st.mode !== 'fit'; $('thrPanel').hidden = st.mode !== 'thr';
    if (st.mode === 'fit') renderFit(); else renderThr();
    drawHowto();
  }

  function copyRows(rows) {
    if (!rows.length) { toast('先に正しい値を入れてください'); return; }
    const text = rows.map(r => r.join('\t')).join('\n');
    const done = () => toast('コピーしました。Excel に貼り付けられます');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* 失敗 */ }
      ta.remove(); toast(ok ? 'コピーしました。Excel に貼り付けられます' : 'コピーできませんでした。表を選んでコピーしてください');
    }
  }
  $('fCopy').addEventListener('click', () => copyRows(fCopy));
  $('tCopy').addEventListener('click', () => copyRows(tCopy));

  // ---- テーマ（QC Workbench の全ツールで共通のキー） ----
  const THEMES = ['auto', 'light', 'dark'], THEME_LABEL = { auto: '表示：自動', light: '表示：ライト', dark: '表示：ダーク' }, THEME_KEY = 'qc-workbench-theme';
  const readTheme = () => { try { const t = localStorage.getItem(THEME_KEY); return THEMES.includes(t) ? t : 'auto'; } catch (e) { return 'auto'; } };
  let theme = readTheme();
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
    $('themeBtn').textContent = THEME_LABEL[t];
  }
  $('themeBtn').addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % 3];
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 保存できない環境 */ }
    applyTheme(theme);
  });
  window.addEventListener('storage', e => { if (e.key === THEME_KEY || e.key === null) { theme = readTheme(); applyTheme(theme); } });
  applyTheme(theme);
  // テーマが変わったら図の色を描き直す
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => render());
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());

  // ---- 初期表示 ----
  fillInputs(); render();

  // ---- オフライン対応 ----
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing; if (!w) return;
          w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('新しい版を取り込みました。開き直すと反映されます'); });
        });
      }).catch(() => { /* 登録できない環境 */ });
    });
  }
})();
