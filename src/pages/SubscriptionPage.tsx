import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Copy, CheckCircle, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import binanceQrImg from "@/assets/binance-qr.png";

const BINANCE_ID = "1216326343";

const SubscriptionPage = () => {
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoPaying, setAutoPaying] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ status: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshProfile();
    loadLatestRequest();
    if (!user) return;
    // Realtime: when profile is upgraded by webhook, refresh instantly
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => {
        refreshProfile();
        toast({ title: "Premium activated!", description: "Your payment was confirmed automatically." });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [user?.id]);


  const loadLatestRequest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("payment_requests")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPendingRequest(data);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(BINANCE_ID);
    setCopied(true);
    toast({ title: "Copied!", description: "Binance ID copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoPay = async () => {
    if (!user) return;
    setAutoPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-binance-order");
      if (error) throw error;
      const url = data?.checkoutUrl || data?.universalUrl || data?.qrcodeLink;
      if (!url) throw new Error("No checkout URL returned");
      window.open(url, "_blank");
      toast({ title: "Complete payment in Binance", description: "Premium will activate automatically once paid." });
    } catch (e: any) {
      toast({ title: "Could not start payment", description: e.message, variant: "destructive" });
    } finally {
      setAutoPaying(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !user) {
      toast({ title: "No screenshot", description: "Please upload your payment screenshot.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("payment-screenshots")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        screenshot_path: path,
      });
      if (insErr) throw insErr;

      toast({ title: "Submitted!", description: "Admin will review your payment shortly." });
      setFile(null);
      setPreviewUrl(null);
      await loadLatestRequest();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (profile?.is_premium) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-slide-up text-center">
          <CheckCircle className="mx-auto h-16 w-16" />
          <h1 className="text-2xl font-bold">You're Premium!</h1>
          <p className="text-sm text-muted-foreground">All AI features are unlocked. Enjoy your trading journey.</p>
        </div>
      </AppLayout>
    );
  }

  const isPending = pendingRequest?.status === "pending";
  const isRejected = pendingRequest?.status === "rejected";

  return (
    <AppLayout>
      <div className="space-y-8 animate-slide-up">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Unlock Premium</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get access to AI Journal, Voice-to-Text, and Chart Analysis.
          </p>
        </div>

        <div className="rounded-lg border-2 border-foreground p-6 text-center">
          <div className="text-4xl font-bold">4.99 USDT</div>
          <div className="mt-1 text-sm text-muted-foreground">/ 1 week</div>
          <div className="mt-4 space-y-2 text-left text-sm">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> AI Voice-to-Text Journal</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> AI Sentiment Analysis</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> AI Chart Pattern Detection</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> SMC Analysis</div>
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Unlimited Journal Entries</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Manual Payment</h2>

          <div className="flex flex-col items-center rounded-lg border border-border p-4">
            <img src={binanceQrImg} alt="Binance QR" className="mb-4 h-48 w-48 rounded-md object-contain" />
            <div className="text-xs text-muted-foreground mb-1">Binance ID</div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-secondary px-3 py-1.5 text-sm font-mono font-bold">{BINANCE_ID}</code>
              <button onClick={handleCopy} className="rounded-md border border-border p-2 transition-colors hover:bg-secondary">
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Step 2 — Upload Payment Screenshot</h2>

          {isPending ? (
            <div className="rounded-lg border border-border p-6 text-center animate-scale-in">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin" />
              <div className="font-semibold">Payment Under Review</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Your premium will be activated once approved by admin.
              </div>
            </div>
          ) : (
            <>
              {isRejected && (
                <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  Your previous request was rejected. Please re-submit a clear screenshot.
                </div>
              )}
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-foreground"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Payment screenshot" className="max-h-40 rounded-md object-contain" />
                ) : (
                  <>
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload payment screenshot</span>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !file}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for Verification
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SubscriptionPage;
