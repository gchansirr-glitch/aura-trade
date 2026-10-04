import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import {
  Mic, MicOff, Send, Smile, AlertTriangle, Zap, Loader2, Trash2,
  History as HistoryIcon, Plus, Pencil, X, Save, Upload, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TradeDetailDialog from "@/components/TradeDetailDialog";
import { signedChartUrl } from "@/lib/chartImage";

const sentimentIcons: Record<string, { icon: typeof Smile }> = {
  Calm: { icon: Smile },
  Greedy: { icon: Zap },
  Anxious: { icon: AlertTriangle },
};

type Outcome = "WIN" | "LOSS" | "BREAKEVEN" | "OPEN";

type JournalEntry = {
  id: string;
  pair: string;
  direction: string;
  notes: string;
  sentiment: "Calm" | "Greedy" | "Anxious" | null;
  created_at: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  outcome: Outcome;
  ai_review: string | null;
  chart_image_url: string | null;
  risk_reward: number | null;
  risk_percent: number | null;
  lot_size: number | null;
  strategy: string | null;
  tags: string[] | null;
  pnl?: number | null;
  chart_analysis?: string | null;
};

const computeRR = (entry: string, sl: string, tp: string, dir: "BUY" | "SELL"): number | null => {
  const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp);
  if (!isFinite(e) || !isFinite(s) || !isFinite(t)) return null;
  const risk = dir === "BUY" ? e - s : s - e;
  const reward = dir === "BUY" ? t - e : e - t;
  if (risk <= 0 || reward <= 0) return null;
  return Math.round((reward / risk) * 100) / 100;
};

const compressImage = (file: File): Promise<{ blob: Blob; base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 1280;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) { height = (height * max) / width; width = max; }
          else { width = (width * max) / height; height = max; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("compress failed"));
            const r2 = new FileReader();
            r2.onload = () => {
              const result = r2.result as string;
              resolve({ blob, base64: result.split(",")[1], mimeType: "image/jpeg" });
            };
            r2.readAsDataURL(blob);
          },
          "image/jpeg",
          0.85,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const JournalPage = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();
  const isPremium = !!profile?.is_premium;

  const [tab, setTab] = useState<"new" | "history">("new");
  const [detail, setDetail] = useState<JournalEntry | null>(null);

  // New entry state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [pair, setPair] = useState("");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("OPEN");
  const [pnl, setPnl] = useState("");
  const [riskPercent, setRiskPercent] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [strategy, setStrategy] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sentiment, setSentiment] = useState<"Calm" | "Greedy" | "Anxious" | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [chartBlob, setChartBlob] = useState<Blob | null>(null);
  const [chartBase64, setChartBase64] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);

  const rr = useMemo(() => computeRR(entryPrice, stopLoss, takeProfit, direction), [entryPrice, stopLoss, takeProfit, direction]);

  // History state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPair, setEditPair] = useState("");
  const [editDirection, setEditDirection] = useState<"BUY" | "SELL">("BUY");
  const [editNotes, setEditNotes] = useState("");
  const [editSentiment, setEditSentiment] = useState<"Calm" | "Greedy" | "Anxious" | null>(null);
  const [editOutcome, setEditOutcome] = useState<Outcome>("OPEN");
  const [editEntry, setEditEntry] = useState("");
  const [editSL, setEditSL] = useState("");
  const [editTP, setEditTP] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntries((data ?? []) as JournalEntry[]);
    } catch (e: any) {
      toast({ title: "Failed to load history", description: e.message, variant: "destructive" });
    } finally {
      setLoadingEntries(false);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === "history" && isPremium) loadEntries();
  }, [tab, isPremium, loadEntries]);

  // ------- Image upload -------
  const handleChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { blob, base64 } = await compressImage(file);
      setChartBlob(blob);
      setChartBase64(base64);
      setChartPreview(URL.createObjectURL(blob));
    } catch {
      toast({ title: "Image error", description: "Could not process image.", variant: "destructive" });
    }
  };

  // ------- Voice -------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone error", description: "Could not access microphone.", variant: "destructive" });
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("transcribe-voice", {
        body: { audio: base64, mimeType: "audio/webm" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = (data?.text ?? "").trim();
      if (text) {
        setJournalText((prev) => (prev ? prev + " " + text : text));
        await analyzeSentiment(text);
      }
    } catch (e: any) {
      toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
    } finally {
      setTranscribing(false);
    }
  };

  const analyzeSentiment = async (text: string) => {
    setAnalyzingSentiment(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-sentiment", { body: { text } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.sentiment) setSentiment(data.sentiment);
    } catch (e: any) {
      toast({ title: "Sentiment analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzingSentiment(false);
    }
  };

  // ------- AI Review -------
  const runReview = async () => {
    if (!journalText.trim() || !pair.trim()) {
      toast({ title: "Add pair and notes first", variant: "destructive" });
      return;
    }
    setReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-journal", {
        body: {
          pair: pair.trim().toUpperCase(),
          direction,
          notes: journalText,
          sentiment,
          entryPrice: entryPrice || null,
          stopLoss: stopLoss || null,
          takeProfit: takeProfit || null,
          riskReward: rr,
          riskPercent: riskPercent || null,
          lotSize: lotSize || null,
          strategy: strategy || null,
          tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null,
          outcome,
          imageBase64: chartBase64,
          mimeType: "image/jpeg",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiReview(data?.review ?? null);
    } catch (e: any) {
      toast({ title: "AI review failed", description: e.message, variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  };

  // ------- Submit -------
  const handleSubmit = async () => {
    // Require at least one of: pair, notes, chart image, or P&L
    if (!pair.trim() && !journalText.trim() && !chartBlob && !pnl) {
      toast({
        title: "Nothing to save",
        description: "Add a pair, notes, chart, or P&L first.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalSentiment = sentiment;
      if (!finalSentiment) {
        const { data } = await supabase.functions.invoke("analyze-sentiment", { body: { text: journalText } });
        finalSentiment = data?.sentiment ?? null;
      }

      let chartUrl: string | null = null;
      if (chartBlob) {
        const path = `${user.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("journal-charts")
          .upload(path, chartBlob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        chartUrl = supabase.storage.from("journal-charts").getPublicUrl(path).data.publicUrl;
      }

      let finalReview = aiReview;
      if (!finalReview) {
        try {
          const { data } = await supabase.functions.invoke("review-journal", {
            body: {
              pair: pair.trim().toUpperCase(),
              direction,
              notes: journalText,
              sentiment: finalSentiment,
              entryPrice: entryPrice || null,
              stopLoss: stopLoss || null,
              takeProfit: takeProfit || null,
              riskReward: rr,
              riskPercent: riskPercent || null,
              lotSize: lotSize || null,
              strategy: strategy || null,
              tags: tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null,
              outcome,
              imageBase64: chartBase64,
              mimeType: "image/jpeg",
            },
          });
          finalReview = data?.review ?? null;
        } catch {
          // non-blocking
        }
      }

      const tagsArr = tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null;

      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        pair: pair.trim().toUpperCase() || "—",
        direction,
        notes: journalText.trim() || "",
        sentiment: finalSentiment,
        entry_price: entryPrice ? Number(entryPrice) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
        outcome,
        pnl: pnl ? Number(pnl) : null,
        ai_review: finalReview,
        chart_image_url: chartUrl,
        risk_reward: rr,
        risk_percent: riskPercent ? Number(riskPercent) : null,
        lot_size: lotSize ? Number(lotSize) : null,
        strategy: strategy || null,
        tags: tagsArr,
      });
      if (error) throw error;

      toast({ title: "Journal saved!", description: "Your trade has been recorded." });
      // reset
      setJournalText(""); setPair(""); setSentiment(null); setEntryPrice("");
      setStopLoss(""); setTakeProfit(""); setOutcome("OPEN"); setPnl("");
      setRiskPercent(""); setLotSize(""); setStrategy(""); setTagsInput("");
      setChartPreview(null); setChartBlob(null); setChartBase64(null); setAiReview(null);
      setTab("history");
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ------- History edit/delete -------
  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditPair(entry.pair);
    setEditDirection((entry.direction as "BUY" | "SELL") || "BUY");
    setEditNotes(entry.notes);
    setEditSentiment(entry.sentiment);
    setEditOutcome(entry.outcome);
    setEditEntry(entry.entry_price?.toString() ?? "");
    setEditSL(entry.stop_loss?.toString() ?? "");
    setEditTP(entry.take_profit?.toString() ?? "");
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editPair.trim() || !editNotes.trim()) {
      toast({ title: "Pair and notes are required.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          pair: editPair.trim().toUpperCase(),
          direction: editDirection,
          notes: editNotes.trim(),
          sentiment: editSentiment,
          outcome: editOutcome,
          entry_price: editEntry ? Number(editEntry) : null,
          stop_loss: editSL ? Number(editSL) : null,
          take_profit: editTP ? Number(editTP) : null,
        })
        .eq("id", id);
      if (error) throw error;
      await loadEntries();
      toast({ title: "Updated" });
      cancelEdit();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this journal entry?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isPremium) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Trade Journal</h1>
          <PremiumGate feature="AI Trading Journal" />
        </div>
      </AppLayout>
    );
  }

  const busy = transcribing || analyzingSentiment;
  const outcomeColors: Record<Outcome, string> = {
    WIN: "border-foreground bg-primary text-primary-foreground",
    LOSS: "border-foreground bg-primary text-primary-foreground",
    BREAKEVEN: "border-foreground bg-primary text-primary-foreground",
    OPEN: "border-foreground bg-primary text-primary-foreground",
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold">Trade Journal</h1>

        <div className="flex gap-2 rounded-md border border-border p-1">
          <button
            onClick={() => setTab("new")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-sm font-semibold transition-colors ${
              tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Plus className="h-4 w-4" /> New
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded py-2 text-sm font-semibold transition-colors ${
              tab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <HistoryIcon className="h-4 w-4" /> History
          </button>
        </div>

        {tab === "new" && (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trade Pair</label>
              <input
                type="text"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                placeholder="e.g. EURUSD, BTCUSDT"
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</label>
              <div className="flex gap-3">
                {(["BUY", "SELL"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`flex-1 rounded-md border py-2.5 text-sm font-semibold transition-colors ${
                      direction === d
                        ? "border-foreground bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Entry", value: entryPrice, set: setEntryPrice },
                { label: "Stop Loss", value: stopLoss, set: setStopLoss },
                { label: "Take Profit", value: takeProfit, set: setTakeProfit },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>

            {rr !== null && (
              <div className="flex items-center justify-between rounded-md border border-foreground bg-secondary px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk : Reward</span>
                <span className="text-base font-bold">1 : {rr}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk %</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lot Size</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="0.01"
                  className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategy</label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. SMC OB Retest, ICT Killzone"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="liquidity-sweep, FVG, killzone"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outcome</label>
              <div className="grid grid-cols-4 gap-2">
                {(["OPEN", "WIN", "LOSS", "BREAKEVEN"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setOutcome(o)}
                    className={`rounded-md border py-2 text-xs font-semibold transition-colors ${
                      outcome === o ? outcomeColors[o] : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profit / Loss ($) {outcome === "LOSS" && <span className="text-destructive">— enter as negative</span>}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                placeholder="e.g. 250 or -120"
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Chart upload */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chart Image (optional)</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border p-4 transition-colors hover:border-foreground">
                {chartPreview ? (
                  <img src={chartPreview} alt="Chart preview" className="max-h-48 rounded" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-2 text-xs text-muted-foreground">Tap to upload chart screenshot</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleChartUpload} />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={busy}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 ${
                  isRecording
                    ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
                    : "border-foreground bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {transcribing ? <Loader2 className="h-5 w-5 animate-spin" /> : isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <span className="text-sm text-muted-foreground">
                {transcribing ? "Transcribing..." : isRecording ? "Recording... Tap to stop" : "Tap to record voice journal"}
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journal Notes</label>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                rows={5}
                placeholder="Reasoning, emotions, plan, lessons..."
                className="w-full resize-none rounded-md border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {(sentiment || analyzingSentiment) && (
              <div className="rounded-lg border border-border p-4 animate-scale-in">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Sentiment</div>
                {analyzingSentiment ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                  </div>
                ) : sentiment ? (
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = sentimentIcons[sentiment].icon;
                      return <><Icon className="h-6 w-6" /><span className="text-lg font-bold">{sentiment}</span></>;
                    })()}
                  </div>
                ) : null}
              </div>
            )}

            {/* AI Review button */}
            <button
              onClick={runReview}
              disabled={reviewing || busy}
              className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-foreground py-3 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Get AI Trade Review
            </button>

            {aiReview && (
              <div className="rounded-lg border border-border p-4 animate-scale-in">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Review</div>
                <div className="space-y-2 text-sm leading-relaxed text-foreground [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1">
                  <ReactMarkdown>{aiReview}</ReactMarkdown>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Save Journal Entry
            </button>
          </>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {loadingEntries ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No journal entries yet. Create your first one!
              </div>
            ) : (
              entries.map((entry) => {
                const Icon = entry.sentiment ? sentimentIcons[entry.sentiment].icon : null;
                const isEditing = editingId === entry.id;

                if (isEditing) {
                  return (
                    <div key={entry.id} className="space-y-3 rounded-lg border-2 border-foreground p-4 animate-scale-in">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pair</label>
                        <input
                          type="text"
                          value={editPair}
                          onChange={(e) => setEditPair(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["BUY", "SELL"] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => setEditDirection(d)}
                            className={`rounded-md border py-2 text-xs font-semibold ${
                              editDirection === d
                                ? "border-foreground bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Entry", v: editEntry, set: setEditEntry },
                          { label: "SL", v: editSL, set: setEditSL },
                          { label: "TP", v: editTP, set: setEditTP },
                        ].map((f) => (
                          <div key={f.label}>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                            <input
                              type="number"
                              value={f.v}
                              onChange={(e) => f.set(e.target.value)}
                              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["OPEN", "WIN", "LOSS", "BREAKEVEN"] as const).map((o) => (
                          <button
                            key={o}
                            onClick={() => setEditOutcome(o)}
                            className={`rounded-md border py-2 text-[10px] font-semibold ${
                              editOutcome === o
                                ? "border-foreground bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Calm", "Greedy", "Anxious"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditSentiment(s)}
                            className={`rounded-md border py-2 text-xs font-semibold ${
                              editSentiment === s
                                ? "border-foreground bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(entry.id)}
                          disabled={savingEdit}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={entry.id} className="rounded-lg border border-border p-4 animate-scale-in">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold">{entry.pair}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          entry.direction === "BUY" ? "bg-foreground text-background" : "border border-foreground text-foreground"
                        }`}>
                          {entry.direction}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold border ${
                          entry.outcome === "WIN" ? "border-foreground bg-foreground text-background"
                          : entry.outcome === "LOSS" ? "border-destructive text-destructive"
                          : "border-border text-muted-foreground"
                        }`}>
                          {entry.outcome}
                        </span>
                        {Icon && entry.sentiment && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" /> {entry.sentiment}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail(entry)} className="text-xs font-semibold underline">Details</button>
                        <button onClick={() => startEdit(entry)} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          aria-label="Delete"
                        >
                          {deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {(entry.entry_price != null || entry.stop_loss != null || entry.take_profit != null || entry.risk_reward != null) && (
                      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {entry.entry_price != null && <span>Entry: <b className="text-foreground">{entry.entry_price}</b></span>}
                        {entry.stop_loss != null && <span>SL: <b className="text-foreground">{entry.stop_loss}</b></span>}
                        {entry.take_profit != null && <span>TP: <b className="text-foreground">{entry.take_profit}</b></span>}
                        {entry.risk_reward != null && <span>R:R: <b className="text-foreground">1:{entry.risk_reward}</b></span>}
                        {entry.risk_percent != null && <span>Risk: <b className="text-foreground">{entry.risk_percent}%</b></span>}
                        {entry.lot_size != null && <span>Lot: <b className="text-foreground">{entry.lot_size}</b></span>}
                      </div>
                    )}

                    {(entry.strategy || (entry.tags && entry.tags.length > 0)) && (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {entry.strategy && (
                          <span className="rounded border border-foreground px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {entry.strategy}
                          </span>
                        )}
                        {entry.tags?.map((t) => (
                          <span key={t} className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.chart_image_url && (
                      <SignedImg src={entry.chart_image_url} alt="Chart" className="mb-2 max-h-48 w-full rounded border border-border object-contain" />
                    )}

                    <p className="mb-2 whitespace-pre-wrap text-sm text-foreground">{entry.notes}</p>

                    {entry.ai_review && (
                      <details className="mb-2 rounded-md border border-border p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          AI Review
                        </summary>
                        <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground [&_h1]:mt-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_p]:my-1">
                          <ReactMarkdown>{entry.ai_review}</ReactMarkdown>
                        </div>
                      </details>
                    )}

                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <TradeDetailDialog trades={detail ? [detail] : null} onClose={() => setDetail(null)} />
    </AppLayout>
  );
};

const SignedImg = ({ src, ...rest }: { src: string; alt: string; className?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { signedChartUrl(src).then(setUrl); }, [src]);
  return url ? <img src={url} {...rest} /> : null;
};

export default JournalPage;
