import { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { Upload, ImageIcon, Loader2, AlertCircle, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signedChartUrl } from "@/lib/chartImage";
import { History, Trash2 } from "lucide-react";

type HistoryRow = { id: string; image_path: string | null; news_context: string | null; analysis: AnalysisResult; created_at: string; thumb?: string | null };

interface AnalysisResult {
  pair?: string;
  timeframe?: string;
  no_setup?: boolean;
  bias?: "BUY" | "SELL";
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  rr?: number;
  confidence?: number;
  smc_analysis?: {
    trend?: string;
    market_structure?: string;
    order_block?: string;
    fvg?: string;
    liquidity_sweep?: string;
  };
  ict_analysis?: {
    killzone?: string;
    pd_array?: string;
    ote_zone?: string;
    power_of_3?: string;
  };
  confluences?: string[];
  reasoning?: string;
  invalidation?: string;
  news_consideration?: string;
}

const ChartAnalysisPage = () => {
  const { toast } = useToast();
  const { profile, refreshProfile, user } = useAuth();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const isPremium = !!profile?.is_premium;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [newsContext, setNewsContext] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => { refreshProfile(); /* eslint-disable-next-line */ }, []);

  const loadHistory = async (restoreLatest = false) => {
    const { data } = await supabase.from("chart_analyses").select("*").order("created_at", { ascending: false }).limit(30);
    const rows = await Promise.all(((data ?? []) as unknown as HistoryRow[]).map(async (r) => ({ ...r, thumb: await signedChartUrl(r.image_path) })));
    setHistory(rows);
    if (restoreLatest && rows[0]) openHistory(rows[0]);
  };
  useEffect(() => { if (user) loadHistory(true); /* eslint-disable-next-line */ }, [user]);

  const openHistory = (r: HistoryRow) => {
    setResult(r.analysis); setPreview(r.thumb ?? null); setBase64(null); setNewsContext(r.news_context ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteHistory = async (r: HistoryRow) => {
    await supabase.from("chart_analyses").delete().eq("id", r.id);
    if (r.image_path) await supabase.storage.from("journal-charts").remove([r.image_path]);
    setHistory((h) => h.filter((x) => x.id !== r.id));
  };

  const compressImage = (file: File, maxDim = 1280, quality = 0.82): Promise<{ dataUrl: string; mime: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim; }
            else { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, width, height);
          resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), mime: "image/jpeg" });
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = ev.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    try {
      const { dataUrl, mime } = await compressImage(file);
      setMimeType(mime); setPreview(dataUrl); setBase64(dataUrl.split(",")[1]);
    } catch (err: any) {
      toast({ title: "Image error", description: err.message, variant: "destructive" });
    }
  };

  const handleAnalyze = async () => {
    if (!base64) { toast({ title: "No chart uploaded", variant: "destructive" }); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: { imageBase64: base64, mimeType, newsContext: newsContext.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.analysis);
      // Save image + analysis to history
      if (user) {
        let image_path: string | null = `${user.id}/chart-ai/${Date.now()}.jpg`;
        const blob = await (await fetch(`data:${mimeType};base64,${base64}`)).blob();
        const { error: upErr } = await supabase.storage.from("journal-charts").upload(image_path, blob, { contentType: mimeType });
        if (upErr) { console.error("chart upload failed", upErr); image_path = null; }
        const { error: insErr } = await supabase.from("chart_analyses").insert({
          user_id: user.id, image_path, news_context: newsContext.trim() || null, analysis: data.analysis,
        });
        if (insErr) console.error("save analysis failed", insErr);
        loadHistory();
      }
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally { setAnalyzing(false); }
  };

  if (!isPremium) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Chart Analysis</h1>
          <PremiumGate feature="AI Chart Analysis" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold">AI Chart Analysis</h1>
          <p className="text-sm text-muted-foreground">
            SMC × ICT × News · RR ≥ 1:3 enforced · No random signals
          </p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-foreground"
        >
          {preview ? (
            <img src={preview} alt="Chart preview" className="max-h-48 rounded-md object-contain" />
          ) : (
            <>
              <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload chart screenshot</span>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            News / Context (optional)
          </label>
          <textarea
            value={newsContext}
            onChange={(e) => setNewsContext(e.target.value)}
            placeholder="e.g. NFP in 2h, FOMC tomorrow, CPI hotter than expected..."
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        {preview && base64 && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {analyzing ? (<><Loader2 className="h-4 w-4 animate-spin" />Analyzing SMC × ICT...</>)
              : (<><ImageIcon className="h-4 w-4" />Analyze Chart</>)}
          </button>
        )}

        {result && result.no_setup && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/5 p-4 animate-scale-in">
            <div className="mb-2 flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-5 w-5" />
              No Valid Setup — Wait
            </div>
            <p className="text-sm text-foreground">{result.reasoning}</p>
          </div>
        )}

        {result && !result.no_setup && (
          <div className="space-y-3 animate-scale-in">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{result.pair} · {result.timeframe}</div>
                  <div className={`flex items-center gap-1.5 text-xl font-bold ${result.bias === "BUY" ? "text-green-600" : "text-red-600"}`}>
                    {result.bias === "BUY" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {result.bias}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-xl font-bold">{result.confidence}%</div>
                  <div className="text-xs font-semibold text-primary">RR {result.rr}:1</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-border p-2 text-center">
                <div className="text-[10px] uppercase text-muted-foreground">Entry</div>
                <div className="text-sm font-bold">{result.entry}</div>
              </div>
              <div className="rounded-md border border-red-500/40 bg-red-500/5 p-2 text-center">
                <div className="text-[10px] uppercase text-red-600">Stop</div>
                <div className="text-sm font-bold">{result.stop_loss}</div>
              </div>
              <div className="rounded-md border border-green-500/40 bg-green-500/5 p-2 text-center">
                <div className="text-[10px] uppercase text-green-600">Target</div>
                <div className="text-sm font-bold">{result.take_profit}</div>
              </div>
            </div>

            {result.smc_analysis && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">📦 SMC</div>
                <div className="space-y-1 text-xs">
                  <div><b>Trend:</b> {result.smc_analysis.trend}</div>
                  <div><b>Structure:</b> {result.smc_analysis.market_structure}</div>
                  <div><b>Order Block:</b> {result.smc_analysis.order_block}</div>
                  <div><b>FVG:</b> {result.smc_analysis.fvg}</div>
                  <div><b>Liquidity:</b> {result.smc_analysis.liquidity_sweep}</div>
                </div>
              </div>
            )}

            {result.ict_analysis && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">⚡ ICT</div>
                <div className="space-y-1 text-xs">
                  <div><b>Killzone:</b> {result.ict_analysis.killzone}</div>
                  <div><b>PD Array:</b> {result.ict_analysis.pd_array}</div>
                  <div><b>OTE Zone:</b> {result.ict_analysis.ote_zone}</div>
                  <div><b>Power of 3:</b> {result.ict_analysis.power_of_3}</div>
                </div>
              </div>
            )}

            {result.confluences && result.confluences.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">✅ Confluences</div>
                <ul className="space-y-1 text-xs">
                  {result.confluences.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </div>
            )}

            {result.reasoning && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> Reasoning
                </div>
                <p className="text-xs leading-relaxed">{result.reasoning}</p>
              </div>
            )}

            {result.invalidation && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-red-600">
                  <Shield className="h-3.5 w-3.5" /> Invalidation
                </div>
                <p className="text-xs">{result.invalidation}</p>
              </div>
            )}

            {result.news_consideration && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">📰 News Context</div>
                <p className="text-xs">{result.news_consideration}</p>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4" /> History</div>
          {history.length === 0 && <p className="text-xs text-muted-foreground">No saved analyses yet.</p>}
          {history.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-md border border-border p-2">
              <button onClick={() => openHistory(r)} className="flex flex-1 items-center gap-3 text-left">
                {r.thumb ? <img src={r.thumb} alt="" className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-secondary" />}
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.analysis.no_setup ? "No setup" : `${r.analysis.bias ?? ""} ${r.analysis.pair ?? ""}`} {r.analysis.timeframe ? `· ${r.analysis.timeframe}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
              </button>
              <button onClick={() => deleteHistory(r)} aria-label="Delete" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default ChartAnalysisPage;
