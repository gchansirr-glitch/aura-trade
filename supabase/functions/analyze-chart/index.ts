import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an institutional-grade trading analyst combining SMC (Smart Money Concepts) and ICT (Inner Circle Trader) frameworks with macro news awareness.

ANALYZE the chart using BOTH frameworks together:

SMC: Order Blocks (OB), Fair Value Gaps (FVG), Break of Structure (BOS), Change of Character (CHoCH), Liquidity sweeps, Premium/Discount zones, Equal Highs/Lows.

ICT: Killzones (London 7-10 UTC, NY 12-15 UTC), Power of 3 (Accumulation-Manipulation-Distribution), Judas Swing, Optimal Trade Entry (OTE 62%-79% Fib), PD Array, Silver Bullet, Mitigation blocks.

NEWS CONTEXT provided by user: integrate any high-impact news into bias and timing.

RULES — HARD CONSTRAINTS:
1. Reward:Risk MUST be ≥ 1:3. Calculate: |TP - Entry| / |Entry - SL| ≥ 3. If chart shows no setup with RR ≥ 1:3 → return no_setup=true.
2. Do NOT invent prices. Use actual price levels visible on chart. If unclear → no_setup=true.
3. Need at least 3 SMC/ICT confluences to call a signal. Otherwise → no_setup=true.
4. Confidence must reflect real confluence count: <60 means no setup.
5. Never give random signals. Better to say "wait" than wrong direction.

OUTPUT — return ONLY valid JSON (no markdown, no text outside JSON):
{
  "pair": "string e.g. EURUSD",
  "timeframe": "string e.g. 15m, 1H, 4H, D",
  "no_setup": false,
  "bias": "BUY" | "SELL",
  "entry": number,
  "stop_loss": number,
  "take_profit": number,
  "rr": number,
  "confidence": number 0-100,
  "smc_analysis": {
    "trend": "Bullish" | "Bearish" | "Ranging",
    "market_structure": "BOS Bullish" | "BOS Bearish" | "CHoCH Bullish" | "CHoCH Bearish" | "None",
    "order_block": "string price range",
    "fvg": "string price range or n/a",
    "liquidity_sweep": "string description"
  },
  "ict_analysis": {
    "killzone": "London" | "NewYork" | "Asia" | "Outside",
    "pd_array": "Premium" | "Discount" | "Equilibrium",
    "ote_zone": "string price range",
    "power_of_3": "Accumulation" | "Manipulation" | "Distribution"
  },
  "confluences": ["array of 3+ short strings"],
  "reasoning": "Detailed 3-5 sentence explanation in plain English: WHY this setup, WHICH SMC + ICT factors align, WHAT confirms entry, WHAT news context supports it.",
  "invalidation": "string — exact price/condition that invalidates the setup",
  "news_consideration": "string — how upcoming/recent news affects this trade"
}

If no_setup=true, fill: {"no_setup": true, "reasoning": "explain why no valid setup", "confidence": 0} and omit trade fields.

Return STRICT JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, newsContext } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 is required");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Fetch upcoming high-impact news for context
    let autoNews = "";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { data: news } = await supabase
        .from("news_events")
        .select("title,currency,impact,event_time,forecast,previous")
        .eq("impact", "high")
        .gte("event_time", now.toISOString())
        .lte("event_time", in24h.toISOString())
        .order("event_time", { ascending: true })
        .limit(10);
      if (news?.length) {
        autoNews = "\n\nHIGH-IMPACT NEWS in next 24h:\n" +
          news.map((n) => `- ${new Date(n.event_time).toUTCString()} | ${n.currency} | ${n.title} | Forecast: ${n.forecast ?? "n/a"} | Previous: ${n.previous ?? "n/a"}`).join("\n");
      }
    } catch (_) { /* news optional */ }

    const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;
    const userText = `Analyze this chart strictly per the JSON schema. Enforce RR ≥ 1:3.${autoNews}${newsContext ? `\n\nUser-provided news/context:\n${newsContext}` : ""}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway error ${resp.status}`);
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = { no_setup: true, reasoning: "AI returned malformed output. Please retry.", confidence: 0 };
    }

    // Server-side RR enforcement
    if (!parsed.no_setup && parsed.entry && parsed.stop_loss && parsed.take_profit) {
      const risk = Math.abs(parsed.entry - parsed.stop_loss);
      const reward = Math.abs(parsed.take_profit - parsed.entry);
      const rr = risk > 0 ? reward / risk : 0;
      parsed.rr = Math.round(rr * 100) / 100;
      if (rr < 3) {
        parsed.no_setup = true;
        parsed.reasoning = `Setup rejected: RR ${parsed.rr}:1 is below minimum 1:3. ${parsed.reasoning || ""}`;
      }
    }

    if ((parsed.confidence ?? 0) < 60 && !parsed.no_setup) {
      parsed.no_setup = true;
      parsed.reasoning = `Confidence ${parsed.confidence}% too low. ${parsed.reasoning || ""}`;
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
