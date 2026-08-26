const Analytics = {
  claims: [],
  charts: {},

  async init() {
    await this.load();
  },

  async load() {
    const el = $('analytics-charts');
    if (!el) return;
    el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Loading analytics...</div>';

    try {
      const { data, error } = await sb.from('appointments').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) throw error;
      this.claims = data || [];
      this.render();
    } catch (e) {
      el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message) + '</div>';
    }
  },

  render() {
    const el = $('analytics-charts');
    if (!el) return;

    const totalRevenue = this.claims.reduce((s, c) => s + Number(c.base_price || c.price_credits || 0), 0);
    const statusCounts = {};
    this.claims.forEach(c => {
      const s = (c.status || 'unknown').toLowerCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    $('analytics-stats') && ($('analytics-stats').innerHTML =
      stat('chart-line', 'Total Revenue', fmtMoney(totalRevenue), 'blue') +
      stat('file-invoice-dollar', 'Total Claims', this.claims.length, 'teal'));

    el.innerHTML = '<div class="chart-container"><canvas id="status-chart"></canvas></div>' +
      '<div class="chart-container"><canvas id="revenue-chart"></canvas></div>';

    if (window.Chart && $('status-chart')) {
      const ctx = $('status-chart').getContext('2d');
      this.charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Claims by Status' } } }
      });
    }

    if (window.Chart && $('revenue-chart')) {
      const monthly = {};
      this.claims.forEach(c => {
        const d = c.timestamp || c.created_at;
        if (!d) return;
        const key = d.substring(0, 7);
        monthly[key] = (monthly[key] || 0) + Number(c.base_price || c.price_credits || 0);
      });
      const months = Object.keys(monthly).sort();
      const ctx2 = $('revenue-chart').getContext('2d');
      this.charts.revenue = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{ label: 'Revenue', data: months.map(m => monthly[m]), backgroundColor: '#3b82f6' }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Monthly Revenue' } }, scales: { y: { beginAtZero: true } } }
      });
    }
  }
};
