import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPushStatus, isPushSupported, subscribePush, unsubscribePush } from "@/lib/push";

const EnablePushButton = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported">("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  if (!isPushSupported() || status === "unsupported") return null;

  const enable = async () => {
    setLoading(true);
    const r = await subscribePush();
    setLoading(false);
    if (r.success) {
      setStatus("granted");
      toast({ title: "🔔 Notifications ON", description: "သင် phone ထဲ alert ရရှိမည်။" });
    } else {
      toast({ title: "Failed", description: r.error, variant: "destructive" });
    }
  };

  const disable = async () => {
    setLoading(true);
    await unsubscribePush();
    setLoading(false);
    setStatus("default");
    toast({ title: "Notifications OFF" });
  };

  return (
    <button
      onClick={status === "granted" ? disable : enable}
      disabled={loading || status === "denied"}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === "granted" ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {status === "granted"
        ? "Notifications ON — Tap to disable"
        : status === "denied"
        ? "Notifications blocked in browser"
        : "🔔 Enable Push Notifications"}
    </button>
  );
};

export default EnablePushButton;
