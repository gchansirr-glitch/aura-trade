import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import LoginPage from "@/pages/LoginPage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const getTgInitData = (): string => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initData) {
    tg.ready?.();
    tg.expand?.();
    return tg.initData as string;
  }
  return "";
};

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState("");
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || user) return;
    const initData = getTgInitData();
    if (!initData) return;
    setTgLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("telegram-auth", { body: { initData } });
        if (error || !data?.token_hash) throw new Error(data?.error ?? "Telegram login failed");
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "email" });
        if (vErr) throw vErr;
      } catch (e: any) {
        setTgError(e.message ?? "Telegram login failed");
      } finally {
        setTgLoading(false);
      }
    })();
  }, [loading, user]);

  useEffect(() => {
    if (!showSplash && !loading && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [showSplash, loading, user, isAdmin, navigate]);

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;
  if (loading || tgLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  if (!user)
    return (
      <>
        {tgError && <p className="bg-destructive p-2 text-center text-xs text-destructive-foreground">{tgError}</p>}
        <LoginPage />
      </>
    );
  return null;
};

export default Index;
