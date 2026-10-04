import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: events, error } = await supabase
      .from("news_events")
      .select("*")
      .eq("impact", "high")
      .eq("notified", false)
      .gte("event_time", now.toISOString())
      .lte("event_time", in30.toISOString());

    if (error) throw error;

    let notified = 0;
    for (const ev of events ?? []) {
      const eventDate = new Date(ev.event_time);
      const minsAway = Math.round((eventDate.getTime() - now.getTime()) / 60000);
      const title = `🔴 High Impact: ${ev.currency || ev.country}`;
      const body = `${ev.title} in ${minsAway} min. Forecast: ${ev.forecast || "n/a"} | Previous: ${ev.previous || "n/a"}`;

      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          title, body, url: "/news", recipient: "all", source: "news_auto",
        }),
      });

      await supabase.from("news_events").update({ notified: true }).eq("id", ev.id);
      notified++;
    }

    return new Response(
      JSON.stringify({ notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify-news error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
