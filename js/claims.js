const Claims = {
  claims: [],
  patientMap: {},
  stats: { total: 0, pending: 0, approved: 0, rejected: 0, revenue: 0 },

  async init() {
    await this.load();
  },

  async load() {
    const el = $('claim-list');
    if (!el) return;
    el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Loading claims...</div>';

    try {
      const { data: profiles } = await sb.from('Profiles').select('id, name');
      (profiles || []).forEach(p => { this.patientMap[p.id] = p.name; });

      const { data, error } = await sb.from('appointments').select('*').order('timestamp', { ascending: false }).limit(50);
      if (error) throw error;
      this.claims = data || [];
      this.computeStats();
      this.render();
    } catch (e) {
      el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message) + '</div>';
    }
  },

  computeStats() {
    this.stats = { total: this.claims.length, pending: 0, approved: 0, rejected: 0, revenue: 0 };
    this.claims.forEach(c => {
      const s = (c.status || '').toLowerCase();
      if (s === 'pending' || s === 'scheduled' || s === 'booked') this.stats.pending++;
      else if (s === 'completed' || s === 'approved' || s === 'paid') { this.stats.approved++; this.stats.revenue += Number(c.base_price || c.price_credits || 0); }
      else if (s === 'rejected' || s === 'cancelled') this.stats.rejected++;
    });
    $('claim-stats') && ($('claim-stats').innerHTML =
      stat('file-invoice-dollar', 'Total Claims', this.stats.total, 'blue') +
      stat('clock', 'Pending', this.stats.pending, 'amber') +
      stat('check-circle', 'Approved', this.stats.approved, 'green') +
      stat('times-circle', 'Rejected', this.stats.rejected, 'red') +
      stat('dollar-sign', 'Revenue', fmtMoney(this.stats.revenue), 'teal'));
  },

  render() {
    const el = $('claim-list');
    if (!el) return;

    const rows = this.claims.map(c => '<tr>' +
      '<td>' + esc(String(c.id || '—')) + '</td>' +
      '<td>' + fmtDate(c.timestamp || c.created_at) + '</td>' +
      '<td>' + esc(this.patientMap[c.patient_id] || 'Patient #' + c.patient_id) + '</td>' +
      '<td>' + esc(c.appointment_type || '—') + '</td>' +
      '<td>' + fmtMoney(c.base_price || c.price_credits || 0) + '</td>' +
      '<td>' + tag((c.status || '').toLowerCase()) + '</td>' +
      '<td><button class="em-btn sm ghost" onclick="Claims.view(' + c.id + ')">View</button></td>' +
      '</tr>').join('');

    el.innerHTML = makeTable(['ID', 'Date', 'Patient', 'Type', 'Amount', 'Status', ''], rows);
  },

  view(id) {
    const claim = this.claims.find(c => c.id == id);
    if (!claim) return;

    $('modal-form').innerHTML =
      '<p><strong>Date:</strong> ' + fmtDate(claim.timestamp || claim.created_at) + '</p>' +
      '<p><strong>Patient:</strong> ' + esc(this.patientMap[claim.patient_id] || 'Patient #' + claim.patient_id) + '</p>' +
      '<p><strong>Type:</strong> ' + esc(claim.appointment_type || '—') + '</p>' +
      '<p><strong>Tier:</strong> ' + esc(claim.service_tier || '—') + '</p>' +
      '<p><strong>Base Price:</strong> ' + fmtMoney(claim.base_price) + '</p>' +
      '<p><strong>Price (credits):</strong> ' + fmtMoney(claim.price_credits) + '</p>' +
      '<p><strong>Platform Fee:</strong> ' + fmtMoney(claim.platform_fee) + '</p>' +
      '<p><strong>Doctor Earnings:</strong> ' + fmtMoney(claim.doctor_earnings) + '</p>' +
      '<p><strong>Status:</strong> ' + tag((claim.status || '').toLowerCase()) + '</p>' +
      '<p><strong>Reason:</strong> ' + esc(claim.reason || '—') + '</p>' +
      '<p><strong>Escrow:</strong> ' + esc(claim.escrow_status || '—') + '</p>';

    $('modal-title').textContent = 'Appointment #' + id;
    $('modal-overlay').classList.add('open');
  }
};
