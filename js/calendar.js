/* ─── CALENDAR: Monthly grid with appointment dots ─── */

const Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,
  appointments: [],
  patientMap: {},
  dayMap: {},

  async init() {
    await this.load();
    this.render();
  },

  async load() {
    try {
      const { data: profiles } = await sb.from('Profiles').select('id, name');
      (profiles || []).forEach(p => { this.patientMap[p.id] = p.name; });

      const { data, error } = await sb.from('appointments')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(100);
      if (error) throw error;
      this.appointments = data || [];

      this.dayMap = {};
      this.appointments.forEach(a => {
        if (!a.timestamp) return;
        const d = new Date(a.timestamp);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (!this.dayMap[key]) this.dayMap[key] = [];
        this.dayMap[key].push(a);
      });
    } catch (e) {
      console.error('Calendar load error:', e);
    }
  },

  statusColor(status) {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'paid') return '#22c55e';
    if (s === 'pending' || s === 'scheduled' || s === 'booked') return '#f59e0b';
    if (s === 'cancelled' || s === 'rejected') return '#ef4444';
    return '#3b82f6';
  },

  patientName(patientId) {
    return this.patientMap[patientId] || 'Patient #' + patientId;
  },

  render() {
    const el = $('calendar-container');
    if (!el) return;

    const now = new Date();
    const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const monthName = new Date(this.currentYear, this.currentMonth).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(this.currentYear, this.currentMonth, 0).getDate();

    let html = '';

    html += '<div class="cal-header">';
    html += '<div class="cal-nav">';
    html += '<button class="em-btn ghost sm" onclick="Calendar.prevMonth()"><i class="fas fa-chevron-left"></i></button>';
    html += '<h3>' + esc(monthName) + '</h3>';
    html += '<button class="em-btn ghost sm" onclick="Calendar.nextMonth()"><i class="fas fa-chevron-right"></i></button>';
    html += '</div>';
    html += '<button class="em-btn ghost sm" onclick="Calendar.goToday()">Today</button>';
    html += '</div>';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    html += '<div class="cal-grid">';
    dayNames.forEach(d => { html += '<div class="cal-day-name">' + d + '</div>'; });

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      let dayNum, dateKey, classes = 'cal-cell';

      if (i < firstDay) {
        dayNum = daysInPrev - firstDay + i + 1;
        const pm = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
        const py = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
        dateKey = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        classes += ' other-month';
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - firstDay - daysInMonth + 1;
        const nm = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
        const ny = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
        dateKey = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
        classes += ' other-month';
      } else {
        dayNum = i - firstDay + 1;
        dateKey = this.currentYear + '-' + String(this.currentMonth + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0');
      }

      if (dateKey === todayKey) classes += ' today';
      if (dateKey === this.selectedDate) classes += ' selected';

      const appts = this.dayMap[dateKey] || [];

      html += '<div class="' + classes + '" onclick="Calendar.selectDay(\'' + dateKey + '\')">';
      html += '<div class="cal-day">' + dayNum + '</div>';
      if (appts.length > 0) {
        html += '<div class="cal-dots">';
        appts.slice(0, 4).forEach(a => {
          html += '<span class="cal-dot" style="background:' + this.statusColor(a.status) + '"></span>';
        });
        if (appts.length > 4) html += '<span class="cal-dot" style="background:#94a3b8"></span>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';

    if (this.selectedDate) {
      const appts = this.dayMap[this.selectedDate] || [];
      if (appts.length > 0) {
        const d = new Date(this.selectedDate + 'T12:00:00');
        const label = d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        html += '<div class="cal-selected-list">';
        html += '<div class="cal-selected-header"><h4><i class="fas fa-calendar-check"></i> Appointments on ' + esc(label) + ' (' + appts.length + ')</h4></div>';
        appts.forEach(a => {
          const time = new Date(a.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
          const name = this.patientName(a.patient_id);
          html += '<div class="cal-appt-row" style="border-left:4px solid ' + this.statusColor(a.status) + '">';
          html += '<div class="cal-appt-time">' + esc(time) + '</div>';
          html += '<div class="cal-appt-info">';
          html += '<div class="cal-appt-name">' + esc(name) + ' — ' + esc(a.appointment_type || 'Visit') + '</div>';
          html += '<div class="cal-appt-meta">' + tag((a.status || '').toLowerCase()) + (a.reason ? ' · ' + esc(a.reason) : '') + '</div>';
          html += '</div>';
          html += '<button class="em-btn sm primary" onclick="event.stopPropagation();Workspace.open(' + a.patient_id + ',null)"><i class="fas fa-arrow-right"></i> Workspace</button>';
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="cal-selected-list"><div class="empty-state"><i class="fas fa-calendar-xmark"></i> No appointments on this date</div></div>';
      }
    }

    el.innerHTML = html;
  },

  selectDay(dateKey) {
    this.selectedDate = dateKey;
    this.render();
  },

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.selectedDate = null;
    this.render();
  },

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.selectedDate = null;
    this.render();
  },

  goToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    this.render();
  }
};
