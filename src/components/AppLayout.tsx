import { ReactNode, useEffect, useState } from "react";
import { LogOut, Menu, Crown, Settings, User, Send } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import TelegramLinkBanner from "@/components/TelegramLinkBanner";
import EnablePushButton from "@/components/EnablePushButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AppLayout = ({ children, showLogo = true }: { children: ReactNode; showLogo?: boolean }) => {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tgHandle, setTgHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("telegram_links").select("telegram_username").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setTgHandle(data ? (data.telegram_username ? `@${data.telegram_username}` : "Linked") : null));
  }, [open, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const isTgOnly = user?.email?.endsWith("@telegram.auratrade.app");
  const tgFromMeta = (user?.user_metadata as any)?.telegram_username;
  const expires = profile?.premium_expires_at ? new Date(profile.premium_expires_at).toLocaleDateString() : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {showLogo && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <div className="w-8" />
          <Logo size="sm" />
          <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </header>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-80 flex-col">
          <SheetHeader><SheetTitle>Account</SheetTitle></SheetHeader>
          <div className="mt-4 flex-1 space-y-5 overflow-y-auto">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><User className="h-4 w-4" /> Profile</div>
              <div className="text-base font-bold">{profile?.display_name ?? "Trader"}</div>
              <div className="break-all text-sm text-muted-foreground">{isTgOnly ? "No email linked" : user?.email}</div>
              <div className="flex items-center gap-1.5 text-sm"><Send className="h-4 w-4" /> Telegram: {tgHandle ?? (tgFromMeta ? `@${tgFromMeta}` : "Not linked")}</div>
            </section>
            <section className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Crown className="h-4 w-4" /> Subscription</div>
              <div className="text-sm font-bold">{profile?.is_premium ? "Premium" : "Free plan"}</div>
              {profile?.is_premium && expires && <div className="text-xs text-muted-foreground">Expires {expires}</div>}
              {!profile?.is_premium && (
                <button onClick={() => { setOpen(false); navigate("/subscription"); }} className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">
                  Upgrade to Premium
                </button>
              )}
            </section>
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Settings className="h-4 w-4" /> Settings</div>
              <EnablePushButton />
            </section>
          </div>
          <button onClick={handleSignOut} className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive py-3 text-sm font-semibold text-destructive">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </SheetContent>
      </Sheet>
      <main className="mx-auto max-w-md px-4 py-6">
        <TelegramLinkBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
