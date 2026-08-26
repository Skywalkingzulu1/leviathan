const ClinicalBrief = {
  _patientId: null,
  _data: null,

  async open(patientId) {
    this._patientId = patientId;
    this._data = null;

    const el = $('clinical-drawer');
    if (!el) return;
    el.classList.add('open');
    el.innerHTML = '<div class="drawer-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading clinical brief...</div>';

    try {
      const profile = await this.fetchProfile(patientId);
      const records = await this.fetchRecords(patientId);

      this._data = { profile, records };
      this.render();
    } catch (e) {
      el.innerHTML = '<div class="drawer-error"><i class="fas fa-exclamation-triangle"></i> Error loading clinical brief: ' + esc(e.message) + '</div>';
    }
  },

  close() {
    const el = $('clinical-drawer');
    if (el) el.classList.remove('open');
  },

  async fetchProfile(id) {
    const { data } = await sb.from('Profiles').select('*').eq('id', String(id)).limit(1);
    return data && data.length > 0 ? data[0] : null;
  },

  async fetchRecords(patientId) {
    try {
      const { data } = await sb.from('medical_records').select('*').eq('patient_id', String(patientId)).order('created_at', { ascending: false }).limit(10);
      return data || [];
    } catch (e) { return []; }
  },

  render() {
    const el = $('clinical-drawer');
    if (!el || !this._data) return;
    const { profile, records } = this._data;
    const p = profile || {};

    const recentDiagnoses = records.length
      ? records.map(r => '<li><strong>' + esc(r.diagnosis || r.title || 'Unknown') + '</strong> — ' + esc((r.summary || '—').substring(0, 200)) + '</li>').join('')
      : '<li>Not documented</li>';

    el.innerHTML = '<div class="drawer-header"><h3><i class="fas fa-file-medical"></i> Clinical Brief — ' + esc(p.name || 'Patient') + '</h3><button class="btn-close" onclick="ClinicalBrief.close()">&times;</button></div>' +
      '<div class="drawer-body" id="brief-content">' +

      '<div class="brief-section"><h4>Patient Context</h4>' +
      '<p><strong>Name:</strong> ' + esc(p.name || 'Not documented') + '</p>' +
      '<p><strong>Email:</strong> ' + esc(p.email || 'Not documented') + '</p>' +
      '<p><strong>Role:</strong> ' + esc(p.role || 'Not documented') + '</p>' +
      '<p><strong>Credits:</strong> ' + fmtMoney(p.credits) + '</p>' +
      '</div>' +

      '<div class="brief-section"><h4>Recent Records</h4><ul class="brief-list">' + recentDiagnoses + '</ul></div>' +

      '<div class="brief-section"><h4>AI Clinical Brief</h4><button class="em-btn sm" id="gen-brief-btn" onclick="ClinicalBrief.generateBrief()"><i class="fas fa-robot"></i> Generate WheelMD Brief</button><div id="ai-brief-output"></div></div>' +

      '</div>';
  },

  async generateBrief() {
    const out = $('ai-brief-output');
    if (!out || !this._data) return;
    const { profile, records } = this._data;
    const p = profile || {};

    const diagList = records.map(r => (r.diagnosis || r.title || 'Unknown') + ' — ' + (r.summary || '').substring(0, 300)).join('; ') || 'Not documented';

    out.innerHTML = '<div class="tool-loading"><i class="fas fa-circle-notch fa-spin"></i> Generating WheelMD brief...</div>';
    $('gen-brief-btn').disabled = true;

    const startTime = Date.now();

    try {
      const prompt = 'Generate a clinical brief for patient ' + esc(p.name || 'Unknown') + ':\n\n' +
        'Recent diagnoses/records: ' + diagList + '\n\n' +
        'Provide: summary of current status, risk factors, follow-up recommendations, and a risk assessment.';

      const result = await ollamaGenerate(prompt, WHEELMD_PERSONA, 0.2);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      out.innerHTML = '<div class="output-panel">' + esc(result).replace(/\n/g, '<br>') +
        '<div class="wheel-md-footer"><i class="fas fa-shield-alt"></i> ' + DISCLAIMER + '</div></div>' +
        '<div class="tool-meta"><span class="tool-time"><i class="fas fa-clock"></i> ' + elapsed + 's</span>' +
        '<span class="tool-model"><i class="fas fa-robot"></i> ' + OLLAMA_MODEL + '</span></div>';
    } catch (e) {
      out.innerHTML = '<div class="output-panel error"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message) + '</div>';
    }

    $('gen-brief-btn').disabled = false;
  }
};
