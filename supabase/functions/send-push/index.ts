import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@auratrade.app";
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { title, body, url, recipient, user_id, source } = await req.json();
    if (!title || !body) throw new Error("title and body required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth check — only admin can call (unless source=system from cron)
    const authHeader = req.headers.get("authorization");
    let senderId: string | null = null;
    const isSystem = source === "system" || source === "news_auto";

    if (!isSystem) {
      if (!authHeader) throw new Error("Unauthorized");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error("Unauthorized");
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!roles?.length) throw new Error("Admin only");
      senderId = user.id;
    }

    // Resolve recipients
    let query = supabase.from("push_subscriptions").select("*");
    if (recipient === "premium") {
      const { data: prem } = await supabase.from("profiles").select("id").eq("is_premium", true);
      const ids = (prem ?? []).map((p) => p.id);
      if (!ids.length) {
        return new Response(JSON.stringify({ delivered: 0, total: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      query = query.in("user_id", ids);
    } else if (recipient === "user" && user_id) {
      query = query.eq("user_id", user_id);
    }
    // recipient === "all" → no extra filter

    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url: url || "/" });
    let delivered = 0;
    const dead: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          delivered++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
          console.warn("push fail", s.endpoint.slice(0, 40), err?.statusCode);
        }
      })
    );

    if (dead.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", dead);
    }

    await supabase.from("notification_logs").insert({
      sender_id: senderId,
      title,
      body,
      recipient_filter: recipient || "all",
      recipient_count: subs?.length ?? 0,
      delivered_count: delivered,
      source: isSystem ? source : "admin",
    });

    return new Response(
      JSON.stringify({ delivered, total: subs?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
