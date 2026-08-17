import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { patient_input, patient_id } = await req.json()
    if (!patient_input) {
      return new Response(JSON.stringify({ error: "patient_input required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create agent session
    const { data: session } = await supabase
      .from("agent_sessions")
      .insert({
        user_id: user.id,
        persona: "triage",
        workflow_type: "patient_intake",
        state: "running",
        input_data: { patient_input, patient_id },
      })
      .select()
      .single()

    // Load persona prompt
    const { data: prompt } = await supabase
      .from("agent_prompts")
      .select("system_prompt")
      .eq("persona", "triage")
      .eq("is_active", true)
      .single()

    // Parse structured fields from unstructured input
    const parsed = parseTriageInput(patient_input)

    // Check for red flags
    const redFlags = detectRedFlags(parsed, patient_input)
    parsed.red_flags = redFlags

    // Validate required fields
    const missing = validateRequired(parsed)
    parsed.missing_fields = missing
    parsed.is_complete = missing.length === 0

    // Determine if HITL is needed
    const needsApproval = redFlags.length > 0 || !parsed.is_complete

    let approvalId = null
    if (needsApproval) {
      const { data: approval } = await supabase.rpc("create_approval", {
        p_user_id: user.id,
        p_session_id: session?.id,
        p_workflow_type: "triage",
        p_action_type: "intake_review",
        p_title: redFlags.length > 0 ? "Red Flag Detection - Review Required" : "Incomplete Intake - Missing Fields",
        p_description: redFlags.length > 0
          ? `Red flags detected: ${redFlags.join(", ")}. Doctor review required before proceeding.`
          : `Missing required fields: ${missing.join(", ")}. Patient needs to provide more information.`,
        p_proposed_data: parsed,
        p_priority: redFlags.length > 0 ? "critical" : "normal",
      })
      approvalId = approval?.id
    }

    // Update session state
    await supabase
      .from("agent_sessions")
      .update({
        state: needsApproval ? "awaiting_approval" : "completed",
        output_data: parsed,
        completed_at: needsApproval ? null : new Date().toISOString(),
      })
      .eq("id", session?.id)

    // Store agent memory
    await supabase.from("agent_memory").insert({
      user_id: user.id,
      agent_session_id: session?.id,
      persona: "triage",
      memory_type: "interaction",
      content: `Triage intake for patient: ${JSON.stringify(parsed).substring(0, 500)}`,
      metadata: { red_flags: redFlags.length, is_complete: parsed.is_complete },
      importance: redFlags.length > 0 ? 0.9 : 0.5,
    })

    // Log audit
    await supabase.rpc("log_audit", {
      p_user_id: user.id,
      p_actor_type: "agent",
      p_actor_id: session?.id,
      p_persona: "triage",
      p_action: "triage_completed",
      p_resource_type: "agent_sessions",
      p_resource_id: session?.id,
      p_before: null,
      p_after: parsed,
    })

    return new Response(JSON.stringify({
      session_id: session?.id,
      parsed,
      red_flags: redFlags,
      missing_fields: missing,
      is_complete: parsed.is_complete,
      needs_approval: needsApproval,
      approval_id: approvalId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

function parseTriageInput(input: string): Record<string, any> {
  const lower = input.toLowerCase()
  const result: Record<string, any> = {}

  // Extract pain level
  const painMatch = input.match(/pain.*?(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i)
  if (painMatch) result.pain_level = parseInt(painMatch[1])

  // Extract duration
  const durationMatch = input.match(/(?:for|since|past|last)\s+(\d+\s+(?:days?|weeks?|months?|hours?))/i)
  if (durationMatch) result.symptom_duration = durationMatch[1]

  // Extract medications mentioned
  const medKeywords = ["taking", "medication", "medicine", "pills", "tablets", "drug"]
  if (medKeywords.some(k => lower.includes(k))) {
    const medSection = input.split(/(?:taking|medication|medicine|current\s+meds?)[:\s]*/i)
    if (medSection.length > 1) result.current_medications = medSection[1].split(/[.,;]/)[0].trim()
  }

  // Extract allergies
  const allergyMatch = input.match(/(?:allergic|allergies?|allergy\s+to)[:\s]+([^.]+)/i)
  if (allergyMatch) result.known_allergies = allergyMatch[1].trim()

  // Extract conditions
  const condMatch = input.match(/(?:history\s+of|suffers?\s+from|has|diagnosed\s+with)[:\s]+([^.]+)/i)
  if (condMatch) result.pre_existing_conditions = condMatch[1].trim()

  // Chief complaint (first sentence usually)
  const firstSentence = input.split(/[.!]/)[0]
  result.chief_complaint = firstSentence.trim()

  return result
}

function detectRedFlags(parsed: Record<string, any>, input: string): string[] {
  const flags: string[] = []
  const lower = input.toLowerCase()

  const redFlagSymptoms = [
    "chest pain", "difficulty breathing", "shortness of breath", "severe bleeding",
    "unconscious", "seizure", "stroke", "paralysis", "anaphylaxis",
    "severe headache", "suicidal", "heart attack", "overdose",
    "coughing blood", "vomiting blood", "severe abdominal pain"
  ]

  for (const symptom of redFlagSymptoms) {
    if (lower.includes(symptom)) flags.push(symptom)
  }

  if (parsed.pain_level && parsed.pain_level >= 8) {
    flags.push(`Severe pain: ${parsed.pain_level}/10`)
  }

  return flags
}

function validateRequired(parsed: Record<string, any>): string[] {
  const missing: string[] = []
  if (!parsed.chief_complaint) missing.push("chief_complaint")
  return missing
}
