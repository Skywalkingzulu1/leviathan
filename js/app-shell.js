/* ─── APP SHELL: 7-Tab Navigation ─── */

const AppShell = {
  activeTab: 'schedule',

  tabs: [
    { id: 'schedule', label: 'Schedule', icon: 'calendar-days' },
    { id: 'patients', label: 'Patients', icon: 'users' },
    { id: 'clinical', label: 'Clinical', icon: 'stethoscope' },
    { id: 'claims', label: 'Claims', icon: 'file-invoice-dollar' },
    { id: 'verification', label: 'HITL', icon: 'clipboard-check' },
    { id: 'analytics', label: 'Analytics', icon: 'chart-line' },
    { id: 'operations', label: 'Operations', icon: 'gear' }
  ],

  init() {
    if (!document.querySelector('.app-header')) {
      this.renderHeader();
    }
    this.renderTabs();
    this.switchTab(this.activeTab);
  },

  renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="header-brand">
        <i class="fas fa-heart-pulse"></i>
        <span class="header-title">Leviathan</span>
        <span class="header-subtitle">Doctors on Wheels</span>
      </div>
      <div class="header-tabs" id="header-tabs"></div>
      <div class="header-right">
        <div class="header-search">
          <i class="fas fa-search"></i>
          <input type="text" id="global-search" placeholder="Search patients..." oninput="handleSearch(this.value)">
        </div>
        <div class="header-user" id="header-user"></div>
      </div>
    `;
    document.body.prepend(header);
  },

  renderTabs() {
    const container = document.getElementById('header-tabs');
    if (!container) return;
    container.innerHTML = '';
    this.tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.tab = tab.id;
      btn.innerHTML = `<i class="fas fa-${tab.icon}"></i> ${tab.label}`;
      btn.onclick = () => this.switchTab(tab.id);
      container.appendChild(btn);
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.toggle('hidden', view.id !== `tab-${tabId}`);
    });
    this.loadTabContent(tabId);
  },

  loadTabContent(tabId) {
    switch (tabId) {
      case 'schedule':
        if (typeof Calendar !== 'undefined') Calendar.init();
        break;
      case 'patients':
        if (typeof Patients !== 'undefined') Patients.load();
        break;
      case 'clinical':
        if (typeof ClinicalTools !== 'undefined') ClinicalTools.init();
        break;
      case 'claims':
        if (typeof Claims !== 'undefined') Claims.load();
        break;
      case 'verification':
        if (typeof HITL !== 'undefined') HITL.load();
        break;
      case 'analytics':
        if (typeof Analytics !== 'undefined') Analytics.load();
        break;
      case 'operations':
        if (typeof Operations !== 'undefined') Operations.load();
        break;
    }
  },

  updateUser(user) {
    const container = document.getElementById('header-user');
    if (container && user) {
      container.innerHTML = `
        <div class="header-avatar"><i class="fas fa-user-doctor"></i></div>
        <div class="header-user-info">
          <div class="header-user-name">${esc(user.email.split('@')[0])}</div>
          <div class="header-user-role">Verified Provider</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="logout()" title="Sign Out"><i class="fas fa-sign-out"></i></button>
      `;
    }
  }
};

function openWorkspace(patientId, appointment) {
  if (typeof Workspace !== 'undefined') Workspace.open(patientId, appointment);
}
