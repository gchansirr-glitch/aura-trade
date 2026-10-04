import { useState } from "react";
import { Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const TG_DOMAIN = "@telegram.auratrade.app";

// Shown inside the Telegram Mini App when signed in with a Telegram-only account.
const TelegramLinkBanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const initData: string = (window as any).Telegram?.WebApp?.initData ?? "";
  if (!initData || !user?.email?.endsWith(TG_DOMAIN)) return null;

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data, error: fErr } = await supabase.functions.invoke("telegram-auth", { body: { initData, action: "link" } });
      if (fErr || !data?.ok) throw new Error(data?.error ?? "Linking failed");
      toast({ title: "Linked!", description: "Telegram now opens your email account." });
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Link failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-md border border-border p-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 text-left text-sm font-semibold">
          <Link2 className="h-4 w-4" /> Link your website (email) account
        </button>
      ) : (
        <form onSubmit={link} className="space-y-2">
          <p className="text-xs text-muted-foreground">Sign in with your website email once. After that, Telegram opens the same journal.</p>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Link account
          </button>
        </form>
      )}
    </div>
  );
};

export default TelegramLinkBanner;
