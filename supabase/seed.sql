-- ============================================================
-- Leviathan seed: demo doctor + realistic data for all 10 modules
-- Run via `supabase db reset` (seed runs automatically)
-- ============================================================

-- Demo user in the auth schema
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone, phone_change, phone_change_token, reauthentication_token)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'demo@leviathan.health',
  crypt('demo-password', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Dr. Demo"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
) on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'demo@leviathan.health',
  '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "demo@leviathan.health"}',
  'email',
  now(),
  now(),
  now()
) on conflict (provider_id, provider) do nothing;

-- Profile
insert into public.profiles (id, display_name, specialty, practice_name, region, role)
values (
  '11111111-1111-1111-1111-111111111111',
  'Dr. Demo',
  'Family Medicine',
  'Sunninghill Sessional Suite',
  'Johannesburg, SA',
  'doctor'
) on conflict (id) do nothing;

-- Module 1: Wellbeing check-ins
insert into public.wellbeing_checkins (user_id, mood, energy, stress, sleep_hours, notes, burnout_risk, checkin_date)
values
  ('11111111-1111-1111-1111-111111111111', 3, 3, 3, 6.5, 'Busy morning clinic. Felt rushed between patients.', 'medium', current_date - 3),
  ('11111111-1111-1111-1111-111111111111', 2, 2, 4, 5.0, 'Double shift covering a locum gap. Exhausted.', 'high', current_date - 2),
  ('11111111-1111-1111-1111-111111111111', 4, 4, 2, 7.5, 'Half-day clinic, admin catch-up worked well.', 'low', current_date - 1),
  ('11111111-1111-1111-1111-111111111111', 3, 3, 3, 7.0, 'Average day. Paperwork still eating time.', 'medium', current_date);

-- Module 2: Billing & claims
insert into public.claims (user_id, patient_name, service_date, amount, insurer, code, status, denial_reason, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'P. Mokoena', current_date - 10, 420.00, 'Discovery', 'J06.9', 'paid', '', ''),
  ('11111111-1111-1111-1111-111111111111', 'S. Naidoo', current_date - 8, 850.00, 'Bonitas', 'E11.9', 'denied', 'Prior authorization missing', 'Appeal filed, awaiting decision'),
  ('11111111-1111-1111-1111-111111111111', 'T. Botha', current_date - 5, 310.00, 'Momentum', 'K29.7', 'submitted', '', ''),
  ('11111111-1111-1111-1111-111111111111', 'L. Dlamini', current_date - 2, 1280.00, 'Medihelp', 'I10', 'appealing', 'Coding mismatch on EDI 277', 'Resubmitted with corrected code');

-- Module 3: Finance
insert into public.transactions (user_id, txn_type, amount, category, description, txn_date)
values
  ('11111111-1111-1111-1111-111111111111', 'income', 8400.00, 'clinic', 'Sessional clinic revenue (4h block)', current_date - 4),
  ('11111111-1111-1111-1111-111111111111', 'expense', 1475.00, 'overhead', 'Suite rental + consumables', current_date - 3),
  ('11111111-1111-1111-1111-111111111111', 'loan_payment', 3500.00, 'student_loan', 'Monthly student loan instalment', current_date - 2),
  ('11111111-1111-1111-1111-111111111111', 'income', 419.99, 'telemedicine', 'Virtual consult (after hours)', current_date - 1);

insert into public.loans (user_id, lender, loan_type, principal, interest_rate, balance, monthly_payment, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Nedbank', 'student', 750000.00, 9.5, 512000.00, 8200.00, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'FNB', 'practice', 300000.00, 11.0, 214000.00, 3900.00, 'active');

-- Module 4: Telemedicine
insert into public.consultations (user_id, patient_name, scheduled_at, duration_min, status, room_url, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'R. Khumalo', now() + interval '2 hours', 20, 'scheduled', '', 'Follow-up hypertension'),
  ('11111111-1111-1111-1111-111111111111', 'A. van Wyk', now() - interval '1 day', 15, 'completed', 'https://meet.example/room-1', 'URI, self-limiting'),
  ('11111111-1111-1111-1111-111111111111', 'M. Abrahams', now() + interval '1 day', 30, 'scheduled', '', 'Diabetes medication review');

-- Module 5: Charting / EHR
insert into public.patients (user_id, name, dob, sex, allergies, conditions, medications, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'R. Khumalo', '1978-04-12', 'M', 'Penicillin', 'Hypertension, T2DM', 'Amlodipine 5mg, Metformin 850mg', 'Well controlled on current regimen'),
  ('11111111-1111-1111-1111-111111111111', 'P. Mokoena', '1990-09-03', 'F', 'None', 'Asthma', 'Salbutamol PRN', 'Uses inhaler ~2x/week'),
  ('11111111-1111-1111-1111-111111111111', 'T. Botha', '1955-01-27', 'M', 'Sulfa', 'CKD stage 3, Gout', 'Allopurinol 300mg', 'Monitor creatinine');

insert into public.visits (user_id, patient_id, visit_date, chief_complaint, subjective, objective, assessment, plan)
values
  ('11111111-1111-1111-1111-111111111111', (select id from public.patients where name = 'R. Khumalo'), current_date - 7,
   'Routine follow-up, BP check',
   'Feeling well, no new symptoms. BP log stable at home.',
   'BP 128/78, HR 72, BMI 27.4',
   'Hypertension well controlled',
   'Continue current meds, repeat BP in 3 months, HbA1c in 6 weeks'),
  ('11111111-1111-1111-1111-111111111111', (select id from public.patients where name = 'P. Mokoena'), current_date - 2,
   'Cough and wheeze',
   '3-day cough, worse at night, responds to inhaler.',
   'Wheeze on expiration, SpO2 97%, no fever',
   'Mild asthma exacerbation',
   'Inhaler technique review, spacer, PRN salbutamol, review in 1 week');

-- Module 6: Roster / staffing
insert into public.shifts (user_id, title, start_at, end_at, location, status, is_locum, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'AM clinic', now() + interval '1 day 8 hours', now() + interval '1 day 12 hours', 'Sunninghill Suite', 'confirmed', false, ''),
  ('11111111-1111-1111-1111-111111111111', 'ER overflow locum', now() + interval '3 days 14 hours', now() + interval '3 days 22 hours', 'Netcare Sunninghill ER', 'needs_cover', true, 'Seeking cover - availability this weekend'),
  ('11111111-1111-1111-1111-111111111111', 'Telemedicine evening', now() + interval '5 days 17 hours', now() + interval '5 days 20 hours', 'Remote', 'confirmed', false, 'Virtual consult block');

-- Module 7: Risk & cases
insert into public.legal_cases (user_id, title, case_type, status, insurer, attorney, key_dates, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'Missed fracture diagnosis claim', 'malpractice', 'preparing', 'Medical Protection Society', 'Smith & Partners', 'Next: expert report due 2026-09-15', 'Alleged delayed ankle fracture diagnosis. Awaiting expert opinion.'),
  ('11111111-1111-1111-1111-111111111111', 'HPCSA complaint - documentation', 'regulatory', 'open', '', 'Legal Aid Medico-Legal Unit', 'Response due 2026-09-30', 'Complaint re: informed consent documentation. Gathering records.');

-- Module 8: Practice ops
insert into public.appointments (user_id, patient_name, appt_at, duration_min, reason, status, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'L. Dlamini', now() + interval '3 hours', 15, 'Flu vaccination', 'booked', ''),
  ('11111111-1111-1111-1111-111111111111', 'G. Pretorius', now() + interval '5 hours', 30, 'New patient workup', 'confirmed', 'Bring previous records'),
  ('11111111-1111-1111-1111-111111111111', 'S. Naidoo', now() - interval '1 day', 15, 'Blood pressure review', 'no_show', 'Reschedule attempt 1');

insert into public.practice_kpis (user_id, month, patient_count, revenue, expense, no_show_rate)
values
  ('11111111-1111-1111-1111-111111111111', date_trunc('month', current_date - interval '2 months'), 140, 126000.00, 48000.00, 8.5),
  ('11111111-1111-1111-1111-111111111111', date_trunc('month', current_date - interval '1 month'), 158, 145000.00, 51000.00, 7.2),
  ('11111111-1111-1111-1111-111111111111', date_trunc('month', current_date), 62, 58000.00, 21000.00, 6.0);

-- Module 9: AI Scribe (sample finished job)
insert into public.scribe_jobs (user_id, status, audio_path, transcript, note, duration_min, error)
values
  ('11111111-1111-1111-1111-111111111111', 'ready', 'demo/sample-consult.mp3',
   'Doctor: Hi, how have you been since we last spoke? Patient: Much better, but still waking up with a headache a couple times a week.',
   'S: Wakes with headache 2x/week. O: BP 132/80, HR 74. A: Essential hypertension, headache possibly BP-related. P: Monitor BP diary, review in 4 weeks.', 12, ''),
  ('11111111-1111-1111-1111-111111111111', 'failed', 'demo/bad-audio.wav', '', '', 0, 'Audio too short to transcribe');

-- Module 10: Overflow / referrals
insert into public.referrals (user_id, patient_name, source, urgency, required_specialty, capacity_match, status, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'Anon (public waitlist)', 'public waitlist', 'soon', 'Cardiology', 'Dr. A. Nkosi - 5 slots next week', 'matched', 'Public waiting list > 6 weeks; matched to private capacity'),
  ('11111111-1111-1111-1111-111111111111', 'Anon (ER overflow)', 'emergency', 'urgent', 'Orthopaedics', 'Sunninghill suite - same day', 'accepted', 'ER overflow diversion case'),
  ('11111111-1111-1111-1111-111111111111', 'J. Meyer', 'gp', 'routine', 'Dermatology', '', 'new', 'GP referral, no private match yet');
