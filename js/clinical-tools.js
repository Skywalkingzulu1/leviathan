const ClinicalTools = {
  currentView: 'menu',

  init() {
    $('clinical-tool-grid') && (this._el = $('clinical-tool-grid'));
    this.show('menu');
  },

  show(view) {
    this.currentView = view;
    if (!this._el) return;

    if (view === 'menu') {
      this._el.innerHTML = this.renderMenu();
      return;
    }

    const title = {
      scribe: 'Session Scribe',
      soap: 'SOAP Note Generator',
      intake: 'Intake Generator',
      differential: 'Differential Diagnoses',
      coding: 'ICD-10 Coding',
      prescription: 'Prescription Review',
      followup: 'Follow-Up Planner'
    }[view] || view;

    this._el.innerHTML = this.renderTool(title, view);
    this.attachHandlers();
  },

  renderMenu() {
    const tools = [
      { id: 'intake', icon: 'clipboard-list', label: 'Intake Generator', desc: 'Convert consultation notes to structured intake' },
      { id: 'soap', icon: 'file-medical-alt', label: 'SOAP Note', desc: 'Generate SOAP note from consultation' },
      { id: 'scribe', icon: 'microphone', label: 'Session Scribe', desc: 'Transcribe and structure consultation' },
      { id: 'differential', icon: 'stethoscope', label: 'Differential Dx', desc: 'Suggest differential diagnoses' },
      { id: 'coding', icon: 'code', label: 'ICD-10 Coding', desc: 'Suggest ICD-10-CM codes' },
      { id: 'prescription', icon: 'prescription-bottle-alt', label: 'Rx Review', desc: 'Check drug interactions' },
      { id: 'followup', icon: 'calendar-check', label: 'Follow-Up Plan', desc: 'Create follow-up plan' }
    ];

    let html = '<div class="tool-grid">';
    tools.forEach(t => {
      html += '<div class="tool-tile" data-tool="' + t.id + '" onclick="ClinicalTools.show(\'' + t.id + '\')">' +
        '<i class="fas fa-' + t.icon + '"></i><h3>' + t.label + '</h3><p>' + t.desc + '</p></div>';
    });
    html += '</div>';
    return html;
  },

  renderTool(title, view) {
    const isScribe = (view === 'scribe');
    return '<div class="tool-view">' +
      '<button class="em-btn ghost" onclick="ClinicalTools.show(\'menu\')"><i class="fas fa-arrow-left"></i> Back to Menu</button>' +
      '<h3>' + title + '</h3>' +
      (isScribe ? this.renderScribeInput() : this.renderTextInput()) +
      '<div class="tool-actions">' +
      '<button class="em-btn primary" id="run-btn" onclick="ClinicalTools.run()">Run ' + title + '</button>' +
      '<button class="em-btn ghost hidden" id="validate-btn" onclick="ClinicalTools.runValidate()"><i class="fas fa-check-circle"></i> Validate Transcript</button>' +
      '</div>' +
      '<div class="tool-output" id="tool-output"></div>' +
      '<div class="tool-meta" id="tool-meta"></div>' +
      '</div>';
  },

  renderTextInput() {
    return '<textarea id="clinical-input" class="em-textarea" rows="6" placeholder="Paste consultation notes here...\n\nInclude: presenting complaint, history, vitals, examination findings, medication list, allergies."></textarea>' +
      '<label class="em-checkbox" style="margin-top:8px"><input type="checkbox" id="validate-check"> Run validation step (extra Ollama call, ~30s more)</label>';
  },

  renderScribeInput() {
    return '<div class="audio-controls" id="audio-controls">' +
      '<button class="em-btn" id="rec-btn" onclick="SessionScribe.toggle()"><i class="fas fa-microphone"></i> Start Recording</button>' +
      '<span id="rec-status" class="rec-idle"><i class="fas fa-circle"></i> Ready</span>' +
      '</div>' +
      '<textarea id="clinical-input" class="em-textarea" rows="6" placeholder="Transcription will appear here, or paste notes manually..."></textarea>' +
      '<label class="em-checkbox" style="margin-top:8px"><input type="checkbox" id="validate-check"> Run validation step (extra Ollama call, ~30s more)</label>';
  },

  attachHandlers() {
    /* no-op — handled by onclick */
  },

  async run() {
    const text = $('clinical-input') && $('clinical-input').value;
    if (!text || text.trim().length < 10) {
      toast('Please enter consultation notes', true);
      return;
    }

    const view = this.currentView;
    const shouldValidate = $('validate-check') && $('validate-check').checked;

    $('run-btn').disabled = true;
    $('run-btn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    $('tool-output').innerHTML = '<div class="tool-loading"><i class="fas fa-circle-notch fa-spin"></i> Generating... <span class="wheel-md-footer">WheelMD decision-support only. Always verify.</span></div>';
    $('tool-meta').innerHTML = '';

    const startTime = Date.now();

    try {
      let processedText = text;

      // Step 1: Validate transcript if requested
      if (shouldValidate) {
        $('tool-output').innerHTML = '<div class="tool-loading"><i class="fas fa-circle-notch fa-spin"></i> Validating transcript... <span class="wheel-md-footer">WheelMD decision-support only. Always verify.</span></div>';
        try {
          processedText = await ollamaGenerate('Validate and clean this transcript:\n\n' + text, VALIDATE_SYSTEM, 0.1);
        } catch (e) {
          console.warn('Validation failed, proceeding with raw text:', e);
          processedText = text;
        }
      }

      // Step 2: Run the actual tool
      const system = {
        scribe: INTAKE_SYSTEM,
        soap: SOAP_SYSTEM,
        intake: INTAKE_SYSTEM,
        differential: DIFFERENTIAL_SYSTEM,
        coding: CODING_SYSTEM,
        prescription: PRESCRIPTION_SYSTEM,
        followup: FOLLOWUP_SYSTEM
      }[view] || WHEELMD_PERSONA;

      let prompt = processedText;

      // For coding, prepend known codes lookup
      if (view === 'coding') {
        const known = lookupKnownCodes(processedText, processedText);
        if (known) prompt = known + '\n\nClinician notes:\n' + processedText;
      }

      const result = await ollamaGenerate(prompt, system, 0.2);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      $('tool-output').innerHTML = '<div class="output-panel">' + esc(result).replace(/\n/g, '<br>') +
        '<div class="wheel-md-footer"><i class="fas fa-shield-alt"></i> ' + DISCLAIMER + '</div></div>';
      $('tool-meta').innerHTML = '<span class="tool-time"><i class="fas fa-clock"></i> ' + elapsed + 's</span>' +
        '<span class="tool-model"><i class="fas fa-robot"></i> ' + OLLAMA_MODEL + '</span>' +
        '<span class="tool-steps">' + (shouldValidate ? '2 steps (validate + generate)' : '1 step (generate)') + '</span>';

    } catch (e) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      $('tool-output').innerHTML = '<div class="output-panel error"><i class="fas fa-exclamation-triangle"></i> ' + esc(e.message || String(e)) +
        '<div class="wheel-md-footer"><i class="fas fa-shield-alt"></i> ' + DISCLAIMER + '</div></div>';
      $('tool-meta').innerHTML = '<span class="tool-time"><i class="fas fa-clock"></i> ' + elapsed + 's (failed)</span>';
    }

    $('run-btn').disabled = false;
    $('run-btn').innerHTML = '<i class="fas fa-play"></i> Run';
  },

  async runValidate() {
    const text = $('clinical-input') && $('clinical-input').value;
    if (!text || text.trim().length < 10) { toast('Enter transcript text first', true); return; }

    $('validate-btn').disabled = true;
    $('validate-btn').innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Validating...';
    $('tool-output').innerHTML = '<div class="tool-loading"><i class="fas fa-circle-notch fa-spin"></i> Validating transcript... <span class="wheel-md-footer">WheelMD decision-support only. Always verify.</span></div>';

    const startTime = Date.now();

    try {
      const result = await ollamaGenerate('Validate and clean this transcript:\n\n' + text, VALIDATE_SYSTEM, 0.1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      $('clinical-input').value = result;
      $('tool-output').innerHTML = '<div class="output-panel success"><i class="fas fa-check-circle"></i> Transcript validated and cleaned.<br><br>' +
        esc(result).replace(/\n/g, '<br>') +
        '<div class="wheel-md-footer"><i class="fas fa-shield-alt"></i> ' + DISCLAIMER + '</div></div>';
      $('tool-meta').innerHTML = '<span class="tool-time"><i class="fas fa-clock"></i> ' + elapsed + 's</span>';
    } catch (e) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      $('tool-output').innerHTML = '<div class="output-panel error"><i class="fas fa-exclamation-triangle"></i> Validation failed: ' + esc(e.message) + '</div>';
      $('tool-meta').innerHTML = '<span class="tool-time"><i class="fas fa-clock"></i> ' + elapsed + 's (failed)</span>';
    }

    $('validate-btn').disabled = false;
    $('validate-btn').innerHTML = '<i class="fas fa-check-circle"></i> Validate Transcript';
  }
};

const SessionScribe = {
  recognition: null,
  isRecording: false,
  transcript: '',

  toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  },

  start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Speech recognition not supported in this browser. Paste notes instead.', true);
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-ZA';

    this.recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        }
      }
      if (final) {
        this.transcript += final;
        $('clinical-input').value = this.transcript;
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast('Microphone access denied. Check browser permissions.', true);
      }
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        this.recognition.start(); // restart if still recording
      }
    };

    this.recognition.start();
    this.isRecording = true;
    $('rec-btn').innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
    $('rec-status').innerHTML = '<i class="fas fa-circle recording-pulse"></i> Recording...';
    $('rec-status').className = 'rec-active';
  },

  stop() {
    if (this.recognition) {
      this.isRecording = false;
      this.recognition.stop();
    }
    $('rec-btn').innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
    $('rec-status').innerHTML = '<i class="fas fa-circle"></i> Stopped';
    $('rec-status').className = 'rec-idle';
  }
};
