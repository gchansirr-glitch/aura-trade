import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.45.0/cors";

const BINANCE_API = "https://bpay.binanceapi.com/binancepay/openapi/v3/order";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;

    const apiKey = Deno.env.get("BINANCE_PAY_API_KEY")!;
    const apiSecret = Deno.env.get("BINANCE_PAY_SECRET_KEY")!;

    const merchantTradeNo = `MTJ${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const body = {
      env: { terminalType: "WEB" },
      merchantTradeNo,
      orderAmount: 1.0,
      currency: "USDT",
      goods: {
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: "premium-1w",
        goodsName: "MY TRADING JOURNAL Premium (1 week)",
      },
    };
    const bodyStr = JSON.stringify(body);
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    const payload = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    const signature = await hmacSha512Hex(apiSecret, payload);

    const resp = await fetch(BINANCE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: bodyStr,
    });
    const json = await resp.json();
    if (json.status !== "SUCCESS") {
      console.error("Binance order failed", json);
      return new Response(JSON.stringify({ error: json.errorMessage || "Order creation failed", detail: json }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("binance_orders").insert({
      user_id: userId,
      merchant_trade_no: merchantTradeNo,
      prepay_id: json.data?.prepayId,
      amount: 1.0,
      currency: "USDT",
      status: "INITIAL",
    });

    return new Response(
      JSON.stringify({
        merchantTradeNo,
        checkoutUrl: json.data?.checkoutUrl,
        deeplink: json.data?.deeplink,
        qrcodeLink: json.data?.qrcodeLink,
        universalUrl: json.data?.universalUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
