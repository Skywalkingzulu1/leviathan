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

    const { data: checkins, error: fetchErr } = await supabase
      .from("wellbeing_checkins")
      .select("mood, energy, stress, sleep_hours, burnout_risk, checkin_date")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(7)

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!checkins || checkins.length === 0) {
      return new Response(JSON.stringify({ score: 0, level: "no_data", checkins: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const n = checkins.length
    const avgMood = checkins.reduce((s, c) => s + c.mood, 0) / n
    const avgEnergy = checkins.reduce((s, c) => s + c.energy, 0) / n
    const avgStress = checkins.reduce((s, c) => s + c.stress, 0) / n
    const avgSleep = checkins.reduce((s, c) => s + (c.sleep_hours || 0), 0) / n

    // Burnout score: 0-100 (higher = more burned out)
    // Invert mood/energy (1-5 → 4-0), add stress, penalize low sleep
    const moodScore = (5 - avgMood) / 4       // 0 = perfect, 1 = worst
    const energyScore = (5 - avgEnergy) / 4
    const stressScore = (avgStress - 1) / 4   // 0 = no stress, 1 = max
    const sleepPenalty = avgSleep < 6 ? (6 - avgSleep) / 6 : 0

    const raw = (moodScore * 0.25 + energyScore * 0.25 + stressScore * 0.35 + sleepPenalty * 0.15)
    const score = Math.min(100, Math.round(raw * 100))

    let level = "low"
    if (score >= 60) level = "high"
    else if (score >= 35) level = "medium"

    return new Response(JSON.stringify({
      score,
      level,
      checkins: n,
      avg_mood: Math.round(avgMood * 10) / 10,
      avg_energy: Math.round(avgEnergy * 10) / 10,
      avg_stress: Math.round(avgStress * 10) / 10,
      avg_sleep: Math.round(avgSleep * 10) / 10,
    }), {
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
