const Patients = {
  patients: [],
  selectedId: null,
  doctorMap: {},

  async init() {
    await this.load();
  },

  async load() {
    const el = $('patient-list');
    if (!el) return;
    el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Loading patients...</div>';

    try {
      // Load doctors for name lookup
      const { data: doctors } = await sb.from('Doctors').select('id, user_id, name, specialty');
      (doctors || []).forEach(d => { this.doctorMap[d.id] = d.name || d.user_id; });

      const { data, error } = await sb.from('Profiles').select('*').order('name', { ascending: true }).limit(50);
      if (error) throw error;
      this.patients = data || [];

      // Load stats
      this.renderStats();
      this.renderList();
    } catch (e) {
      el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message) + '</div>';
    }
  },

  renderStats() {
    const total = this.patients.length;
    const active = this.patients.filter(p => p.is_active).length;
    const verified = this.patients.filter(p => p.email_verified).length;
    const totalCredits = this.patients.reduce((s, p) => s + (p.credits || 0), 0);

    $('patient-stats') && ($('patient-stats').innerHTML =
      stat('users', 'Total Patients', total, 'blue') +
      stat('user-check', 'Active', active, 'green') +
      stat('shield-halved', 'Verified', verified, 'teal') +
      stat('coins', 'Total Credits', fmtMoney(totalCredits), 'purple'));
  },

  renderList() {
    const el = $('patient-list');
    if (!el) return;

    if (this.patients.length === 0) {
      el.innerHTML = '<div class="empty-state"><i class="fas fa-user-injured"></i> No patients found</div>';
      return;
    }

    el.innerHTML = this.patients.map(p => {
      const name = p.name || 'Unknown';
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      return '<div class="patient-row' + (this.selectedId == p.id ? ' selected' : '') + '" onclick="Patients.select(' + p.id + ')">' +
        '<div class="patient-avatar">' + esc(initials) + '</div>' +
        '<div class="patient-info"><div class="patient-name">' + esc(name) + '</div>' +
        '<div class="patient-meta">' + esc(p.email || '') + ' · ' + esc(p.role || 'patient') + '</div></div>' +
        '<div class="patient-actions">' +
        '<button class="em-btn sm ghost" onclick="event.stopPropagation();Patients.select(' + p.id + ')"><i class="fas fa-eye"></i></button>' +
        '<button class="em-btn sm primary" onclick="event.stopPropagation();Workspace.open(' + p.id + ')"><i class="fas fa-arrow-right"></i></button>' +
        '</div></div>';
    }).join('');
  },

  async search(query) {
    if (!query || query.length < 2) { this.renderList(); return; }

    try {
      const { data } = await sb.from('Profiles').select('*')
        .or('name.ilike.%' + query + '%,email.ilike.%' + query + '%')
        .limit(20);
      this.patients = data || [];
      this.renderList();
    } catch (e) {
      console.warn('Search failed:', e);
    }
  },

  async select(id) {
    this.selectedId = id;
    this.renderList();

    const detailEl = $('patient-detail');
    if (!detailEl) return;
    detailEl.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Loading patient details...</div>';
    show(detailEl);

    try {
      const { data: profile } = await sb.from('Profiles').select('*').eq('id', String(id)).limit(1);
      const patient = profile && profile.length > 0 ? profile[0] : {};

      const { data: appointments } = await sb.from('appointments').select('*').eq('patient_id', String(id)).order('timestamp', { ascending: false }).limit(10);
      const { data: records } = await sb.from('medical_records').select('*').eq('patient_id', String(id)).order('created_at', { ascending: false }).limit(10);

      const name = patient.name || 'Unknown';
      const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

      let html = '<div class="detail-header">' +
        '<div class="patient-avatar" style="width:56px;height:56px;font-size:1.3rem;">' + esc(initials) + '</div>' +
        '<div style="flex:1"><h3>' + esc(name) + '</h3>' +
        '<div style="font-size:0.85rem;color:var(--text-muted)">' + esc(patient.email || '') + '</div></div>' +
        '<button class="em-btn sm ghost" onclick="Patients.closeDetail()"><i class="fas fa-times"></i></button>' +
        '</div>';

      // Profile info
      html += '<div class="detail-section"><h4><i class="fas fa-id-card"></i> Profile Information</h4>' +
        '<div class="detail-grid">' +
        this.detailRow('Role', patient.role || '—') +
        this.detailRow('Email', patient.email || '—') +
        this.detailRow('Phone', patient.phone || '—') +
        this.detailRow('Credits', fmtMoney(patient.credits)) +
        this.detailRow('Verification', patient.verification_level || '—') +
        this.detailRow('Active', patient.is_active ? 'Yes' : 'No') +
        this.detailRow('Email Verified', patient.email_verified ? 'Yes' : 'No') +
        this.detailRow('Joined', fmtDate(patient.created_at)) +
        '</div></div>';

      // Appointments
      html += '<div class="detail-section"><h4><i class="fas fa-calendar-check"></i> Appointments (' + (appointments ? appointments.length : 0) + ')</h4>';
      if (appointments && appointments.length) {
        html += '<div class="mini-list">';
        appointments.forEach(a => {
          const docName = this.doctorMap[a.doctor_id] || 'Doctor #' + a.doctor_id;
          html += '<div class="mini-item">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<strong>' + esc(a.appointment_type || 'Visit') + '</strong> ' + tag((a.status || '').toLowerCase()) +
            '</div>' +
            '<div class="mini-sub">' + fmtDate(a.timestamp) + ' · Dr. ' + esc(docName) + ' · ' + fmtMoney(a.base_price) + '</div>' +
            (a.reason ? '<div class="mini-sub">' + esc(a.reason) + '</div>' : '') +
            '</div>';
        });
        html += '</div>';
      } else {
        html += '<p class="text-muted">No appointments found.</p>';
      }
      html += '</div>';

      // Medical Records
      html += '<div class="detail-section"><h4><i class="fas fa-file-medical"></i> Medical Records (' + (records ? records.length : 0) + ')</h4>';
      if (records && records.length) {
        html += '<div class="mini-list">';
        records.forEach(r => {
          const docName = this.doctorMap[r.doctor_id] || 'Doctor #' + r.doctor_id;
          html += '<div class="mini-item">' +
            '<strong>' + esc(r.diagnosis || r.title || 'Record') + '</strong>' +
            '<div class="mini-sub">' + fmtDate(r.created_at) + ' · Dr. ' + esc(docName) + ' · ' + esc(r.type || 'general') + '</div>' +
            (r.summary ? '<div class="mini-sub" style="margin-top:0.25rem;color:var(--text);">' + esc(r.summary).substring(0, 200) + (r.summary.length > 200 ? '...' : '') + '</div>' : '') +
            '</div>';
        });
        html += '</div>';
      } else {
        html += '<p class="text-muted">No medical records found.</p>';
      }
      html += '</div>';

      // Actions
      html += '<div class="detail-section" style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;gap:0.5rem;">' +
        '<button class="em-btn primary" onclick="Workspace.open(' + id + ')"><i class="fas fa-arrow-right"></i> Open Workspace</button> ' +
        '<button class="em-btn ghost" onclick="ClinicalBrief.open(' + id + ')"><i class="fas fa-file-medical"></i> Clinical Brief</button>' +
        '</div>';

      detailEl.innerHTML = html;

    } catch (e) {
      detailEl.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message) + '</div>';
    }
  },

  detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + esc(String(value)) + '</span></div>';
  },

  closeDetail() {
    this.selectedId = null;
    hide($('patient-detail'));
    this.renderList();
  }
};
