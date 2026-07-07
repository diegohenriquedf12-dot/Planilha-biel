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

  // Estado inicial ZERADO — sem dados de exemplo. Apenas as categorias
  // padrão são mantidas (necessárias para cadastrar lançamentos).
  function seed() {
    return {
      version: 4,
      profile: { name: '', currency: 'BRL', avatar: '' },
      settings: {
        theme: 'dark',
        widgets: { balance: true, income: true, expense: true, investments: true, cashflow: true, categories: true, budget: true, goals: true, ai: true, upcoming: true },
        alertThreshold: 1.25, // alerta quando o gasto passa da média por este fator
      },
      categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
      transactions: [],
      accounts: [],
      cards: [],
      goals: [],
      subscriptions: [],
      reserve: { target: 0, saved: 0, monthlyExpense: 0 },
      budgets: {},
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
