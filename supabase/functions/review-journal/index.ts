import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a strict but supportive Smart Money Concepts (SMC/ICT) trading coach.
You will receive a trader's journal entry: pair, direction, entry/SL/TP, sentiment, notes, and optionally a chart screenshot.
Your job: review the trade end-to-end, point out mistakes, and give clear actionable advice.

REPLY ONLY in ENGLISH. No other languages. No intro. No disclaimer. Use this EXACT markdown template:

**Trade Review — {PAIR} ({DIRECTION})**

**✅ What was done well**
- bullet 1
- bullet 2

**⚠️ Mistakes / Risks**
- bullet 1
- bullet 2

**📊 Risk Assessment**
- R:R ratio: {value or n/a}
- Position vs market structure: {short comment}
- Emotional state ({sentiment}): {short comment}

**🎯 Advice — Next Steps**
- actionable bullet 1
- actionable bullet 2
- actionable bullet 3

**One-line verdict:** {single sentence: keep / adjust / avoid + why}

Rules:
- Keep total under 220 words.
- Be specific with prices when given.
- If the chart image contradicts the notes, call it out.
- If R:R is below 1:1.5, flag it.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      pair, direction, notes, sentiment,
      entryPrice, stopLoss, takeProfit, outcome,
      riskReward, riskPercent, lotSize, strategy, tags,
      imageBase64, mimeType,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userText = [
      `Pair: ${pair ?? "n/a"}`,
      `Direction: ${direction ?? "n/a"}`,
      `Entry: ${entryPrice ?? "n/a"}`,
      `Stop Loss: ${stopLoss ?? "n/a"}`,
      `Take Profit: ${takeProfit ?? "n/a"}`,
      `Risk:Reward: ${riskReward != null ? `1:${riskReward}` : "n/a"}`,
      `Risk %: ${riskPercent ?? "n/a"}`,
      `Lot Size: ${lotSize ?? "n/a"}`,
      `Strategy: ${strategy ?? "n/a"}`,
      `Tags: ${Array.isArray(tags) && tags.length ? tags.join(", ") : "n/a"}`,
      `Outcome: ${outcome ?? "OPEN"}`,
      `Sentiment: ${sentiment ?? "n/a"}`,
      `Notes: ${notes ?? "n/a"}`,
    ].join("\n");

    const userContent: any[] = [{ type: "text", text: userText }];
    if (imageBase64) {
      const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gateway error ${resp.status}`);
    }

    const data = await resp.json();
    const review = data.choices?.[0]?.message?.content ?? "No review available.";
    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("review-journal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
