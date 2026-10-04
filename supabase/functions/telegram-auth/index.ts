import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const enc = new TextEncoder();
const hmac = async (key: ArrayBuffer | Uint8Array, data: string) => {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
};
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const BOT = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT) return json({ error: 'Telegram bot not configured' }, 500);
    const { initData, action = 'login' } = await req.json().catch(() => ({}));
    if (typeof initData !== 'string' || initData.length < 10 || initData.length > 4096) {
      return json({ error: 'Invalid initData' }, 400);
    }
    if (action !== 'login' && action !== 'link') return json({ error: 'Invalid action' }, 400);

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = await hmac(enc.encode('WebAppData'), BOT);
    if (!hash || hex(await hmac(secret, check)) !== hash) return json({ error: 'Invalid signature' }, 401);
    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > 86400) return json({ error: 'Login expired' }, 401);

    const tgUser = JSON.parse(params.get('user') ?? '{}');
    if (!tgUser.id) return json({ error: 'No user' }, 400);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Link this Telegram account to the signed-in (email) account
    if (action === 'link') {
      const token = req.headers.get('Authorization')?.replace('Bearer ', '');
      const { data: u, error: uErr } = token ? await admin.auth.getUser(token) : { data: null, error: true };
      if (uErr || !u?.user) return json({ error: 'Please sign in first' }, 401);
      await admin.from('telegram_links').delete().eq('user_id', u.user.id);
      const { error } = await admin.from('telegram_links').upsert(
        { telegram_id: tgUser.id, user_id: u.user.id, telegram_username: tgUser.username ?? null },
        { onConflict: 'telegram_id' },
      );
      if (error) throw error;
      return json({ ok: true });
    }

    // Login: use linked account if one exists, else a Telegram-only account
    let email: string | undefined;
    const { data: link } = await admin.from('telegram_links').select('user_id').eq('telegram_id', tgUser.id).maybeSingle();
    if (link) {
      const { data: lu } = await admin.auth.admin.getUserById(link.user_id);
      email = lu?.user?.email;
    }
    if (!email) {
      email = `tg_${tgUser.id}@telegram.auratrade.app`;
      const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Trader';
      const meta = { telegram_id: tgUser.id, telegram_username: tgUser.username ?? null, display_name: name };
      const { error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
      if (createErr && !/already|registered|exists/i.test(createErr.message)) throw createErr;
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (error) throw error;
    return json({ token_hash: data.properties.hashed_token });
  } catch (e) {
    console.error('telegram-auth error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
