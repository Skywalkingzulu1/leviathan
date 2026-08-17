const SUPABASE_URL='http://127.0.0.1:54321';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
let currentUser=null;
let activeView='dashboard';

/* ─── HELPERS ─── */
function $(id){return document.getElementById(id)}
function show(el){el&&el.classList.remove('hidden')}
function hide(el){el&&el.classList.add('hidden')}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})}
function fmtDateTime(d){if(!d)return'—';return new Date(d).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function fmtMoney(n){if(n==null||n==='')return'R0';return'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:0,maximumFractionDigits:2})}
function tag(status){return`<span class="tag tag-${status}">${(status||'').replace(/_/g,' ')}</span>`}

function toast(msg,isError){
  const t=$('toast');t.textContent=msg;
  t.className='toast'+(isError?' error':'')+' show';
  setTimeout(()=>t.className='toast',3000);
}

function stat(icon,label,value,color){
  return`<div class="stat-card"><div class="stat-icon ${color||'blue'}"><i class="fas fa-${icon}"></i></div><div class="stat-val">${value}</div><div class="stat-lab">${label}</div></div>`;
}

function makeTable(headers,rows){
  let h='<table class="em-table"><thead><tr>';
  headers.forEach(col=>h+=`<th>${col}</th>`);
  h+='</tr></thead><tbody>';
  if(!rows||rows.length===0){h+=`<tr><td colspan="${headers.length}" class="empty-state">No records yet.</td></tr>`;}
  else rows.forEach(r=>h+=`<tr>${r}</tr>`);
  h+='</tbody></table>';
  return h;
}

/* ─── AUTH ─── */
async function login(){
  const email=$('login-email').value, pw=$('login-password').value;
  $('auth-error').textContent='';
  const{data,error}=await sb.auth.signInWithPassword({password:pw,email});
  if(error){$('auth-error').textContent=error.message;return;}
  onAuth(data.user);
}

async function logout(){
  await sb.auth.signOut();
  currentUser=null;
  hide($('app'));show($('auth-screen'));
  $('auth-user').classList.add('hidden');$('auth-login').classList.remove('hidden');
}

function onAuth(user){
  currentUser=user;
  hide($('auth-screen'));hide($('splash'));show($('app'));
  $('display-user-name').textContent=user.email.split('@')[0];
  $('auth-user-text').textContent='Signed in as '+user.email;
  switchView('dashboard');
}

/* ─── SIDEBAR NAV ─── */
function switchView(id){
  activeView=id;
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  const v=$('view-'+id);if(v)v.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n=>{
    n.classList.toggle('active',n.dataset.view===id);
  });
  loadView(id);
  closeMobileMenu();
}

function toggleMobileMenu(){
  $('sidebar').classList.toggle('mobile-open');
  $('sidebar').previousElementSibling.classList.toggle('active');
}
function closeMobileMenu(){
  $('sidebar').classList.remove('mobile-open');
  const o=$('sidebar').previousElementSibling;
  if(o)o.classList.remove('active');
}

/* ─── DATA LOADING ─── */
async function loadView(id){
  switch(id){
    case'dashboard':await loadDashboard();await loadApprovalBadge();break;
    case'approvals':await loadApprovals();break;
    case'charting':await loadPatients();await loadVisits();break;
    case'telemedicine':await loadConsultations();break;
    case'referrals':await loadReferrals();break;
    case'wellbeing':await loadWellbeing();break;
    case'roster':await loadShifts();break;
    case'risk':await loadCases();break;
    case'practice':await loadAppointments();await loadKPIs();break;
    case'finance':await loadTransactions();await loadLoans();break;
    case'claims':await loadClaims();break;
    case'scribe':await loadScribeJobs();break;
    case'documents':await loadDocPatients();break;
  }
}

async function query(table,opts={}){
  let q=sb.from(table).select(opts.select||'*');
  if(opts.order)q=q.order(opts.order.col,{ascending:opts.order.asc||false});
  if(opts.filter)q=q.eq(opts.filter.col,opts.filter.val);
  if(opts.limit)q=q.limit(opts.limit);
  return q;
}

/* ─── DASHBOARD ─── */
async function loadDashboard(){
  const[appts,kpis,wellbeing,claims,referrals]=await Promise.all([
    sb.from('appointments').select('status,appt_at,patient_name'),
    sb.from('practice_kpis').select('revenue,expense,patient_count'),
    sb.from('wellbeing_checkins').select('mood,stress,burnout_risk'),
    sb.from('claims').select('status,amount'),
    sb.from('referrals').select('status,urgency')
  ]);
  const ad=appts.data||[],kd=kpis.data||[],wd=wellbeing.data||[],cd=claims.data||[],rd=referrals.data||[];
  const booked=ad.filter(r=>r.status==='booked'||r.status==='confirmed').length;
  const totalRev=kd.reduce((s,r)=>s+r.revenue,0);
  const urgent=rd.filter(r=>r.urgency==='urgent').length;
  const highRisk=wd.filter(r=>r.burnout_risk==='high').length;

  $('dashboard-stats').innerHTML=
    stat('calendar-check','Upcoming',booked,'blue')+
    stat('naira','Revenue',fmtMoney(totalRev),'green')+
    stat('users','Patients',kd.reduce((s,r)=>s+r.patient_count,0),'blue')+
    stat('triangle-exclamation','Urgent Referrals',urgent,'red')+
    stat('brain','High Burnout Risk',highRisk,'amber');

  const rows=ad.filter(r=>r.status==='booked'||r.status==='confirmed').slice(0,5);
  if(rows.length===0){
    $('dashboard-appointments').innerHTML='<div class="empty-state">No upcoming appointments.</div>';
  }else{
    $('dashboard-appointments').innerHTML=makeTable(['Patient','When','Status'],
      rows.map(r=>`<td><strong>${r.patient_name}</strong></td><td>${fmtDateTime(r.appt_at)}</td><td>${tag(r.status)}</td>`));
  }
}

/* ─── PATIENTS ─── */
async function loadPatients(){
  const{data}=await sb.from('patients').select('*').order('created_at',{ascending:false});
  $('patients-count').textContent=(data||[]).length;
  $('patients-table-wrap').innerHTML=makeTable(['Name','DOB','Sex','Allergies','Actions'],
    (data||[]).map(r=>`<td><strong>${r.name}</strong></td><td>${fmtDate(r.dob)}</td><td>${r.sex||'—'}</td><td>${r.allergies||'—'}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('patients','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── VISITS ─── */
async function loadVisits(){
  const{data}=await sb.from('visits').select('*').order('created_at',{ascending:false});
  $('visits-count').textContent=(data||[]).length;
  $('visits-table-wrap').innerHTML=makeTable(['Date','Complaint','S','O','A','P','Actions'],
    (data||[]).map(r=>`<td>${fmtDate(r.visit_date)}</td><td>${r.chief_complaint||'—'}</td>
    <td title="${r.subjective||''}">${(r.subjective||'—').substring(0,40)}</td>
    <td title="${r.objective||''}">${(r.objective||'—').substring(0,40)}</td>
    <td title="${r.assessment||''}">${(r.assessment||'—').substring(0,40)}</td>
    <td title="${r.plan||''}">${(r.plan||'—').substring(0,40)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('visits','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── CONSULTATIONS ─── */
async function loadConsultations(){
  const{data}=await sb.from('consultations').select('*').order('created_at',{ascending:false});
  const scheduled=(data||[]).filter(r=>r.status==='scheduled').length;
  const completed=(data||[]).filter(r=>r.status==='completed').length;
  $('tele-stats').innerHTML=stat('video','Total',(data||[]).length,'blue')+stat('clock','Scheduled',scheduled,'amber')+stat('check-circle','Completed',completed,'green');
  $('consultations-table-wrap').innerHTML=makeTable(['Patient','When','Duration','Status','Actions'],
    (data||[]).map(r=>`<td><strong>${r.patient_name}</strong></td><td>${fmtDateTime(r.scheduled_at)}</td><td>${r.duration_min}min</td><td>${tag(r.status)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('consultations','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── REFERRALS ─── */
async function loadReferrals(){
  const{data}=await sb.from('referrals').select('*').order('created_at',{ascending:false});
  const urgent=(data||[]).filter(r=>r.urgency==='urgent').length;
  const matched=(data||[]).filter(r=>r.status==='matched'||r.status==='accepted').length;
  $('referral-stats').innerHTML=stat('arrow-right-arrow-left','Total',(data||[]).length,'blue')+stat('bolt','Urgent',urgent,'red')+stat('check','Matched',matched,'green')+stat('clock','New',(data||[]).filter(r=>r.status==='new').length,'amber');
  $('referrals-table-wrap').innerHTML=makeTable(['Patient','Source','Urgency','Specialty','Status','Actions'],
    (data||[]).map(r=>`<td><strong>${r.patient_name}</strong></td><td>${(r.source||'—').replace(/_/g,' ')}</td><td>${tag(r.urgency)}</td><td>${r.required_specialty||'—'}</td><td>${tag(r.status)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('referrals','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── WELLBEING ─── */
async function loadWellbeing(){
  const{data}=await sb.from('wellbeing_checkins').select('*').order('created_at',{ascending:false});
  const n=(data||[]).length;
  const avgMood=n?(data.reduce((s,r)=>s+r.mood,0)/n).toFixed(1):'0';
  const avgStress=n?(data.reduce((s,r)=>s+r.stress,0)/n).toFixed(1):'0';
  const highRisk=(data||[]).filter(r=>r.burnout_risk==='high').length;
  $('wellbeing-stats').innerHTML=stat('brain','Check-ins',n,'blue')+stat('face-smile','Avg Mood',avgMood,'green')+stat('bolt','Avg Stress',avgStress,'red')+stat('triangle-exclamation','High Risk',highRisk,'amber');
  $('wellbeing-table-wrap').innerHTML=makeTable(['Date','Mood','Energy','Stress','Sleep','Risk','Notes','Actions'],
    (data||[]).map(r=>`<td>${fmtDate(r.checkin_date)}</td><td>${r.mood}/5</td><td>${r.energy}/5</td><td>${r.stress}/5</td><td>${r.sleep_hours?r.sleep_hours+'h':'—'}</td><td>${tag(r.burnout_risk)}</td>
    <td title="${r.notes||''}">${(r.notes||'—').substring(0,30)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('wellbeing_checkins','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── SHIFTS ─── */
async function loadShifts(){
  const{data}=await sb.from('shifts').select('*').order('created_at',{ascending:false});
  const confirmed=(data||[]).filter(r=>r.status==='confirmed').length;
  const locums=(data||[]).filter(r=>r.is_locum).length;
  const needsCover=(data||[]).filter(r=>r.status==='needs_cover').length;
  $('roster-stats').innerHTML=stat('calendar-days','Total',(data||[]).length,'blue')+stat('check-circle','Confirmed',confirmed,'green')+stat('users','Locums',locums,'amber')+stat('triangle-exclamation','Needs Cover',needsCover,'red');
  $('shifts-table-wrap').innerHTML=makeTable(['Title','Start','End','Location','Status','Locum','Actions'],
    (data||[]).map(r=>`<td><strong>${r.title}</strong></td><td>${fmtDateTime(r.start_at)}</td><td>${fmtDateTime(r.end_at)}</td><td>${r.location||'—'}</td><td>${tag(r.status)}</td><td>${r.is_locum?'Yes':'No'}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('shifts','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── LEGAL CASES ─── */
async function loadCases(){
  const{data}=await sb.from('legal_cases').select('*').order('created_at',{ascending:false});
  const open=(data||[]).filter(r=>r.status==='open'||r.status==='preparing').length;
  const active=(data||[]).filter(r=>r.status==='active_litigation').length;
  $('risk-stats').innerHTML=stat('shield-halved','Total',(data||[]).length,'blue')+stat('folder-open','Open',open,'amber')+stat('gavel','Active Litigation',active,'red');
  $('cases-table-wrap').innerHTML=makeTable(['Title','Type','Status','Attorney','Insurer','Actions'],
    (data||[]).map(r=>`<td><strong>${r.title}</strong></td><td>${(r.case_type||'—').replace(/_/g,' ')}</td><td>${tag(r.status)}</td><td>${r.attorney||'—'}</td><td>${r.insurer||'—'}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('legal_cases','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── APPOINTMENTS ─── */
async function loadAppointments(){
  const{data}=await sb.from('appointments').select('*').order('created_at',{ascending:false});
  $('appt-count').textContent=(data||[]).length;
  const booked=(data||[]).filter(r=>r.status==='booked'||r.status==='confirmed').length;
  const totalRev=(await sb.from('practice_kpis').select('revenue')).data?.reduce((s,r)=>s+r.revenue,0)||0;
  $('practice-stats').innerHTML=stat('calendar-check','Upcoming',booked,'blue')+stat('naira','Revenue',fmtMoney(totalRev),'green')+stat('user-clock','Total',(data||[]).length,'blue');
  $('appointments-table-wrap').innerHTML=makeTable(['Patient','When','Duration','Reason','Status','Actions'],
    (data||[]).map(r=>`<td><strong>${r.patient_name}</strong></td><td>${fmtDateTime(r.appt_at)}</td><td>${r.duration_min}min</td><td>${r.reason||'—'}</td><td>${tag(r.status)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('appointments','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── KPIs ─── */
async function loadKPIs(){
  const{data}=await sb.from('practice_kpis').select('*').order('created_at',{ascending:false});
  $('kpi-count').textContent=(data||[]).length;
  $('kpis-table-wrap').innerHTML=makeTable(['Month','Patients','Revenue','Expenses','No-Show %','Actions'],
    (data||[]).map(r=>`<td>${fmtDate(r.month)}</td><td>${r.patient_count}</td><td>${fmtMoney(r.revenue)}</td><td>${fmtMoney(r.expense)}</td><td>${r.no_show_rate||0}%</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('practice_kpis','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── TRANSACTIONS ─── */
async function loadTransactions(){
  const{data}=await sb.from('transactions').select('*').order('created_at',{ascending:false});
  $('txn-count').textContent=(data||[]).length;
  const income=(data||[]).filter(r=>r.txn_type==='income').reduce((s,r)=>s+r.amount,0);
  const expense=(data||[]).filter(r=>r.txn_type==='expense').reduce((s,r)=>s+r.amount,0);
  const totalDebt=(await sb.from('loans').select('balance')).data?.reduce((s,r)=>s+r.balance,0)||0;
  $('finance-stats').innerHTML=stat('arrow-down','Income',fmtMoney(income),'green')+stat('arrow-up','Expenses',fmtMoney(expense),'red')+stat('scale-balanced','Net',fmtMoney(income-expense),'blue')+stat('landmark','Total Debt',fmtMoney(totalDebt),'amber');
  $('transactions-table-wrap').innerHTML=makeTable(['Type','Amount','Category','Description','Date','Actions'],
    (data||[]).map(r=>`<td>${tag(r.txn_type)}</td><td><strong>${fmtMoney(r.amount)}</strong></td><td>${r.category||'—'}</td><td>${r.description||'—'}</td><td>${fmtDate(r.txn_date)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('transactions','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── LOANS ─── */
async function loadLoans(){
  const{data}=await sb.from('loans').select('*').order('created_at',{ascending:false});
  $('loan-count').textContent=(data||[]).length;
  $('loans-table-wrap').innerHTML=makeTable(['Lender','Type','Principal','Balance','Rate','Monthly','Status','Actions'],
    (data||[]).map(r=>`<td><strong>${r.lender}</strong></td><td>${(r.loan_type||'—').replace(/_/g,' ')}</td><td>${fmtMoney(r.principal)}</td><td>${fmtMoney(r.balance)}</td><td>${r.interest_rate||0}%</td><td>${fmtMoney(r.monthly_payment)}/mo</td><td>${tag(r.status)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('loans','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── CLAIMS ─── */
async function loadClaims(){
  const{data}=await sb.from('claims').select('*').order('created_at',{ascending:false});
  const total=(data||[]).reduce((s,r)=>s+r.amount,0);
  const approved=(data||[]).filter(r=>r.status==='approved'||r.status==='paid').reduce((s,r)=>s+r.amount,0);
  const denied=(data||[]).filter(r=>r.status==='denied').length;
  $('claims-stats').innerHTML=stat('file-invoice-dollar','Total',(data||[]).length,'blue')+stat('naira','Value',fmtMoney(total),'blue')+stat('check-circle','Approved',fmtMoney(approved),'green')+stat('xmark','Denied',denied,'red');
  $('claims-table-wrap').innerHTML=makeTable(['Patient','Amount','Insurer','Code','Status','Date','Actions'],
    (data||[]).map(r=>`<td><strong>${r.patient_name}</strong></td><td>${fmtMoney(r.amount)}</td><td>${r.insurer||'—'}</td><td>${r.code||'—'}</td><td>${tag(r.status)}</td><td>${fmtDate(r.service_date)}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('claims','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── SCRIBE JOBS ─── */
async function loadScribeJobs(){
  const{data}=await sb.from('scribe_jobs').select('*').order('created_at',{ascending:false});
  $('scribe-count').textContent=(data||[]).length;
  $('scribe-table-wrap').innerHTML=makeTable(['Status','Transcript','Note','Duration','Actions'],
    (data||[]).map(r=>`<td>${tag(r.status)}</td>
    <td title="${r.transcript||''}">${(r.transcript||'—').substring(0,60)}</td>
    <td title="${r.note||''}">${(r.note||'—').substring(0,60)}</td>
    <td>${r.duration_min?r.duration_min+'min':'—'}</td>
    <td class="row-actions"><button class="btn btn-sm btn-danger" onclick="deleteRow('scribe_jobs','${r.id}')"><i class="fas fa-trash"></i></button></td>`));
}

/* ─── AI SCRIBE ─── */
async function runAiScribe(){
  const btn=$('scribe-btn');
  const transcript=$('scribe-input').value.trim();
  if(!transcript){toast('Enter consultation notes first',true);return;}
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Generating...';
  try{
    const token=(await sb.auth.getSession()).data.session?.access_token;
    const resp=await fetch(SUPABASE_URL+'/functions/v1/ai-scribe',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'apikey':SUPABASE_ANON},
      body:JSON.stringify({transcript,patient_name:$('scribe-patient').value||undefined})
    });
    const data=await resp.json();
    if(data.error){toast('Error: '+data.error,true);return;}
    const note=data.note||'';
    let html='';
    const sections=note.split(/\n\n/);
    sections.forEach(s=>{
      const lines=s.split('\n');
      const header=lines[0];
      if(/^(SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN)$/i.test(header.trim())){
        html+=`<h4>${header.trim()}</h4><p>${lines.slice(1).join('\n')}</p>`;
      }else{
        html+=`<p>${s}</p>`;
      }
    });
    $('scribe-output').innerHTML=html||note;
    show($('scribe-actions'));
    toast('SOAP note generated');
    await loadScribeJobs();
  }catch(e){toast('Request failed: '+e.message,true);}
  finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-wand-sparkles"></i> Generate SOAP Note';}
}

function copyScribeNote(){
  const text=$('scribe-output').innerText;
  navigator.clipboard.writeText(text).then(()=>toast('Copied'));
}

function saveScribeToVisit(){
  const text=$('scribe-output').innerText;
  switchView('charting');
  openModal('visits');
}

/* ─── DOCUMENT GENERATOR ─── */
async function loadDocPatients(){
  const{data}=await sb.from('patients').select('id,name').order('name');
  const sel=$('doc-patient');
  sel.innerHTML='<option value="">Select a patient...</option>';
  (data||[]).forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;sel.appendChild(o);});
}

function toggleDocFields(){
  const type=$('doc-type').value;
  if(type==='prescription')show($('prescription-fields'));else hide($('prescription-fields'));
  if(type==='clinical_note'||type==='sick_note'||type==='referral')show($('soap-fields'));else hide($('soap-fields'));
}

function addMedRow(){
  const row=document.createElement('div');row.className='med-row';
  row.innerHTML=`<input class="med-name" placeholder="Medication"><input class="med-dose" placeholder="Dose"><input class="med-freq" placeholder="Frequency"><input class="med-qty" placeholder="Qty"><button class="btn btn-sm btn-danger" onclick="this.closest('.med-row').remove()"><i class="fas fa-times"></i></button>`;
  $('med-list').appendChild(row);
}

function generateDocument(){
  const type=$('doc-type').value;
  const patient=$('doc-patient');
  const patientName=patient.options[patient.selectedIndex]?.text||'Patient';
  const context=$('doc-context').value;
  const now=new Date().toLocaleDateString('en-ZA');

  let title='Clinical Note';
  let body='';

  if(type==='sick_note'){
    title='Medical Certificate / Sick Note';
    body=`Patient: ${patientName}\nDate: ${now}\n\nDiagnosis: ${context}\n\nThis certifies that the above-named patient is medically unfit to attend work/duty from the date of this consultation.\n\nPlease contact the practice for any further information.`;
  }else if(type==='prescription'){
    title='Prescription';
    const meds=[];
    document.querySelectorAll('.med-row').forEach(r=>{
      const n=r.querySelector('.med-name').value;
      const d=r.querySelector('.med-dose').value;
      const f=r.querySelector('.med-freq').value;
      const q=r.querySelector('.med-qty').value;
      if(n)meds.push(`${n} — ${d} ${f} (${q}x)`);
    });
    body=`Patient: ${patientName}\nDate: ${now}\n\n${context?context+'\n\n':''}Medications:\n${meds.length?meds.map(m=>'  • '+m).join('\n'):'  (No medications specified)'}`;
  }else if(type==='referral'){
    title='Referral Letter';
    body=`Patient: ${patientName}\nDate: ${now}\n\nClinical Summary:\n${context}\n\nI am referring the above patient for specialist assessment and management. Please find the relevant clinical details above.\n\nThank you for your attention to this matter.`;
  }else{
    title='Clinical Note';
    const s=$('doc-soap-s').value;
    const o=$('doc-soap-o').value;
    const a=$('doc-soap-a').value;
    const p=$('doc-soap-p').value;
    body=`Patient: ${patientName}\nDate: ${now}\n\n`;
    if(s)body+=`SUBJECTIVE:\n${s}\n\n`;
    if(o)body+=`OBJECTIVE:\n${o}\n\n`;
    if(a)body+=`ASSESSMENT:\n${a}\n\n`;
    if(p)body+=`PLAN:\n${p}\n\n`;
    if(context)body+=`Additional Context:\n${context}`;
  }

  $('doc-preview').innerHTML=`
    <div class="doc-header">
      <div class="doc-logo">
        <div class="doc-logo-box">LV</div>
        <div class="doc-logo-text"><h2>Leviathan</h2><p>All-in-One Doctor Platform</p></div>
      </div>
      <div style="text-align:right;font-size:0.85rem;color:var(--text-muted)">
        <strong style="color:var(--text)">${currentUser?.email||'Doctor'}</strong><br>
        <span>Verified Provider</span>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:1.5rem"><h3 style="text-decoration:underline;text-transform:uppercase;font-size:1rem">${title}</h3></div>
    <div class="doc-body">${body.replace(/\n/g,'<br>')}</div>
    <div class="doc-footer">
      <div><strong>Date:</strong> ${now}</div>
      <div style="text-align:center"><div style="border-bottom:1px solid #333;min-height:2rem;margin-bottom:0.25rem;padding:0 1rem"></div><div style="font-size:0.8rem;font-weight:600">${currentUser?.email||'Doctor'}</div><div style="font-size:0.7rem;color:#999">Electronically Signed</div></div>
    </div>`;

  hide($('doc-preview-placeholder'));show($('doc-preview'));show($('doc-preview-actions'));
  toast('Document generated');
}

function copyDocumentText(){
  navigator.clipboard.writeText($('doc-preview').innerText).then(()=>toast('Copied'));
}

function downloadDocumentPDF(){
  const el=$('doc-preview');
  html2pdf().set({margin:1,filename:'leviathan-document.pdf',html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}}).from(el).save();
}

/* ─── APPROVALS / HITL ─── */
async function loadApprovalBadge(){
  const{data}=await sb.from('workflow_approvals').select('id').eq('status','pending');
  const count=(data||[]).length;
  const badge=$('approval-badge');
  const pb=$('pending-badge');
  if(count>0){badge.textContent=count;show(badge);pb.textContent=count;show(pb);}
  else{hide(badge);hide(pb);}
}

async function loadApprovals(){
  const{data:pending}=await sb.from('workflow_approvals').select('*').eq('status','pending').order('created_at',{ascending:false});
  const{data:resolved}=await sb.from('workflow_approvals').select('*').neq('status','pending').order('reviewed_at',{ascending:false}).limit(10);

  const p=(pending||[]),r=(resolved||[]);
  $('pending-count').textContent=p.length;

  $('approval-stats').innerHTML=
    stat('clock','Pending',p.length,'amber')+
    stat('check-circle','Approved',r.filter(x=>x.status==='approved').length,'green')+
    stat('xmark','Rejected',r.filter(x=>x.status==='rejected').length,'red')+
    stat('pen','Overridden',r.filter(x=>x.status==='override').length,'blue');

  if(p.length===0){
    $('approvals-list').innerHTML='<div class="empty-state"><i class="fas fa-check-circle" style="font-size:2rem;color:var(--accent);opacity:0.3;margin-bottom:0.5rem;display:block"></i>No pending approvals. All workflows clear.</div>';
  }else{
    $('approvals-list').innerHTML='';
    p.forEach(a=>{
      const card=document.createElement('div');
      card.className='approval-card priority-'+a.priority;
      const dataPreview=JSON.stringify(a.proposed_data,null,2);
      card.innerHTML=`
        <div class="approval-header">
          <div>
            <div class="approval-title">${a.title}</div>
            <span class="tag tag-${a.priority==='critical'?'high':a.priority}">${a.priority}</span>
            <span class="tag tag-${a.workflow_type==='triage'?'medium':'submitted'}">${a.workflow_type}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${fmtDateTime(a.created_at)}</div>
        </div>
        <div class="approval-desc">${a.description||'No description'}</div>
        <div class="approval-data">${dataPreview}</div>
        <div class="approval-actions">
          <button class="btn btn-primary btn-sm" onclick="resolveApproval('${a.id}','approve')"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-ghost btn-sm" onclick="resolveApproval('${a.id}','override')"><i class="fas fa-pen"></i> Override & Approve</button>
          <button class="btn btn-danger btn-sm" onclick="resolveApproval('${a.id}','reject')"><i class="fas fa-times"></i> Reject</button>
        </div>`;
      $('approvals-list').appendChild(card);
    });
  }

  // Audit log
  const{data:logs}=await sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(20);
  $('audit-table-wrap').innerHTML=makeTable(['Time','Actor','Action','Persona','Resource'],
    (logs||[]).map(l=>`<td>${fmtDateTime(l.created_at)}</td><td>${tag(l.actor_type)}</td><td>${l.action}</td><td>${l.persona||'—'}</td><td>${l.resource_type||'—'}</td>`));

  await loadApprovalBadge();
}

async function resolveApproval(id,action){
  let notes=null;
  if(action==='override'){
    notes=prompt('Override notes (optional):');
  }
  try{
    const token=(await sb.auth.getSession()).data.session?.access_token;
    const resp=await fetch(SUPABASE_URL+'/functions/v1/approval-gate',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'apikey':SUPABASE_ANON},
      body:JSON.stringify({action,approval_id:id,notes})
    });
    const data=await resp.json();
    if(data.error){toast('Error: '+data.error,true);return;}
    toast(`Approval ${action === 'override' ? 'overridden' : action === 'approve' ? 'approved' : 'rejected'}`);
    await loadApprovals();
  }catch(e){toast('Failed: '+e.message,true);}
}

/* ─── SEARCH ─── */
let searchTimeout;
function handleSearch(val){
  clearTimeout(searchTimeout);
  if(!val||val.length<2)return;
  searchTimeout=setTimeout(async()=>{
    const q=val.toLowerCase();
    const results=[];
    const searches=[
      {table:'patients',fields:['name','allergies','conditions'],view:'charting',label:'Patients'},
      {table:'visits',fields:['chief_complaint','subjective','assessment'],view:'charting',label:'Visits'},
      {table:'claims',fields:['patient_name','insurer','code'],view:'claims',label:'Claims'},
      {table:'referrals',fields:['patient_name','required_specialty'],view:'referrals',label:'Referrals'},
      {table:'appointments',fields:['patient_name','reason'],view:'practice',label:'Appointments'},
    ];
    for(const s of searches){
      const{data}=await sb.from(s.table).select('*').limit(5);
      (data||[]).forEach(r=>{
        const match=s.fields.some(f=>(r[f]||'').toLowerCase().includes(q));
        if(match)results.push({view:s.view,label:s.label,name:r.name||r.patient_name||r.title||'—',data:r});
      });
    }
    if(results.length>0){
      switchView(results[0].view);
      toast(`Found ${results.length} result(s)`);
    }
  },400);
}

/* ─── DELETE ─── */
async function deleteRow(table,id){
  if(!confirm('Delete this record?'))return;
  const{error}=await sb.from(table).delete().eq('id',id);
  if(error){toast('Delete failed: '+error.message,true);return;}
  toast('Deleted');
  loadView(activeView);
}

/* ─── MODAL / CRUD ─── */
const MODULES={
  wellbeing:{table:'wellbeing_checkins',title:'Wellbeing Check-in',fields:[
    {name:'mood',label:'Mood (1-5)',type:'number',min:1,max:5,required:true},
    {name:'energy',label:'Energy (1-5)',type:'number',min:1,max:5,required:true},
    {name:'stress',label:'Stress (1-5)',type:'number',min:1,max:5,required:true},
    {name:'sleep_hours',label:'Sleep Hours',type:'number',min:0,max:24},
    {name:'burnout_risk',label:'Burnout Risk',type:'select',options:['low','medium','high']},
    {name:'checkin_date',label:'Date',type:'date'},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  claims:{table:'claims',title:'Insurance Claim',fields:[
    {name:'patient_name',label:'Patient Name',type:'text',required:true},
    {name:'service_date',label:'Service Date',type:'date'},
    {name:'amount',label:'Amount',type:'number',min:0,required:true},
    {name:'insurer',label:'Insurer',type:'text'},
    {name:'code',label:'ICD-10 / CPT Code',type:'text'},
    {name:'status',label:'Status',type:'select',options:['draft','submitted','approved','denied','appealing','paid']},
    {name:'denial_reason',label:'Denial Reason',type:'text'},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  transactions:{table:'transactions',title:'Transaction',fields:[
    {name:'txn_type',label:'Type',type:'select',options:['income','expense','loan_payment'],required:true},
    {name:'amount',label:'Amount',type:'number',min:0,required:true},
    {name:'category',label:'Category',type:'text'},
    {name:'description',label:'Description',type:'text'},
    {name:'txn_date',label:'Date',type:'date'}
  ]},
  loans:{table:'loans',title:'Loan',fields:[
    {name:'lender',label:'Lender',type:'text',required:true},
    {name:'loan_type',label:'Loan Type',type:'select',options:['student','mortgage','practice','other']},
    {name:'principal',label:'Principal',type:'number',min:0,required:true},
    {name:'interest_rate',label:'Interest Rate %',type:'number',min:0},
    {name:'balance',label:'Current Balance',type:'number',min:0},
    {name:'monthly_payment',label:'Monthly Payment',type:'number',min:0},
    {name:'status',label:'Status',type:'select',options:['active','paid_off']}
  ]},
  consultations:{table:'consultations',title:'Teleconsultation',fields:[
    {name:'patient_name',label:'Patient Name',type:'text',required:true},
    {name:'scheduled_at',label:'Scheduled At',type:'datetime',required:true},
    {name:'duration_min',label:'Duration (min)',type:'number',min:1,value:15},
    {name:'status',label:'Status',type:'select',options:['scheduled','in_progress','completed','cancelled','no_show']},
    {name:'room_url',label:'Room URL',type:'text'},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  patients:{table:'patients',title:'Patient',fields:[
    {name:'name',label:'Full Name',type:'text',required:true},
    {name:'dob',label:'Date of Birth',type:'date'},
    {name:'sex',label:'Sex',type:'select',options:['M','F','Other','']},
    {name:'allergies',label:'Allergies',type:'textarea'},
    {name:'conditions',label:'Conditions',type:'textarea'},
    {name:'medications',label:'Medications',type:'textarea'},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  visits:{table:'visits',title:'SOAP Visit',fields:[
    {name:'patient_id',label:'Patient',type:'select',ref:'patients',required:true},
    {name:'visit_date',label:'Date',type:'date'},
    {name:'chief_complaint',label:'Chief Complaint',type:'text'},
    {name:'subjective',label:'Subjective (S)',type:'textarea'},
    {name:'objective',label:'Objective (O)',type:'textarea'},
    {name:'assessment',label:'Assessment (A)',type:'textarea'},
    {name:'plan',label:'Plan (P)',type:'textarea'}
  ]},
  shifts:{table:'shifts',title:'Shift',fields:[
    {name:'title',label:'Title',type:'text',required:true},
    {name:'start_at',label:'Start',type:'datetime',required:true},
    {name:'end_at',label:'End',type:'datetime',required:true},
    {name:'location',label:'Location',type:'text'},
    {name:'status',label:'Status',type:'select',options:['draft','confirmed','cancelled','covered','needs_cover']},
    {name:'is_locum',label:'Locum?',type:'select',options:['false','true']},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  legal_cases:{table:'legal_cases',title:'Legal Case',fields:[
    {name:'title',label:'Case Title',type:'text',required:true},
    {name:'case_type',label:'Case Type',type:'select',options:['malpractice','complaint','regulatory','insurance_dispute']},
    {name:'status',label:'Status',type:'select',options:['open','preparing','active_litigation','closed','resolved']},
    {name:'insurer',label:'Insurer',type:'text'},
    {name:'attorney',label:'Attorney',type:'text'},
    {name:'key_dates',label:'Key Dates',type:'text'},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  appointments:{table:'appointments',title:'Appointment',fields:[
    {name:'patient_name',label:'Patient Name',type:'text',required:true},
    {name:'appt_at',label:'Appointment At',type:'datetime',required:true},
    {name:'duration_min',label:'Duration (min)',type:'number',min:1,value:15},
    {name:'reason',label:'Reason',type:'text'},
    {name:'status',label:'Status',type:'select',options:['booked','confirmed','completed','cancelled','no_show']},
    {name:'notes',label:'Notes',type:'textarea'}
  ]},
  practice_kpis:{table:'practice_kpis',title:'Monthly KPI',fields:[
    {name:'month',label:'Month',type:'date',required:true},
    {name:'patient_count',label:'Patient Count',type:'number',min:0},
    {name:'revenue',label:'Revenue',type:'number',min:0},
    {name:'expense',label:'Expense',type:'number',min:0},
    {name:'no_show_rate',label:'No-Show Rate %',type:'number',min:0,max:100}
  ]},
  referrals:{table:'referrals',title:'Referral',fields:[
    {name:'patient_name',label:'Patient Name',type:'text',required:true},
    {name:'source',label:'Source',type:'select',options:['public_waitlist','gp','emergency','other']},
    {name:'urgency',label:'Urgency',type:'select',options:['routine','soon','urgent']},
    {name:'required_specialty',label:'Required Specialty',type:'text'},
    {name:'capacity_match',label:'Capacity Match',type:'text'},
    {name:'status',label:'Status',type:'select',options:['new','matched','accepted','completed','expired']},
    {name:'notes',label:'Notes',type:'textarea'}
  ]}
};

async function openModal(moduleName){
  const mod=MODULES[moduleName];if(!mod)return;
  $('modal-title').textContent='New '+mod.title;
  const form=$('modal-form');form.innerHTML='';

  for(const f of mod.fields){
    const wrapper=document.createElement('div');wrapper.className='form-group';
    const lbl=document.createElement('label');lbl.textContent=f.label;wrapper.appendChild(lbl);

    if(f.type==='select'&&f.ref){
      const sel=document.createElement('select');sel.name=f.name;
      if(!f.required){const o0=document.createElement('option');o0.value='';o0.textContent='-- None --';sel.appendChild(o0);}
      const{data}=await sb.from(f.ref).select('id,name').order('name');
      (data||[]).forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;sel.appendChild(o);});
      wrapper.appendChild(sel);
    }else if(f.type==='select'){
      const sel=document.createElement('select');sel.name=f.name;
      f.options.forEach(o=>{const opt=document.createElement('option');opt.value=o;opt.textContent=o.replace(/_/g,' ');sel.appendChild(opt);});
      wrapper.appendChild(sel);
    }else if(f.type==='textarea'){
      const ta=document.createElement('textarea');ta.name=f.name;ta.rows=3;wrapper.appendChild(ta);
    }else{
      const inp=document.createElement('input');inp.type=f.type==='datetime'?'datetime-local':f.type;inp.name=f.name;
      if(f.min!=null)inp.min=f.min;if(f.max!=null)inp.max=f.max;if(f.value!=null)inp.value=f.value;if(f.required)inp.required=true;
      wrapper.appendChild(inp);
    }
    form.appendChild(wrapper);
  }

  const btns=document.createElement('div');btns.className='form-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-ghost';cancel.textContent='Cancel';cancel.onclick=closeModal;
  const submit=document.createElement('button');submit.type='submit';submit.className='btn btn-primary';submit.textContent='Save';
  btns.appendChild(cancel);btns.appendChild(submit);form.appendChild(btns);

  form.onsubmit=async(e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    const row={user_id:currentUser.id};
    for(const f of mod.fields){
      let val=fd.get(f.name);
      if(f.name==='is_locum')val=val==='true';
      if(f.type==='number'&&val!=='')val=Number(val);
      if(f.type==='date'&&val&&f.name==='month')val=new Date(val+'-01').toISOString().split('T')[0];
      if(f.type==='datetime'&&val)val=new Date(val).toISOString();
      if((val===null||val==='')&&f.type!=='select'&&f.type!=='textarea')continue;
      row[f.name]=val||'';
    }
    const{error}=await sb.from(mod.table).insert(row);
    if(error){toast('Insert failed: '+error.message,true);return;}
    toast(mod.title+' added');
    closeModal();
    loadView(activeView);
  };
  $('modal-overlay').classList.add('open');
}

function closeModal(){$('modal-overlay').classList.remove('open');}

/* ─── INIT ─── */
(async()=>{
  const{data:{session}}=await sb.auth.getSession();
  if(session&&session.user){onAuth(session.user);}
  else{$('splash').classList.add('hidden');show($('auth-screen'));}
})();
