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

    const { patient_name, amount, insurer, code, service_date, notes } = await req.json()

    if (!patient_name || !amount) {
      return new Response(JSON.stringify({ error: "patient_name and amount required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create agent session
    const { data: session } = await supabase
      .from("agent_sessions")
      .insert({
        user_id: user.id,
        persona: "billing",
        workflow_type: "claims_processing",
        state: "running",
        input_data: { patient_name, amount, insurer, code, service_date, notes },
      })
      .select()
      .single()

    // Evaluate claim
    const evaluation = evaluateClaim(amount, insurer, code)

    // Check for existing claims with same patient/date
    const { data: existingClaims } = await supabase
      .from("claims")
      .select("id, amount, status")
      .eq("patient_name", patient_name)
      .eq("service_date", service_date)

    if (existingClaims && existingClaims.length > 0) {
      evaluation.flags.push("duplicate_claim_risk")
      evaluation.duplicate_claims = existingClaims.length
    }

    // Determine if high-value (needs HITL)
    const isHighValue = amount > 50000
    const needsApproval = isHighValue || evaluation.flags.length > 0 || !evaluation.codes_valid

    let approvalId = null
    if (needsApproval) {
      const { data: approval } = await supabase.rpc("create_approval", {
        p_user_id: user.id,
        p_session_id: session?.id,
        p_workflow_type: "billing",
        p_action_type: "claim_submission",
        p_title: isHighValue ? `High-Value Claim: R${amount.toLocaleString()}` : "Claim Review Required",
        p_description: evaluation.flags.length > 0
          ? `Flags: ${evaluation.flags.join(", ")}. Requires doctor review before submission.`
          : `Claim for R${amount.toLocaleString()} ready for review.`,
        p_proposed_data: {
          patient_name, amount, insurer, code, service_date, notes,
          evaluation,
        },
        p_priority: isHighValue ? "high" : "normal",
      })
      approvalId = approval?.id
    }

    // Update session
    await supabase
      .from("agent_sessions")
      .update({
        state: needsApproval ? "awaiting_approval" : "completed",
        output_data: evaluation,
        completed_at: needsApproval ? null : new Date().toISOString(),
      })
      .eq("id", session?.id)

    // Store memory
    await supabase.from("agent_memory").insert({
      user_id: user.id,
      agent_session_id: session?.id,
      persona: "billing",
      memory_type: "interaction",
      content: `Billing evaluation for ${patient_name}: R${amount} - ${evaluation.recommended_action}`,
      metadata: { amount, insurer, flags: evaluation.flags },
      importance: isHighValue ? 0.8 : 0.4,
    })

    return new Response(JSON.stringify({
      session_id: session?.id,
      evaluation,
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

function evaluateClaim(amount: number, insurer?: string, code?: string) {
  const flags: string[] = []
  let codesValid = true
  let preAuthRequired = false
  let recommendedAction = "submit"

  // Validate ICD-10 code format
  if (code) {
    const icd10Regex = /^[A-Z]\d{2}(?:\.\d{1,4})?$/
    const cptRegex = /^\d{4,5}$/
    if (!icd10Regex.test(code) && !cptRegex.test(code)) {
      flags.push("invalid_code_format")
      codesValid = false
    }
  } else {
    flags.push("missing_code")
    codesValid = false
  }

  // Check amount thresholds
  if (amount > 100000) {
    flags.push("very_high_value")
    preAuthRequired = true
    recommendedAction = "review_and_preauth"
  } else if (amount > 50000) {
    flags.push("high_value")
    recommendedAction = "review_before_submit"
  }

  // Check scheme requirements
  const schemesRequiringPreauth = ["discovery", "gems", "bonitas", "momentum"]
  if (insurer && schemesRequiringPreauth.some(s => insurer.toLowerCase().includes(s))) {
    if (amount > 10000) {
      preAuthRequired = true
      flags.push("scheme_preauth_required")
    }
  }

  return {
    payment_type: insurer ? "medical_aid" : "cash",
    scheme_name: insurer || "N/A",
    claim_amount: amount,
    codes_valid: codesValid,
    pre_auth_required: preAuthRequired,
    flags,
    recommended_action: recommendedAction,
    estimated_processing_days: insurer ? 14 : 0,
  }
}
