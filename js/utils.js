/* ============================================================
   utils.js — formatting, DOM helpers, dates
   ============================================================ */
(function (w) {
  const U = {};

  U.uid = () => 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  U.brl = (n) =>
    (n < 0 ? '-' : '') +
    'R$ ' +
    Math.abs(Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  U.brlShort = (n) => {
    const a = Math.abs(n);
    const s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return s + 'R$ ' + (a / 1e3).toFixed(1) + 'k';
    return s + 'R$ ' + a.toFixed(0);
  };

  U.pct = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  U.MONTHS = MONTHS;
  U.MONTHS_FULL = MONTHS_FULL;

  U.today = () => new Date();
  U.iso = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
  U.ymKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
  U.monthLabel = (ym) => { const [y, m] = ym.split('-'); return MONTHS[+m - 1] + '/' + y.slice(2); };

  U.fmtDate = (d) => {
    const x = new Date(d);
    return String(x.getDate()).padStart(2, '0') + ' ' + MONTHS[x.getMonth()] + ' ' + x.getFullYear();
  };
  U.fmtDateShort = (d) => {
    const x = new Date(d);
    return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0');
  };
  U.daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  U.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  U.startOfMonth = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), 1); };
  U.endOfMonth = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth() + 1, 0); };

  // DOM helpers
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.el = (tag, props = {}, children) => {
    const e = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'html') e.innerHTML = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.startsWith('on') && typeof props[k] === 'function') e.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(e.style, props[k]);
      else if (props[k] != null) e.setAttribute(k, props[k]);
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  U.sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);

  // animate a number in an element
  U.animateCount = (elm, to, opts = {}) => {
    const dur = opts.dur || 900;
    const fmt = opts.fmt || U.brl;
    const from = opts.from || 0;
    const start = performance.now();
    function frame(t) {
      const p = U.clamp((t - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      elm.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // debounce
  U.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  U.download = (filename, content, mime = 'text/plain') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  w.U = U;
})(window);
