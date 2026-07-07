/* ============================================================
   charts.js — lightweight animated SVG charts (no dependencies)
   Follows dataviz specs: thin marks, rounded data-ends, 2px gaps,
   hover tooltips, legend for >=2 series, recessive grid.
   Palette: validated categorical slots (CVD-safe).
   ============================================================ */
(function (w) {
  const U = w.U;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  function tip() {
    let t = document.getElementById('chartTip');
    if (!t) {
      t = U.el('div', { id: 'chartTip', style: {
        position: 'fixed', zIndex: 100, pointerEvents: 'none', padding: '8px 11px', borderRadius: '10px',
        font: '600 12.5px var(--font)', background: 'var(--surface-solid)', color: 'var(--ink)',
        border: '1px solid var(--border-strong)', boxShadow: '0 10px 30px -10px rgba(0,0,0,.5)', opacity: 0,
        transition: 'opacity .12s', maxWidth: '240px'
      } });
      document.body.appendChild(t);
    }
    return t;
  }
  function showTip(html, x, y) { const t = tip(); t.innerHTML = html; t.style.opacity = 1; t.style.left = Math.min(x + 14, innerWidth - 250) + 'px'; t.style.top = (y - 10) + 'px'; }
  function hideTip() { tip().style.opacity = 0; }

  const Charts = {};

  /* ---------- Donut / Pie (categorical identity) ---------- */
  Charts.donut = function (host, data, opts = {}) {
    host.innerHTML = '';
    const size = opts.size || 220, r = size / 2, inner = opts.inner != null ? opts.inner : r * 0.62;
    const realTotal = U.sum(data, (d) => d.value); // valor exibido (pode ser 0)
    const total = realTotal || 1;                  // guarda contra divisão por zero na geometria
    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart-svg', style: `max-width:${size}px;margin:auto` });
    const cx = r, cy = r;
    let a0 = -Math.PI / 2;
    const gap = 0.03; // radians ~ 2px surface gap
    data.forEach((d, i) => {
      const frac = d.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      const path = arc(cx, cy, r - 4, inner, a0 + gap / 2, a1 - gap / 2);
      const p = el('path', { d: path, fill: d.color, opacity: 0 });
      p.style.transition = 'opacity .5s, transform .2s'; p.style.transformOrigin = `${cx}px ${cy}px`;
      p.addEventListener('mousemove', (e) => { p.style.transform = 'scale(1.03)'; showTip(`<b>${U.esc(d.label)}</b><br>${U.brl(d.value)} · ${U.pct(frac * 100)}`, e.clientX, e.clientY); });
      p.addEventListener('mouseleave', () => { p.style.transform = 'scale(1)'; hideTip(); });
      svg.appendChild(p);
      setTimeout(() => (p.style.opacity = 1), 40 * i);
      a0 = a1;
    });
    // center label
    const cLabel = el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 20, 'font-weight': 800 });
    cLabel.textContent = opts.centerTop || U.brlShort(realTotal);
    const cSub = el('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 11 });
    cSub.textContent = opts.centerSub || 'Total';
    if (inner > 0) { svg.appendChild(cLabel); svg.appendChild(cSub); }
    host.appendChild(svg);

    function arc(cx, cy, ro, ri, s, e) {
      const x0 = cx + ro * Math.cos(s), y0 = cy + ro * Math.sin(s);
      const x1 = cx + ro * Math.cos(e), y1 = cy + ro * Math.sin(e);
      const xi1 = cx + ri * Math.cos(e), yi1 = cy + ri * Math.sin(e);
      const xi0 = cx + ri * Math.cos(s), yi0 = cy + ri * Math.sin(s);
      const large = e - s > Math.PI ? 1 : 0;
      if (ri <= 0) return `M${cx} ${cy} L${x0} ${y0} A${ro} ${ro} 0 ${large} 1 ${x1} ${y1} Z`;
      return `M${x0} ${y0} A${ro} ${ro} 0 ${large} 1 ${x1} ${y1} L${xi1} ${yi1} A${ri} ${ri} 0 ${large} 0 ${xi0} ${yi0} Z`;
    }
  };

  /* ---------- Bars (magnitude, grouped income/expense) ---------- */
  Charts.bars = function (host, series, opts = {}) {
    host.innerHTML = '';
    const W = opts.width || 640, H = opts.height || 240, pad = { l: 44, r: 12, t: 14, b: 26 };
    const groups = series.labels.length;
    const max = Math.max(1, ...series.sets.flatMap((s) => s.values));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg' });
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    // gridlines
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + ih - (ih * i / ticks);
      svg.appendChild(el('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, class: 'grid-line' }));
      const lab = el('text', { x: pad.l - 8, y: y + 3, 'text-anchor': 'end', class: 'axis-label' });
      lab.textContent = U.brlShort(max * i / ticks); svg.appendChild(lab);
    }
    const gw = iw / groups;
    const nSets = series.sets.length;
    const bw = Math.min(26, (gw * 0.62) / nSets);
    series.labels.forEach((lab, gi) => {
      const gx = pad.l + gi * gw + gw / 2;
      series.sets.forEach((s, si) => {
        const v = s.values[gi];
        const h = (v / max) * ih;
        const x = gx - (nSets * bw + (nSets - 1) * 2) / 2 + si * (bw + 2);
        const rect = el('rect', { x, y: pad.t + ih, width: bw, height: 0, rx: 4, fill: s.color });
        rect.style.transition = 'height .6s var(--ease), y .6s var(--ease), opacity .2s';
        rect.addEventListener('mousemove', (e) => { rect.style.opacity = .82; showTip(`<b>${U.esc(s.name)}</b> · ${U.esc(lab)}<br>${U.brl(v)}`, e.clientX, e.clientY); });
        rect.addEventListener('mouseleave', () => { rect.style.opacity = 1; hideTip(); });
        svg.appendChild(rect);
        setTimeout(() => { rect.setAttribute('height', Math.max(0, h)); rect.setAttribute('y', pad.t + ih - h); }, 30 * gi + 80 * si);
      });
      const xl = el('text', { x: gx, y: H - 8, 'text-anchor': 'middle', class: 'axis-label' });
      xl.textContent = lab; svg.appendChild(xl);
    });
    host.appendChild(svg);
  };

  /* ---------- Line / area (change over time) ---------- */
  Charts.line = function (host, series, opts = {}) {
    host.innerHTML = '';
    const W = opts.width || 640, H = opts.height || 240, pad = { l: 46, r: 14, t: 14, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = series.labels.length;
    const allv = series.sets.flatMap((s) => s.values);
    const max = Math.max(1, ...allv), min = Math.min(0, ...allv);
    const X = (i) => pad.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
    const Y = (v) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg' });
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + ih - (ih * i / ticks);
      svg.appendChild(el('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y, class: 'grid-line' }));
      const lab = el('text', { x: pad.l - 8, y: y + 3, 'text-anchor': 'end', class: 'axis-label' });
      lab.textContent = U.brlShort(min + (max - min) * i / ticks); svg.appendChild(lab);
    }
    series.labels.forEach((lab, i) => { const xl = el('text', { x: X(i), y: H - 8, 'text-anchor': 'middle', class: 'axis-label' }); xl.textContent = lab; svg.appendChild(xl); });

    series.sets.forEach((s, si) => {
      let dLine = '', dArea = '';
      s.values.forEach((v, i) => { const x = X(i), y = Y(v); dLine += (i ? 'L' : 'M') + x + ' ' + y + ' '; });
      dArea = dLine + `L${X(n - 1)} ${pad.t + ih} L${X(0)} ${pad.t + ih} Z`;
      if (opts.area && si === 0) {
        const gid = 'g' + Math.random().toString(36).slice(2, 7);
        const grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
        grad.appendChild(el('stop', { offset: '0%', 'stop-color': s.color, 'stop-opacity': .28 }));
        grad.appendChild(el('stop', { offset: '100%', 'stop-color': s.color, 'stop-opacity': 0 }));
        svg.appendChild(grad);
        svg.appendChild(el('path', { d: dArea, fill: `url(#${gid})` }));
      }
      const path = el('path', { d: dLine, class: 'series-line', stroke: s.color });
      svg.appendChild(path);
      const len = path.getTotalLength ? path.getTotalLength() : 1000;
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      path.style.transition = 'stroke-dashoffset 1s var(--ease)';
      setTimeout(() => (path.style.strokeDashoffset = 0), 60 + si * 120);
      // points + hover
      s.values.forEach((v, i) => {
        const c = el('circle', { cx: X(i), cy: Y(v), r: 4.5, fill: 'var(--surface-solid)', stroke: s.color, 'stroke-width': 2.5 });
        c.style.cursor = 'pointer';
        c.addEventListener('mousemove', (e) => { c.setAttribute('r', 6.5); showTip(`<b>${U.esc(s.name)}</b> · ${U.esc(series.labels[i])}<br>${U.brl(v)}`, e.clientX, e.clientY); });
        c.addEventListener('mouseleave', () => { c.setAttribute('r', 4.5); hideTip(); });
        svg.appendChild(c);
      });
    });
    host.appendChild(svg);
  };

  /* ---------- Sparkline ---------- */
  Charts.spark = function (host, values, color) {
    host.innerHTML = '';
    const W = 120, H = 38, pad = 3;
    const max = Math.max(...values), min = Math.min(...values);
    const X = (i) => pad + (i * (W - 2 * pad)) / (values.length - 1);
    const Y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'spark', preserveAspectRatio: 'none' });
    let d = '';
    values.forEach((v, i) => (d += (i ? 'L' : 'M') + X(i) + ' ' + Y(v) + ' '));
    svg.appendChild(el('path', { d, fill: 'none', stroke: color || 'var(--neon-green)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    svg.appendChild(el('circle', { cx: X(values.length - 1), cy: Y(values[values.length - 1]), r: 3, fill: color || 'var(--neon-green)' }));
    host.appendChild(svg);
  };

  w.Charts = Charts;
})(window);
