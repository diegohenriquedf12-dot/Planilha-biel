/* ============================================================
   app.js — application shell, routing, views, interactions
   ============================================================ */
(function (w) {
  const U = w.U, Store = w.Store, Charts = w.Charts, Auth = w.Auth, AI = w.AI;
  const $ = U.$, el = U.el;

  const App = {
    route: 'dashboard',
    filters: { period: U.ymKey(new Date()), category: 'all', method: 'all', q: '' },
  };

  const ICONS = ['🍽️','🏠','🚗','💊','🎮','📚','🛍️','📺','💼','✨','📈','💰','🎁','✈️','🚙','💻','📱','☕','⚽','🎓','🐶','💡','🔧','🎵','💳','🏥','👕','🍺','🎬','📦'];
  const COLORS = ['#23f0a6','#38bdf8','#4f8bff','#9085e9','#e66767','#c98500','#199e70','#d55181','#d95926','#008300','#3987e5','#fab219'];

  const NAV = [
    { group: 'Principal' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'transactions', icon: '💸', label: 'Lançamentos' },
    { id: 'calendar', icon: '📅', label: 'Calendário' },
    { group: 'Gestão' },
    { id: 'accounts', icon: '🧾', label: 'Contas' },
    { id: 'cards', icon: '💳', label: 'Cartões' },
    { id: 'subscriptions', icon: '📺', label: 'Assinaturas' },
    { id: 'budget', icon: '🎯', label: 'Orçamento' },
    { group: 'Planejar' },
    { id: 'goals', icon: '🏆', label: 'Metas' },
    { id: 'reserve', icon: '🛡️', label: 'Reserva' },
    { id: 'planning', icon: '🗓️', label: 'Planejamento' },
    { id: 'simulator', icon: '🧮', label: 'Simulador' },
    { group: 'Insights' },
    { id: 'reports', icon: '📑', label: 'Relatórios' },
    { id: 'achievements', icon: '🎖️', label: 'Conquistas' },
    { id: 'settings', icon: '⚙️', label: 'Configurações' },
  ];

  /* =========================================================
     Boot
     ========================================================= */
  function boot() {
    const saved = localStorage.getItem('neofin:theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    setTimeout(() => {
      $('#splash').classList.add('fade');
      setTimeout(() => { $('#splash').classList.add('hidden'); }, 500);
      const sess = Auth.current();
      if (sess) enterApp(sess); else showAuth();
    }, 1100);
    wireGlobal();
  }

  /* =========================================================
     Auth screen
     ========================================================= */
  let authMode = 'login';
  function showAuth() {
    $('#auth').classList.remove('hidden');
    $('#app').classList.add('hidden');
  }
  function wireAuth() {
    const form = $('#loginForm');
    $('#switchAuth').addEventListener('click', (e) => {
      e.preventDefault();
      authMode = authMode === 'login' ? 'register' : 'login';
      $('#authTitle').textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
      $('#authSubmit').textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
      $('#switchText').textContent = authMode === 'login' ? 'Não tem conta?' : 'Já tem conta?';
      $('#switchAuth').textContent = authMode === 'login' ? 'Criar agora' : 'Entrar';
      $('#nameField').style.display = authMode === 'register' ? 'block' : 'none';
      $('#authError').textContent = '';
    });
    $('#demoLogin').addEventListener('click', () => enterApp(Auth.demo()));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      $('#authError').textContent = '';
      const name = $('#authName').value, email = $('#authEmail').value, pass = $('#authPass').value;
      try {
        const u = authMode === 'login' ? await Auth.login(email, pass) : await Auth.register(name, email, pass);
        enterApp(Auth.current());
      } catch (err) { $('#authError').textContent = err.message; }
    });
  }

  function enterApp(session) {
    Store.load(session.email);
    if (session.name && Store.data.profile) {
      if (!Store.data.profile.name) Store.data.profile.name = session.name;
    }
    // apply saved theme from data
    const th = Store.data.settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', th);
    localStorage.setItem('neofin:theme', th);

    $('#auth').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderNav();
    updateUserChip();
    checkAchievements(true);
    runAlertScan();
    go('dashboard');
  }

  function updateUserChip() {
    const p = Store.data.profile;
    const sess = Auth.current();
    $('#userName').textContent = p.name;
    $('#userEmail').textContent = sess ? sess.email : '';
    $('#userAvatar').textContent = (p.name || 'U').charAt(0).toUpperCase();
  }

  /* =========================================================
     Navigation
     ========================================================= */
  function renderNav() {
    const nav = $('#nav');
    nav.innerHTML = '';
    NAV.forEach((n) => {
      if (n.group) { nav.appendChild(el('div', { class: 'nav-group', text: n.group })); return; }
      const item = el('div', { class: 'nav-item' + (App.route === n.id ? ' active' : ''), 'data-route': n.id }, [
        el('span', { class: 'ni-ico', text: n.icon }), el('span', { text: n.label }),
      ]);
      item.addEventListener('click', () => { go(n.id); closeNav(); });
      nav.appendChild(item);
    });
  }

  function go(route) {
    App.route = route;
    U.$$('.nav-item').forEach((i) => i.classList.toggle('active', i.dataset.route === route));
    const view = $('#view');
    view.style.animation = 'none'; view.offsetHeight; view.style.animation = '';
    (VIEWS[route] || VIEWS.dashboard)(view);
    view.scrollIntoView({ block: 'start' });
  }

  function closeNav() { $('#app').classList.remove('nav-open'); }

  /* =========================================================
     Global wiring
     ========================================================= */
  function wireGlobal() {
    wireAuth();
    $('#menuBtn').addEventListener('click', () => $('#app').classList.add('nav-open'));
    $('#sidebarClose').addEventListener('click', closeNav);
    $('#scrim').addEventListener('click', closeNav);
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#quickAdd').addEventListener('click', () => txModal());
    $('#userChip').addEventListener('click', () => go('settings'));
    $('#notifBtn').addEventListener('click', toggleNotif);
    $('#modalScrim').addEventListener('click', closeModal);
    // global search
    const gs = $('#globalSearch');
    gs.addEventListener('input', U.debounce(() => doSearch(gs.value), 180));
    gs.addEventListener('blur', () => setTimeout(() => $('#searchResults').classList.remove('show'), 180));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('#notifPanel').hidden = true; } });
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('neofin:theme', next);
    if (Store.data) { Store.data.settings.theme = next; Store.save(); }
    // re-render to refresh chart colors
    go(App.route);
  }

  /* =========================================================
     Toasts & notifications
     ========================================================= */
  function toast(title, sub, tone = 'good') {
    const tones = { good: ['tone-green', '✓'], info: ['tone-blue', 'ℹ️'], warn: ['tone-amber', '⚠️'], bad: ['tone-red', '✕'] };
    const [cls, ic] = tones[tone] || tones.good;
    const t = el('div', { class: 'toast' }, [
      el('div', { class: 't-ic ' + cls, text: ic }),
      el('div', {}, [el('b', { text: title }), sub ? el('small', { text: sub }) : null]),
    ]);
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  function toggleNotif() {
    const panel = $('#notifPanel');
    if (!panel.hidden) { panel.hidden = true; return; }
    const notifs = Store.data.notifications;
    panel.innerHTML = '';
    if (!notifs.length) panel.appendChild(el('div', { class: 'empty', html: '<span class="e-ic">🔕</span>Nenhuma notificação' }));
    else notifs.forEach((n) => {
      panel.appendChild(el('div', { class: 'notif-item' }, [
        el('div', { class: 'ni-ic ' + (n.tone === 'bad' ? 'tone-red' : n.tone === 'warn' ? 'tone-amber' : 'tone-blue'), text: n.icon || '🔔' }),
        el('div', {}, [el('b', { text: n.title }), el('small', { text: n.sub || '' })]),
      ]));
    });
    notifs.forEach((n) => (n.read = true)); Store.save();
    $('#notifDot').hidden = true;
    panel.hidden = false;
  }

  function runAlertScan() {
    const alerts = AI.alerts();
    // record any new alerts as notifications (dedupe by title within session)
    const existing = new Set(Store.data.notifications.map((n) => n.title));
    let added = 0;
    alerts.forEach((a) => { if (!existing.has(a.title)) { Store.pushNotif(a); added++; } });
    if (Store.data.notifications.some((n) => !n.read)) $('#notifDot').hidden = false;
  }

  /* =========================================================
     Modals
     ========================================================= */
  function openModal(node) {
    const host = $('#modalHost'), m = $('#modal');
    m.innerHTML = '';
    m.appendChild(el('button', { class: 'icon-btn modal-close', text: '✕', onclick: closeModal }));
    m.appendChild(node);
    host.hidden = false;
  }
  function closeModal() { $('#modalHost').hidden = true; }

  /* =========================================================
     Search
     ========================================================= */
  function doSearch(q) {
    const box = $('#searchResults');
    q = q.trim().toLowerCase();
    if (!q) { box.classList.remove('show'); return; }
    const res = Store.data.transactions.filter((t) =>
      (t.description || '').toLowerCase().includes(q) ||
      Store.cat(t.categoryId).name.toLowerCase().includes(q) ||
      (t.method || '').toLowerCase().includes(q)
    ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    box.innerHTML = '';
    if (!res.length) { box.appendChild(el('div', { class: 'sr-item', html: '<span class="muted">Nada encontrado</span>' })); }
    res.forEach((t) => {
      const c = Store.cat(t.categoryId);
      const item = el('div', { class: 'sr-item' }, [
        el('span', {}, [el('b', { text: (c.icon + ' ' + t.description) }), el('br'), el('small', { class: 'muted', text: c.name + ' · ' + U.fmtDate(t.date) })]),
        el('span', { class: t.type === 'income' ? 'amt-in' : 'amt-out', text: (t.type === 'income' ? '+' : '-') + U.brl(t.amount) }),
      ]);
      item.addEventListener('mousedown', () => { $('#globalSearch').value = ''; box.classList.remove('show'); go('transactions'); setTimeout(() => txModal(t), 100); });
      box.appendChild(item);
    });
    box.classList.add('show');
  }

  /* =========================================================
     Reusable UI bits
     ========================================================= */
  function pageHead(title, sub, actions) {
    return el('div', { class: 'page-head' }, [
      el('div', {}, [el('h1', { text: title }), sub ? el('p', { text: sub }) : null]),
      actions ? el('div', { class: 'no-print', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, actions) : null,
    ]);
  }
  function statCard(label, value, icon, tone, delta, i) {
    const card = el('div', { class: 'card stat hoverable', style: { animationDelay: (i * 60) + 'ms' } }, [
      el('div', { class: 'stat-top' }, [
        el('div', {}, [el('div', { class: 'stat-label', text: label }), el('div', { class: 'stat-value count', text: 'R$ 0,00' })]),
        el('div', { class: 'stat-ico ' + tone, text: icon }),
      ]),
      delta ? el('div', { class: 'stat-delta ' + (delta.up ? 'up' : 'down') }, [el('span', { text: (delta.up ? '▲' : '▼') + ' ' + delta.text })]) : null,
      el('div', { class: 'glow', style: { background: tone.includes('green') ? 'var(--neon-green)' : tone.includes('blue') ? 'var(--neon-blue)' : tone.includes('red') ? 'var(--critical)' : 'var(--neon-blue-2)' } }),
    ]);
    setTimeout(() => U.animateCount(card.querySelector('.stat-value'), value), 60 + i * 80);
    return card;
  }

  function sectionTitle(txt, right) {
    return el('div', { class: 'section-title' }, [el('span', { text: txt }), el('span', { class: 'st-line' }), right || null]);
  }

  /* =========================================================
     Views
     ========================================================= */
  const VIEWS = {};

  /* ---------- Dashboard ---------- */
  VIEWS.dashboard = function (root) {
    root.innerHTML = '';
    const ym = U.ymKey(new Date());
    const totals = Store.monthTotals(ym);
    const prev = Store.monthTotals(U.ymKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)));
    const W = Store.data.settings.widgets;

    root.appendChild(pageHead('Olá, ' + Store.data.profile.name.split(' ')[0] + ' 👋', 'Resumo financeiro de ' + U.MONTHS_FULL[new Date().getMonth()] + ' de ' + new Date().getFullYear(), [
      el('button', { class: 'btn btn-ghost btn-sm', text: '⚙️ Widgets', onclick: widgetModal }),
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Lançamento', onclick: () => txModal() }),
    ]));

    // stat cards
    const cards = el('div', { class: 'cards' });
    let i = 0;
    const dPct = (a, b) => b ? Math.abs(((a - b) / b) * 100) : 0;
    if (W.balance) cards.appendChild(statCard('Saldo atual', Store.balance(), '💰', 'tone-green', null, i++));
    if (W.income) cards.appendChild(statCard('Receitas do mês', totals.income, '📥', 'tone-blue', { up: totals.income >= prev.income, text: U.pct(dPct(totals.income, prev.income)) + ' vs mês ant.' }, i++));
    if (W.expense) cards.appendChild(statCard('Despesas do mês', totals.expense, '📤', 'tone-red', { up: totals.expense <= prev.expense, text: U.pct(dPct(totals.expense, prev.expense)) + ' vs mês ant.' }, i++));
    if (W.investments) cards.appendChild(statCard('Investimentos', Store.investments(), '📈', 'tone-violet', null, i++));
    if (W.balance || true) cards.appendChild(statCard('Patrimônio', Store.netWorth(), '🏦', 'tone-blue', null, i++));
    root.appendChild(cards);

    // charts row
    const dash = el('div', { class: 'dash-grid', style: { marginTop: '18px' } });

    if (W.cashflow) {
      const flowCard = el('div', { class: 'card chart-card' });
      flowCard.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Fluxo de caixa (6 meses)' }),
        el('div', { class: 'legend' }, [
          legendItem('Receitas', 'var(--series-2)'), legendItem('Despesas', 'var(--series-6)'),
        ])]));
      const host = el('div'); flowCard.appendChild(host);
      const s = Store.monthlySeries(6);
      Charts.bars(host, { labels: s.map((x) => x.label), sets: [
        { name: 'Receitas', color: cssVar('--series-2'), values: s.map((x) => x.income) },
        { name: 'Despesas', color: cssVar('--series-6'), values: s.map((x) => x.expense) },
      ] }, { height: 250 });
      dash.appendChild(flowCard);
    }

    if (W.categories) {
      const catCard = el('div', { class: 'card chart-card' });
      catCard.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Gastos por categoria' })]));
      const host = el('div'); catCard.appendChild(host);
      const cats = Store.spendByCategory(ym).slice(0, 6);
      Charts.donut(host, cats.map((c) => ({ label: c.cat.name, value: c.value, color: c.cat.color })), { size: 210, centerSub: U.MONTHS[new Date().getMonth()] });
      const leg = el('div', { class: 'legend' });
      cats.forEach((c) => leg.appendChild(legendItem(c.cat.name + ' · ' + U.brlShort(c.value), c.cat.color)));
      catCard.appendChild(leg);
      dash.appendChild(catCard);
    }
    root.appendChild(dash);

    // second row: patrimônio evolution + AI + upcoming
    const row2 = el('div', { class: 'dash-grid', style: { marginTop: '16px' } });

    const evoCard = el('div', { class: 'card chart-card' });
    evoCard.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Evolução do saldo líquido' })]));
    const eh = el('div'); evoCard.appendChild(eh);
    const ms = Store.monthlySeries(6);
    let cum = 0; const cumVals = ms.map((m) => (cum += m.net));
    Charts.line(eh, { labels: ms.map((m) => m.label), sets: [{ name: 'Saldo acumulado', color: cssVar('--neon-green'), values: cumVals }] }, { area: true, height: 240 });
    row2.appendChild(evoCard);

    // right column stack
    const rightCol = el('div', { class: 'grid' });
    if (W.ai) rightCol.appendChild(aiWidget());
    if (W.upcoming) rightCol.appendChild(upcomingWidget());
    row2.appendChild(rightCol);
    root.appendChild(row2);

    // budget + goals row
    const row3 = el('div', { class: 'dash-grid', style: { marginTop: '16px' } });
    if (W.budget) row3.appendChild(budgetWidget());
    if (W.goals) row3.appendChild(goalsWidget());
    root.appendChild(row3);
  };

  function legendItem(text, color) { return el('span', {}, [el('i', { style: { background: color } }), el('span', { text })]); }
  function cssVar(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function aiWidget() {
    const card = el('div', { class: 'card ai-card' });
    card.appendChild(el('div', { class: 'chart-head' }, [el('h3', { html: '🤖 Assistente IA' }),
      el('span', { class: 'chip', text: 'Previsão' })]));
    const f = AI.forecastMonth();
    card.appendChild(el('div', { class: 'ai-tip' }, [
      el('span', { class: 'ai-ic', text: '🔮' }),
      el('div', {}, [el('b', { html: 'Saldo previsto no fim do mês' }), el('div', { class: 'muted', style: { fontSize: '13px', marginTop: '2px' },
        html: `Projeção: <b style="color:${f.projectedNet >= 0 ? 'var(--good)' : 'var(--critical)'}">${U.brl(f.projectedNet)}</b> · ${f.daysLeft} dias restantes` })]),
    ]));
    AI.tips().slice(0, 2).forEach((t) => card.appendChild(el('div', { class: 'ai-tip' }, [el('span', { class: 'ai-ic', text: t.icon }), el('div', { html: t.text, style: { fontSize: '13px' } })])));
    card.appendChild(el('button', { class: 'btn btn-ghost btn-block btn-sm', text: 'Ver todas as dicas', onclick: () => go('reports') }));
    return card;
  }

  function upcomingWidget() {
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: '⏰ Próximos vencimentos' })]));
    const up = Store.upcoming(14);
    if (!up.length) card.appendChild(el('div', { class: 'empty', html: '<span class="e-ic">✅</span>Nada nos próximos 14 dias' }));
    const list = el('div', { class: 'list' });
    up.slice(0, 6).forEach((b) => {
      const tone = b.days <= 2 ? 'pill bad' : b.days <= 5 ? 'pill warn' : 'pill ok';
      list.appendChild(el('div', { class: 'row-item' }, [
        el('div', { class: 'row-ico tone-blue', text: b.icon }),
        el('div', { class: 'row-main' }, [el('b', { text: b.name }), el('small', { text: b.kind + ' · ' + U.fmtDateShort(b.date) })]),
        el('div', { style: { textAlign: 'right' } }, [el('div', { class: 'row-amt', text: U.brl(b.amount) }),
          el('span', { class: tone, text: b.days === 0 ? 'hoje' : b.days + 'd' })]),
      ]));
    });
    card.appendChild(list);
    return card;
  }

  function budgetWidget() {
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: '🎯 Orçamento do mês' }), el('button', { class: 'btn btn-ghost btn-sm', text: 'Gerenciar', onclick: () => go('budget') })]));
    const ym = U.ymKey(new Date());
    const spend = Store.spendByCategory(ym);
    const budgets = Store.data.budgets;
    const rows = el('div', { class: 'grid' });
    Object.keys(budgets).slice(0, 5).forEach((cid) => {
      const c = Store.cat(cid); const limit = budgets[cid];
      const used = (spend.find((s) => s.id === cid) || {}).value || 0;
      const pct = U.clamp((used / limit) * 100, 0, 100);
      const cls = used > limit ? 'over' : used > limit * 0.85 ? 'warn' : '';
      rows.appendChild(el('div', {}, [
        el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' } }, [
          el('span', { html: c.icon + ' ' + U.esc(c.name) }),
          el('span', { class: used > limit ? 'down' : 'muted', text: U.brl(used) + ' / ' + U.brl(limit) }),
        ]),
        el('div', { class: 'progress ' + cls }, [el('i', { style: { width: '0%' } })]),
      ]));
    });
    card.appendChild(rows);
    requestAnimationFrame(() => U.$$('.progress > i', card).forEach((b, k) => {
      const cid = Object.keys(budgets)[k]; const limit = budgets[cid];
      const used = (spend.find((s) => s.id === cid) || {}).value || 0;
      b.style.width = U.clamp((used / limit) * 100, 0, 100) + '%';
    }));
    return card;
  }

  function goalsWidget() {
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: '🏆 Metas financeiras' }), el('button', { class: 'btn btn-ghost btn-sm', text: 'Ver todas', onclick: () => go('goals') })]));
    const list = el('div', { class: 'grid' });
    Store.data.goals.slice(0, 3).forEach((g) => {
      const pct = U.clamp((g.saved / g.target) * 100, 0, 100);
      list.appendChild(el('div', { class: 'meter' }, [
        el('div', { class: 'donut', style: { '--val': 0 } }, [el('b', { text: Math.round(pct) + '%' })]),
        el('div', { style: { flex: 1 } }, [
          el('b', { html: g.icon + ' ' + U.esc(g.name) + (g.done ? ' <span class="pill ok">Concluída</span>' : '') }),
          el('div', { class: 'muted', style: { fontSize: '13px', margin: '2px 0 6px' }, text: U.brl(g.saved) + ' de ' + U.brl(g.target) }),
        ]),
      ]));
    });
    card.appendChild(list);
    requestAnimationFrame(() => U.$$('.donut', card).forEach((d, k) => {
      const g = Store.data.goals[k]; d.style.setProperty('--val', U.clamp((g.saved / g.target) * 100, 0, 100));
    }));
    return card;
  }

  /* ---------- Transactions ---------- */
  VIEWS.transactions = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Lançamentos', 'Receitas e despesas com categorias, anexos e filtros', [
      el('button', { class: 'btn btn-ghost btn-sm', text: '📁 Categorias', onclick: categoriesModal }),
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Novo lançamento', onclick: () => txModal() }),
    ]));

    // toolbar
    const months = Store.monthlySeries(12).map((m) => m.ym).reverse();
    const tb = el('div', { class: 'toolbar' }, [
      selectEl('period', [{ v: 'all', t: 'Todo período' }, ...months.map((m) => ({ v: m, t: U.monthLabel(m) }))], App.filters.period),
      selectEl('category', [{ v: 'all', t: 'Todas categorias' }, ...Store.data.categories.map((c) => ({ v: c.id, t: c.icon + ' ' + c.name }))], App.filters.category),
      selectEl('method', [{ v: 'all', t: 'Toda forma pgto' }, { v: 'pix', t: 'Pix' }, { v: 'credit', t: 'Crédito' }, { v: 'debit', t: 'Débito' }, { v: 'boleto', t: 'Boleto' }, { v: 'transfer', t: 'Transferência' }, { v: 'cash', t: 'Dinheiro' }], App.filters.method),
      el('input', { class: 'input', placeholder: '🔎 Filtrar…', value: App.filters.q, oninput: U.debounce((e) => { App.filters.q = e.target.value; renderTxTable(listWrap); }, 200) }),
    ]);
    tb.querySelectorAll('select').forEach((s) => s.addEventListener('change', (e) => { App.filters[e.target.dataset.k] = e.target.value; renderTxTable(listWrap); }));
    root.appendChild(tb);

    // summary chips
    const summary = el('div', { class: 'cards', style: { marginBottom: '16px' } });
    root.appendChild(summary);

    const card = el('div', { class: 'card' });
    const listWrap = el('div');
    card.appendChild(listWrap);
    root.appendChild(card);
    renderTxTable(listWrap, summary);
  };

  function filteredTx() {
    const f = App.filters;
    return Store.data.transactions.filter((t) => {
      if (f.period !== 'all' && U.ymKey(t.date) !== f.period) return false;
      if (f.category !== 'all' && t.categoryId !== f.category) return false;
      if (f.method !== 'all' && t.method !== f.method) return false;
      if (f.q && !((t.description || '').toLowerCase().includes(f.q.toLowerCase()) || Store.cat(t.categoryId).name.toLowerCase().includes(f.q.toLowerCase()))) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderTxTable(wrap, summary) {
    const list = filteredTx();
    if (summary) {
      summary.innerHTML = '';
      const inc = U.sum(list.filter((t) => t.type === 'income'), (t) => t.amount);
      const exp = U.sum(list.filter((t) => t.type === 'expense'), (t) => t.amount);
      summary.appendChild(miniStat('📥 Receitas', U.brl(inc), 'tone-green'));
      summary.appendChild(miniStat('📤 Despesas', U.brl(exp), 'tone-red'));
      summary.appendChild(miniStat('⚖️ Saldo', U.brl(inc - exp), inc - exp >= 0 ? 'tone-blue' : 'tone-red'));
      summary.appendChild(miniStat('#️⃣ Lançamentos', String(list.length), 'tone-violet'));
    }
    wrap.innerHTML = '';
    if (!list.length) { wrap.appendChild(el('div', { class: 'empty', html: '<span class="e-ic">🗂️</span>Nenhum lançamento com estes filtros' })); return; }
    const table = el('div', { class: 'table-wrap' });
    const t = el('table', { class: 'tbl' });
    t.appendChild(el('thead', {}, el('tr', {}, ['', 'Descrição', 'Categoria', 'Data', 'Forma', 'Valor', ''].map((h) => el('th', { text: h })))));
    const tb = el('tbody');
    list.slice(0, 200).forEach((tx) => {
      const c = Store.cat(tx.categoryId);
      const tr = el('tr', {}, [
        el('td', {}, el('div', { class: 'row-ico', style: { background: c.color + '22', color: c.color, width: '34px', height: '34px', fontSize: '15px' }, text: c.icon })),
        el('td', {}, [el('b', { text: tx.description }), tx.attachment ? el('span', { class: 'chip', style: { marginLeft: '6px' }, text: '📎' }) : null]),
        el('td', {}, el('span', { class: 'chip', html: c.icon + ' ' + U.esc(c.name) })),
        el('td', { text: U.fmtDate(tx.date) }),
        el('td', {}, el('span', { class: 'chip', text: methodLabel(tx.method) })),
        el('td', {}, el('b', { class: tx.type === 'income' ? 'amt-in' : 'amt-out', text: (tx.type === 'income' ? '+' : '-') + U.brl(tx.amount) })),
        el('td', {}, el('div', { style: { display: 'flex', gap: '4px' } }, [
          iconMini('✏️', () => txModal(tx)), iconMini('🗑️', () => confirmDelete('lançamento', () => { Store.removeTx(tx.id); toast('Lançamento excluído'); go('transactions'); })),
        ])),
      ]);
      tb.appendChild(tr);
    });
    t.appendChild(tb); table.appendChild(t); wrap.appendChild(table);
  }

  function methodLabel(m) { return ({ pix: 'Pix', credit: 'Crédito', debit: 'Débito', boleto: 'Boleto', transfer: 'Transf.', cash: 'Dinheiro' }[m] || m || '—'); }
  function miniStat(label, value, tone) {
    return el('div', { class: 'card hoverable', style: { padding: '14px 16px' } }, [
      el('div', { class: 'stat-top' }, [el('div', {}, [el('div', { class: 'stat-label', text: label }), el('div', { style: { fontSize: '20px', fontWeight: 800, marginTop: '2px' }, text: value })]),
      ]),
    ]);
  }
  function iconMini(txt, fn) { return el('button', { class: 'icon-btn', style: { width: '32px', height: '32px', fontSize: '14px' }, text: txt, onclick: fn }); }

  /* ---------- Transaction modal ---------- */
  function txModal(existing) {
    const isEdit = !!existing;
    const t = existing || { type: 'expense', categoryId: 'c_food', description: '', amount: '', date: U.iso(new Date()), method: 'pix', attachment: null, note: '' };
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: isEdit ? 'Editar lançamento' : 'Novo lançamento' }));
    form.appendChild(el('p', { class: 'modal-sub', text: 'Registre uma receita ou despesa' }));

    const seg = el('div', { class: 'seg' }, [
      el('button', { type: 'button', class: t.type === 'expense' ? 'active' : '', text: '📤 Despesa', 'data-type': 'expense' }),
      el('button', { type: 'button', class: t.type === 'income' ? 'active' : '', text: '📥 Receita', 'data-type': 'income' }),
    ]);
    let type = t.type;
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      type = b.dataset.type; seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      refreshCats();
    }));
    form.appendChild(seg);

    const catSel = el('select', { class: 'field' });
    function refreshCats() {
      catSel.innerHTML = '';
      Store.data.categories.filter((c) => c.type === type).forEach((c) => {
        const o = el('option', { value: c.id, text: c.icon + ' ' + c.name }); if (c.id === t.categoryId) o.selected = true; catSel.appendChild(o);
      });
    }
    refreshCats();

    const descI = inputField('Descrição', 'text', t.description, 'Ex: Mercado do mês');
    const amtI = inputField('Valor (R$)', 'number', t.amount, '0,00');
    amtI.querySelector('input').step = '0.01';
    const dateI = inputField('Data', 'date', t.date);
    const methSel = labeledSelect('Forma de pagamento', [
      ['pix', 'Pix'], ['credit', 'Cartão de crédito'], ['debit', 'Cartão de débito'], ['boleto', 'Boleto'], ['transfer', 'Transferência'], ['cash', 'Dinheiro'],
    ], t.method);

    form.appendChild(labeledWrap('Categoria', catSel));
    form.appendChild(descI);
    form.appendChild(el('div', { class: 'form-row' }, [amtI, dateI]));
    form.appendChild(methSel);

    // attachment
    let attachment = t.attachment;
    const fileLabel = el('label', { class: 'field' }, [el('span', { text: 'Comprovante (opcional)' }),
      el('input', { type: 'file', accept: 'image/*,application/pdf' })]);
    const preview = el('div', { class: 'muted', style: { fontSize: '12px', marginTop: '-8px', marginBottom: '8px' }, text: attachment ? '📎 Anexo salvo' : '' });
    fileLabel.querySelector('input').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 1.5e6) { toast('Arquivo muito grande', 'Máx. 1.5MB', 'warn'); return; }
      const r = new FileReader(); r.onload = () => { attachment = r.result; preview.textContent = '📎 ' + file.name; }; r.readAsDataURL(file);
    });
    form.appendChild(fileLabel); form.appendChild(preview);

    const noteI = inputField('Observação', 'text', t.note, 'Opcional');
    form.appendChild(noteI);

    const actions = el('div', { class: 'form-actions' }, [
      el('button', { type: 'submit', class: 'btn btn-primary btn-block', text: isEdit ? 'Salvar alterações' : 'Adicionar' }),
    ]);
    if (isEdit) actions.appendChild(el('button', { type: 'button', class: 'btn btn-danger', text: '🗑️', onclick: () => confirmDelete('lançamento', () => { Store.removeTx(t.id); closeModal(); toast('Excluído'); go(App.route); }) }));
    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(amtI.querySelector('input').value);
      const desc = descI.querySelector('input').value.trim();
      if (!desc || !(amount > 0)) { toast('Preencha descrição e valor', '', 'warn'); return; }
      const payload = { type, categoryId: catSel.value, description: desc, amount, date: dateI.querySelector('input').value, method: methSel.querySelector('select').value, attachment, note: noteI.querySelector('input').value };
      if (isEdit) { Store.updateTx(t.id, payload); toast('Lançamento atualizado'); }
      else { Store.addTx(payload); toast('Lançamento adicionado', desc + ' · ' + U.brl(amount)); confettiBurst(6); }
      closeModal(); checkAchievements(); runAlertScan(); go(App.route === 'transactions' ? 'transactions' : App.route);
    });
    openModal(form);
  }

  /* ---------- Categories modal ---------- */
  function categoriesModal() {
    const wrap = el('div');
    wrap.appendChild(el('h2', { text: 'Categorias' }));
    wrap.appendChild(el('p', { class: 'modal-sub', text: 'Personalize categorias com ícones e cores' }));
    const list = el('div', { class: 'list' });
    function refresh() {
      list.innerHTML = '';
      Store.data.categories.forEach((c) => {
        list.appendChild(el('div', { class: 'row-item' }, [
          el('div', { class: 'row-ico', style: { background: c.color + '22', color: c.color }, text: c.icon }),
          el('div', { class: 'row-main' }, [el('b', { text: c.name }), el('small', { text: c.type === 'income' ? 'Receita' : 'Despesa' })]),
          el('div', { class: 'row-actions', style: { opacity: 1 } }, [
            iconMini('🗑️', () => { Store.data.categories = Store.data.categories.filter((x) => x.id !== c.id); Store.save(); refresh(); }),
          ]),
        ]));
      });
    }
    refresh();
    wrap.appendChild(list);
    // add new
    const nameI = el('input', { class: 'input', placeholder: 'Nova categoria', style: { flex: 1 } });
    let icon = '🏷️', color = COLORS[0], type = 'expense';
    const iconRow = el('div', { class: 'icon-picker', style: { marginTop: '10px' } });
    ICONS.slice(0, 16).forEach((ic) => { const b = el('button', { type: 'button', text: ic, class: ic === icon ? 'sel' : '' }); b.onclick = () => { icon = ic; iconRow.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }; iconRow.appendChild(b); });
    const colRow = el('div', { class: 'color-picker', style: { marginTop: '10px' } });
    COLORS.forEach((cl) => { const b = el('button', { type: 'button', style: { background: cl }, class: cl === color ? 'sel' : '' }); b.onclick = () => { color = cl; colRow.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }; colRow.appendChild(b); });
    const typeSeg = el('div', { class: 'seg', style: { marginTop: '10px' } }, [
      el('button', { type: 'button', class: 'active', text: 'Despesa', onclick: (e) => { type = 'expense'; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === e.target)); } }),
      el('button', { type: 'button', text: 'Receita', onclick: (e) => { type = 'income'; e.target.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === e.target)); } }),
    ]);
    wrap.appendChild(el('div', { class: 'section-title' }, [el('span', { text: 'Adicionar categoria' }), el('span', { class: 'st-line' })]));
    wrap.appendChild(nameI); wrap.appendChild(iconRow); wrap.appendChild(colRow); wrap.appendChild(typeSeg);
    wrap.appendChild(el('button', { class: 'btn btn-primary btn-block', style: { marginTop: '12px' }, text: '＋ Criar categoria', onclick: () => {
      const name = nameI.value.trim(); if (!name) return;
      Store.data.categories.push({ id: U.uid(), name, icon, color, type }); Store.save(); nameI.value = ''; refresh(); toast('Categoria criada');
    } }));
    openModal(wrap);
  }

  /* ---------- Accounts (fixed/variable) ---------- */
  VIEWS.accounts = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Contas', 'Contas fixas e variáveis com vencimentos', [
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Nova conta', onclick: () => accountModal() }),
    ]));
    const fixedTotal = U.sum(Store.data.accounts.filter((a) => a.active && a.kind === 'fixed'), (a) => a.amount);
    const varTotal = U.sum(Store.data.accounts.filter((a) => a.active && a.kind === 'variable'), (a) => a.amount);
    const cards = el('div', { class: 'cards' });
    cards.appendChild(statCard('Contas fixas / mês', fixedTotal, '📌', 'tone-blue', null, 0));
    cards.appendChild(statCard('Contas variáveis / mês', varTotal, '🔀', 'tone-amber', null, 1));
    cards.appendChild(statCard('Total mensal', fixedTotal + varTotal, '🧾', 'tone-green', null, 2));
    root.appendChild(cards);

    ['fixed', 'variable'].forEach((kind) => {
      root.appendChild(sectionTitle(kind === 'fixed' ? '📌 Contas fixas' : '🔀 Contas variáveis'));
      const card = el('div', { class: 'card' });
      const list = el('div', { class: 'list' });
      const items = Store.data.accounts.filter((a) => a.kind === kind);
      if (!items.length) list.appendChild(el('div', { class: 'empty', html: '<span class="e-ic">📭</span>Nenhuma conta' }));
      items.forEach((a) => {
        const c = Store.cat(a.categoryId);
        list.appendChild(el('div', { class: 'row-item' }, [
          el('div', { class: 'row-ico', style: { background: c.color + '22', color: c.color }, text: c.icon }),
          el('div', { class: 'row-main' }, [el('b', { text: a.name }), el('small', { text: 'Vence dia ' + a.dueDay + (a.active ? '' : ' · inativa') })]),
          el('div', { class: 'row-amt', text: U.brl(a.amount) }),
          el('div', { class: 'row-actions' }, [iconMini('✏️', () => accountModal(a)), iconMini('🗑️', () => { Store.data.accounts = Store.data.accounts.filter((x) => x.id !== a.id); Store.save(); go('accounts'); })]),
        ]));
      });
      card.appendChild(list); root.appendChild(card);
    });
  };

  function accountModal(existing) {
    const a = existing || { name: '', amount: '', dueDay: 5, kind: 'fixed', categoryId: 'c_home', active: true };
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: existing ? 'Editar conta' : 'Nova conta' }));
    const nameI = inputField('Nome da conta', 'text', a.name, 'Ex: Aluguel');
    const amtI = inputField('Valor (R$)', 'number', a.amount); amtI.querySelector('input').step = '0.01';
    const dueI = inputField('Dia de vencimento', 'number', a.dueDay); dueI.querySelector('input').min = 1; dueI.querySelector('input').max = 31;
    const kindSel = labeledSelect('Tipo', [['fixed', 'Fixa'], ['variable', 'Variável']], a.kind);
    const catSel = labeledSelect('Categoria', Store.data.categories.filter((c) => c.type === 'expense').map((c) => [c.id, c.icon + ' ' + c.name]), a.categoryId);
    form.appendChild(nameI);
    form.appendChild(el('div', { class: 'form-row' }, [amtI, dueI]));
    form.appendChild(el('div', { class: 'form-row' }, [kindSel, catSel]));
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Salvar', type: 'submit' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = { name: nameI.querySelector('input').value.trim(), amount: parseFloat(amtI.querySelector('input').value) || 0, dueDay: +dueI.querySelector('input').value, kind: kindSel.querySelector('select').value, categoryId: catSel.querySelector('select').value, active: true };
      if (!payload.name) return;
      if (existing) Object.assign(a, payload); else Store.data.accounts.push({ id: U.uid(), ...payload });
      Store.save(); closeModal(); toast('Conta salva'); go('accounts');
    });
    openModal(form);
  }

  /* ---------- Cards ---------- */
  VIEWS.cards = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Cartões de crédito', 'Limites, faturas atuais, próximas faturas e parcelas', [
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Novo cartão', onclick: () => cardModal() }),
    ]));
    const totalLimit = U.sum(Store.data.cards, (c) => c.limit);
    const totalUsed = U.sum(Store.data.cards, (c) => Store.cardInvoiceTotal(c));
    const cards = el('div', { class: 'cards' });
    cards.appendChild(statCard('Limite total', totalLimit, '💳', 'tone-blue', null, 0));
    cards.appendChild(statCard('Faturas abertas', totalUsed, '🧾', 'tone-red', null, 1));
    cards.appendChild(statCard('Limite disponível', totalLimit - totalUsed, '✅', 'tone-green', null, 2));
    root.appendChild(cards);

    const grid = el('div', { class: 'cards', style: { marginTop: '18px' } });
    Store.data.cards.forEach((card) => {
      const used = Store.cardInvoiceTotal(card);
      const pct = U.clamp((used / card.limit) * 100, 0, 100);
      const wrap = el('div', { class: 'grid' });
      // visual card
      wrap.appendChild(el('div', { class: 'cc', style: { background: card.color } }, [
        el('div', { class: 'cc-top' }, [el('div', { class: 'cc-chip' }), el('div', { class: 'cc-brand', text: card.brand })]),
        el('div', { class: 'cc-num', text: '•••• •••• •••• ' + card.last4 }),
        el('div', { class: 'cc-foot' }, [
          el('div', {}, [el('div', { style: { opacity: .8 }, text: card.name }), el('b', { text: 'Fatura: ' + U.brl(used) })]),
          el('div', { style: { textAlign: 'right' } }, [el('div', { style: { opacity: .8 }, text: 'Vence dia ' + card.dueDay }), el('b', { text: U.pct(pct) + ' usado' })]),
        ]),
      ]));
      // details
      const det = el('div', { class: 'card' });
      det.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: card.name }),
        el('div', { style: { display: 'flex', gap: '6px' } }, [iconMini('➕', () => cardItemModal(card)), iconMini('✏️', () => cardModal(card)), iconMini('🗑️', () => { Store.data.cards = Store.data.cards.filter((x) => x.id !== card.id); Store.save(); go('cards'); })])]));
      det.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' } }, [el('span', { class: 'muted', text: 'Limite usado' }), el('b', { text: U.brl(used) + ' / ' + U.brl(card.limit) })]));
      const prog = el('div', { class: 'progress ' + (pct > 85 ? 'over' : pct > 60 ? 'warn' : '') }, [el('i')]);
      det.appendChild(prog); requestAnimationFrame(() => (prog.querySelector('i').style.width = pct + '%'));
      det.appendChild(el('div', { class: 'muted', style: { fontSize: '12.5px', margin: '10px 0 4px' }, text: 'Fecha dia ' + card.closeDay + ' · vence dia ' + card.dueDay }));
      // invoice items
      const inv = card.invoices[card.invoices.length - 1];
      const list = el('div', { class: 'list' });
      (inv ? inv.items : []).forEach((it) => {
        list.appendChild(el('div', { class: 'row-item' }, [
          el('div', { class: 'row-ico tone-violet', text: it.installments > 1 ? '🔁' : '🛒' }),
          el('div', { class: 'row-main' }, [el('b', { text: it.desc }), el('small', { text: U.fmtDate(it.date) + (it.installments > 1 ? ` · parcela ${it.current}/${it.installments}` : '') })]),
          el('div', { class: 'row-amt', text: U.brl(it.amount) }),
          el('div', { class: 'row-actions' }, [iconMini('🗑️', () => { inv.items = inv.items.filter((x) => x.id !== it.id); Store.save(); go('cards'); })]),
        ]));
      });
      det.appendChild(list);
      wrap.appendChild(det);
      grid.appendChild(wrap);
    });
    root.appendChild(grid);
  };

  function cardModal(existing) {
    const c = existing || { name: '', brand: 'Mastercard', last4: '0000', color: 'linear-gradient(135deg,#7c3aed,#4f8bff)', limit: 5000, closeDay: 1, dueDay: 8, invoices: [{ ym: U.ymKey(new Date()), items: [] }] };
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: existing ? 'Editar cartão' : 'Novo cartão' }));
    const nameI = inputField('Nome', 'text', c.name, 'Ex: Nubank');
    const brandSel = labeledSelect('Bandeira', [['Mastercard', 'Mastercard'], ['Visa', 'Visa'], ['Elo', 'Elo'], ['Amex', 'Amex']], c.brand);
    const last4I = inputField('Final (4 díg.)', 'text', c.last4, '0000');
    const limitI = inputField('Limite (R$)', 'number', c.limit);
    const closeI = inputField('Fecha dia', 'number', c.closeDay);
    const dueI = inputField('Vence dia', 'number', c.dueDay);
    const colors = ['linear-gradient(135deg,#7c3aed,#4f8bff)', 'linear-gradient(135deg,#0f172a,#334155)', 'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#e11d48,#f59e0b)', 'linear-gradient(135deg,#1e3a8a,#38bdf8)'];
    let color = c.color;
    const colRow = el('div', { class: 'color-picker', style: { marginTop: '8px' } });
    colors.forEach((cl) => { const b = el('button', { type: 'button', style: { background: cl, width: '46px', height: '30px', borderRadius: '8px' }, class: cl === color ? 'sel' : '' }); b.onclick = () => { color = cl; colRow.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }; colRow.appendChild(b); });
    form.appendChild(nameI);
    form.appendChild(el('div', { class: 'form-row' }, [brandSel, last4I]));
    form.appendChild(el('div', { class: 'form-row' }, [limitI, el('div', {})]));
    form.appendChild(el('div', { class: 'form-row' }, [closeI, dueI]));
    form.appendChild(labeledWrap('Cor', colRow));
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Salvar', type: 'submit', style: { marginTop: '12px' } }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = { name: nameI.querySelector('input').value.trim(), brand: brandSel.querySelector('select').value, last4: last4I.querySelector('input').value.slice(-4) || '0000', color, limit: parseFloat(limitI.querySelector('input').value) || 0, closeDay: +closeI.querySelector('input').value, dueDay: +dueI.querySelector('input').value };
      if (!payload.name) return;
      if (existing) Object.assign(c, payload); else Store.data.cards.push({ id: U.uid(), ...payload, invoices: [{ ym: U.ymKey(new Date()), items: [] }] });
      Store.save(); closeModal(); toast('Cartão salvo'); go('cards');
    });
    openModal(form);
  }

  function cardItemModal(card) {
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: 'Nova compra — ' + card.name }));
    const descI = inputField('Descrição', 'text', '', 'Ex: Tênis');
    const amtI = inputField('Valor total (R$)', 'number', ''); amtI.querySelector('input').step = '0.01';
    const dateI = inputField('Data', 'date', U.iso(new Date()));
    const instI = inputField('Parcelas', 'number', 1); instI.querySelector('input').min = 1;
    form.appendChild(descI);
    form.appendChild(el('div', { class: 'form-row' }, [amtI, instI]));
    form.appendChild(dateI);
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Adicionar à fatura', type: 'submit' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const total = parseFloat(amtI.querySelector('input').value); const inst = Math.max(1, +instI.querySelector('input').value);
      const desc = descI.querySelector('input').value.trim();
      if (!desc || !(total > 0)) return;
      let inv = card.invoices.find((i) => i.ym === U.ymKey(new Date())); if (!inv) { inv = { ym: U.ymKey(new Date()), items: [] }; card.invoices.push(inv); }
      inv.items.push({ id: U.uid(), desc, amount: +(total / inst).toFixed(2), date: dateI.querySelector('input').value, installments: inst, current: 1 });
      Store.save(); closeModal(); toast('Compra adicionada'); go('cards');
    });
    openModal(form);
  }

  /* ---------- Subscriptions ---------- */
  VIEWS.subscriptions = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Assinaturas', 'Controle seus serviços recorrentes', [
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Nova assinatura', onclick: () => subModal() }),
    ]));
    const active = Store.data.subscriptions.filter((s) => s.active);
    const monthly = U.sum(active, (s) => s.amount);
    const cards = el('div', { class: 'cards' });
    cards.appendChild(statCard('Total mensal', monthly, '📺', 'tone-red', null, 0));
    cards.appendChild(statCard('Total anual', monthly * 12, '📅', 'tone-amber', null, 1));
    cards.appendChild(statCard('Assinaturas ativas', active.length, '✅', 'tone-green', null, 2));
    root.appendChild(cards);
    const grid = el('div', { class: 'cards', style: { marginTop: '18px' } });
    Store.data.subscriptions.forEach((s) => {
      const card = el('div', { class: 'card hoverable' }, [
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          el('div', { class: 'row-ico', style: { background: s.color + '22', color: s.color, fontSize: '22px', width: '48px', height: '48px' }, text: s.icon }),
          el('div', { style: { flex: 1 } }, [el('b', { text: s.name }), el('div', { class: 'muted', style: { fontSize: '12.5px' }, text: 'Vence dia ' + s.dueDay })]),
          el('div', { style: { textAlign: 'right' } }, [el('b', { style: { fontSize: '18px' }, text: U.brl(s.amount) }), el('div', { class: 'muted', style: { fontSize: '11px' }, text: '/mês' })]),
        ]),
        el('div', { style: { display: 'flex', gap: '6px', marginTop: '12px' } }, [
          el('button', { class: 'btn btn-ghost btn-sm', style: { flex: 1 }, text: s.active ? '⏸ Pausar' : '▶ Ativar', onclick: () => { s.active = !s.active; Store.save(); go('subscriptions'); } }),
          iconMini('✏️', () => subModal(s)), iconMini('🗑️', () => { Store.data.subscriptions = Store.data.subscriptions.filter((x) => x.id !== s.id); Store.save(); go('subscriptions'); }),
        ]),
      ]);
      if (!s.active) card.style.opacity = .55;
      grid.appendChild(card);
    });
    root.appendChild(grid);
  };

  function subModal(existing) {
    const s = existing || { name: '', icon: '📺', amount: '', dueDay: 10, color: '#38bdf8', active: true };
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: existing ? 'Editar assinatura' : 'Nova assinatura' }));
    const nameI = inputField('Nome', 'text', s.name, 'Ex: Netflix');
    const amtI = inputField('Valor (R$)', 'number', s.amount); amtI.querySelector('input').step = '0.01';
    const dueI = inputField('Vence dia', 'number', s.dueDay);
    let icon = s.icon;
    const iconRow = el('div', { class: 'icon-picker' });
    ['📺','🎬','🎵','☁️','📦','🤖','📱','🎮','📰','💪','🚗','🍔'].forEach((ic) => { const b = el('button', { type: 'button', text: ic, class: ic === icon ? 'sel' : '' }); b.onclick = () => { icon = ic; iconRow.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }; iconRow.appendChild(b); });
    form.appendChild(nameI);
    form.appendChild(el('div', { class: 'form-row' }, [amtI, dueI]));
    form.appendChild(labeledWrap('Ícone', iconRow));
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Salvar', type: 'submit', style: { marginTop: '12px' } }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = { name: nameI.querySelector('input').value.trim(), amount: parseFloat(amtI.querySelector('input').value) || 0, dueDay: +dueI.querySelector('input').value, icon, color: '#38bdf8', active: true };
      if (!payload.name) return;
      if (existing) Object.assign(s, payload); else Store.data.subscriptions.push({ id: U.uid(), ...payload });
      Store.save(); closeModal(); toast('Assinatura salva'); go('subscriptions');
    });
    openModal(form);
  }

  /* ---------- Budget ---------- */
  VIEWS.budget = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Orçamento mensal', 'Defina limites por categoria e acompanhe o consumo'));
    const ym = U.ymKey(new Date());
    const spend = Store.spendByCategory(ym);
    const totalBudget = U.sum(Object.values(Store.data.budgets));
    const totalSpent = U.sum(Object.keys(Store.data.budgets).map((cid) => (spend.find((s) => s.id === cid) || {}).value || 0));
    const cards = el('div', { class: 'cards' });
    cards.appendChild(statCard('Orçamento total', totalBudget, '🎯', 'tone-blue', null, 0));
    cards.appendChild(statCard('Gasto até agora', totalSpent, '💸', 'tone-red', null, 1));
    cards.appendChild(statCard('Disponível', totalBudget - totalSpent, '✅', 'tone-green', null, 2));
    root.appendChild(cards);

    const card = el('div', { class: 'card', style: { marginTop: '18px' } });
    card.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Categorias' })]));
    const grid = el('div', { class: 'grid' });
    Store.data.categories.filter((c) => c.type === 'expense').forEach((c) => {
      const limit = Store.data.budgets[c.id] || 0;
      const used = (spend.find((s) => s.id === c.id) || {}).value || 0;
      const pct = limit ? U.clamp((used / limit) * 100, 0, 100) : 0;
      const cls = used > limit && limit ? 'over' : used > limit * 0.85 && limit ? 'warn' : '';
      const row = el('div', { style: { padding: '10px 0', borderBottom: '1px solid var(--border)' } }, [
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' } }, [
          el('div', { class: 'row-ico', style: { background: c.color + '22', color: c.color, width: '34px', height: '34px', fontSize: '15px' }, text: c.icon }),
          el('b', { text: c.name, style: { flex: 1 } }),
          el('span', { class: used > limit && limit ? 'down' : 'muted', style: { fontSize: '13px' }, text: U.brl(used) + ' / ' }),
          el('input', { class: 'input', type: 'number', value: limit, style: { width: '110px' }, onchange: (e) => { const v = parseFloat(e.target.value) || 0; if (v) Store.data.budgets[c.id] = v; else delete Store.data.budgets[c.id]; Store.save(); go('budget'); } }),
        ]),
        el('div', { class: 'progress ' + cls }, [el('i', { style: { width: '0%' } })]),
      ]);
      grid.appendChild(row);
      requestAnimationFrame(() => { row.querySelector('.progress > i').style.width = pct + '%'; });
    });
    card.appendChild(grid); root.appendChild(card);
  };

  /* ---------- Goals ---------- */
  VIEWS.goals = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Metas financeiras', 'Objetivos com barra de progresso e recompensas', [
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Nova meta', onclick: () => goalModal() }),
    ]));
    const grid = el('div', { class: 'cards' });
    Store.data.goals.forEach((g) => {
      const pct = U.clamp((g.saved / g.target) * 100, 0, 100);
      const card = el('div', { class: 'card hoverable' });
      if (g.done) card.style.border = '1px solid var(--neon-green)';
      card.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } }, [
        el('div', { class: 'row-ico', style: { background: g.color + '22', color: g.color, fontSize: '24px', width: '52px', height: '52px' }, text: g.icon }),
        el('div', { style: { flex: 1 } }, [el('b', { style: { fontSize: '16px' }, text: g.name }), el('div', { class: 'muted', style: { fontSize: '12.5px' }, text: 'Prazo: ' + U.fmtDate(g.deadline) })]),
        g.done ? el('span', { class: 'pill ok', text: '🎉 Concluída' }) : el('b', { text: Math.round(pct) + '%' }),
      ]));
      card.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' } }, [el('span', { class: 'muted', text: 'Guardado' }), el('b', { text: U.brl(g.saved) + ' / ' + U.brl(g.target) })]));
      const prog = el('div', { class: 'progress' }, [el('i')]); card.appendChild(prog);
      requestAnimationFrame(() => (prog.querySelector('i').style.width = pct + '%'));
      const actions = el('div', { style: { display: 'flex', gap: '6px', marginTop: '12px' } }, [
        el('button', { class: 'btn btn-ghost btn-sm', style: { flex: 1 }, text: '＋ Depositar', onclick: () => depositModal(g) }),
        iconMini('✏️', () => goalModal(g)), iconMini('🗑️', () => { Store.data.goals = Store.data.goals.filter((x) => x.id !== g.id); Store.save(); go('goals'); }),
      ]);
      card.appendChild(actions);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  };

  function depositModal(g) {
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: 'Depositar em ' + g.name }));
    const amtI = inputField('Valor (R$)', 'number', ''); amtI.querySelector('input').step = '0.01';
    form.appendChild(amtI);
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Depositar', type: 'submit' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = parseFloat(amtI.querySelector('input').value); if (!(v > 0)) return;
      g.saved += v;
      const wasDone = g.done;
      if (g.saved >= g.target && !g.done) { g.done = true; g.saved = g.target; closeModal(); celebrate('🎉 Meta concluída!', g.name + ' — parabéns!'); Store.save(); checkAchievements(); go('goals'); return; }
      Store.save(); closeModal(); toast('Depósito realizado', U.brl(v) + ' em ' + g.name); go('goals');
    });
    openModal(form);
  }

  function goalModal(existing) {
    const g = existing || { name: '', icon: '🎯', target: '', saved: 0, deadline: U.iso(new Date(new Date().getFullYear() + 1, 0, 1)), color: '#38bdf8', done: false };
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: existing ? 'Editar meta' : 'Nova meta' }));
    const nameI = inputField('Nome', 'text', g.name, 'Ex: Viagem');
    const targetI = inputField('Valor alvo (R$)', 'number', g.target);
    const savedI = inputField('Já guardado (R$)', 'number', g.saved);
    const dateI = inputField('Prazo', 'date', g.deadline);
    let icon = g.icon;
    const iconRow = el('div', { class: 'icon-picker' });
    ['🎯','✈️','🚙','💻','🏠','💍','🎓','🏖️','📱','🚀','👶','🐶'].forEach((ic) => { const b = el('button', { type: 'button', text: ic, class: ic === icon ? 'sel' : '' }); b.onclick = () => { icon = ic; iconRow.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }; iconRow.appendChild(b); });
    form.appendChild(nameI);
    form.appendChild(el('div', { class: 'form-row' }, [targetI, savedI]));
    form.appendChild(dateI);
    form.appendChild(labeledWrap('Ícone', iconRow));
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Salvar', type: 'submit', style: { marginTop: '12px' } }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = { name: nameI.querySelector('input').value.trim(), target: parseFloat(targetI.querySelector('input').value) || 0, saved: parseFloat(savedI.querySelector('input').value) || 0, deadline: dateI.querySelector('input').value, icon, color: g.color || '#38bdf8' };
      if (!payload.name) return;
      payload.done = payload.saved >= payload.target;
      if (existing) Object.assign(g, payload); else Store.data.goals.push({ id: U.uid(), ...payload });
      Store.save(); closeModal(); toast('Meta salva'); go('goals');
    });
    openModal(form);
  }

  /* ---------- Reserve ---------- */
  VIEWS.reserve = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Reserva de emergência', 'Sua segurança financeira para imprevistos'));
    const r = Store.data.reserve;
    const pct = r.target ? U.clamp((r.saved / r.target) * 100, 0, 100) : 0;
    const months = r.monthlyExpense ? (r.saved / r.monthlyExpense) : 0;
    const targetMonths = 6;

    const grid = el('div', { class: 'dash-grid' });
    const main = el('div', { class: 'card', style: { textAlign: 'center' } });
    main.appendChild(el('div', { class: 'donut', style: { '--val': 0, width: '160px', height: '160px', margin: '10px auto' } }, [el('b', { style: { fontSize: '26px' }, text: Math.round(pct) + '%' })]));
    main.appendChild(el('h3', { style: { margin: '6px 0' }, text: U.brl(r.saved) + ' de ' + U.brl(r.target) }));
    main.appendChild(el('p', { class: 'muted', html: 'Cobre <b style="color:var(--ink)">' + months.toFixed(1) + ' meses</b> de despesas (meta: ' + targetMonths + ')' }));
    main.appendChild(el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' } }, [
      el('button', { class: 'btn btn-primary btn-sm', text: '＋ Depositar', onclick: () => reserveDeposit() }),
      el('button', { class: 'btn btn-ghost btn-sm', text: '⚙️ Configurar', onclick: () => reserveConfig() }),
    ]));
    grid.appendChild(main);
    requestAnimationFrame(() => main.querySelector('.donut').style.setProperty('--val', pct));

    const info = el('div', { class: 'card ai-card' });
    info.appendChild(el('h3', { html: '🛡️ Por que ter uma reserva?' }));
    info.appendChild(el('div', { class: 'ai-tip' }, [el('span', { class: 'ai-ic', text: '💡' }), el('div', { html: 'O ideal é acumular de <b>6 a 12 meses</b> das suas despesas mensais em uma aplicação de alta liquidez.', style: { fontSize: '13.5px' } })]));
    info.appendChild(el('div', { class: 'ai-tip' }, [el('span', { class: 'ai-ic', text: '📊' }), el('div', { html: 'Faltam <b>' + U.brl(Math.max(0, r.target - r.saved)) + '</b> para atingir sua meta.', style: { fontSize: '13.5px' } })]));
    const perMonth = Math.max(0, r.target - r.saved) / 12;
    info.appendChild(el('div', { class: 'ai-tip' }, [el('span', { class: 'ai-ic', text: '📅' }), el('div', { html: 'Guardando <b>' + U.brl(perMonth) + '/mês</b> você completa em 12 meses.', style: { fontSize: '13.5px' } })]));
    grid.appendChild(info);
    root.appendChild(grid);
  };

  function reserveDeposit() {
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: 'Depositar na reserva' }));
    const amtI = inputField('Valor (R$)', 'number', ''); amtI.querySelector('input').step = '0.01';
    form.appendChild(amtI);
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Depositar', type: 'submit' }));
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = parseFloat(amtI.querySelector('input').value); if (!(v > 0)) return; Store.data.reserve.saved += v; Store.save(); closeModal(); toast('Depósito na reserva', U.brl(v)); confettiBurst(5); checkAchievements(); go('reserve'); });
    openModal(form);
  }
  function reserveConfig() {
    const r = Store.data.reserve;
    const form = el('form', { class: 'grid' });
    form.appendChild(el('h2', { text: 'Configurar reserva' }));
    const tI = inputField('Meta (R$)', 'number', r.target);
    const mI = inputField('Despesa mensal (R$)', 'number', r.monthlyExpense);
    form.appendChild(el('div', { class: 'form-row' }, [tI, mI]));
    form.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Salvar', type: 'submit' }));
    form.addEventListener('submit', (e) => { e.preventDefault(); r.target = parseFloat(tI.querySelector('input').value) || 0; r.monthlyExpense = parseFloat(mI.querySelector('input').value) || 0; Store.save(); closeModal(); go('reserve'); });
    openModal(form);
  }

  /* ---------- Planning (monthly/annual) ---------- */
  VIEWS.planning = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Planejamento', 'Visão mensal e anual das suas finanças'));
    const year = new Date().getFullYear();
    // annual overview from 12 months
    const now = new Date();
    const rows = [];
    for (let m = 0; m < 12; m++) { const ym = year + '-' + String(m + 1).padStart(2, '0'); rows.push({ m, ym, ...Store.monthTotals(ym) }); }
    const totalInc = U.sum(rows, (r) => r.income), totalExp = U.sum(rows, (r) => r.expense);
    const cards = el('div', { class: 'cards' });
    cards.appendChild(statCard('Receitas ' + year, totalInc, '📥', 'tone-green', null, 0));
    cards.appendChild(statCard('Despesas ' + year, totalExp, '📤', 'tone-red', null, 1));
    cards.appendChild(statCard('Saldo ' + year, totalInc - totalExp, '⚖️', 'tone-blue', null, 2));
    cards.appendChild(statCard('Média mensal', (totalInc - totalExp) / 12, '📊', 'tone-violet', null, 3));
    root.appendChild(cards);

    const chartCard = el('div', { class: 'card', style: { marginTop: '18px' } });
    chartCard.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Receitas vs Despesas ' + year }),
      el('div', { class: 'legend' }, [legendItem('Receitas', 'var(--series-2)'), legendItem('Despesas', 'var(--series-6)')])]));
    const host = el('div'); chartCard.appendChild(host);
    Charts.bars(host, { labels: U.MONTHS, sets: [
      { name: 'Receitas', color: cssVar('--series-2'), values: rows.map((r) => r.income) },
      { name: 'Despesas', color: cssVar('--series-6'), values: rows.map((r) => r.expense) },
    ] }, { width: 720, height: 260 });
    root.appendChild(chartCard);

    // table
    const tCard = el('div', { class: 'card', style: { marginTop: '16px' } });
    tCard.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Detalhamento mensal' })]));
    const tw = el('div', { class: 'table-wrap' });
    const table = el('table', { class: 'tbl' });
    table.appendChild(el('thead', {}, el('tr', {}, ['Mês', 'Receitas', 'Despesas', 'Saldo', 'Poupança'].map((h) => el('th', { text: h })))));
    const tb = el('tbody');
    rows.forEach((r) => {
      const rate = r.income ? (r.net / r.income) * 100 : 0;
      tb.appendChild(el('tr', {}, [
        el('td', {}, el('b', { text: U.MONTHS_FULL[r.m] })),
        el('td', {}, el('span', { class: 'amt-in', text: U.brl(r.income) })),
        el('td', {}, el('span', { class: 'amt-out', text: U.brl(r.expense) })),
        el('td', {}, el('b', { class: r.net >= 0 ? 'up' : 'down', text: U.brl(r.net) })),
        el('td', {}, el('span', { class: 'pill ' + (rate >= 20 ? 'ok' : rate >= 0 ? 'warn' : 'bad'), text: U.pct(rate) })),
      ]));
    });
    table.appendChild(tb); tw.appendChild(table); tCard.appendChild(tw); root.appendChild(tCard);
  };

  /* ---------- Calendar ---------- */
  let calMonth = new Date().getMonth(), calYear = new Date().getFullYear();
  VIEWS.calendar = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Calendário financeiro', 'Vencimentos, lançamentos e lembretes'));
    const card = el('div', { class: 'card' });
    const head = el('div', { class: 'chart-head' }, [
      el('h3', { text: U.MONTHS_FULL[calMonth] + ' ' + calYear }),
      el('div', { style: { display: 'flex', gap: '6px' } }, [
        el('button', { class: 'icon-btn', text: '‹', onclick: () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } go('calendar'); } }),
        el('button', { class: 'btn btn-ghost btn-sm', text: 'Hoje', onclick: () => { calMonth = new Date().getMonth(); calYear = new Date().getFullYear(); go('calendar'); } }),
        el('button', { class: 'icon-btn', text: '›', onclick: () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } go('calendar'); } }),
      ]),
    ]);
    card.appendChild(head);

    // build events map
    const events = {}; // day -> [{label,color,type}]
    const push = (day, label, color) => { (events[day] = events[day] || []).push({ label, color }); };
    Store.data.accounts.filter((a) => a.active).forEach((a) => push(a.dueDay, a.name, 'var(--series-6)'));
    Store.data.subscriptions.filter((s) => s.active).forEach((s) => push(s.dueDay, s.name, 'var(--series-8)'));
    Store.data.cards.forEach((c) => push(c.dueDay, 'Fatura ' + c.name, 'var(--series-5)'));
    // transactions in this month
    Store.data.transactions.filter((t) => { const d = new Date(t.date); return d.getMonth() === calMonth && d.getFullYear() === calYear; }).forEach((t) => {
      const d = new Date(t.date).getDate(); push(d, (t.type === 'income' ? '+' : '-') + U.brlShort(t.amount), t.type === 'income' ? 'var(--series-2)' : 'var(--series-3)');
    });

    const grid = el('div', { class: 'cal' });
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((d) => grid.appendChild(el('div', { class: 'dow', text: d })));
    const first = new Date(calYear, calMonth, 1).getDay();
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    const prevDays = new Date(calYear, calMonth, 0).getDate();
    const today = new Date();
    for (let i = 0; i < first; i++) grid.appendChild(el('div', { class: 'day out' }, el('div', { class: 'dn', text: prevDays - first + i + 1 })));
    for (let d = 1; d <= days; d++) {
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      const cell = el('div', { class: 'day' + (isToday ? ' today' : '') }, [el('div', { class: 'dn', text: d })]);
      (events[d] || []).slice(0, 3).forEach((ev) => cell.appendChild(el('div', { class: 'ev', style: { background: ev.color + '22', color: ev.color }, text: ev.label })));
      if ((events[d] || []).length > 3) cell.appendChild(el('div', { class: 'muted', style: { fontSize: '10px' }, text: '+' + (events[d].length - 3) }));
      grid.appendChild(cell);
    }
    card.appendChild(grid);
    // legend
    card.appendChild(el('div', { class: 'legend', style: { marginTop: '14px' } }, [
      legendItem('Contas', 'var(--series-6)'), legendItem('Assinaturas', 'var(--series-8)'), legendItem('Faturas', 'var(--series-5)'), legendItem('Receitas', 'var(--series-2)'), legendItem('Despesas', 'var(--series-3)'),
    ]));
    root.appendChild(card);
  };

  /* ---------- Simulator ---------- */
  VIEWS.simulator = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Simulador de investimentos', 'Projete o crescimento das suas economias com juros compostos'));
    const grid = el('div', { class: 'dash-grid' });
    const form = el('div', { class: 'card' });
    form.appendChild(el('h3', { text: 'Parâmetros' }));
    const initI = inputField('Valor inicial (R$)', 'number', 1000);
    const monI = inputField('Aporte mensal (R$)', 'number', 500);
    const rateI = inputField('Rentabilidade (% ao mês)', 'number', 0.9); rateI.querySelector('input').step = '0.1';
    const perI = inputField('Período (meses)', 'number', 24);
    form.appendChild(initI); form.appendChild(monI);
    form.appendChild(el('div', { class: 'form-row' }, [rateI, perI]));
    const resultCard = el('div', { class: 'card' });
    grid.appendChild(form); grid.appendChild(resultCard);
    root.appendChild(grid);

    function run() {
      const r = AI.simulate({
        initial: parseFloat(initI.querySelector('input').value) || 0,
        monthly: parseFloat(monI.querySelector('input').value) || 0,
        months: Math.max(1, +perI.querySelector('input').value),
        ratePct: parseFloat(rateI.querySelector('input').value) || 0,
      });
      resultCard.innerHTML = '';
      resultCard.appendChild(el('h3', { text: 'Resultado projetado' }));
      resultCard.appendChild(el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '10px 0' } }, [
        miniRes('Total final', U.brl(r.final), 'var(--neon-green)'),
        miniRes('Investido', U.brl(r.invested), 'var(--neon-blue)'),
        miniRes('Juros ganhos', U.brl(r.earnings), 'var(--series-5)'),
      ]));
      const host = el('div'); resultCard.appendChild(host);
      Charts.line(host, { labels: r.series.filter((_, i) => i % Math.ceil(r.series.length / 8) === 0 || i === r.series.length - 1).map((s) => 'M' + s.m),
        sets: [
          { name: 'Patrimônio', color: cssVar('--neon-green'), values: r.series.filter((_, i) => i % Math.ceil(r.series.length / 8) === 0 || i === r.series.length - 1).map((s) => s.bal) },
          { name: 'Investido', color: cssVar('--neon-blue'), values: r.series.filter((_, i) => i % Math.ceil(r.series.length / 8) === 0 || i === r.series.length - 1).map((s) => s.invested) },
        ] }, { area: true, height: 230 });
    }
    [initI, monI, rateI, perI].forEach((f) => f.querySelector('input').addEventListener('input', U.debounce(run, 250)));
    run();
  };
  function miniRes(label, val, color) { return el('div', { style: { flex: '1 1 120px', padding: '12px', borderRadius: '14px', background: 'var(--surface-2)' } }, [el('div', { class: 'muted', style: { fontSize: '12px' }, text: label }), el('b', { style: { fontSize: '19px', color }, text: val })]); }

  /* ---------- Reports ---------- */
  VIEWS.reports = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Relatórios', 'Análises completas e exportação', [
      el('button', { class: 'btn btn-ghost btn-sm', text: '📊 Excel', onclick: exportExcel }),
      el('button', { class: 'btn btn-ghost btn-sm', text: '📄 PDF', onclick: () => window.print() }),
      el('button', { class: 'btn btn-primary btn-sm', text: '💾 CSV', onclick: exportCSV }),
    ]));

    // AI insights section
    const aiCard = el('div', { class: 'card ai-card' });
    aiCard.appendChild(el('h3', { html: '🤖 Análise inteligente de hábitos' }));
    AI.tips().forEach((t) => aiCard.appendChild(el('div', { class: 'ai-tip' }, [el('span', { class: 'ai-ic', text: t.icon }), el('div', { html: t.text, style: { fontSize: '13.5px' } })])));
    root.appendChild(aiCard);

    // forecast
    const f = AI.forecastMonth();
    const fc = el('div', { class: 'cards', style: { marginTop: '16px' } });
    fc.appendChild(statCard('Receita prevista', f.expectedIncome, '📥', 'tone-green', null, 0));
    fc.appendChild(statCard('Despesa projetada', f.projectedExpense, '📤', 'tone-red', null, 1));
    fc.appendChild(statCard('Saldo previsto', f.projectedNet, '🔮', 'tone-blue', null, 2));
    root.appendChild(fc);

    // charts
    const grid = el('div', { class: 'dash-grid', style: { marginTop: '18px' } });
    const c1 = el('div', { class: 'card' });
    c1.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Evolução Receitas x Despesas' })]));
    const h1 = el('div'); c1.appendChild(h1);
    const ms = Store.monthlySeries(6);
    Charts.line(h1, { labels: ms.map((m) => m.label), sets: [
      { name: 'Receitas', color: cssVar('--series-2'), values: ms.map((m) => m.income) },
      { name: 'Despesas', color: cssVar('--series-6'), values: ms.map((m) => m.expense) },
    ] }, { height: 240 });
    c1.appendChild(el('div', { class: 'legend' }, [legendItem('Receitas', 'var(--series-2)'), legendItem('Despesas', 'var(--series-6)')]));
    grid.appendChild(c1);

    const c2 = el('div', { class: 'card' });
    c2.appendChild(el('div', { class: 'chart-head' }, [el('h3', { text: 'Distribuição de gastos' })]));
    const h2 = el('div'); c2.appendChild(h2);
    const cats = Store.spendByCategory(U.ymKey(new Date()));
    Charts.donut(h2, cats.map((c) => ({ label: c.cat.name, value: c.value, color: c.cat.color })), { size: 210 });
    const leg = el('div', { class: 'legend' }); cats.slice(0, 6).forEach((c) => leg.appendChild(legendItem(c.cat.name, c.cat.color))); c2.appendChild(leg);
    grid.appendChild(c2);
    root.appendChild(grid);
  };

  /* ---------- Achievements ---------- */
  const BADGES = [
    { id: 'first_tx', icon: '🌱', name: 'Primeiros passos', desc: 'Registre seu 1º lançamento', check: () => Store.data.transactions.length >= 1 },
    { id: 'saver', icon: '🐷', name: 'Poupador', desc: 'Guarde algo na reserva', check: () => Store.data.reserve.saved > 0 },
    { id: 'goal_done', icon: '🏆', name: 'Conquistador', desc: 'Complete uma meta', check: () => Store.data.goals.some((g) => g.done) },
    { id: 'budget_set', icon: '🎯', name: 'Planejador', desc: 'Defina um orçamento', check: () => Object.keys(Store.data.budgets).length > 0 },
    { id: 'reserve_half', icon: '🛡️', name: 'Blindado', desc: '50% da reserva', check: () => Store.data.reserve.target && Store.data.reserve.saved >= Store.data.reserve.target / 2 },
    { id: 'ten_tx', icon: '📊', name: 'Organizado', desc: '10+ lançamentos', check: () => Store.data.transactions.length >= 10 },
    { id: 'positive', icon: '💚', name: 'No azul', desc: 'Saldo positivo no mês', check: () => Store.monthTotals(U.ymKey(new Date())).net > 0 },
    { id: 'investor', icon: '📈', name: 'Investidor', desc: 'Registre um investimento', check: () => Store.data.transactions.some((t) => t.categoryId === 'c_invest') },
    { id: 'three_goals', icon: '⭐', name: 'Sonhador', desc: 'Crie 3 metas', check: () => Store.data.goals.length >= 3 },
  ];
  VIEWS.achievements = function (root) {
    root.innerHTML = '';
    const unlocked = BADGES.filter((b) => Store.data.achievements[b.id]).length;
    root.appendChild(pageHead('Conquistas', unlocked + ' de ' + BADGES.length + ' badges desbloqueados'));
    const prog = el('div', { class: 'card', style: { marginBottom: '18px' } }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } }, [el('b', { text: 'Progresso' }), el('b', { text: Math.round((unlocked / BADGES.length) * 100) + '%' })]),
      el('div', { class: 'progress' }, [el('i', { style: { width: '0%' } })]),
    ]);
    root.appendChild(prog);
    requestAnimationFrame(() => (prog.querySelector('i').style.width = (unlocked / BADGES.length) * 100 + '%'));
    const grid = el('div', { class: 'badges' });
    BADGES.forEach((b) => {
      const on = !!Store.data.achievements[b.id];
      grid.appendChild(el('div', { class: 'badge' + (on ? '' : ' locked') }, [
        el('span', { class: 'b-ic', text: b.icon }), el('b', { text: b.name }), el('small', { text: b.desc }),
        on ? el('div', { class: 'pill ok', style: { marginTop: '8px', display: 'inline-block' }, text: '✓ Desbloqueado' }) : el('div', { class: 'chip', style: { marginTop: '8px' }, text: '🔒 Bloqueado' }),
      ]));
    });
    root.appendChild(grid);
  };

  function checkAchievements(silent) {
    BADGES.forEach((b) => {
      if (!Store.data.achievements[b.id] && b.check()) {
        Store.data.achievements[b.id] = Date.now();
        if (!silent) { celebrate('🎖️ Nova conquista!', b.icon + ' ' + b.name); Store.pushNotif({ icon: b.icon, tone: 'info', title: 'Conquista: ' + b.name, sub: b.desc }); }
      }
    });
    Store.save();
  }

  /* ---------- Settings ---------- */
  VIEWS.settings = function (root) {
    root.innerHTML = '';
    root.appendChild(pageHead('Configurações', 'Perfil, tema, backup e dados'));
    const grid = el('div', { class: 'dash-grid' });

    // profile
    const prof = el('div', { class: 'card' });
    prof.appendChild(el('h3', { text: '👤 Perfil' }));
    const p = Store.data.profile;
    const nameI = inputField('Nome', 'text', p.name);
    prof.appendChild(nameI);
    prof.appendChild(el('div', { class: 'field' }, [el('span', { text: 'E-mail' }), el('div', { class: 'input', style: { opacity: .7 }, text: (Auth.current() || {}).email || '' })]));
    prof.appendChild(el('button', { class: 'btn btn-primary btn-sm', text: 'Salvar perfil', onclick: () => { p.name = nameI.querySelector('input').value.trim() || p.name; Store.save(); updateUserChip(); toast('Perfil atualizado'); } }));
    grid.appendChild(prof);

    // preferences
    const pref = el('div', { class: 'card' });
    pref.appendChild(el('h3', { text: '🎨 Preferências' }));
    pref.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' } }, [
      el('div', {}, [el('b', { text: 'Tema' }), el('div', { class: 'muted', style: { fontSize: '12.5px' }, text: 'Claro ou escuro' })]),
      el('div', { class: 'seg' }, [
        el('button', { class: document.documentElement.getAttribute('data-theme') === 'dark' ? 'active' : '', text: '🌙 Escuro', onclick: () => { if (document.documentElement.getAttribute('data-theme') !== 'dark') toggleTheme(); } }),
        el('button', { class: document.documentElement.getAttribute('data-theme') === 'light' ? 'active' : '', text: '☀️ Claro', onclick: () => { if (document.documentElement.getAttribute('data-theme') !== 'light') toggleTheme(); } }),
      ]),
    ]));
    pref.appendChild(el('div', { style: { padding: '10px 0' } }, [
      el('b', { text: 'Sensibilidade de alertas' }),
      el('div', { class: 'muted', style: { fontSize: '12.5px', marginBottom: '8px' }, text: 'Alerta quando gasto passa da média por este fator' }),
      (() => { const inp = el('input', { type: 'range', min: '1.1', max: '2', step: '0.05', value: Store.data.settings.alertThreshold, style: { width: '100%' } }); inp.oninput = () => { Store.data.settings.alertThreshold = parseFloat(inp.value); Store.save(); }; return inp; })(),
    ]));
    grid.appendChild(pref);
    root.appendChild(grid);

    // data / backup
    const data = el('div', { class: 'card', style: { marginTop: '16px' } });
    data.appendChild(el('h3', { text: '💾 Backup e dados' }));
    data.appendChild(el('p', { class: 'muted', style: { fontSize: '13px' }, text: 'Seus dados ficam salvos localmente neste navegador. Faça backups regularmente.' }));
    const btns = el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' } }, [
      el('button', { class: 'btn btn-primary btn-sm', text: '⬇️ Exportar backup (JSON)', onclick: () => { U.download('neofinance-backup-' + U.iso(new Date()) + '.json', Store.exportJSON(), 'application/json'); toast('Backup exportado'); } }),
      (() => { const lbl = el('label', { class: 'btn btn-ghost btn-sm', text: '⬆️ Importar backup' }); const inp = el('input', { type: 'file', accept: '.json', style: { display: 'none' } }); inp.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { Store.importJSON(r.result); toast('Backup restaurado'); go('dashboard'); } catch (err) { toast('Arquivo inválido', '', 'bad'); } }; r.readAsText(file); }; lbl.appendChild(inp); return lbl; })(),
      el('button', { class: 'btn btn-ghost btn-sm', text: '📊 Exportar Excel', onclick: exportExcel }),
      el('button', { class: 'btn btn-danger', text: '🧹 Zerar todos os dados', onclick: () => confirmDelete('todos os dados (lançamentos, contas, cartões, metas, etc.) e começar do zero', () => { Store.reset(); toast('Dados zerados'); go('dashboard'); }) }),
    ]);
    data.appendChild(btns);
    data.appendChild(el('div', { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' } }, [
      el('button', { class: 'btn btn-ghost', text: '🚪 Sair da conta', onclick: () => { Auth.logout(); location.reload(); } }),
    ]));
    root.appendChild(data);

    // auto-backup note
    if (localStorage.getItem('neofin:autobackup') !== U.iso(new Date())) {
      localStorage.setItem('neofin:autobackup', U.iso(new Date()));
    }
  };

  /* ---------- Widget config modal ---------- */
  function widgetModal() {
    const wrap = el('div');
    wrap.appendChild(el('h2', { text: 'Widgets do painel' }));
    wrap.appendChild(el('p', { class: 'modal-sub', text: 'Escolha o que aparece no dashboard' }));
    const W = Store.data.settings.widgets;
    const labels = { balance: 'Saldo', income: 'Receitas', expense: 'Despesas', investments: 'Investimentos', cashflow: 'Fluxo de caixa', categories: 'Categorias', budget: 'Orçamento', goals: 'Metas', ai: 'Assistente IA', upcoming: 'Vencimentos' };
    const row = el('div', { class: 'widget-toggle' });
    Object.keys(labels).forEach((k) => {
      const t = el('button', { class: 'wt' + (W[k] ? ' on' : ''), text: labels[k] });
      t.onclick = () => { W[k] = !W[k]; t.classList.toggle('on', W[k]); Store.save(); };
      row.appendChild(t);
    });
    wrap.appendChild(row);
    wrap.appendChild(el('button', { class: 'btn btn-primary btn-block', style: { marginTop: '16px' }, text: 'Aplicar', onclick: () => { closeModal(); go('dashboard'); } }));
    openModal(wrap);
  }

  /* =========================================================
     Export helpers
     ========================================================= */
  function exportCSV() {
    const rows = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma', 'Valor']];
    filteredTx().forEach((t) => rows.push([t.date, t.type === 'income' ? 'Receita' : 'Despesa', t.description, Store.cat(t.categoryId).name, methodLabel(t.method), String(t.amount).replace('.', ',')]));
    const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
    U.download('neofinance-lancamentos.csv', csv, 'text/csv');
    toast('CSV exportado');
  }
  function exportExcel() {
    // Excel-readable HTML table (.xls)
    const rows = Store.data.transactions.slice().sort((a, b) => b.date.localeCompare(a.date));
    let html = '<table border="1"><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th>Valor</th></tr>';
    rows.forEach((t) => { html += `<tr><td>${t.date}</td><td>${t.type === 'income' ? 'Receita' : 'Despesa'}</td><td>${U.esc(t.description)}</td><td>${U.esc(Store.cat(t.categoryId).name)}</td><td>${methodLabel(t.method)}</td><td>${t.amount}</td></tr>`; });
    html += '</table>';
    U.download('neofinance-relatorio.xls', '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>', 'application/vnd.ms-excel');
    toast('Excel exportado');
  }

  /* =========================================================
     Small form helpers
     ========================================================= */
  function inputField(label, type, value, placeholder) {
    return el('label', { class: 'field' }, [el('span', { text: label }), el('input', { type, value: value != null ? value : '', placeholder: placeholder || '' })]);
  }
  function labeledSelect(label, options, selected) {
    const s = el('select');
    options.forEach(([v, t]) => { const o = el('option', { value: v, text: t }); if (v === selected) o.selected = true; s.appendChild(o); });
    return el('label', { class: 'field' }, [el('span', { text: label }), s]);
  }
  function labeledWrap(label, node) { return el('label', { class: 'field' }, [el('span', { text: label }), node]); }
  function selectEl(key, opts, val) {
    const s = el('select', { class: 'select', 'data-k': key });
    opts.forEach((o) => { const op = el('option', { value: o.v, text: o.t }); if (o.v === val) op.selected = true; s.appendChild(op); });
    return s;
  }

  /* =========================================================
     Confirm + celebration
     ========================================================= */
  function confirmDelete(what, fn) {
    const wrap = el('div');
    wrap.appendChild(el('h2', { text: 'Confirmar' }));
    wrap.appendChild(el('p', { class: 'modal-sub', text: 'Deseja realmente excluir ' + what + '? Esta ação não pode ser desfeita.' }));
    wrap.appendChild(el('div', { class: 'form-actions' }, [
      el('button', { class: 'btn btn-ghost btn-block', text: 'Cancelar', onclick: closeModal }),
      el('button', { class: 'btn btn-danger btn-block', text: 'Excluir', onclick: () => { fn(); closeModal(); } }),
    ]));
    openModal(wrap);
  }

  function celebrate(title, sub) {
    confettiBurst(40);
    toast(title, sub, 'good');
  }
  function confettiBurst(n) {
    const colors = ['#23f0a6', '#38bdf8', '#4f8bff', '#fab219', '#e66767', '#9085e9'];
    for (let i = 0; i < n; i++) {
      const c = el('div', { class: 'confetti' });
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }

  // start
  document.addEventListener('DOMContentLoaded', boot);
  window.NeoFinance = App;
})(window);
