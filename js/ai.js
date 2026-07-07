/* ============================================================
   ai.js — rule-based "AI" financial insights & forecasting
   Analyzes spending habits and produces tips, forecast, alerts.
   ============================================================ */
(function (w) {
  const U = w.U, Store = w.Store;
  const AI = {};

  // Forecast end-of-month balance from run-rate of expenses + expected income
  AI.forecastMonth = function () {
    const now = new Date();
    const ym = U.ymKey(now);
    const dom = now.getDate();
    const daysInMonth = U.endOfMonth(now).getDate();
    const t = Store.monthTotals(ym);
    const dailyExpense = dom > 0 ? t.expense / dom : 0;
    const projectedExpense = dailyExpense * daysInMonth;
    // expected income: use avg of last 3 months income if current is low
    const hist = Store.monthlySeries(4).slice(0, 3);
    const avgIncome = U.sum(hist, (h) => h.income) / (hist.length || 1);
    const expectedIncome = Math.max(t.income, avgIncome);
    const projectedNet = expectedIncome - projectedExpense;
    return {
      projectedExpense, expectedIncome, projectedNet,
      dailyExpense, daysLeft: daysInMonth - dom,
      currentNet: t.net,
      endBalance: Store.balance() + (projectedNet - t.net),
    };
  };

  // Smart tips based on habits
  AI.tips = function () {
    const tips = [];
    const now = new Date();
    const ym = U.ymKey(now);
    const prevYm = U.ymKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const cats = Store.spendByCategory(ym);
    const prevTotals = Store.monthTotals(prevYm);
    const curTotals = Store.monthTotals(ym);

    // 1. category over average
    cats.forEach((c) => {
      const avg = Store.avgCategorySpend(c.id, 3);
      if (avg > 0 && c.value > avg * (Store.data.settings.alertThreshold || 1.25)) {
        tips.push({ icon: '⚠️', tone: 'warn', text: `Gastos em <b>${c.cat.name}</b> estão ${U.pct(((c.value / avg) - 1) * 100)} acima da sua média. Já foram ${U.brl(c.value)} este mês.` });
      }
    });

    // 2. subscriptions weight
    const subs = U.sum(Store.data.subscriptions.filter((s) => s.active), (s) => s.amount);
    if (subs > 0) {
      const income = curTotals.income || 1;
      tips.push({ icon: '📺', tone: 'info', text: `Suas assinaturas somam <b>${U.brl(subs)}/mês</b> (${U.pct((subs / income) * 100)} da renda). Revisar as pouco usadas pode economizar <b>${U.brl(subs * 0.3 * 12)}/ano</b>.` });
    }

    // 3. savings rate
    if (curTotals.income > 0) {
      const rate = (curTotals.net / curTotals.income) * 100;
      if (rate < 10) tips.push({ icon: '🎯', tone: 'warn', text: `Sua taxa de poupança este mês é de <b>${U.pct(rate)}</b>. A meta saudável é 20%. Tente reduzir gastos variáveis.` });
      else if (rate >= 20) tips.push({ icon: '🌟', tone: 'good', text: `Excelente! Você poupou <b>${U.pct(rate)}</b> da sua renda este mês. Continue assim e considere investir o excedente.` });
    }

    // 4. expense trend
    if (prevTotals.expense > 0) {
      const delta = ((curTotals.expense - prevTotals.expense) / prevTotals.expense) * 100;
      if (delta > 15) tips.push({ icon: '📈', tone: 'warn', text: `Seus gastos cresceram <b>${U.pct(delta)}</b> vs. mês passado. Fique atento ao ritmo.` });
      else if (delta < -10) tips.push({ icon: '📉', tone: 'good', text: `Parabéns! Você reduziu os gastos em <b>${U.pct(Math.abs(delta))}</b> comparado ao mês anterior.` });
    }

    // 5. reserve
    const r = Store.data.reserve;
    const pct = r.target ? (r.saved / r.target) * 100 : 0;
    if (pct < 100) {
      const months = r.monthlyExpense ? (r.saved / r.monthlyExpense) : 0;
      tips.push({ icon: '🛡️', tone: 'info', text: `Sua reserva cobre <b>${months.toFixed(1)} meses</b> de despesas. O ideal são 6 meses — faltam <b>${U.brl(Math.max(0, r.target - r.saved))}</b>.` });
    }

    // 6. biggest category
    if (cats[0]) tips.push({ icon: cats[0].cat.icon, tone: 'info', text: `Seu maior gasto do mês é <b>${cats[0].cat.name}</b> com ${U.brl(cats[0].value)}. Definir um orçamento aqui traz o maior impacto.` });

    return tips.slice(0, 5);
  };

  // Live alerts (also written to notifications)
  AI.alerts = function () {
    const out = [];
    Store.upcoming(5).forEach((b) => {
      out.push({ icon: '📅', tone: b.days <= 2 ? 'bad' : 'warn', title: `${b.name} vence em ${b.days === 0 ? 'hoje' : b.days + ' dia(s)'}`, sub: `${b.kind} · ${U.brl(b.amount)}` });
    });
    const now = new Date();
    Store.spendByCategory(U.ymKey(now)).forEach((c) => {
      const budget = Store.data.budgets[c.id];
      if (budget && c.value > budget) out.push({ icon: '🚨', tone: 'bad', title: `Orçamento estourado: ${c.cat.name}`, sub: `${U.brl(c.value)} de ${U.brl(budget)}` });
    });
    return out;
  };

  // Investment / savings simulator (compound interest)
  AI.simulate = function ({ initial = 0, monthly = 0, months = 12, ratePct = 0.8 }) {
    const r = ratePct / 100;
    const series = [];
    let bal = initial, invested = initial;
    for (let m = 1; m <= months; m++) {
      bal = bal * (1 + r) + monthly;
      invested += monthly;
      series.push({ m, bal, invested });
    }
    return { final: bal, invested, earnings: bal - invested, series };
  };

  w.AI = AI;
})(window);
