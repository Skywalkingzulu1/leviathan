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

    const { patient_name, scheduled_at, duration_min, consultation_type } = await req.json()

    if (!patient_name || !scheduled_at) {
      return new Response(JSON.stringify({ error: "patient_name and scheduled_at required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create agent session
    const { data: session } = await supabase
      .from("agent_sessions")
      .insert({
        user_id: user.id,
        persona: "telecom",
        workflow_type: "session_setup",
        state: "running",
        input_data: { patient_name, scheduled_at, duration_min, consultation_type },
      })
      .select()
      .single()

    // Generate secure room
    const roomId = crypto.randomUUID()
    const patientToken = crypto.randomUUID()
    const providerToken = crypto.randomUUID()

    const scheduledDate = new Date(scheduled_at)
    const expiresAt = new Date(scheduledDate.getTime() + (duration_min || 30) * 60 * 1000)

    // Create consultation record
    const { data: consult } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        patient_name,
        scheduled_at,
        duration_min: duration_min || 30,
        status: "scheduled",
        room_url: `https://meet.leviathan.health/${roomId}`,
        notes: `Auto-provisioned by telecom agent. Room: ${roomId}`,
      })
      .select()
      .single()

    // Build notification templates
    const notifications = {
      patient_sms: `Hi ${patient_name}, your teleconsultation is scheduled for ${scheduledDate.toLocaleString("en-ZA")}. Join here: https://meet.leviathan.health/${roomId}?token=${patientToken}`,
      patient_email: {
        subject: `Teleconsultation Confirmation - ${scheduledDate.toLocaleDateString("en-ZA")}`,
        body: `Dear ${patient_name},\n\nYour teleconsultation has been confirmed.\n\nDate: ${scheduledDate.toLocaleDateString("en-ZA")}\nTime: ${scheduledDate.toLocaleTimeString("en-ZA")}\nDuration: ${duration_min || 30} minutes\nType: ${consultation_type || "video"}\n\nJoin link: https://meet.leviathan.health/${roomId}?token=${patientToken}\n\nPlease ensure you have a stable internet connection and a quiet environment.\n\nKind regards,\nLeviathan Health`,
      },
      provider_alert: `Teleconsultation scheduled with ${patient_name} at ${scheduledDate.toLocaleString("en-ZA")}. Room ready.`,
    }

    // Update session
    await supabase
      .from("agent_sessions")
      .update({
        state: "completed",
        output_data: {
          room_id: roomId,
          consultation_id: consult?.id,
          patient_link: `https://meet.leviathan.health/${roomId}?token=${patientToken}`,
          provider_link: `https://meet.leviathan.health/${roomId}?token=${providerToken}`,
          session_state: "scheduled",
          room_expires: expiresAt,
          notifications,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", session?.id)

    // Store memory
    await supabase.from("agent_memory").insert({
      user_id: user.id,
      agent_session_id: session?.id,
      persona: "telecom",
      memory_type: "interaction",
      content: `Telecom session provisioned for ${patient_name} at ${scheduled_at}. Room: ${roomId}`,
      metadata: { room_id: roomId, consultation_id: consult?.id },
      importance: 0.4,
    })

    return new Response(JSON.stringify({
      session_id: session?.id,
      consultation_id: consult?.id,
      room_id: roomId,
      patient_link: `https://meet.leviathan.health/${roomId}?token=${patientToken}`,
      provider_link: `https://meet.leviathan.health/${roomId}?token=${providerToken}`,
      session_state: "scheduled",
      notifications,
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
