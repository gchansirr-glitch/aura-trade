import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FFItem {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  url?: string;
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  USD: "USD", EUR: "EUR", GBP: "GBP", JPY: "JPY", AUD: "AUD",
  CAD: "CAD", CHF: "CHF", NZD: "NZD", CNY: "CNY",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`Forex Factory fetch failed: ${r.status}`);
    const items: FFItem[] = await r.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rows = items.map((it) => {
      const impactRaw = (it.impact || "").toLowerCase();
      const impact =
        impactRaw === "high" ? "high" :
        impactRaw === "medium" ? "medium" :
        impactRaw === "holiday" ? "holiday" : "low";
      const currency = COUNTRY_TO_CURRENCY[it.country] || it.country;
      const external_id = `${it.country}-${it.date}-${it.title}`.slice(0, 200);
      return {
        external_id,
        title: it.title,
        country: it.country,
        currency,
        impact,
        event_time: it.date,
        forecast: it.forecast || null,
        previous: it.previous || null,
        source_url: it.url || "https://www.forexfactory.com/calendar",
      };
    });

    const { error } = await supabase
      .from("news_events")
      .upsert(rows, { onConflict: "external_id", ignoreDuplicates: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, inserted: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-forex-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
