import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { transcript, patient_name } = await req.json()

    if (!transcript) {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Mock SOAP note generation (replace with real LLM API when key is available)
    const subjective = extractSection(transcript, "subjective") ||
      `Patient reports: ${transcript.substring(0, 200)}`
    const objective = extractSection(transcript, "objective") ||
      "Vitals stable. General appearance unremarkable."
    const assessment = extractSection(transcript, "assessment") ||
      "Clinical assessment pending further evaluation."
    const plan = extractSection(transcript, "plan") ||
      "Follow up as needed. Patient educated on findings."

    const note = `SUBJECTIVE\n${subjective}\n\nOBJECTIVE\n${objective}\n\nASSESSMENT\n${assessment}\n\nPLAN\n${plan}`

    const { data: job, error: insertErr } = await supabase
      .from("scribe_jobs")
      .insert({
        user_id: user.id,
        status: "ready",
        transcript,
        note,
        duration_min: Math.ceil(transcript.split(" ").length / 150),
      })
      .select()
      .single()

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ job, note }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

function extractSection(text: string, label: string): string {
  const regex = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=\\n\\n|SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN|$)`, "i")
  const match = text.match(regex)
  return match ? match[1].trim() : ""
}
