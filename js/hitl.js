/* ─── HITL: Verification & Approval Panel ─── */

const HITL = {
  async load() {
    const statsEl = $('hitl-stats');
    const pendingEl = $('hitl-pending');
    const resolvedEl = $('hitl-resolved');

    // Check if workflow_approvals table exists
    try {
      const { error } = await sb.from('workflow_approvals').select('id').limit(1);
      if (error && error.message && error.message.includes('not find')) {
        if (statsEl) statsEl.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-check" style="font-size:2rem;opacity:0.3;margin-bottom:0.5rem;display:block"></i>Workflow approvals table not yet set up.</div>';
        if (pendingEl) pendingEl.innerHTML = '<div class="empty-state">No pending approvals.</div>';
        if (resolvedEl) resolvedEl.innerHTML = '<div class="empty-state">No resolved items.</div>';
        return;
      }
    } catch (e) {
      // Table doesn't exist or connection issue
      if (statsEl) statsEl.innerHTML = '<div class="empty-state">HITL not available.</div>';
      if (pendingEl) pendingEl.innerHTML = '<div class="empty-state">Not available.</div>';
      if (resolvedEl) resolvedEl.innerHTML = '<div class="empty-state">Not available.</div>';
      return;
    }

    const pending = await this.fetchPending();
    const resolved = await this.fetchResolved();
    this.renderStats(pending, resolved);
    this.renderPending(pending);
    this.renderResolved(resolved);
  },

  async fetchPending() {
    try {
      const { data, error } = await sb.from('workflow_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async fetchResolved() {
    try {
      const { data, error } = await sb.from('workflow_approvals')
        .select('*')
        .neq('status', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  renderStats(pending, resolved) {
    const critical = pending.filter(p => p.priority === 'critical').length;
    const high = pending.filter(p => p.priority === 'high').length;
    const approved = resolved.filter(r => r.status === 'approved').length;
    $('hitl-stats') && ($('hitl-stats').innerHTML =
      stat('clock', 'Pending', pending.length, 'amber') +
      stat('triangle-exclamation', 'Critical', critical, 'red') +
      stat('arrow-up', 'High', high, 'amber') +
      stat('check-circle', 'Resolved', approved, 'green'));
  },

  renderPending(pending) {
    const container = $('hitl-pending');
    if (!container) return;
    if (pending.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="font-size:2rem;color:var(--accent);opacity:0.3;margin-bottom:0.5rem;display:block"></i>All clear. No pending approvals.</div>';
      return;
    }

    container.innerHTML = pending.map(a => '<div class="approval-card priority-' + a.priority + '">' +
      '<div class="approval-header"><div>' +
      '<div class="approval-title">' + esc(a.title || 'Untitled') + '</div>' +
      '<span class="tag tag-' + (a.priority === 'critical' ? 'high' : a.priority || 'low') + '">' + (a.priority || 'low') + '</span> ' +
      '<span class="tag tag-submitted">' + (a.workflow_type || 'general') + '</span>' +
      '</div><div style="font-size:0.75rem;color:var(--text-muted)">' + fmtDateTime(a.created_at) + '</div></div>' +
      '<div class="approval-desc">' + esc(a.description || 'No description') + '</div>' +
      '<div class="approval-actions">' +
      '<button class="em-btn primary sm" onclick="HITL.resolve(\'' + a.id + '\',\'approve\')"><i class="fas fa-check"></i> Approve</button> ' +
      '<button class="em-btn ghost sm" onclick="HITL.resolve(\'' + a.id + '\',\'override\')"><i class="fas fa-pen"></i> Override</button> ' +
      '<button class="em-btn danger sm" onclick="HITL.resolve(\'' + a.id + '\',\'reject\')"><i class="fas fa-times"></i> Reject</button>' +
      '</div></div>').join('');
  },

  renderResolved(resolved) {
    const container = $('hitl-resolved');
    if (!container) return;
    if (resolved.length === 0) {
      container.innerHTML = '<div class="empty-state">No resolved items yet.</div>';
      return;
    }
    container.innerHTML = makeTable(['Title', 'Status', 'Resolved'], resolved.map(r =>
      '<td>' + esc(r.title || 'Untitled') + '</td><td>' + tag(r.status || 'unknown') + '</td><td>' + fmtDateTime(r.reviewed_at) + '</td>'
    ));
  },

  async resolve(id, action) {
    let notes = null;
    if (action === 'override') {
      notes = prompt('Override notes (optional):');
    }
    try {
      const { error } = await sb.from('workflow_approvals')
        .update({
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'overridden',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes
        })
        .eq('id', id);
      if (error) throw error;
      toast('Approval ' + (action === 'override' ? 'overridden' : action === 'approve' ? 'approved' : 'rejected'));
      this.load();
    } catch (e) {
      toast('Failed: ' + (e.message || 'Unknown error'), true);
    }
  }
};
