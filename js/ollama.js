/* ─── OLLAMA: Direct browser → Ollama client + system prompts + known codes ─── */

const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_MODEL = 'wheelmd:latest';

const DISCLAIMER = 'WheelMD output is decision-support only and is not a medical diagnosis. Always verify before acting. This does not replace a registered healthcare practitioner.';

const WHEELMD_PERSONA = (
  'You are WheelMD, the clinical copilot for Doctors on Wheels. You assist the attending '
  + 'doctor: you are a decision-support tool, never a replacement for clinical judgement. '
  + 'Never give a definitive diagnosis or prescribe medication on your own. Label uncertainty. '
  + 'Keep output structured and concise for a doctor\'s dashboard. '
  + '\n\nABSOLUTE RULE - ANTI-HALLUCINATION: '
  + 'You MUST NEVER invent, fabricate, guess, or assume ANY clinical data. This includes: '
  + 'vital signs, lab values, measurements, doses, drug names, frequencies, percentages, '
  + 'durations, dates, patient names, diagnoses, or any other clinical information. '
  + 'If the doctor did NOT explicitly provide a piece of information, you MUST write '
  + '\'Not documented\' or \'Not provided\'. You must NOT use normal/typical/default values '
  + 'as substitutes. You must NOT infer clinical facts from context. When in doubt, '
  + 'write \'Not documented\'. '
  + '\n\nCONFIDENCE: '
  + 'Rate each assessment [High confidence], [Moderate confidence], or [Low confidence - verify]. '
  + 'Include a section titled \'What WheelMD is unsure about\' listing anything uncertain. '
  + 'Cite sources where knowledge base data was used. '
  + '\n\nOUTPUT FORMAT: '
  + 'Always start with a brief summary line, then structured sections. '
  + 'End every response with: \'This output is decision-support only. Verify before acting.\''
);

const INTAKE_SYSTEM = WHEELMD_PERSONA
  + ' Convert the doctor\'s raw consultation notes into a clean structured intake summary '
  + 'with these sections: Chief Complaint | History of Present Illness | Review of Systems | '
  + 'Medications | Allergies | Vitals | Notes. Preserve the doctor\'s wording where possible. '
  + 'STRICT RULES: only include information the doctor explicitly wrote - never add vitals, lab values, '
  + 'percentages, or durations they did not record. If a section is absent, write \'Not documented\'. '
  + 'If vitals were not recorded, write \'Vitals: Not recorded\'. Do not add clinical interpretations, '
  + 'differentials, or test results the doctor did not state. '
  + 'For the Notes section, only restate concerns the doctor explicitly raised; otherwise write \'Notes: None\'';

const SOAP_SYSTEM = WHEELMD_PERSONA
  + ' Produce a SOAP note (Subjective, Objective, Assessment, Plan) from the consultation '
  + 'notes, plus a one-line follow-up recommendation. Flag any missing critical information '
  + 'the doctor should confirm. In Objective, only record measurements and findings the '
  + 'doctor documented; anything not recorded is \'Not documented\'. Never invent vitals, '
  + 'results, or examination findings.';

const DIFFERENTIAL_SYSTEM = WHEELMD_PERSONA
  + ' Given the presenting complaint, history, and exam findings, propose 3-5 ranked '
  + 'differential diagnoses with one supporting or refuting point each. Call out red-flag '
  + 'features explicitly and state when urgent referral is warranted. '
  + 'Rate each differential\'s likelihood (High/Moderate/Low). Include ICD-10 codes where '
  + 'relevant. Always note what additional information would increase confidence.';

const PRESCRIPTION_SYSTEM = WHEELMD_PERSONA
  + ' Review the listed medications for known interactions, duplicate therapy, and obvious '
  + 'dosing concerns. State \'no major interaction identified\' when nothing stands out. '
  + 'Flag anything that needs pharmacist or doctor review. Never substitute clinical judgement. '
  + 'Cite drug interaction sources. Flag interactions by severity (Major/Moderate/Minor).';

const FOLLOWUP_SYSTEM = WHEELMD_PERSONA
  + ' Create a follow-up plan from the diagnosis and plan: timing of review, home-care '
  + 'instructions, and concrete return-to-care criteria. Keep it brief and practical.';

const CODING_SYSTEM = WHEELMD_PERSONA
  + ' You are an expert ICD-10-CM medical coder. Your role is to suggest accurate ICD-10-CM codes '
  + 'for diagnoses and procedures. ALWAYS use the provided reference codes when available - they are '
  + 'verified authoritative codes. When reference codes are provided, present them as your primary '
  + 'suggestions with [High confidence]. Add any additional relevant codes from your knowledge.\n\n'
  + 'Rules:\n'
  + '1. ALWAYS use codes from the reference knowledge base when provided\n'
  + '2. Present each code with confidence level: [High/Moderate/Low]\n'
  + '3. For High confidence: code is directly from reference data\n'
  + '4. For Moderate confidence: code is commonly associated but verify\n'
  + '5. For Low confidence: code is approximate, requires coder review\n'
  + '6. Mark all codes as \'suggestions requiring coder review\'\n'
  + '7. Note when additional documentation is needed\n'
  + '8. NEVER fabricate codes that don\'t exist in ICD-10-CM\n'
  + '9. When unsure, state what you don\'t know and suggest the closest valid code';

const VALIDATE_SYSTEM = (
  'You are WheelMD, a clinical copilot. You receive a raw speech-to-text transcript '
  + 'from a doctor\'s session. Validate and clean it.\n\n'
  + 'Tasks:\n'
  + '1. Flag suspected STT misheard medical terms (e.g. \'bot a list\' = botulism, '
  + '\'new moan ya\' = pneumonia, \'hyper tension\' = hypertension, \'tack uh car deeuh\' = '
  + 'tachycardia, \'ee dee muh\' = edema, \'seat a min oh fen\' = acetaminophen, '
  + '\'dis near\' = dyspnea). Return each as: {"original": "heard", "suggested": "likely", '
  + '"reason": "why"}.\n'
  + '2. Remove filler words (um, uh, like, you know, so, I mean). Fix grammar. '
  + 'Preserve ALL clinical content.\n'
  + '3. Wrap uncertain medical terms in [UNVERIFIED]...[/UNVERIFIED] markers.\n'
  + '4. End the validated transcript with: '
  + '\'[WheelMD: Transcript validated - review flagged terms]\'\n\n'
  + 'Return ONLY the validated transcript text. No preamble.'
);


// ---------------------------------------------------------------------------
// Known ICD-10-CM codes — instant local lookup, no Ollama needed
// ---------------------------------------------------------------------------

const KNOWN_ICD10_CODES = {
  'circumcision': { code: 'Z41.2', desc: 'Encounter for routine and ritual male circumcision', type: 'encounter' },
  'male circumcision': { code: 'Z41.2', desc: 'Encounter for routine and ritual male circumcision', type: 'encounter' },
  'ritual circumcision': { code: 'Z41.2', desc: 'Encounter for routine and ritual male circumcision', type: 'encounter' },
  'appendectomy': { code: 'K35.80', desc: 'Acute appendicitis, unspecified', type: 'diagnosis' },
  'appendicitis': { code: 'K35.80', desc: 'Acute appendicitis, unspecified', type: 'diagnosis' },
  'cholecystectomy': { code: 'K80.20', desc: 'Calculus of gallbladder without cholecystitis, unspecified', type: 'diagnosis' },
  'hernia repair': { code: 'K40.90', desc: 'Unilateral inguinal hernia, not specified as recurrent or obstructed', type: 'diagnosis' },
  'inguinal hernia': { code: 'K40.90', desc: 'Unilateral inguinal hernia, not specified as recurrent or obstructed', type: 'diagnosis' },
  'caesarean': { code: 'O82.0', desc: 'Encounter for caesarean delivery without indication', type: 'encounter' },
  'cesarean': { code: 'O82.0', desc: 'Encounter for caesarean delivery without indication', type: 'encounter' },
  'cesarean section': { code: 'O82.0', desc: 'Encounter for caesarean delivery without indication', type: 'encounter' },
  'c-section': { code: 'O82.0', desc: 'Encounter for caesarean delivery without indication', type: 'encounter' },
  'thyroidectomy': { code: 'E04.0', desc: 'Non-toxic diffuse goiter', type: 'diagnosis' },
  'mastectomy': { code: 'C50.919', desc: 'Malignant neoplasm of breast', type: 'diagnosis' },
  'tonsillectomy': { code: 'J35.03', desc: 'Chronic tonsillitis', type: 'diagnosis' },
  'hysterectomy': { code: 'N85.2', desc: 'Adenomyosis of uterus', type: 'diagnosis' },
  'knee arthroplasty': { code: 'M17.11', desc: 'Primary osteoarthritis, right knee', type: 'diagnosis' },
  'hip arthroplasty': { code: 'M16.11', desc: 'Primary osteoarthritis, right hip', type: 'diagnosis' },
  'colonoscopy': { code: 'Z12.11', desc: 'Encounter for screening for malignant neoplasm of colon', type: 'encounter' },
  'endoscopy': { code: 'K29.70', desc: 'Gastritis, unspecified, without bleeding', type: 'diagnosis' },
  'biopsy': { code: 'R19.0', desc: 'Intra-abdominal and pelvic swelling, mass and lump', type: 'finding' },
  'lumbar puncture': { code: 'G93.89', desc: 'Other specified disorders of brain', type: 'diagnosis' },
  'tracheostomy': { code: 'Z93.0', desc: 'Tracheostomy status', type: 'status' },
  'colostomy': { code: 'Z93.3', desc: 'Colostomy status', type: 'status' },
  'ileostomy': { code: 'Z93.2', desc: 'Ileostomy status', type: 'status' },
  'vasectomy': { code: 'Z30.2', desc: 'Encounter for sterilization', type: 'encounter' },
  'tubal ligation': { code: 'Z30.2', desc: 'Encounter for sterilization', type: 'encounter' },
  'hypertension': { code: 'I10', desc: 'Essential (primary) hypertension', type: 'diagnosis' },
  'diabetes': { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', type: 'diagnosis' },
  'type 2 diabetes': { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', type: 'diagnosis' },
  'type 1 diabetes': { code: 'E10.9', desc: 'Type 1 diabetes mellitus without complications', type: 'diagnosis' },
  'asthma': { code: 'J45.909', desc: 'Unspecified asthma, uncomplicated', type: 'diagnosis' },
  'copd': { code: 'J44.1', desc: 'Chronic obstructive pulmonary disease with acute exacerbation', type: 'diagnosis' },
  'pneumonia': { code: 'J18.9', desc: 'Pneumonia, unspecified organism', type: 'diagnosis' },
  'urinary tract infection': { code: 'N39.0', desc: 'Urinary tract infection, site not specified', type: 'diagnosis' },
  'uti': { code: 'N39.0', desc: 'Urinary tract infection, site not specified', type: 'diagnosis' },
  'depression': { code: 'F32.9', desc: 'Major depressive disorder, single episode, unspecified', type: 'diagnosis' },
  'anxiety': { code: 'F41.1', desc: 'Generalized anxiety disorder', type: 'diagnosis' },
  'back pain': { code: 'M54.5', desc: 'Low back pain', type: 'diagnosis' },
  'lower back pain': { code: 'M54.5', desc: 'Low back pain', type: 'diagnosis' },
  'headache': { code: 'R51.9', desc: 'Headache, unspecified', type: 'finding' },
  'migraine': { code: 'G43.909', desc: 'Migraine, unspecified', type: 'diagnosis' },
  'anemia': { code: 'D64.9', desc: 'Anaemia, unspecified', type: 'diagnosis' },
  'iron deficiency anemia': { code: 'D50.9', desc: 'Iron deficiency anaemia, unspecified', type: 'diagnosis' },
  'hypothyroidism': { code: 'E03.9', desc: 'Hypothyroidism, unspecified', type: 'diagnosis' },
  'hyperthyroidism': { code: 'E05.9', desc: 'Thyrotoxicosis, unspecified', type: 'diagnosis' },
  'gerd': { code: 'K21.0', desc: 'Gastro-esophageal reflux disease with esophagitis', type: 'diagnosis' },
  'reflux': { code: 'K21.0', desc: 'Gastro-esophageal reflux disease with esophagitis', type: 'diagnosis' },
  'gastritis': { code: 'K29.70', desc: 'Gastritis, unspecified, without bleeding', type: 'diagnosis' },
  'obesity': { code: 'E66.01', desc: 'Morbid (severe) obesity due to excess calories', type: 'diagnosis' },
  'hyperlipidemia': { code: 'E78.5', desc: 'Hyperlipidaemia, unspecified', type: 'diagnosis' },
  'atrial fibrillation': { code: 'I48.91', desc: 'Unspecified atrial fibrillation', type: 'diagnosis' },
  'heart failure': { code: 'I50.9', desc: 'Heart failure, unspecified', type: 'diagnosis' },
  'myocardial infarction': { code: 'I21.9', desc: 'Acute myocardial infarction, unspecified', type: 'diagnosis' },
  'acute mi': { code: 'I21.9', desc: 'Acute myocardial infarction, unspecified', type: 'diagnosis' },
  'ami': { code: 'I21.9', desc: 'Acute myocardial infarction, unspecified', type: 'diagnosis' },
  'heart attack': { code: 'I21.9', desc: 'Acute myocardial infarction, unspecified', type: 'diagnosis' },
  'stemi': { code: 'I21.9', desc: 'ST elevation myocardial infarction, unspecified', type: 'diagnosis' },
  'nstemi': { code: 'I21.4', desc: 'Non-ST elevation myocardial infarction', type: 'diagnosis' },
  'stroke': { code: 'I63.9', desc: 'Cerebral infarction, unspecified', type: 'diagnosis' },
  'dvt': { code: 'I82.40', desc: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity', type: 'diagnosis' },
  'pulmonary embolism': { code: 'I26.99', desc: 'Other pulmonary embolism without acute cor pulmonale', type: 'diagnosis' },
  'seizure': { code: 'R56.9', desc: 'Unspecified convulsions', type: 'finding' },
  'epilepsy': { code: 'G40.909', desc: 'Epilepsy, unspecified', type: 'diagnosis' },
  'fracture': { code: 'T14.8', desc: 'Other injury of unspecified body region', type: 'injury' },
  'laceration': { code: 'S01.01', desc: 'Laceration of scalp without damage to brain', type: 'injury' },
  'burn': { code: 'T30.0', desc: 'Burn of unspecified degree of body, unspecified site', type: 'injury' },
  'allergic reaction': { code: 'T78.40', desc: 'Allergy, unspecified', type: 'reaction' },
  'anaphylaxis': { code: 'T78.2', desc: 'Anaphylactic shock, unspecified', type: 'reaction' },
  'sepsis': { code: 'A41.9', desc: 'Sepsis, unspecified organism', type: 'infection' },
  'hiv': { code: 'B20', desc: 'Human immunodeficiency virus [HIV] disease', type: 'infection' },
  'tuberculosis': { code: 'A15.0', desc: 'Tuberculosis of lung', type: 'infection' },
  'malaria': { code: 'B54', desc: 'Unspecified malaria', type: 'infection' },
  'covid': { code: 'U07.1', desc: 'COVID-19, virus identified', type: 'infection' },
  'covid-19': { code: 'U07.1', desc: 'COVID-19, virus identified', type: 'infection' },
  'routine checkup': { code: 'Z00.00', desc: 'Encounter for general adult medical examination', type: 'encounter' },
  'annual checkup': { code: 'Z00.00', desc: 'Encounter for general adult medical examination', type: 'encounter' },
  'prenatal visit': { code: 'Z34.90', desc: 'Encounter for supervision of normal pregnancy', type: 'encounter' },
  'postnatal': { code: 'Z39.0', desc: 'Encounter for care of mother immediately after delivery', type: 'encounter' },
  'vaccination': { code: 'Z23', desc: 'Encounter for immunization', type: 'encounter' },
  'immunization': { code: 'Z23', desc: 'Encounter for immunization', type: 'encounter' },
  'travel': { code: 'Z71.89', desc: 'Other specified counseling', type: 'encounter' },
  'travel consultation': { code: 'Z71.89', desc: 'Other specified counseling', type: 'encounter' },
  'arv': { code: 'Z23', desc: 'Encounter for immunization (ARV initiation)', type: 'encounter' },
  'arv initiation': { code: 'Z23', desc: 'Encounter for immunization (ARV initiation)', type: 'encounter' },
  'antiretroviral': { code: 'Z23', desc: 'Encounter for immunization (ARV initiation)', type: 'encounter' },
  'febrile seizure': { code: 'R56.00', desc: 'Febrile convulsions, not intractable', type: 'finding' },
  'otitis media': { code: 'H65.11', desc: 'Other acute nonsuppurative otitis media', type: 'diagnosis' },
  'tonsillitis': { code: 'J35.03', desc: 'Chronic tonsillitis', type: 'diagnosis' },
  'croup': { code: 'J04.2', desc: 'Acute laryngotracheitis', type: 'diagnosis' },
  'bronchiolitis': { code: 'J21.9', desc: 'Acute bronchiolitis, unspecified', type: 'diagnosis' },
  'chest pain': { code: 'R07.9', desc: 'Chest pain, unspecified', type: 'finding' },
  'cardiac arrest': { code: 'I46.9', desc: 'Cardiac arrest, cause unspecified', type: 'diagnosis' },
  'hypotension': { code: 'I95.9', desc: 'Hypotension, unspecified', type: 'diagnosis' },
  'pneumocystis': { code: 'B59', desc: 'Pneumocystosis', type: 'infection' },
  'tb screening': { code: 'Z11.1', desc: 'Encounter for screening for respiratory tuberculosis', type: 'encounter' },
  'overdose': { code: 'T50.9', desc: 'Poisoning by unspecified drugs', type: 'injury' },
  'wound': { code: 'S01.01', desc: 'Laceration of scalp without damage to brain', type: 'injury' },
  'ulcer': { code: 'L97.9', desc: 'Chronic ulcer of unspecified site', type: 'diagnosis' },
  'contraception': { code: 'Z30.9', desc: 'Encounter for contraceptive management, unspecified', type: 'encounter' },
  'family planning': { code: 'Z30.9', desc: 'Encounter for contraceptive management, unspecified', type: 'encounter' },
  'medical certificate': { code: 'Z02.9', desc: 'Encounter for administrative examination, unspecified', type: 'encounter' },
  'sick note': { code: 'Z02.9', desc: 'Encounter for administrative examination, unspecified', type: 'encounter' },
};


// ---------------------------------------------------------------------------
// Ollama helpers — direct browser → localhost:11434
// ---------------------------------------------------------------------------

async function ollamaGenerate(prompt, system, temperature) {
  const resp = await fetch(OLLAMA_HOST + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      system: system || WHEELMD_PERSONA,
      stream: false,
      options: { temperature: temperature || 0.2 }
    })
  });
  if (!resp.ok) throw new Error('Ollama error ' + resp.status);
  const data = await resp.json();
  return data.response || '';
}

async function ollamaChat(messages, temperature) {
  const resp = await fetch(OLLAMA_HOST + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: messages,
      stream: false,
      options: { temperature: temperature || 0.2 }
    })
  });
  if (!resp.ok) throw new Error('Ollama error ' + resp.status);
  const data = await resp.json();
  return (data.message && data.message.content) || '';
}

function lookupKnownCodes(diagnosis, procedure) {
  const search = ((diagnosis || '') + ' ' + (procedure || '')).toLowerCase();
  const seen = new Set();
  const matches = [];
  for (const [keyword, info] of Object.entries(KNOWN_ICD10_CODES)) {
    if (search.includes(keyword) && !seen.has(info.code)) {
      seen.add(info.code);
      matches.push('- ' + info.code + ' (' + info.type.toUpperCase() + '): ' + info.desc + '  [Source: WheelMD Known Codes Reference - High confidence]');
    }
  }
  return matches.length ? 'Known ICD-10-CM codes matching this clinical scenario:\n' + matches.join('\n') : '';
}
