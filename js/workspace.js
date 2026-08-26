/* ─── WORKSPACE: Patient workspace overlay + document generation ─── */

const DOW_PRACTICE = {
  name: 'Dr Samukele Luzulane',
  shortName: 'Dr Luzulane',
  surname: 'Luzulane',
  qualification: 'MBCHB (UCT), MP no: 1011545',
  specialty: 'General Practitioner',
  pcns: '1339370',
  hpcsa: 'MP01339370',
  practiceNo: 'PCNS 1339370',
  address: '136 2nd St, Randjespark, Midrand, 1685',
  phone: '072 973 4610',
  email: 'Doctorsonwheels@outlook.com',
  website: 'docsonwheels.co.za'
};

const COMMON_DRUGS = [
  { name: 'Paracetamol', dose: '500mg', freq: 'TDS', note: '1g max single dose' },
  { name: 'Ibuprofen', dose: '400mg', freq: 'TDS', note: 'Take with food' },
  { name: 'Amoxicillin', dose: '500mg', freq: 'TDS', note: '8-12 hourly' },
  { name: 'Amoxicillin + Clavulanate', dose: '625mg', freq: 'TDS', note: '8-hourly with food' },
  { name: 'Azithromycin', dose: '500mg', freq: 'OD x 3 days', note: '500mg day 1, then 250mg' },
  { name: 'Ciprofloxacin', dose: '500mg', freq: 'BD', note: '12-hourly, avoid dairy' },
  { name: 'Metformin', dose: '500mg', freq: 'BD', note: 'With meals' },
  { name: 'Amlodipine', dose: '5mg', freq: 'OD', note: 'Once daily' },
  { name: 'Lisinopril', dose: '10mg', freq: 'OD', note: 'Once daily' },
  { name: 'Atorvastatin', dose: '20mg', freq: 'OD', note: 'At night' },
  { name: 'Omeprazole', dose: '20mg', freq: 'OD', note: 'Before breakfast' },
  { name: 'Pantoprazole', dose: '40mg', freq: 'OD', note: 'Before breakfast' },
  { name: 'Salbutamol Inhaler', dose: '100mcg', freq: 'PRN', note: '2 puffs 4-6hrly as needed' },
  { name: 'Fluticasone Inhaler', dose: '250mcg', freq: 'BD', note: '2 puffs twice daily' },
  { name: 'Cetirizine', dose: '10mg', freq: 'OD', note: 'Once daily at night' },
  { name: 'Loratadine', dose: '10mg', freq: 'OD', note: 'Once daily' },
  { name: 'Prednisolone', dose: '5mg', freq: 'BD', note: 'Taper as directed' },
  { name: 'Diclofenac', dose: '50mg', freq: 'TDS', note: 'With food, max 150mg/day' },
  { name: 'Tramadol', dose: '50mg', freq: 'QDS', note: '4-6 hourly PRN, max 400mg/day' },
  { name: 'Codeine Phosphate', dose: '30mg', freq: 'QDS', note: '4-6 hourly PRN' },
  { name: 'Fluconazole', dose: '200mg', freq: 'Weekly', note: 'Single weekly dose' },
  { name: 'Metronidazole', dose: '400mg', freq: 'TDS', note: '8-hourly, avoid alcohol' },
  { name: 'Doxycycline', dose: '100mg', freq: 'BD', note: '12-hourly, with water' },
  { name: 'Cephalexin', dose: '500mg', freq: 'QDS', note: '6-hourly' },
  { name: 'Co-amoxiclav', dose: '625mg', freq: 'TDS', note: '8-hourly with food' },
  { name: 'Gaviscon', dose: '10ml', freq: 'TDS', note: 'After meals and at bedtime' },
  { name: 'Loperamide', dose: '2mg', freq: 'PRN', note: 'After each loose stool, max 8mg/day' },
  { name: 'ORS Sachets', dose: '1 sachet', freq: 'PRN', note: 'Dissolve in 200ml water' },
  { name: 'Insulin Glargine', dose: 'Units', freq: 'OD', note: 'Basal insulin, individualized' },
  { name: 'Gliclazide', dose: '80mg', freq: 'BD', note: 'Before meals' },
  { name: 'Enalapril', dose: '10mg', freq: 'BD', note: '12-hourly' },
  { name: 'Losartan', dose: '50mg', freq: 'OD', note: 'Once daily' },
  { name: 'Carvedilol', dose: '6.25mg', freq: 'BD', note: '12-hourly with food' },
  { name: 'Furosemide', dose: '40mg', freq: 'OD', note: 'Morning, monitor K+' },
  { name: 'Spironolactone', dose: '25mg', freq: 'OD', note: 'Monitor K+' },
  { name: 'Clopidogrel', dose: '75mg', freq: 'OD', note: 'Once daily' },
  { name: 'Warfarin', dose: 'Variable', freq: 'OD', note: 'INR monitoring required' },
  { name: 'Enoxaparin', dose: '40mg', freq: 'OD', note: 'SC, prophylactic dose' },
  { name: 'Albendazole', dose: '400mg', freq: 'Single dose', note: 'Repeat in 2 weeks' },
  { name: 'Mebendazole', dose: '100mg', freq: 'BD x 3 days', note: '12-hourly for 3 days' },
  { name: 'Iron Supplement', dose: '200mg', freq: 'BD', note: 'Take on empty stomach' },
  { name: 'Folic Acid', dose: '5mg', freq: 'OD', note: 'Once daily' },
  { name: 'Calcium + Vitamin D', dose: '500mg/250IU', freq: 'BD', note: 'With meals' },
  { name: 'Vitamin B12 Injection', dose: '1000mcg', freq: 'Monthly', note: 'IM injection' },
  { name: 'Flu Vaccine', dose: '0.5ml', freq: 'Annual', note: 'IM, once yearly' },
  { name: 'Tetanus Toxoid', dose: '0.5ml', freq: 'As needed', note: 'IM, 5-yearly booster' }
];

const Workspace = {
  patientId: null,
  patient: {},
  appointments: [],
  records: [],
  doctorMap: {},
  doctorProfile: {},
  activeTab: 'overview',
  activeDocType: null,
  docGenerated: false,
  drugFilterTimeout: null,

  async open(patientId, appointment) {
    this.patientId = patientId;
    this.activeTab = 'overview';
    this.activeDocType = null;
    this.docGenerated = false;
    const overlay = $('workspace-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    await this.loadData();
    this.renderHeader();
    this.switchTab('overview');
  },

  close() {
    const overlay = $('workspace-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  },

  /* ── SIGNATURE PAD ── */
  _sigCtx: null,
  _sigDrawing: false,

  openSigPad() {
    var overlay = $('sig-pad-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    var canvas = $('sig-pad-canvas');
    if (!canvas) return;
    this._sigCtx = canvas.getContext('2d');
    this._sigCtx.lineWidth = 2.5;
    this._sigCtx.lineCap = 'round';
    this._sigCtx.strokeStyle = '#1a1a1a';
    this._sigCtx.clearRect(0, 0, canvas.width, canvas.height);

    /* Draw existing signature if present */
    var existing = (this.doctorProfile && this.doctorProfile.signature) || null;
    if (existing && existing.indexOf('data:image') === 0) {
      var img = new Image();
      img.onload = function() {
        var ctx = Workspace._sigCtx;
        var scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
        var x = (canvas.width - img.width * scale) / 2;
        var y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      };
      img.src = existing;
    }

    /* Mouse events */
    canvas.onmousedown = function(e) { Workspace._sigStart(e.offsetX, e.offsetY); };
    canvas.onmousemove = function(e) { Workspace._sigMove(e.offsetX, e.offsetY); };
    canvas.onmouseup = function() { Workspace._sigDrawing = false; };
    canvas.onmouseleave = function() { Workspace._sigDrawing = false; };

    /* Touch events */
    canvas.ontouchstart = function(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      Workspace._sigStart(t.clientX - rect.left, t.clientY - rect.top);
    };
    canvas.ontouchmove = function(e) {
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var t = e.touches[0];
      Workspace._sigMove(t.clientX - rect.left, t.clientY - rect.top);
    };
    canvas.ontouchend = function() { Workspace._sigDrawing = false; };
  },

  _sigStart(x, y) {
    this._sigDrawing = true;
    this._sigCtx.beginPath();
    this._sigCtx.moveTo(x, y);
  },

  _sigMove(x, y) {
    if (!this._sigDrawing) return;
    this._sigCtx.lineTo(x, y);
    this._sigCtx.stroke();
  },

  clearSigPad() {
    var canvas = $('sig-pad-canvas');
    if (!canvas || !this._sigCtx) return;
    this._sigCtx.clearRect(0, 0, canvas.width, canvas.height);
  },

  async saveSigPad() {
    var canvas = $('sig-pad-canvas');
    if (!canvas) return;
    var dataUrl = canvas.toDataURL('image/png');
    var doctorId = this.doctorProfile ? this.doctorProfile.id : null;
    if (!doctorId) {
      toast('No doctor profile found', 'error');
      return;
    }
    try {
      var { error } = await sb.from('Doctors').update({ signature: dataUrl }).eq('id', doctorId);
      if (error) throw error;
      this.doctorProfile.signature = dataUrl;
      this.closeSigPad();
      toast('Signature saved', 'success');
      /* Re-render current tab to show updated signature */
      if (this.activeTab === 'documents') this.renderTab();
    } catch (e) {
      console.error('Save signature error:', e);
      toast('Failed to save signature: ' + e.message, 'error');
    }
  },

  closeSigPad() {
    var overlay = $('sig-pad-overlay');
    if (overlay) overlay.classList.add('hidden');
    this._sigDrawing = false;
  },

  async loadData() {
    try {
      const { data: doctors } = await sb.from('Doctors').select('*');
      this.doctorMap = {};
      (doctors || []).forEach(d => { this.doctorMap[d.id] = d; });
      this.doctorProfile = (doctors && doctors.length > 0) ? doctors[0] : {};

      const { data: profile } = await sb.from('Profiles').select('*').eq('id', String(this.patientId)).limit(1);
      this.patient = (profile && profile.length > 0) ? profile[0] : {};

      const { data: appts } = await sb.from('appointments').select('*').eq('patient_id', String(this.patientId)).order('timestamp', { ascending: false }).limit(20);
      this.appointments = appts || [];

      const { data: recs } = await sb.from('medical_records').select('*').eq('patient_id', String(this.patientId)).order('created_at', { ascending: false }).limit(20);
      this.records = recs || [];
    } catch (e) {
      console.error('Workspace load error:', e);
    }
  },

  renderHeader() {
    const name = this.patient.name || 'Unknown Patient';
    const email = this.patient.email || '';
    const role = this.patient.role || 'PATIENT';
    $('ws-patient-name').textContent = name;
    $('ws-patient-meta').textContent = 'ID: ' + (this.getIDNumber() || this.patientId) + '  ·  DOB: ' + this.fmtDOB() + '  ·  ' + email;
    $('ws-patient-role').textContent = role;
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.ws-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    this.renderTab();
  },

  renderTab() {
    const el = $('ws-content');
    if (!el) return;
    switch (this.activeTab) {
      case 'overview': this.renderOverview(el); break;
      case 'documents': this.renderDocuments(el); break;
      case 'records': this.renderRecords(el); break;
      case 'ai': this.renderAITools(el); break;
    }
  },

  /* ── OVERVIEW TAB ── */
  renderOverview(el) {
    const p = this.patient;
    const name = p.name || 'Unknown';
    const initials = name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    const latest = this.appointments[0] || null;

    let html = '<div class="ws-overview-grid">';

    /* Profile Card */
    html += '<div class="clinical-card">';
    html += '<div class="clinical-card-header"><i class="fas fa-id-card"></i> Profile Information</div>';
    html += '<div class="clinical-card-body">';
    html += '<div class="ws-profile-header">';
    html += '<div class="patient-avatar" style="width:56px;height:56px;font-size:1.3rem;">' + esc(initials) + '</div>';
    html += '<div><h3 style="font-size:1.1rem;font-weight:700;">' + esc(name) + '</h3>';
    html += '<div style="font-size:0.85rem;color:var(--text-muted)">' + esc(p.email || '') + '</div></div>';
    html += '</div>';
    html += '<div class="detail-grid">';
    html += this.dRow('ID Number', String(this.getIDNumber() || this.patientId));
    html += this.dRow('Date of Birth', this.fmtDOB());
    html += this.dRow('Role', p.role || '—');
    html += this.dRow('Phone', p.phone || '—');
    html += this.dRow('Credits', fmtMoney(p.credits));
    html += this.dRow('Active', p.is_active ? 'Yes' : 'No');
    html += this.dRow('Email Verified', p.email_verified ? 'Yes' : 'No');
    html += this.dRow('Joined', fmtDate(p.created_at));
    html += '</div>';
    html += '</div></div>';

    /* Latest Appointment */
    html += '<div class="clinical-card">';
    html += '<div class="clinical-card-header"><i class="fas fa-calendar-check"></i> Latest Appointment</div>';
    html += '<div class="clinical-card-body">';
    if (latest) {
      const doc = this.doctorMap[latest.doctor_id] || {};
      html += '<div class="detail-grid">';
      html += this.dRow('Date', fmtDateTime(latest.timestamp));
      html += this.dRow('Type', latest.appointment_type || '—');
      html += this.dRow('Status', tag((latest.status || '').toLowerCase()));
      html += this.dRow('Reason', latest.reason || '—');
      html += this.dRow('Doctor', doc.name || 'Doctor #' + latest.doctor_id);
      html += this.dRow('Price', fmtMoney(latest.base_price));
      html += '</div>';
    } else {
      html += '<p class="text-muted">No appointments found.</p>';
    }
    html += '</div></div>';

    /* Medical Records */
    html += '<div class="clinical-card" style="grid-column: 1 / -1;">';
    html += '<div class="clinical-card-header"><i class="fas fa-folder-open"></i> Medical Records (' + this.records.length + ')</div>';
    html += '<div class="clinical-card-body" style="max-height:300px;overflow-y:auto;padding:0;">';
    if (this.records.length > 0) {
      this.records.forEach(function(r) {
        var doc = this.doctorMap[r.doctor_id] || {};
        html += '<div class="ws-record-row">';
        html += '<div class="ws-record-info">';
        html += '<strong>' + esc(r.title || r.diagnosis || 'Record') + '</strong>';
        html += '<div class="mini-sub">' + fmtDate(r.created_at) + ' · ' + esc(r.type || 'general') + ' · Dr. ' + esc(doc.name || '#') + '</div>';
        if (r.summary) html += '<div class="mini-sub" style="margin-top:0.25rem;color:var(--text);">' + esc(r.summary).substring(0, 200) + (r.summary.length > 200 ? '...' : '') + '</div>';
        html += '</div>';
        html += '</div>';
      }.bind(this));
    } else {
      html += '<div class="empty-state"><i class="fas fa-file-medical"></i> No medical records yet</div>';
    }
    html += '</div></div>';

    html += '</div>';
    el.innerHTML = html;
  },

  /* ── DOCUMENTS TAB ── */
  renderDocuments(el) {
    var self = this;
    var p = this.patient;
    var doc = this.doctorProfile;
    var patientName = p.name || 'Patient';
    var today = new Date().toLocaleDateString('en-ZA');

    var html = '<div class="ws-documents-grid">';

    /* ── Left: Input Panel ── */
    html += '<div class="ws-doc-input">';

    /* Document Type Selector */
    html += '<div class="field-label">Document Type</div>';
    html += '<div class="doc-type-grid">';
    var types = [
      { id: 'Sick Note', icon: 'bed', label: 'Sick Note' },
      { id: 'Prescription', icon: 'pills', label: 'Prescription' },
      { id: 'Referral Letter', icon: 'file-export', label: 'Referral' },
      { id: 'Clinical Note', icon: 'notes-medical', label: 'Clinical Note' }
    ];
    types.forEach(function(t) {
      var active = self.activeDocType === t.id ? ' active' : '';
      html += '<button class="doc-type-btn' + active + '" onclick="Workspace.selectDocType(\'' + t.id + '\')">';
      html += '<i class="fas fa-' + t.icon + '"></i> ' + t.label + '</button>';
    });
    html += '</div>';

    /* ── Sick Note Fields ── */
    html += '<div id="ws-sicknote-fields" class="doc-fields">';
    html += '<div class="field-label">Number of Sick Leave Days</div>';
    html += '<input type="number" id="ws-sick-days" class="em-input" value="2" min="1" max="30" onchange="Workspace.updateSickNote()">';

    html += '<div class="field-label" style="margin-top:0.75rem;">Start Date</div>';
    html += '<input type="date" id="ws-sick-start" class="em-input" value="' + new Date().toISOString().split('T')[0] + '" onchange="Workspace.updateSickNote()">';
    html += '</div>';

    /* ── Prescription Fields ── */
    html += '<div id="ws-rx-fields" class="doc-fields hidden">';
    html += '<div class="field-label"><i class="fas fa-pills"></i> Medication Details</div>';
    html += '<div id="ws-drug-autocomplete-wrap" style="position:relative;">';
    html += '<input type="text" id="ws-drug-search" class="em-input" placeholder="Type drug name to search..." oninput="Workspace.filterDrugs(this.value)" autocomplete="off">';
    html += '<div id="ws-drug-dropdown" class="ws-drug-dropdown hidden"></div>';
    html += '</div>';
    html += '<div id="ws-med-list">';
    html += this.medRowHTML();
    html += '</div>';
    html += '<button class="em-btn ghost sm" onclick="Workspace.addMedRow()" style="margin-top:0.5rem;"><i class="fas fa-plus"></i> Add Medication</button>';

    html += '<div class="field-label" style="margin-top:1rem;">Special Instructions</div>';
    html += '<textarea id="ws-doc-context" class="em-textarea" placeholder="Additional instructions for the pharmacist or patient..." style="min-height:60px;"></textarea>';
    html += '</div>';

    /* ── Referral Letter Fields ── */
    html += '<div id="ws-referral-fields" class="doc-fields hidden">';
    html += '<div class="field-label">Reason for Referral</div>';
    html += '<textarea id="ws-referral-reason" class="em-textarea" placeholder="Reason for referring this patient..." style="min-height:80px;"></textarea>';

    html += '<div class="field-label" style="margin-top:0.75rem;">Referred To (Specialist / Facility)</div>';
    html += '<input type="text" id="ws-referral-to" class="em-input" placeholder="e.g. Dr. Smith, Cardiologist / Groote Schuur Hospital">';

    html += '<div class="field-label" style="margin-top:0.75rem;">Summary of Findings</div>';
    html += '<textarea id="ws-doc-context" class="em-textarea" placeholder="Clinical findings and summary for the receiving doctor..." style="min-height:100px;"></textarea>';
    html += '</div>';

    /* ── Clinical Note Fields ── */
    html += '<div id="ws-clinical-fields" class="doc-fields hidden">';
    html += '<div class="field-label">Note Type</div>';
    html += '<div class="doc-type-grid" style="grid-template-columns:1fr 1fr 1fr;">';
    var noteTypes = ['SOAP Note', 'Progress Note', 'Clinical Note'];
    noteTypes.forEach(function(nt) {
      html += '<button class="doc-type-btn ws-note-type' + (nt === 'SOAP Note' ? ' active' : '') + '" onclick="Workspace.selectNoteType(this,\'' + nt + '\')">' + nt + '</button>';
    });
    html += '</div>';

    html += '<div class="field-label" style="margin-top:0.75rem;">Note Title</div>';
    html += '<input type="text" id="ws-clinical-title" class="em-input" value="Clinical Note" placeholder="e.g. SOAP Note, Progress Note">';

    html += '<div class="field-label" style="margin-top:0.75rem;">Clinical Details</div>';
    html += '<textarea id="ws-doc-context" class="em-textarea" placeholder="Enter clinical notes, findings, assessment, and plan..." style="min-height:140px;"></textarea>';
    html += '</div>';

    /* Generate Button */
    html += '<div class="doc-actions" style="margin-top:1rem;">';
    html += '<button class="em-btn primary" onclick="Workspace.generateDoc()"><i class="fas fa-wand-magic-sparkles"></i> Generate Document</button>';
    html += '<button class="sig-set-btn" onclick="Workspace.openSigPad()"><i class="fas fa-pen-nib"></i> Set Signature</button>';
    html += '</div>';
    html += '</div>'; /* close ws-doc-input */

    /* ── Right: Preview Panel ── */
    html += '<div class="ws-doc-preview-wrap">';
    html += this.renderDocPreview();

    /* Action buttons */
    html += '<div id="ws-doc-actions" class="hidden" style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:center;">';
    html += '<button class="em-btn primary" onclick="Workspace.downloadPDF()"><i class="fas fa-download"></i> Download PDF</button>';
    html += '<button class="em-btn ghost" onclick="Workspace.saveDoc()"><i class="fas fa-save"></i> Save to Records</button>';
    html += '</div>';

    html += '</div>'; /* close ws-doc-preview-wrap */
    html += '</div>'; /* close ws-documents-grid */

    el.innerHTML = html;
  },

  renderDocPreview() {
    var p = this.patient;
    var doc = this.doctorProfile;
    var patientName = p.name || 'Patient';
    var patientId = this.patientId;
    var today = new Date().toLocaleDateString('en-ZA');
    var signatureHtml = '';
    var sigUrl = doc.signature || null;
    var hasSig = sigUrl && sigUrl.indexOf('data:image') === 0;
    if (hasSig) {
      signatureHtml = '<img src="' + sigUrl + '" alt="Signature" style="max-height:60px;display:block;margin:0 auto;">';
    } else {
      signatureHtml = '<div style="font-family:\'Dancing Script\',cursive;font-size:1.8rem;color:#999;cursor:pointer;" onclick="Workspace.openSigPad()" title="Click to add your signature">Click to sign</div>';
    }

    var html = '<div id="ws-doc-preview" class="doc-preview">';

    /* Letterhead */
    html += '<div class="doc-letterhead">';
    html += '<div class="doc-logo">DoW</div>';
    html += '<div class="doc-practice-info">';
    html += '<h2 style="margin:0;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:1px;font-size:1.1rem;">Doctors on Wheels</h2>';
    html += '<p style="font-size:0.75rem;color:#666;margin:2px 0;">Healthcare, On Your Terms — South Africa</p>';
    html += '<p style="font-size:0.75rem;color:#333;margin:2px 0;font-weight:600;">' + esc(DOW_PRACTICE.address) + '</p>';
    html += '<p style="font-size:0.75rem;color:#333;margin:2px 0;font-weight:600;">' + esc(DOW_PRACTICE.phone) + ' | ' + esc(DOW_PRACTICE.email) + '</p>';
    html += '</div>';
    html += '<div class="doc-doctor-info">';
    html += '<strong style="font-size:0.95rem;">' + esc(DOW_PRACTICE.name) + '</strong><br>';
    html += '<span style="font-size:0.8rem;color:#333;">' + esc(DOW_PRACTICE.qualification) + '</span><br>';
    html += '<span style="font-size:0.75rem;color:#666;">' + esc(DOW_PRACTICE.specialty) + '</span><br>';
    html += '<span style="font-size:0.75rem;color:#666;">HPCSA: ' + esc(DOW_PRACTICE.hpcsa) + '</span><br>';
    html += '<span style="font-size:0.75rem;color:#666;">' + esc(DOW_PRACTICE.practiceNo) + '</span>';
    html += '</div>';
    html += '</div>';

    /* Patient info bar */
    html += '<div class="doc-patient-bar">';
    html += '<div><strong>Patient:</strong> ' + esc(patientName) + '</div>';
    html += '<div><strong>ID Number:</strong> ' + esc(String(this.getIDNumber() || patientId)) + '</div>';
    html += '<div><strong>DOB:</strong> ' + esc(this.fmtDOB()) + '</div>';
    html += '<div><strong>Date:</strong> ' + today + '</div>';
    html += '</div>';

    /* Title */
    html += '<h3 id="ws-doc-title" class="doc-title"></h3>';

    /* Content */
    html += '<div id="ws-doc-content" class="doc-body" style="min-height:200px;"></div>';

    /* Signature block */
    var sigBlockClick = hasSig ? '' : ' onclick="Workspace.openSigPad()" style="cursor:pointer;"';
    html += '<div class="doc-signature-block">';
    html += '<div class="doc-sig-box"' + sigBlockClick + '>';
    html += '<div class="doc-sig-line">';
    html += signatureHtml;
    html += '<div class="doc-sig-underline"></div>';
    html += '</div>';
    html += '<div class="doc-sig-label">' + esc(DOW_PRACTICE.name) + ', ' + esc(DOW_PRACTICE.qualification) + '</div>';
    html += '<div class="doc-sig-sub">' + esc(DOW_PRACTICE.practiceNo) + ' | ' + esc(DOW_PRACTICE.phone) + '</div>';
    html += '</div>';
    html += '<div class="doc-sig-date">';
    html += '<div><strong>Date:</strong> ' + today + '</div>';
    html += '<div style="margin-top:0.25rem;"><strong>Location:</strong> Digital Consultation</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>'; /* close doc-preview */

    return html;
  },

  /* ── Drug Autocomplete ── */
  filterDrugs(query) {
    var dropdown = $('ws-drug-dropdown');
    if (!dropdown) return;
    if (!query || query.length < 1) {
      dropdown.classList.add('hidden');
      return;
    }
    var q = query.toLowerCase();
    var matches = COMMON_DRUGS.filter(function(d) {
      return d.name.toLowerCase().indexOf(q) > -1;
    }).slice(0, 8);

    if (matches.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    var html = '';
    matches.forEach(function(d) {
      html += '<div class="ws-drug-item" onclick="Workspace.selectDrug(\'' + esc(d.name) + '\',\'' + esc(d.dose) + '\',\'' + esc(d.freq) + '\',\'' + esc(d.note) + '\')">';
      html += '<div class="ws-drug-name">' + esc(d.name) + '</div>';
      html += '<div class="ws-drug-meta">' + esc(d.dose) + ' · ' + esc(d.freq) + '</div>';
      html += '</div>';
    });
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  },

  selectDrug(name, dose, freq, note) {
    var list = $('ws-med-list');
    if (!list) return;
    /* Pre-fill the last empty row or add new */
    var rows = list.querySelectorAll('.ws-med-row');
    var target = null;
    rows.forEach(function(r) {
      if (!r.querySelector('.ws-med-name').value.trim()) target = r;
    });
    if (!target) {
      target = document.createElement('div');
      target.innerHTML = this.medRowHTML();
      target = target.firstChild;
      list.appendChild(target);
    }
    target.querySelector('.ws-med-name').value = name;
    target.querySelector('.ws-med-dose').value = dose;
    target.querySelector('.ws-med-freq').value = freq;
    target.querySelector('.ws-med-qty').value = '1';
    var searchInput = $('ws-drug-search');
    if (searchInput) searchInput.value = '';
    var dropdown = $('ws-drug-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  },

  /* ── Med Row HTML ── */
  medRowHTML() {
    return '<div class="ws-med-row">' +
      '<input class="em-input ws-med-name" placeholder="Medication name">' +
      '<input class="em-input ws-med-dose" placeholder="Dose">' +
      '<input class="em-input ws-med-freq" placeholder="Frequency">' +
      '<input class="em-input ws-med-qty" placeholder="Qty">' +
      '<button class="em-btn danger sm" onclick="this.closest(\'.ws-med-row\').remove()">&times;</button>' +
      '</div>';
  },

  addMedRow() {
    var list = $('ws-med-list');
    if (list) {
      list.insertAdjacentHTML('beforeend', this.medRowHTML());
    }
  },

  getMeds() {
    var meds = [];
    var rows = document.querySelectorAll('.ws-med-row');
    rows.forEach(function(row) {
      var name = row.querySelector('.ws-med-name').value.trim();
      if (name) {
        meds.push({
          name: name,
          dose: row.querySelector('.ws-med-dose').value.trim(),
          freq: row.querySelector('.ws-med-freq').value.trim(),
          qty: row.querySelector('.ws-med-qty').value.trim()
        });
      }
    });
    return meds;
  },

  selectDocType(type) {
    this.activeDocType = type;
    document.querySelectorAll('.doc-type-grid .doc-type-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    /* Find the correct button and activate it */
    document.querySelectorAll('.doc-type-grid .doc-type-btn').forEach(function(b) {
      if (b.textContent.trim().indexOf(type) > -1 || b.onclick && b.onclick.toString().indexOf(type) > -1) {
        b.classList.add('active');
      }
    });

    var sickFields = $('ws-sicknote-fields');
    var rxFields = $('ws-rx-fields');
    var refFields = $('ws-referral-fields');
    var clinFields = $('ws-clinical-fields');
    var contextLabel = document.querySelector('.ws-doc-input .field-label');

    if (sickFields) sickFields.classList.toggle('hidden', type !== 'Sick Note');
    if (rxFields) rxFields.classList.toggle('hidden', type !== 'Prescription');
    if (refFields) refFields.classList.toggle('hidden', type !== 'Referral Letter');
    if (clinFields) clinFields.classList.toggle('hidden', type !== 'Clinical Note');
  },

  selectNoteType(btn, type) {
    document.querySelectorAll('.ws-note-type').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var titleInput = $('ws-clinical-title');
    if (titleInput) titleInput.value = type;
  },

  updateSickNote() {
    /* live preview update when days change */
    if (this.activeDocType === 'Sick Note' && this.docGenerated) {
      this.generateDoc();
    }
  },

  /* ── PATIENT IDENTITY HELPERS ── */
  getIDNumber() {
    var p = this.patient || {};
    return p.id_number || p.national_id || p.identity_number || p.passport || p.id || '';
  },

  getDOB() {
    var p = this.patient || {};
    return p.dob || p.date_of_birth || p.patient_dob || '';
  },

  fmtDOB() {
    var raw = this.getDOB();
    if (!raw) return '—';
    try { return new Date(raw).toLocaleDateString('en-ZA'); } catch (e) { return raw; }
  },

  /* ── GENERATE DOCUMENT ── */
  generateDoc() {
    if (!this.activeDocType) { toast('Select a document type first', true); return; }

    var patientName = this.patient.name || 'Patient';
    var idNumber = this.getIDNumber() || this.patientId;
    var dob = this.fmtDOB();
    var today = new Date().toLocaleDateString('en-ZA');
    var content = '';
    var title = this.activeDocType;

    if (this.activeDocType === 'Sick Note') {
      var daysInput = $('ws-sick-days');
      var startDateInput = $('ws-sick-start');
      var d = parseInt(daysInput ? daysInput.value : '2') || 2;
      var startDate = startDateInput ? new Date(startDateInput.value + 'T12:00:00') : new Date();
      var endDate = new Date(startDate.getTime() + (d - 1) * 86400000);
      var fitDate = new Date(startDate.getTime() + d * 86400000);

      content = 'TO WHOM IT MAY CONCERN,\n\n';
      content += 'This is to certify that I have examined ' + patientName + ' (ID: ' + idNumber + ', DOB: ' + dob + ') on ' + today + '.\n\n';
      content += 'Based on my clinical findings, it is my professional opinion that the patient is unfit for work/school duties from ' + startDate.toLocaleDateString('en-ZA') + ' to ' + endDate.toLocaleDateString('en-ZA') + ' inclusive (' + d + ' calendar day' + (d > 1 ? 's' : '') + ').\n\n';
      content += 'The patient is expected to be fit to resume duties on ' + fitDate.toLocaleDateString('en-ZA') + '.\n\n';
      content += 'Nature of illness: Medical Condition (Consultation Confidentiality Maintained).\n\n';
      content += '---\n';
      content += DOW_PRACTICE.name + ', ' + DOW_PRACTICE.qualification + '\n';
      content += 'HPCSA: ' + DOW_PRACTICE.hpcsa + ' | ' + DOW_PRACTICE.practiceNo + '\n';
      content += DOW_PRACTICE.phone + ' | ' + DOW_PRACTICE.email;

    } else if (this.activeDocType === 'Prescription') {
      var meds = this.getMeds();
      var contextInput = document.querySelector('#ws-rx-fields #ws-doc-context');
      var instructions = contextInput ? contextInput.value : '';

      content = 'PRESCRIPTION\n\n';
      content += 'Date: ' + today + '\n';
      content += 'Patient: ' + patientName + ' (ID: ' + idNumber + ', DOB: ' + dob + ')\n\n';
      content += 'MEDICATIONS:\n';
      if (meds.length === 0) {
        content += '  No medications listed.\n';
      } else {
        meds.forEach(function(m, i) {
          content += '  ' + (i + 1) + '. ' + (m.name || '—');
          if (m.dose) content += ' ' + m.dose;
          if (m.freq) content += ' — ' + m.freq;
          if (m.qty) content += ' (Qty: ' + m.qty + ')';
          content += '\n';
        });
      }
      if (instructions) {
        content += '\nSpecial Instructions:\n' + instructions + '\n';
      }
      content += '\n---\n';
      content += DOW_PRACTICE.name + ', ' + DOW_PRACTICE.qualification + '\n';
      content += 'HPCSA: ' + DOW_PRACTICE.hpcsa + ' | ' + DOW_PRACTICE.practiceNo + '\n';
      content += DOW_PRACTICE.phone + ' | ' + DOW_PRACTICE.email;

    } else if (this.activeDocType === 'Referral Letter') {
      var reasonInput = $('ws-referral-reason');
      var referredToInput = $('ws-referral-to');
      var contextInput = document.querySelector('#ws-referral-fields #ws-doc-context');
      var reason = reasonInput ? reasonInput.value : '';
      var referredTo = referredToInput ? referredToInput.value : '';
      var findings = contextInput ? contextInput.value : '';

      content = 'RE: REFERRAL FOR ' + patientName.toUpperCase() + ' (ID: ' + idNumber + ', DOB: ' + dob + ')\n\n';
      content += 'Date: ' + today + '\n\n';
      if (referredTo) content += 'To: ' + referredTo + '\n\n';
      content += 'Dear Colleague,\n\n';
      content += 'I am referring this patient to your specialized care';
      if (reason) content += ' for ' + reason;
      content += '.\n\n';
      if (findings) {
        content += 'Summary of Findings:\n' + findings + '\n\n';
      }
      content += 'Thank you for your assistance in the ongoing care of this patient.\n\n';
      content += '---\n';
      content += DOW_PRACTICE.name + ', ' + DOW_PRACTICE.qualification + '\n';
      content += 'HPCSA: ' + DOW_PRACTICE.hpcsa + ' | ' + DOW_PRACTICE.practiceNo + '\n';
      content += DOW_PRACTICE.phone + ' | ' + DOW_PRACTICE.email;

    } else if (this.activeDocType === 'Clinical Note') {
      var titleInput = $('ws-clinical-title');
      var contextInput = document.querySelector('#ws-clinical-fields #ws-doc-context');
      var noteTitle = titleInput ? titleInput.value : 'Clinical Note';
      var details = contextInput ? contextInput.value : '';

      title = noteTitle;
      content = noteTitle.toUpperCase() + '\n\n';
      content += 'Date: ' + today + '\n';
      content += 'Patient: ' + patientName + ' (ID: ' + idNumber + ', DOB: ' + dob + ')\n';
      content += 'Practitioner: ' + DOW_PRACTICE.name + ', ' + DOW_PRACTICE.qualification + '\n\n';
      content += details || 'No clinical details provided.';
      content += '\n\n---\n';
      content += DOW_PRACTICE.name + ', ' + DOW_PRACTICE.qualification + '\n';
      content += 'HPCSA: ' + DOW_PRACTICE.hpcsa + ' | ' + DOW_PRACTICE.practiceNo + '\n';
      content += DOW_PRACTICE.phone + ' | ' + DOW_PRACTICE.email;
    }

    $('ws-doc-title').textContent = title;
    $('ws-doc-content').textContent = content;
    var actionsEl = $('ws-doc-actions');
    if (actionsEl) { actionsEl.classList.remove('hidden'); actionsEl.style.display = 'flex'; }
    this.docGenerated = true;
    toast(title + ' generated');
  },

  /* ── PDF Download ── */
  downloadPDF() {
    if (!this.docGenerated) { toast('Generate a document first', true); return; }
    var preview = $('ws-doc-preview');
    var title = $('ws-doc-title').textContent || 'document';
    var filename = title.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    toast('Generating PDF...');
    html2pdf().set({
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(preview).save().then(function() {
      toast('PDF downloaded: ' + filename);
    }).catch(function(e) {
      toast('PDF generation failed: ' + e.message, true);
    });
  },

  /* ── Save to Records ── */
  async saveDoc() {
    if (!this.docGenerated) { toast('Generate a document first', true); return; }
    var title = $('ws-doc-title').textContent || 'Document';
    var content = $('ws-doc-content').textContent || '';
    try {
      toast('Saving to records...');
      await sb.from('medical_records').insert({
        patient_id: Number(this.patientId),
        doctor_id: this.doctorProfile.id || null,
        title: title,
        type: title.toLowerCase().replace(/\s+/g, '_'),
        summary: content,
        diagnosis: null
      });
      toast('Document saved to records');
    } catch (e) {
      toast('Failed to save: ' + e.message, true);
    }
  },

  /* ── RECORDS TAB ── */
  renderRecords(el) {
    var html = '';
    html += '<div class="clinical-card">';
    html += '<div class="clinical-card-header"><i class="fas fa-folder-open"></i> Medical Records (' + this.records.length + ')</div>';
    html += '<div class="clinical-card-body" style="padding:0;">';

    if (this.records.length > 0) {
      html += '<table class="em-table"><thead><tr>';
      html += '<th>Date</th><th>Type</th><th>Title</th><th>Doctor</th><th>Summary</th>';
      html += '</tr></thead><tbody>';
      this.records.forEach(function(r) {
        var doc = this.doctorMap[r.doctor_id] || {};
        html += '<tr>';
        html += '<td>' + fmtDate(r.created_at) + '</td>';
        html += '<td>' + esc(r.type || '—') + '</td>';
        html += '<td><strong>' + esc(r.title || r.diagnosis || '—') + '</strong></td>';
        html += '<td>' + esc(doc.name || '—') + '</td>';
        html += '<td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc((r.summary || '').substring(0, 120)) + '</td>';
        html += '</tr>';
      }.bind(this));
      html += '</tbody></table>';
    } else {
      html += '<div class="empty-state"><i class="fas fa-file-medical"></i> No medical records yet</div>';
    }

    html += '</div></div>';
    el.innerHTML = html;
  },

  /* ── AI TOOLS TAB ── */
  renderAITools(el) {
    var tools = [
      { id: 'intake', icon: 'clipboard-list', title: 'Intake Summary', desc: 'Convert consultation notes to structured intake' },
      { id: 'soap', icon: 'file-medical', title: 'SOAP Note', desc: 'Generate a SOAP note from findings' },
      { id: 'differential', icon: 'diagnoses', title: 'Differential Diagnosis', desc: 'Ranked differential diagnoses' },
      { id: 'prescription-review', icon: 'pills', title: 'Prescription Review', desc: 'Check for interactions and dosing' },
      { id: 'followup', icon: 'calendar-check', title: 'Follow-up Plan', desc: 'Create a follow-up care plan' }
    ];

    var html = '<div class="ws-ai-grid">';
    tools.forEach(function(t) {
      html += '<div class="tool-tile" onclick="Workspace.openAITool(\'' + t.id + '\')">';
      html += '<i class="fas fa-' + t.icon + '"></i>';
      html += '<h3>' + esc(t.title) + '</h3>';
      html += '<p>' + esc(t.desc) + '</p>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div id="ws-ai-output" style="margin-top:1.5rem;"></div>';
    el.innerHTML = html;
  },

  openAITool(toolId) {
    var outputEl = $('ws-ai-output');
    if (!outputEl) return;

    var patientName = this.patient.name || 'Patient';
    var placeholder = '';

    if (toolId === 'intake') {
      placeholder = 'Enter consultation notes for ' + patientName + '...';
    } else if (toolId === 'soap') {
      placeholder = 'Enter findings for SOAP note...';
    } else if (toolId === 'differential') {
      placeholder = 'Enter presenting complaint and history...';
    } else if (toolId === 'prescription-review') {
      placeholder = 'Enter medications to review...';
    } else if (toolId === 'followup') {
      placeholder = 'Enter diagnosis and current plan...';
    }

    var label = toolId.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

    var html = '<div class="clinical-card">';
    html += '<div class="clinical-card-header"><i class="fas fa-robot"></i> ' + esc(label) + '</div>';
    html += '<div class="clinical-card-body">';
    html += '<textarea id="ws-ai-input" class="em-textarea" placeholder="' + esc(placeholder) + '" style="min-height:120px;"></textarea>';
    html += '<div style="margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center;">';
    html += '<button class="em-btn primary" id="ws-ai-run" onclick="Workspace.runAITool(\'' + toolId + '\')"><i class="fas fa-play"></i> Run</button>';
    html += '<span id="ws-ai-status" class="text-muted"></span>';
    html += '</div>';
    html += '<div id="ws-ai-result" class="tool-output" style="margin-top:1rem;display:none;"></div>';
    html += '<div class="wheel-md-footer"><i class="fas fa-triangle-exclamation"></i> ' + esc(DISCLAIMER) + '</div>';
    html += '</div></div>';
    outputEl.innerHTML = html;
  },

  async runAITool(toolId) {
    var input = $('ws-ai-input');
    var result = $('ws-ai-result');
    var status = $('ws-ai-status');
    var runBtn = $('ws-ai-run');
    if (!input || !result) return;

    var text = input.value.trim();
    if (!text) { toast('Enter clinical notes first', true); return; }

    result.style.display = 'block';
    result.innerHTML = '<div class="output-loading"><i class="fas fa-circle-notch fa-spin"></i> Generating...</div>';
    result.className = 'tool-output';
    if (status) status.textContent = 'Running on WheelMD...';
    if (runBtn) runBtn.disabled = true;

    var systemMap = {
      'intake': INTAKE_SYSTEM,
      'soap': SOAP_SYSTEM,
      'differential': DIFFERENTIAL_SYSTEM,
      'prescription-review': PRESCRIPTION_SYSTEM,
      'followup': FOLLOWUP_SYSTEM
    };

    var startTime = Date.now();

    try {
      var data = await ollamaGenerate(systemMap[toolId] || WHEELMD_PERSONA, text);
      var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      result.textContent = data;
      result.className = 'tool-output success';
      if (status) status.textContent = 'Completed in ' + elapsed + 's';
    } catch (e) {
      result.textContent = 'Error: ' + e.message;
      result.className = 'tool-output error';
      if (status) status.textContent = 'Failed';
    } finally {
      if (runBtn) runBtn.disabled = false;
    }
  },

  dRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + value + '</span></div>';
  }
};
