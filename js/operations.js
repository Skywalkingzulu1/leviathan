const Operations = {
  async init() {
    await this.check();
  },

  async check() {
    const el = $('operations-health');
    if (!el) return;
    el.innerHTML = '<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Checking services...</div>';

    const checks = [];

    // Supabase check
    const supa = { name: 'Supabase Database', icon: 'database', status: 'checking', detail: '' };
    try {
      const start = Date.now();
      const { error } = await sb.from('Profiles').select('id').limit(1);
      const ms = Date.now() - start;
      if (error) throw error;
      supa.status = 'online';
      supa.detail = ms + 'ms — Connected to jvsfhrekkkhijneqngax';
    } catch (e) {
      supa.status = 'error';
      supa.detail = e.message || 'Connection failed';
    }
    checks.push(supa);

    // Ollama check
    const oll = { name: 'Ollama AI (localhost:11434)', icon: 'robot', status: 'checking', detail: '' };
    try {
      const start = Date.now();
      const resp = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
      const ms = Date.now() - start;
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      const models = (data.models || []).map(m => m.name).join(', ');
      oll.status = 'online';
      oll.detail = ms + 'ms — Models: ' + (models || 'none');
    } catch (e) {
      oll.status = 'error';
      oll.detail = e.message || 'Connection failed — is Ollama running?';
    }
    checks.push(oll);

    // WheelMD model check
    const mod = { name: 'WheelMD Model', icon: 'brain', status: 'checking', detail: '' };
    try {
      const resp = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
      const data = await resp.json();
      const wheelmd = (data.models || []).find(m => m.name && m.name.includes('wheelmd'));
      if (wheelmd) {
        mod.status = 'online';
        mod.detail = wheelmd.name + ' — ' + ((wheelmd.size || 0) / 1e9).toFixed(1) + ' GB';
      } else {
        mod.status = 'warning';
        mod.detail = 'wheelmd:latest not found — using fallback';
      }
    } catch (e) {
      mod.status = 'error';
      mod.detail = 'Cannot reach Ollama';
    }
    checks.push(mod);

    // Auth check
    const auth = { name: 'Authentication', icon: 'shield-alt', status: 'checking', detail: '' };
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session && session.user) {
        auth.status = 'online';
        auth.detail = 'Logged in as ' + (session.user.email || 'unknown');
      } else {
        auth.status = 'warning';
        auth.detail = 'Not logged in';
      }
    } catch (e) {
      auth.status = 'error';
      auth.detail = e.message;
    }
    checks.push(auth);

    // Render
    el.innerHTML = checks.map(c => '<div class="status-card status-' + c.status + '">' +
      '<div class="status-icon"><i class="fas fa-' + c.icon + '"></i></div>' +
      '<div class="status-info"><div class="status-name">' + c.name + '</div>' +
      '<div class="status-detail">' + esc(c.detail) + '</div></div>' +
      '<div class="status-badge">' + (c.status === 'online' ? '✓ Online' : c.status === 'warning' ? '⚠ Warning' : '✗ Error') + '</div>' +
      '</div>').join('');
  }
};
