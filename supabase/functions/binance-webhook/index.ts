import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

async function hmacSha512Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("BinancePay-Timestamp") || "";
    const nonce = req.headers.get("BinancePay-Nonce") || "";
    const signature = req.headers.get("BinancePay-Signature") || "";

    const apiSecret = Deno.env.get("BINANCE_PAY_SECRET_KEY")!;
    const expected = await hmacSha512Hex(apiSecret, `${timestamp}\n${nonce}\n${rawBody}\n`);
    if (expected !== signature.toUpperCase()) {
      console.error("Invalid Binance signature");
      return new Response(JSON.stringify({ returnCode: "FAIL", returnMessage: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    // bizType e.g. PAY, PAY_REFUND. bizStatus PAY_SUCCESS, PAY_CLOSED
    const bizType = event.bizType;
    const bizStatus = event.bizStatus;
    const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    const merchantTradeNo = data?.merchantTradeNo;

    console.log("Binance webhook", { bizType, bizStatus, merchantTradeNo });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (bizType === "PAY" && bizStatus === "PAY_SUCCESS" && merchantTradeNo) {
      const { data: order } = await admin
        .from("binance_orders")
        .select("user_id, status")
        .eq("merchant_trade_no", merchantTradeNo)
        .maybeSingle();

      if (!order) {
        console.error("Order not found", merchantTradeNo);
      } else if (order.status !== "PAID") {
        await admin
          .from("binance_orders")
          .update({ status: "PAID", paid_at: new Date().toISOString() })
          .eq("merchant_trade_no", merchantTradeNo);

        // Extend by 7 days from current expiry (or now)
        const { data: profile } = await admin
          .from("profiles")
          .select("premium_expires_at")
          .eq("id", order.user_id)
          .maybeSingle();

        const base = profile?.premium_expires_at && new Date(profile.premium_expires_at) > new Date()
          ? new Date(profile.premium_expires_at)
          : new Date();
        base.setDate(base.getDate() + 7);

        await admin
          .from("profiles")
          .update({ is_premium: true, premium_expires_at: base.toISOString() })
          .eq("id", order.user_id);

        console.log("Premium granted to", order.user_id, "until", base.toISOString());
      }
    }

    return new Response(JSON.stringify({ returnCode: "SUCCESS", returnMessage: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error", e);
    return new Response(JSON.stringify({ returnCode: "FAIL", returnMessage: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
