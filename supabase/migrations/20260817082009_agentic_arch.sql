-- ═══════════════════════════════════════════════════════════════
-- AGENTIC ARCHITECTURE: Dual-DB, HITL, Persona Agents
-- ═══════════════════════════════════════════════════════════════

-- Enable pgvector for agent memory embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── AGENT SESSIONS ───────────────────────────────────────────
-- Tracks which agent persona is handling which workflow
CREATE TABLE public.agent_sessions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona       text NOT NULL CHECK (persona IN ('triage','billing','telecom','scribe','general')),
  workflow_type text NOT NULL,
  state         text NOT NULL DEFAULT 'idle' CHECK (state IN (
    'idle','running','awaiting_approval','approved','rejected','completed','failed'
  )),
  input_data    jsonb DEFAULT '{}',
  output_data   jsonb DEFAULT '{}',
  context_refs  jsonb DEFAULT '[]',
  error         text,
  started_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX idx_agent_sessions_user ON public.agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_state ON public.agent_sessions(state);
CREATE INDEX idx_agent_sessions_persona ON public.agent_sessions(persona);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent sessions"
  ON public.agent_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ─── WORKFLOW APPROVALS (HITL Gates) ──────────────────────────
-- Every high-risk action pauses here until human approves
CREATE TABLE public.workflow_approvals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_session_id uuid REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  workflow_type   text NOT NULL,
  action_type     text NOT NULL,
  title           text NOT NULL,
  description     text,
  proposed_data   jsonb NOT NULL,
  edited_data     jsonb,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','override','expired'
  )),
  reviewed_by     uuid,
  review_notes    text,
  priority        text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  expires_at      timestamptz DEFAULT (now() + interval '24 hours'),
  created_at      timestamptz DEFAULT now(),
  reviewed_at     timestamptz
);

CREATE INDEX idx_approvals_user_status ON public.workflow_approvals(user_id, status);
CREATE INDEX idx_approvals_pending ON public.workflow_approvals(status) WHERE status = 'pending';

ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own approvals"
  ON public.workflow_approvals FOR ALL
  USING (auth.uid() = user_id);

-- ─── AGENT PROMPTS (Persona Definitions) ──────────────────────
-- System prompts stored in DB, editable without code deploys
CREATE TABLE public.agent_prompts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  persona     text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  version     integer DEFAULT 1,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Seed the three core personas
INSERT INTO public.agent_prompts (persona, name, description, system_prompt) VALUES
(
  'triage',
  'Triage & Intake Agent',
  'Engages patients, parses unstructured responses into structured records, validates required fields.',
  'You are a clinical triage agent for a South African medical practice. Your role:
1. Greet the patient professionally and gather their chief complaint.
2. Parse unstructured patient responses into structured clinical fields: chief_complaint, symptom_duration, pain_level (0-10), current_medications, known_allergies, pre_existing_conditions, red_flags.
3. Validate that all required demographic fields are present (name, DOB, contact).
4. Flag red_flag symptoms (chest pain, difficulty breathing, severe bleeding, neurological changes) for immediate escalation.
5. Output a structured JSON object with all parsed fields.
6. Never make diagnoses. Only structure and validate input.
7. If information is missing, output which fields are required.
Always respond in a warm, professional, South African English tone.'
),
(
  'billing',
  'Billing & Claims Agent',
  'Evaluates insurance eligibility, formats claims, handles pre-validation, suggests payment options.',
  'You are a medical billing agent for a South African practice. Your role:
1. Evaluate patient insurance/medical aid eligibility from provided records.
2. Determine if the patient has medical aid cover or is a cash-paying patient.
3. For medical aid patients: format claims according to the scheme requirements, validate ICD-10 and CPT codes, check for pre-auth requirements.
4. For cash patients: calculate estimated costs, suggest payment plans if applicable.
5. Pre-validate claims before submission: check for complete demographics, valid codes, correct provider details.
6. Flag claims that need doctor review (high-value, complex coding, potential denials).
7. Output structured JSON: {payment_type, scheme_name, claim_amount, codes_valid, pre_auth_required, flags[], recommended_action}.
8. Never submit claims without human approval. Always prepare for review.
Be precise with medical coding and South African medical aid terminology.'
),
(
  'telecom',
  'Telecommunications Setup Agent',
  'Orchestrates backend communications, generates secure session rooms, manages access links.',
  'You are a telehealth session coordinator for a South African medical practice. Your role:
1. When a teleconsultation is scheduled, generate a secure session room.
2. Create time-limited access tokens for both patient and provider.
3. Prepare session metadata: patient_name, provider_name, scheduled_time, duration, consultation_type.
4. Generate the patient-facing link and provider-facing link.
5. Prepare notification payloads for both parties (email/SMS templates).
6. Track session state: scheduled → room_ready → waiting → in_progress → completed.
7. Handle session expiry and cleanup.
8. Output structured JSON: {room_id, patient_link, provider_link, session_state, notifications_sent[]}.
9. Never expose raw room credentials in logs or responses.
Maintain HIPPO-equivalent privacy standards for all session data.'
);

-- ─── AGENT MEMORY ─────────────────────────────────────────────
-- Vector embeddings for semantic context retrieval + session history
CREATE TABLE public.agent_memory (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_session_id uuid REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  persona       text NOT NULL,
  memory_type   text NOT NULL CHECK (memory_type IN (
    'interaction','context','learned','embeddings'
  )),
  content       text NOT NULL,
  embedding     vector(384),
  metadata      jsonb DEFAULT '{}',
  importance    real DEFAULT 0.5,
  created_at    timestamptz DEFAULT now(),
  accessed_at   timestamptz DEFAULT now(),
  expires_at    timestamptz
);

CREATE INDEX idx_memory_user ON public.agent_memory(user_id);
CREATE INDEX idx_memory_persona ON public.agent_memory(persona);
CREATE INDEX idx_memory_embedding ON public.agent_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent memory"
  ON public.agent_memory FOR ALL
  USING (auth.uid() = user_id);

-- ─── FHIR RESOURCE CACHE ──────────────────────────────────────
-- Cached FHIR resources for fast retrieval and sync tracking
CREATE TABLE public.fhir_resources (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id   text,
  data          jsonb NOT NULL,
  version_id    integer DEFAULT 1,
  last_synced   timestamptz DEFAULT now(),
  source_system text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_fhir_user_type ON public.fhir_resources(user_id, resource_type);
CREATE INDEX idx_fhir_resource_id ON public.fhir_resources(resource_type, resource_id);

ALTER TABLE public.fhir_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own FHIR resources"
  ON public.fhir_resources FOR ALL
  USING (auth.uid() = user_id);

-- ─── AUDIT LOG (Immutable) ────────────────────────────────────
-- Append-only audit trail for all agent and human actions
CREATE TABLE public.audit_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id),
  actor_type    text NOT NULL CHECK (actor_type IN ('user','agent','system')),
  actor_id      text,
  persona       text,
  action        text NOT NULL,
  resource_type text,
  resource_id   uuid,
  before_state  jsonb,
  after_state   jsonb,
  metadata      jsonb DEFAULT '{}',
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_type, action);
CREATE INDEX idx_audit_time ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own audit log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Append-only: prevent updates and deletes
CREATE RULE audit_no_update AS ON UPDATE TO public.audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO public.audit_log DO INSTEAD NOTHING;

-- ─── HELPER: Log agent/human action ──────────────────────────
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id uuid,
  p_actor_type text,
  p_actor_id text,
  p_persona text,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id, actor_type, actor_id, persona, action,
    resource_type, resource_id, before_state, after_state, metadata
  ) VALUES (
    p_user_id, p_actor_type, p_actor_id, p_persona, p_action,
    p_resource_type, p_resource_id, p_before, p_after, p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── HELPER: Create approval gate ─────────────────────────────
CREATE OR REPLACE FUNCTION public.create_approval(
  p_user_id uuid,
  p_session_id uuid,
  p_workflow_type text,
  p_action_type text,
  p_title text,
  p_description text,
  p_proposed_data jsonb,
  p_priority text DEFAULT 'normal'
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.workflow_approvals (
    user_id, agent_session_id, workflow_type, action_type,
    title, description, proposed_data, priority
  ) VALUES (
    p_user_id, p_session_id, p_workflow_type, p_action_type,
    p_title, p_description, p_proposed_data, p_priority
  ) RETURNING id INTO v_id;

  PERFORM public.log_audit(
    p_user_id, 'agent', p_session_id::text, p_workflow_type,
    'approval_requested', 'workflow_approvals', v_id,
    NULL, jsonb_build_object('status','pending','priority',p_priority),
    jsonb_build_object('action_type', p_action_type, 'title', p_title)
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── HELPER: Approve/reject gate ──────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_approval(
  p_approval_id uuid,
  p_user_id uuid,
  p_status text,
  p_edited_data jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.workflow_approvals
  SET status = p_status,
      edited_data = p_edited_data,
      review_notes = p_notes,
      reviewed_by = p_user_id,
      reviewed_at = now()
  WHERE id = p_approval_id AND user_id = p_user_id AND status = 'pending';

  UPDATE public.agent_sessions
  SET state = CASE WHEN p_status = 'approved' THEN 'running' ELSE 'failed' END,
      updated_at = now()
  WHERE id = (
    SELECT agent_session_id FROM public.workflow_approvals WHERE id = p_approval_id
  );

  PERFORM public.log_audit(
    p_user_id, 'user', p_user_id::text, NULL,
    'approval_' || p_status, 'workflow_approvals', p_approval_id,
    jsonb_build_object('status','pending'),
    jsonb_build_object('status', p_status),
    jsonb_build_object('notes', p_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Grants ───────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
