const SUPABASE_URL = 'https://jvsfhrekkkhijneqngax.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c2ZocmVra2toaWpuZXFuZ2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDE4MTksImV4cCI6MjA5MTQ3NzgxOX0.NZw_9YAzHrXaW3Fg2DWaVyVP3eut-skqaxIgga0cU3s';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
let currentUser = null;

/* ─── HELPERS ─── */
function $(id) { return document.getElementById(id); }
function show(el) { el && el.classList.remove('hidden'); }
function hide(el) { el && el.classList.add('hidden'); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function fmtMoney(n) { if (n == null || n === '') return 'R0'; return 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function tag(status) { return '<span class="tag tag-' + (status || 'unknown') + '">' + (status || '').replace(/_/g, ' ') + '</span>'; }

function toast(msg, isError) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '') + ' show';
  setTimeout(() => t.className = 'toast', 3000);
}

function stat(icon, label, value, color) {
  return '<div class="stat-card"><div class="stat-icon ' + (color || 'blue') + '"><i class="fas fa-' + icon + '"></i></div><div class="stat-val">' + value + '</div><div class="stat-lab">' + label + '</div></div>';
}

function makeTable(headers, rows) {
  let h = '<table class="em-table"><thead><tr>';
  headers.forEach(col => h += '<th>' + col + '</th>');
  h += '</tr></thead><tbody>';
  if (!rows || rows.length === 0) { h += '<tr><td colspan="' + headers.length + '" class="empty-state">No records yet.</td></tr>'; }
  else rows.forEach(r => h += '<tr>' + r + '</tr>');
  h += '</tbody></table>';
  return h;
}

/* ─── AUTH ─── */
async function login() {
  const email = $('login-email').value, pw = $('login-password').value;
  if (!email || !pw) { $('auth-error').textContent = 'Enter email and password'; return; }
  $('auth-error').textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ password: pw, email });
  if (error) { $('auth-error').textContent = error.message; return; }
  onAuth(data.user);
}

async function signup() {
  const email = $('login-email').value, pw = $('login-password').value, name = $('signup-name').value;
  if (!email || !pw) { $('auth-error').textContent = 'Enter email and password first, then click Create Account'; return; }
  $('auth-error').textContent = '';
  const { data, error } = await sb.auth.signUp({
    password: pw,
    email,
    options: { data: { full_name: name || email.split('@')[0] } }
  });
  if (error) { $('auth-error').textContent = error.message; return; }
  if (data.user && !data.session) {
    $('auth-error').textContent = 'Check your email to confirm your account, then sign in.';
    $('auth-error').style.color = 'var(--accent)';
    return;
  }
  onAuth(data.user);
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  hide($('app'));
  show($('auth-screen'));
  $('auth-user').classList.add('hidden');
  $('auth-login').classList.remove('hidden');
}

function onAuth(user) {
  currentUser = user;
  hide($('auth-screen'));
  hide($('splash'));
  show($('app'));
  AppShell.init();
  AppShell.updateUser(user);
}

/* ─── MODAL ─── */
function closeModal() { $('modal-overlay').classList.remove('open'); }

/* ─── SEARCH ─── */
let searchTimeout;
function handleSearch(val) {
  clearTimeout(searchTimeout);
  if (!val || val.length < 2) return;
  searchTimeout = setTimeout(async () => {
    try {
      const { data } = await sb.from('Doctors').select('id, full_name, specialty').ilike('full_name', '%' + val + '%').limit(5);
      if (data && data.length > 0) {
        toast('Found ' + data.length + ' result(s)');
        AppShell.switchTab('patients');
      }
    } catch (e) { /* ignore search errors */ }
  }, 400);
}

/* ─── INIT ─── */
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    onAuth(session.user);
  } else {
    $('splash').classList.add('hidden');
    show($('auth-screen'));
  }
})();
