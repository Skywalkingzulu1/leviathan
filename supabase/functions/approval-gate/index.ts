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

    const { action, approval_id, edited_data, notes } = await req.json()

    if (!action || !approval_id) {
      return new Response(JSON.stringify({ error: "action and approval_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch the approval
    const { data: approval, error: fetchErr } = await supabase
      .from("workflow_approvals")
      .select("*")
      .eq("id", approval_id)
      .eq("user_id", user.id)
      .single()

    if (fetchErr || !approval) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (approval.status !== "pending") {
      return new Response(JSON.stringify({ error: `Approval already ${approval.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "approve") {
      // Resolve the approval
      await supabase.rpc("resolve_approval", {
        p_approval_id: approval_id,
        p_user_id: user.id,
        p_status: "approved",
        p_edited_data: edited_data || null,
        p_notes: notes || null,
      })

      // Execute the workflow based on type
      const result = await executeApprovedWorkflow(supabase, approval, edited_data)

      return new Response(JSON.stringify({
        success: true,
        status: "approved",
        execution_result: result,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    } else if (action === "reject") {
      await supabase.rpc("resolve_approval", {
        p_approval_id: approval_id,
        p_user_id: user.id,
        p_status: "rejected",
        p_notes: notes || null,
      })

      return new Response(JSON.stringify({
        success: true,
        status: "rejected",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    } else if (action === "override") {
      // Doctor overrides with their own data
      await supabase.rpc("resolve_approval", {
        p_approval_id: approval_id,
        p_user_id: user.id,
        p_status: "override",
        p_edited_data: edited_data,
        p_notes: notes || "Doctor override",
      })

      const result = await executeApprovedWorkflow(supabase, approval, edited_data)

      return new Response(JSON.stringify({
        success: true,
        status: "override",
        execution_result: result,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function executeApprovedWorkflow(
  supabase: any,
  approval: any,
  editedData: any
): Promise<Record<string, any>> {
  const data = editedData || approval.proposed_data

  switch (approval.workflow_type) {
    case "triage": {
      // Create patient from triage data
      if (data.patient_id) {
        // Update existing patient
        await supabase.from("patients").update({
          allergies: data.known_allergies,
          conditions: data.pre_existing_conditions,
          medications: data.current_medications,
        }).eq("id", data.patient_id)
      }
      return { action: "triage_recorded", patient_id: data.patient_id }
    }

    case "billing": {
      // Submit the claim
      const { data: claim } = await supabase
        .from("claims")
        .insert({
          user_id: approval.user_id,
          patient_name: data.patient_name,
          amount: data.amount,
          insurer: data.insurer,
          code: data.code,
          service_date: data.service_date,
          status: "submitted",
          notes: data.notes,
        })
        .select()
        .single()
      return { action: "claim_submitted", claim_id: claim?.id }
    }

    default:
      return { action: "no_execution", reason: "Unknown workflow type" }
  }
}
