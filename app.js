const SUPABASE_URL='http://127.0.0.1:54321';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
let currentUser=null;
let activeTab='wellbeing';

const TABS=[
  {id:'wellbeing',label:'Wellbeing'},
  {id:'claims',label:'Claims'},
  {id:'finance',label:'Finance'},
  {id:'telemedicine',label:'Telehealth'},
  {id:'charting',label:'EHR'},
  {id:'roster',label:'Roster'},
  {id:'risk',label:'Risk/Legal'},
  {id:'practice',label:'Practice'},
  {id:'scribe',label:'AI Scribe'},
  {id:'referrals',label:'Referrals'}
];

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
  scribe_jobs:{table:'scribe_jobs',title:'AI Scribe Job',fields:[
    {name:'status',label:'Status',type:'select',options:['queued','transcribing','generating','ready','failed']},
    {name:'audio_path',label:'Audio Path',type:'text'},
    {name:'transcript',label:'Transcript',type:'textarea'},
    {name:'note',label:'Generated Note',type:'textarea'},
    {name:'duration_min',label:'Duration (min)',type:'number',min:0},
    {name:'error',label:'Error',type:'textarea'}
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

function toast(msg,isError){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className='toast'+(isError?' error':'')+' show';
  setTimeout(()=>t.className='toast',3000);
}

async function login(){
  const email=document.getElementById('login-email').value;
  const pw=document.getElementById('login-password').value;
  document.getElementById('auth-error').textContent='';
  const{data,error}=await sb.auth.signInWithPassword({password:pw,email});
  if(error){document.getElementById('auth-error').textContent=error.message;return;}
  onAuth(data.user);
}

async function logout(){
  await sb.auth.signOut();
  currentUser=null;
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('auth-user').style.display='none';
  document.getElementById('auth-login').style.display='block';
}

function onAuth(user){
  currentUser=user;
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('user-email').textContent=user.email;
  document.getElementById('auth-user').style.display='block';
  document.getElementById('auth-login').style.display='none';
  document.getElementById('auth-user-text').textContent='Signed in as '+user.email;
  buildNav();
  switchTab('wellbeing');
}

function buildNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML='';
  TABS.forEach(t=>{
    const b=document.createElement('button');
    b.textContent=t.label;
    b.onclick=()=>switchTab(t.id);
    if(t.id===activeTab)b.classList.add('active');
    nav.appendChild(b);
  });
}

function switchTab(id){
  activeTab=id;
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  document.querySelectorAll('.nav button').forEach((b,i)=>{
    b.classList.toggle('active',TABS[i].id===id);
  });
  loadTabData(id);
}

async function loadTabData(id){
  switch(id){
    case'wellbeing':await loadList('wellbeing_checkins','wellbeing-list',renderWellbeing);renderWellbeingStats();break;
    case'claims':await loadList('claims','claims-list',renderClaim);renderClaimsStats();break;
    case'finance':await loadList('transactions','transactions-list',renderTransaction);await loadList('loans','loans-list',renderLoan);renderFinanceStats();break;
    case'telemedicine':await loadList('consultations','consultations-list',renderConsult);renderTeleStats();break;
    case'charting':await loadList('patients','patients-list',renderPatient);await loadList('visits','visits-list',renderVisit);break;
    case'roster':await loadList('shifts','shifts-list',renderShift);renderRosterStats();break;
    case'risk':await loadList('legal_cases','cases-list',renderCase);renderRiskStats();break;
    case'practice':await loadList('appointments','appointments-list',renderAppointment);await loadList('practice_kpis','kpis-list',renderKPI);renderPracticeStats();break;
    case'scribe':await loadList('scribe_jobs','scribe-list',renderScribe);renderScribeStats();break;
    case'referrals':await loadList('referrals','referrals-list',renderReferral);renderReferralStats();break;
  }
}

async function loadList(table,containerId,renderFn){
  const{data,error}=await sb.from(table).select('*').order('created_at',{ascending:false});
  const el=document.getElementById(containerId);
  if(error){el.innerHTML='<div class="empty-state">Error loading data</div>';return;}
  if(!data||data.length===0){el.innerHTML='<div class="empty-state">No records yet. Add one above.</div>';return;}
  el.innerHTML='';
  data.forEach(row=>el.appendChild(renderFn(row)));
}

function fmtDate(d){if(!d)return'';return new Date(d).toLocaleDateString();}
function fmtDateTime(d){if(!d)return'';return new Date(d).toLocaleString();}
function fmtMoney(n){if(n==null)return'R0';return'R'+Number(n).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2});}
function tagSpan(status){return`<span class="tag tag-${status}">${status.replace(/_/g,' ')}</span>`;}
function cardActions(table,id){return`<div class="actions"><button class="btn-danger" onclick="deleteRow('${table}','${id}')">Delete</button></div>`;}

async function deleteRow(table,id){
  if(!confirm('Delete this record?'))return;
  const{error}=await sb.from(table).delete().eq('id',id);
  if(error){toast('Delete failed: '+error.message,true);return;}
  toast('Deleted');
  switchTab(activeTab);
}

function renderWellbeing(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${fmtDate(r.checkin_date)} ${tagSpan(r.burnout_risk)}</div>
  <div class="meta"><span class="kv">Mood <b>${r.mood}/5</b></span><span class="kv">Energy <b>${r.energy}/5</b></span><span class="kv">Stress <b>${r.stress}/5</b></span>${r.sleep_hours?`<span class="kv">Sleep <b>${r.sleep_hours}h</b></span>`:''}</div>
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('wellbeing_checkins',r.id)}`;
  return d;
}

function renderClaim(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.patient_name}</b></span><span class="kv">${fmtMoney(r.amount)}</span><span class="kv">${r.insurer||''}</span></div>
  <div class="meta"><span class="kv">Code: <b>${r.code||'N/A'}</b></span><span class="kv">Date: <b>${fmtDate(r.service_date)}</b></span></div>
  ${r.denial_reason?`<div class="desc" style="color:var(--accent4)">Denial: ${r.denial_reason}</div>`:''}
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('claims',r.id)}`;
  return d;
}

function renderTransaction(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.txn_type)}<span class="kv">${fmtMoney(r.amount)}</span><span class="kv"><b>${r.category||''}</b></span><span class="kv">${fmtDate(r.txn_date)}</span></div>
  ${r.description?`<div class="desc">${r.description}</div>`:''}${cardActions('transactions',r.id)}`;
  return d;
}

function renderLoan(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.lender}</b></span><span class="kv">${r.loan_type||''}</span></div>
  <div class="meta"><span class="kv">Principal <b>${fmtMoney(r.principal)}</b></span><span class="kv">Balance <b>${fmtMoney(r.balance)}</b></span><span class="kv">${r.interest_rate||0}%</span><span class="kv">${fmtMoney(r.monthly_payment)}/mo</span></div>
  ${cardActions('loans',r.id)}`;
  return d;
}

function renderConsult(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.patient_name}</b></span><span class="kv">${fmtDateTime(r.scheduled_at)}</span><span class="kv">${r.duration_min}min</span></div>
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('consultations',r.id)}`;
  return d;
}

function renderPatient(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<h4>${r.name}</h4>
  <div class="meta"><span class="kv">${r.sex||'N/A'}</span><span class="kv">DOB: <b>${fmtDate(r.dob)}</b></span></div>
  ${r.allergies?`<div class="desc"><b>Allergies:</b> ${r.allergies}</div>`:''}
  ${r.conditions?`<div class="desc"><b>Conditions:</b> ${r.conditions}</div>`:''}
  ${r.medications?`<div class="desc"><b>Meds:</b> ${r.medications}</div>`:''}
  ${cardActions('patients',r.id)}`;
  return d;
}

function renderVisit(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta"><span class="kv"><b>Visit</b></span><span class="kv">${fmtDate(r.visit_date)}</span><span class="kv">${r.chief_complaint||''}</span></div>
  ${r.subjective?`<div class="desc"><b>S:</b> ${r.subjective}</div>`:''}
  ${r.objective?`<div class="desc"><b>O:</b> ${r.objective}</div>`:''}
  ${r.assessment?`<div class="desc"><b>A:</b> ${r.assessment}</div>`:''}
  ${r.plan?`<div class="desc"><b>P:</b> ${r.plan}</div>`:''}
  ${cardActions('visits',r.id)}`;
  return d;
}

function renderShift(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.title}</b></span>${r.is_locum?`<span class="tag tag-medium">Locum</span>`:''}</div>
  <div class="meta"><span class="kv">${fmtDateTime(r.start_at)} → ${fmtDateTime(r.end_at)}</span><span class="kv">${r.location||''}</span></div>
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('shifts',r.id)}`;
  return d;
}

function renderCase(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.title}</b></span><span class="kv">${r.case_type||''}</span></div>
  <div class="meta"><span class="kv">Attorney: <b>${r.attorney||'N/A'}</b></span><span class="kv">Insurer: <b>${r.insurer||'N/A'}</b></span></div>
  ${r.key_dates?`<div class="desc"><b>Key Dates:</b> ${r.key_dates}</div>`:''}
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('legal_cases',r.id)}`;
  return d;
}

function renderAppointment(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.patient_name}</b></span><span class="kv">${fmtDateTime(r.appt_at)}</span><span class="kv">${r.duration_min}min</span></div>
  ${r.reason?`<div class="desc">${r.reason}</div>`:''}${r.notes?`<div class="desc">${r.notes}</div>`:''}
  ${cardActions('appointments',r.id)}`;
  return d;
}

function renderKPI(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta"><span class="kv"><b>${fmtDate(r.month)}</b></span></div>
  <div class="meta"><span class="kv">Patients <b>${r.patient_count}</b></span><span class="kv">Revenue <b>${fmtMoney(r.revenue)}</b></span><span class="kv">Expenses <b>${fmtMoney(r.expense)}</b></span><span class="kv">No-Show <b>${r.no_show_rate}%</b></span></div>
  ${cardActions('practice_kpis',r.id)}`;
  return d;
}

function renderScribe(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv">${fmtDateTime(r.created_at)}</span>${r.duration_min?`<span class="kv">${r.duration_min}min</span>`:''}</div>
  ${r.transcript?`<div class="desc"><b>Transcript:</b> ${r.transcript.substring(0,200)}${r.transcript.length>200?'...':''}</div>`:''}
  ${r.note?`<div class="desc"><b>Note:</b> ${r.note.substring(0,200)}${r.note.length>200?'...':''}</div>`:''}
  ${r.error?`<div class="desc" style="color:var(--accent4)">Error: ${r.error}</div>`:''}
  ${cardActions('scribe_jobs',r.id)}`;
  return d;
}

function renderReferral(r){
  const d=document.createElement('div');d.className='record-card';
  d.innerHTML=`<div class="meta">${tagSpan(r.status)}<span class="kv"><b>${r.patient_name}</b></span><span class="kv">${tagSpan(r.urgency)}</span></div>
  <div class="meta"><span class="kv">Source: <b>${(r.source||'').replace(/_/g,' ')}</b></span><span class="kv">Specialty: <b>${r.required_specialty||'N/A'}</b></span></div>
  ${r.capacity_match?`<div class="desc"><b>Match:</b> ${r.capacity_match}</div>`:''}
  ${r.notes?`<div class="desc">${r.notes}</div>`:''}${cardActions('referrals',r.id)}`;
  return d;
}

async function renderWellbeingStats(){
  const{data}=await sb.from('wellbeing_checkins').select('mood,stress,energy,burnout_risk');
  if(!data)return;
  const el=document.getElementById('wellbeing-stats');
  const n=data.length;
  const avgMood=n?(data.reduce((s,r)=>s+r.mood,0)/n).toFixed(1):'0';
  const avgStress=n?(data.reduce((s,r)=>s+r.stress,0)/n).toFixed(1):'0';
  const highRisk=data.filter(r=>r.burnout_risk==='high').length;
  el.innerHTML=statCard('Total Check-ins',n)+statCard('Avg Mood',avgMood)+statCard('Avg Stress',avgStress,'red')+statCard('High Risk',highRisk,'red');
}
async function renderClaimsStats(){
  const{data}=await sb.from('claims').select('status,amount');
  if(!data)return;
  const el=document.getElementById('claims-stats');
  const total=data.reduce((s,r)=>s+r.amount,0);
  const approved=data.filter(r=>r.status==='approved'||r.status==='paid').reduce((s,r)=>s+r.amount,0);
  const denied=data.filter(r=>r.status==='denied').length;
  el.innerHTML=statCard('Total Claims',data.length)+statCard('Total Value',fmtMoney(total),'blue')+statCard('Approved/Paid',fmtMoney(approved))+statCard('Denied',denied,'red');
}
async function renderFinanceStats(){
  const tx=await sb.from('transactions').select('txn_type,amount');
  const ln=await sb.from('loans').select('balance');
  if(!tx.data||!ln.data)return;
  const el=document.getElementById('finance-stats');
  const income=tx.data.filter(r=>r.txn_type==='income').reduce((s,r)=>s+r.amount,0);
  const expense=tx.data.filter(r=>r.txn_type==='expense').reduce((s,r)=>s+r.amount,0);
  const totalDebt=ln.data.reduce((s,r)=>s+r.balance,0);
  el.innerHTML=statCard('Income',fmtMoney(income))+statCard('Expenses',fmtMoney(expense),'red')+statCard('Net',fmtMoney(income-expense),'blue')+statCard('Total Debt',fmtMoney(totalDebt),'amber');
}
async function renderTeleStats(){
  const{data}=await sb.from('consultations').select('status,duration_min');
  if(!data)return;
  const el=document.getElementById('telemedicine-stats');
  const scheduled=data.filter(r=>r.status==='scheduled').length;
  const completed=data.filter(r=>r.status==='completed').length;
  el.innerHTML=statCard('Total Consults',data.length)+statCard('Scheduled',scheduled,'blue')+statCard('Completed',completed);
}
async function renderRosterStats(){
  const{data}=await sb.from('shifts').select('status,is_locum');
  if(!data)return;
  const el=document.getElementById('roster-stats');
  const confirmed=data.filter(r=>r.status==='confirmed').length;
  const locums=data.filter(r=>r.is_locum).length;
  el.innerHTML=statCard('Total Shifts',data.length)+statCard('Confirmed',confirmed)+statCard('Locums',locums,'amber')+statCard('Needs Cover',data.filter(r=>r.status==='needs_cover').length,'red');
}
async function renderRiskStats(){
  const{data}=await sb.from('legal_cases').select('status');
  if(!data)return;
  const el=document.getElementById('risk-stats');
  const open=data.filter(r=>r.status==='open'||r.status==='preparing').length;
  const active=data.filter(r=>r.status==='active_litigation').length;
  el.innerHTML=statCard('Total Cases',data.length)+statCard('Open/Preparing',open,'blue')+statCard('Active Litigation',active,'red');
}
async function renderPracticeStats(){
  const ap=await sb.from('appointments').select('status');
  const kpi=await sb.from('practice_kpis').select('revenue,expense,patient_count');
  if(!ap.data||!kpi.data)return;
  const el=document.getElementById('practice-stats');
  const booked=ap.data.filter(r=>r.status==='booked'||r.status==='confirmed').length;
  const totalRev=kpi.data.reduce((s,r)=>s+r.revenue,0);
  const totalPts=kpi.data.reduce((s,r)=>s+r.patient_count,0);
  el.innerHTML=statCard('Total Appts',ap.data.length)+statCard('Upcoming',booked,'blue')+statCard('Revenue',fmtMoney(totalRev))+statCard('Patients Seen',totalPts);
}
async function renderScribeStats(){
  const{data}=await sb.from('scribe_jobs').select('status');
  if(!data)return;
  const el=document.getElementById('scribe-stats');
  const ready=data.filter(r=>r.status==='ready').length;
  const failed=data.filter(r=>r.status==='failed').length;
  el.innerHTML=statCard('Total Jobs',data.length)+statCard('Ready',ready)+statCard('Failed',failed,'red');
}
async function renderReferralStats(){
  const{data}=await sb.from('referrals').select('status,urgency');
  if(!data)return;
  const el=document.getElementById('referrals-stats');
  const urgent=data.filter(r=>r.urgency==='urgent').length;
  const matched=data.filter(r=>r.status==='matched'||r.status==='accepted').length;
  el.innerHTML=statCard('Total Referrals',data.length)+statCard('Urgent',urgent,'red')+statCard('Matched',matched,'blue')+statCard('New',data.filter(r=>r.status==='new').length,'amber');
}

function statCard(label,value,color){
  return`<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value${color?' '+color:''}">${value}</div></div>`;
}

async function openModal(moduleName){
  const mod=MODULES[moduleName];
  document.getElementById('modal-title').textContent='New '+mod.title;
  const form=document.getElementById('modal-form');
  form.innerHTML='';

  for(const f of mod.fields){
    const wrapper=document.createElement('div');
    const lbl=document.createElement('label');
    lbl.textContent=f.label;
    wrapper.appendChild(lbl);

    if(f.type==='select'&&f.ref){
      const sel=document.createElement('select');
      sel.name=f.name;
      if(!f.required)sel.innerHTML='<option value="">-- None --</option>';
      const{data}=await sb.from(f.ref).select('id,name').order('name');
      (data||[]).forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;sel.appendChild(o);});
      wrapper.appendChild(sel);
    }else if(f.type==='select'){
      const sel=document.createElement('select');
      sel.name=f.name;
      f.options.forEach(o=>{const opt=document.createElement('option');opt.value=o;opt.textContent=o.replace(/_/g,' ');sel.appendChild(opt);});
      wrapper.appendChild(sel);
    }else if(f.type==='textarea'){
      const ta=document.createElement('textarea');
      ta.name=f.name;ta.rows=3;
      wrapper.appendChild(ta);
    }else{
      const inp=document.createElement('input');
      inp.type=f.type==='datetime'?'datetime-local':f.type;
      inp.name=f.name;
      if(f.min!=null)inp.min=f.min;
      if(f.max!=null)inp.max=f.max;
      if(f.value!=null)inp.value=f.value;
      if(f.required)inp.required=true;
      wrapper.appendChild(inp);
    }
    form.appendChild(wrapper);
  }

  const btns=document.createElement('div');btns.className='form-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn-secondary';cancel.textContent='Cancel';cancel.onclick=closeModal;
  const submit=document.createElement('button');submit.type='submit';submit.className='btn-primary';submit.textContent='Save';
  btns.appendChild(cancel);btns.appendChild(submit);form.appendChild(btns);

  form.onsubmit=async(e)=>{
    e.preventDefault();
    const fd=new FormData(form);
    const row={user_id:currentUser.id};
    for(const f of mod.fields){
      let val=fd.get(f.name);
      if(f.name==='is_locum')val=val==='true';
      if(f.type==='number'&&val!=='')val=Number(val);
      if(f.type==='date'&&val){
        if(f.name==='month')val=new Date(val+'-01').toISOString().split('T')[0];
      }
      if(f.type==='datetime'&&val)val=new Date(val).toISOString();
      if((val===null||val==='')&&f.type!=='select'&&f.type!=='textarea')continue;
      row[f.name]=val||'';
    }
    const{error}=await sb.from(mod.table).insert(row);
    if(error){toast('Insert failed: '+error.message,true);return;}
    toast(mod.title+' added');
    closeModal();
    switchTab(activeTab);
  };
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
}

(async()=>{
  const{data:{session}}=await sb.auth.getSession();
  if(session&&session.user)onAuth(session.user);
})();
