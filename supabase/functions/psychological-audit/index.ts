import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a trading psychology coach. Analyze the user's recent trade notes and detect emotional biases.
Use the provided tool to return structured output. Be concise, direct, and actionable.

Biases to detect (only include those clearly present):
- FOMO (chasing entries, late entries)
- Revenge Trading (re-entering after losses to recover)
- Over-confidence (oversized positions, ignoring risk after wins)
- Hesitation (missing planned setups)
- Discipline (positive — following plan)

Score 0-100 where 100 = perfect mental state.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("pair, direction, notes, sentiment, outcome, risk_percent, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No trades yet. Log some trades first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tradeText = entries.map((e, i) =>
      `Trade ${i + 1}: ${e.pair} ${e.direction} | Outcome: ${e.outcome} | Risk: ${e.risk_percent ?? "n/a"}% | Sentiment: ${e.sentiment ?? "n/a"} | Notes: ${e.notes}`
    ).join("\n");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze these ${entries.length} recent trades:\n\n${tradeText}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "psych_audit",
            description: "Return structured psychology audit",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                summary: { type: "string", description: "1-2 sentence mental state summary" },
                biases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", enum: ["FOMO", "Revenge Trading", "Over-confidence", "Hesitation", "Discipline"] },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      evidence: { type: "string" },
                    },
                    required: ["name", "severity", "evidence"],
                  },
                },
                advice: { type: "string", description: "One concrete action to improve next 10 trades" },
              },
              required: ["score", "summary", "biases", "advice"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "psych_audit" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = JSON.parse(toolCall.function.arguments);

    await supabase.from("psych_audits").insert({
      user_id: user.id,
      summary: args.summary + "\n\nAdvice: " + args.advice,
      biases: args.biases,
      score: args.score,
      trade_count_at_audit: entries.length,
    });

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("psych-audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
