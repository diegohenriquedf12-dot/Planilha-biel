/* ============================================================
   store.js — localStorage data layer, seed data, backup
   ============================================================ */
(function (w) {
  const U = w.U;
  const KEY = (email) => 'neofin:data:' + (email || 'demo');

  const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7', '--series-8'];

  const DEFAULT_CATEGORIES = [
    { id: 'c_food', name: 'Alimentação', icon: '🍽️', color: '#e66767', type: 'expense' },
    { id: 'c_home', name: 'Moradia', icon: '🏠', color: '#3987e5', type: 'expense' },
    { id: 'c_transp', name: 'Transporte', icon: '🚗', color: '#c98500', type: 'expense' },
    { id: 'c_health', name: 'Saúde', icon: '💊', color: '#199e70', type: 'expense' },
    { id: 'c_fun', name: 'Lazer', icon: '🎮', color: '#9085e9', type: 'expense' },
    { id: 'c_edu', name: 'Educação', icon: '📚', color: '#38bdf8', type: 'expense' },
    { id: 'c_shop', name: 'Compras', icon: '🛍️', color: '#d55181', type: 'expense' },
    { id: 'c_sub', name: 'Assinaturas', icon: '📺', color: '#d95926', type: 'expense' },
    { id: 'c_salary', name: 'Salário', icon: '💼', color: '#23f0a6', type: 'income' },
    { id: 'c_extra', name: 'Renda Extra', icon: '✨', color: '#38bdf8', type: 'income' },
    { id: 'c_invest', name: 'Investimentos', icon: '📈', color: '#4f8bff', type: 'income' },
  ];

  function seed() {
    const now = new Date();
    const tx = [];
    const rnd = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

    // build 6 months of history
    for (let m = 5; m >= 0; m--) {
      const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
      // salary
      tx.push(mk('income', 'c_salary', 'Salário mensal', 7200, new Date(base.getFullYear(), base.getMonth(), 5), 'pix'));
      if (Math.random() > .4) tx.push(mk('income', 'c_extra', 'Freelance', rnd(400, 1400), new Date(base.getFullYear(), base.getMonth(), 12 + (m % 6)), 'pix'));
      tx.push(mk('income', 'c_invest', 'Rendimentos', rnd(120, 380), new Date(base.getFullYear(), base.getMonth(), 28), 'transfer'));
      // recurring expenses
      tx.push(mk('expense', 'c_home', 'Aluguel', 1650, new Date(base.getFullYear(), base.getMonth(), 8), 'boleto'));
      tx.push(mk('expense', 'c_home', 'Energia + Água', rnd(180, 320), new Date(base.getFullYear(), base.getMonth(), 15), 'boleto'));
      tx.push(mk('expense', 'c_sub', 'Streaming & Apps', 119.7, new Date(base.getFullYear(), base.getMonth(), 10), 'credit'));
      // variable
      const nFood = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < nFood; i++) tx.push(mk('expense', 'c_food', pick(['Mercado', 'Restaurante', 'iFood', 'Padaria']), rnd(28, 260), new Date(base.getFullYear(), base.getMonth(), 3 + Math.floor(Math.random() * 25)), pick(['credit', 'debit', 'pix'])));
      for (let i = 0; i < 4; i++) tx.push(mk('expense', 'c_transp', pick(['Combustível', 'Uber', 'Estacionamento']), rnd(20, 180), new Date(base.getFullYear(), base.getMonth(), 2 + Math.floor(Math.random() * 26)), pick(['credit', 'debit'])));
      for (let i = 0; i < 3; i++) tx.push(mk('expense', 'c_fun', pick(['Cinema', 'Bar', 'Show', 'Jogo']), rnd(35, 220), new Date(base.getFullYear(), base.getMonth(), 5 + Math.floor(Math.random() * 22)), 'credit'));
      if (Math.random() > .5) tx.push(mk('expense', 'c_shop', pick(['Roupas', 'Eletrônico', 'Casa']), rnd(90, 650), new Date(base.getFullYear(), base.getMonth(), 14), 'credit'));
      if (Math.random() > .6) tx.push(mk('expense', 'c_health', pick(['Farmácia', 'Consulta', 'Academia']), rnd(60, 300), new Date(base.getFullYear(), base.getMonth(), 18), 'debit'));
    }

    function mk(type, cat, desc, amount, date, method) {
      return { id: U.uid(), type, categoryId: cat, description: desc, amount: +amount, date: U.iso(date), method, attachment: null, note: '' };
    }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

    const ym = U.ymKey(now);
    return {
      version: 3,
      profile: { name: 'Gabriel', currency: 'BRL', avatar: 'G' },
      settings: {
        theme: 'dark',
        widgets: { balance: true, income: true, expense: true, investments: true, cashflow: true, categories: true, budget: true, goals: true, ai: true, upcoming: true },
        alertThreshold: 1.25, // spend > 125% of avg triggers alert
      },
      categories: DEFAULT_CATEGORIES,
      transactions: tx,
      accounts: [
        { id: U.uid(), name: 'Aluguel', amount: 1650, dueDay: 8, kind: 'fixed', categoryId: 'c_home', active: true },
        { id: U.uid(), name: 'Internet + Telefone', amount: 129.9, dueDay: 12, kind: 'fixed', categoryId: 'c_home', active: true },
        { id: U.uid(), name: 'Energia elétrica', amount: 240, dueDay: 15, kind: 'variable', categoryId: 'c_home', active: true },
        { id: U.uid(), name: 'Plano de saúde', amount: 389, dueDay: 20, kind: 'fixed', categoryId: 'c_health', active: true },
        { id: U.uid(), name: 'Academia', amount: 99.9, dueDay: 5, kind: 'fixed', categoryId: 'c_health', active: true },
      ],
      cards: [
        { id: U.uid(), name: 'Nubank', brand: 'Mastercard', last4: '4821', color: 'linear-gradient(135deg,#7c3aed,#4f8bff)', limit: 8000, closeDay: 3, dueDay: 10,
          invoices: [
            { ym, items: [
              { id: U.uid(), desc: 'Mercado', amount: 420.5, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 2)), installments: 1, current: 1 },
              { id: U.uid(), desc: 'Notebook (parcela)', amount: 333.33, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 4)), installments: 12, current: 3 },
              { id: U.uid(), desc: 'Restaurante', amount: 156.9, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 6)), installments: 1, current: 1 },
              { id: U.uid(), desc: 'Streaming', amount: 55.9, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 10)), installments: 1, current: 1 },
            ] },
          ] },
        { id: U.uid(), name: 'Itaú Black', brand: 'Visa', last4: '9032', color: 'linear-gradient(135deg,#0f172a,#334155)', limit: 15000, closeDay: 28, dueDay: 7,
          invoices: [
            { ym, items: [
              { id: U.uid(), desc: 'Passagens aéreas', amount: 611.1, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 1)), installments: 6, current: 2 },
              { id: U.uid(), desc: 'Farmácia', amount: 89.4, date: U.iso(new Date(now.getFullYear(), now.getMonth(), 9)), installments: 1, current: 1 },
            ] },
          ] },
      ],
      goals: [
        { id: U.uid(), name: 'Viagem Europa', icon: '✈️', target: 18000, saved: 7400, deadline: U.iso(new Date(now.getFullYear() + 1, 5, 1)), color: '#38bdf8', done: false },
        { id: U.uid(), name: 'Trocar de carro', icon: '🚙', target: 45000, saved: 12800, deadline: U.iso(new Date(now.getFullYear() + 1, 11, 1)), color: '#23f0a6', done: false },
        { id: U.uid(), name: 'Notebook novo', icon: '💻', target: 6000, saved: 6000, deadline: U.iso(new Date(now.getFullYear(), now.getMonth() + 1, 1)), color: '#9085e9', done: true },
      ],
      subscriptions: [
        { id: U.uid(), name: 'Netflix', icon: '🎬', amount: 44.9, dueDay: 10, color: '#e50914', active: true },
        { id: U.uid(), name: 'Spotify', icon: '🎵', amount: 21.9, dueDay: 15, color: '#1db954', active: true },
        { id: U.uid(), name: 'iCloud', icon: '☁️', amount: 12.9, dueDay: 3, color: '#38bdf8', active: true },
        { id: U.uid(), name: 'Amazon Prime', icon: '📦', amount: 19.9, dueDay: 22, color: '#ff9900', active: true },
        { id: U.uid(), name: 'ChatGPT Plus', icon: '🤖', amount: 110, dueDay: 18, color: '#10a37f', active: true },
      ],
      reserve: { target: 24000, saved: 15600, monthlyExpense: 4000 },
      budgets: { // per category monthly limit
        c_food: 1400, c_transp: 700, c_fun: 500, c_shop: 600, c_health: 400, c_sub: 250,
      },
      achievements: {},
      notifications: [],
    };
  }

  const Store = {
    email: null,
    data: null,

    load(email) {
      this.email = email;
      const raw = localStorage.getItem(KEY(email));
      if (raw) {
        try { this.data = JSON.parse(raw); } catch (e) { this.data = seed(); }
      } else {
        this.data = seed();
        this.save();
      }
      if (!this.data.notifications) this.data.notifications = [];
      return this.data;
    },
    save() { if (this.email) localStorage.setItem(KEY(this.email), JSON.stringify(this.data)); },
    reset() { this.data = seed(); this.save(); },

    // ----- getters -----
    cat(id) { return this.data.categories.find((c) => c.id === id) || { name: 'Sem categoria', icon: '❓', color: '#6f7a8d' }; },
    seriesColor(i) { return getComputedStyle(document.documentElement).getPropertyValue(SERIES[i % SERIES.length]).trim(); },

    txInMonth(ym) { return this.data.transactions.filter((t) => U.ymKey(t.date) === ym); },
    txInRange(from, to) { return this.data.transactions.filter((t) => t.date >= from && t.date <= to); },

    monthTotals(ym) {
      const list = this.txInMonth(ym);
      const income = U.sum(list.filter((t) => t.type === 'income'), (t) => t.amount);
      const expense = U.sum(list.filter((t) => t.type === 'expense'), (t) => t.amount);
      return { income, expense, net: income - expense };
    },

    balance() {
      const income = U.sum(this.data.transactions.filter((t) => t.type === 'income'), (t) => t.amount);
      const expense = U.sum(this.data.transactions.filter((t) => t.type === 'expense'), (t) => t.amount);
      return income - expense;
    },

    investments() {
      // rendimentos + a portion (patrimônio investido). We model invested = reserve.saved + goals invested proxy
      const rend = U.sum(this.data.transactions.filter((t) => t.categoryId === 'c_invest'), (t) => t.amount);
      return rend + this.data.reserve.saved;
    },

    netWorth() {
      const cash = this.balance();
      const invested = this.data.reserve.saved + U.sum(this.data.goals, (g) => g.saved);
      const cardDebt = U.sum(this.data.cards, (c) => this.cardInvoiceTotal(c));
      return cash + invested - cardDebt;
    },

    cardInvoiceTotal(card, ym) {
      const key = ym || U.ymKey(new Date());
      const inv = card.invoices.find((i) => i.ym === key) || card.invoices[card.invoices.length - 1];
      if (!inv) return 0;
      return U.sum(inv.items, (i) => i.amount);
    },

    monthlySeries(nMonths = 6) {
      const now = new Date();
      const out = [];
      for (let m = nMonths - 1; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const ym = U.ymKey(d);
        const t = this.monthTotals(ym);
        out.push({ ym, label: U.monthLabel(ym), income: t.income, expense: t.expense, net: t.net });
      }
      return out;
    },

    spendByCategory(ym) {
      const list = this.txInMonth(ym).filter((t) => t.type === 'expense');
      const map = {};
      list.forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
      return Object.entries(map).map(([id, v]) => ({ id, cat: this.cat(id), value: v })).sort((a, b) => b.value - a.value);
    },

    avgCategorySpend(catId, months = 3) {
      const now = new Date();
      let total = 0, n = 0;
      for (let m = 1; m <= months; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const list = this.txInMonth(U.ymKey(d)).filter((t) => t.categoryId === catId);
        total += U.sum(list, (t) => t.amount); n++;
      }
      return n ? total / n : 0;
    },

    // upcoming bills within N days (accounts, subs, cards)
    upcoming(days = 14) {
      const now = new Date();
      const out = [];
      const addDue = (dueDay, name, amount, icon, kind) => {
        let d = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
        const diff = U.daysBetween(now, d);
        if (diff <= days) out.push({ name, amount, icon, kind, date: U.iso(d), days: diff });
      };
      this.data.accounts.filter((a) => a.active).forEach((a) => addDue(a.dueDay, a.name, a.amount, this.cat(a.categoryId).icon, a.kind === 'fixed' ? 'Conta fixa' : 'Conta variável'));
      this.data.subscriptions.filter((s) => s.active).forEach((s) => addDue(s.dueDay, s.name, s.amount, s.icon, 'Assinatura'));
      this.data.cards.forEach((c) => addDue(c.dueDay, 'Fatura ' + c.name, this.cardInvoiceTotal(c), '💳', 'Cartão'));
      return out.sort((a, b) => a.days - b.days);
    },

    // ----- mutations -----
    addTx(t) { t.id = t.id || U.uid(); this.data.transactions.push(t); this.save(); },
    updateTx(id, patch) { const t = this.data.transactions.find((x) => x.id === id); if (t) Object.assign(t, patch); this.save(); },
    removeTx(id) { this.data.transactions = this.data.transactions.filter((t) => t.id !== id); this.save(); },

    pushNotif(n) {
      n.id = U.uid(); n.time = Date.now(); n.read = false;
      this.data.notifications.unshift(n);
      this.data.notifications = this.data.notifications.slice(0, 40);
      this.save();
    },

    exportJSON() { return JSON.stringify(this.data, null, 2); },
    importJSON(str) { this.data = JSON.parse(str); this.save(); },
  };

  Store.SERIES = SERIES;
  w.Store = Store;
})(window);
