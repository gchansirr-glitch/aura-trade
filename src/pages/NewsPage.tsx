import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnablePushButton from "@/components/EnablePushButton";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

interface NewsRow {
  id: string;
  title: string;
  country: string | null;
  currency: string | null;
  impact: "low" | "medium" | "high" | "holiday";
  event_time: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

const impactStyles: Record<string, { dot: string; label: string; bg: string }> = {
  high: { dot: "bg-red-500", label: "HIGH", bg: "border-red-500/40 bg-red-500/5" },
  medium: { dot: "bg-orange-500", label: "MED", bg: "border-orange-500/40 bg-orange-500/5" },
  low: { dot: "bg-zinc-400", label: "LOW", bg: "border-border" },
  holiday: { dot: "bg-blue-400", label: "HOL", bg: "border-blue-400/30 bg-blue-400/5" },
};

const NewsPage = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "high" | "today">("today");

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("news_events")
      .select("*")
      .gte("event_time", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte("event_time", weekAhead.toISOString())
      .order("event_time", { ascending: true });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else setRows((data ?? []) as NewsRow[]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("fetch-forex-news");
    setRefreshing(false);
    if (error) toast({ title: "Fetch failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "News updated" });
      load();
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter === "high") return r.impact === "high";
    if (filter === "today") {
      const d = new Date(r.event_time);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }
    return true;
  });

  // Group by date
  const grouped: Record<string, NewsRow[]> = {};
  filtered.forEach((r) => {
    const k = new Date(r.event_time).toDateString();
    (grouped[k] ||= []).push(r);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Logo size="sm" />
        <button onClick={refresh} disabled={refreshing} className="text-muted-foreground hover:text-foreground">
          {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">📰 Forex News</h1>
          <p className="text-sm text-muted-foreground">High-impact news triggers auto alerts 30 min before release.</p>
        </div>

        <EnablePushButton />

        <div className="flex gap-2 rounded-lg border border-border p-1">
          {(["today", "high", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f === "high" ? "🔴 High Impact" : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No news. Tap refresh to fetch.
          </div>
        ) : (
          Object.entries(grouped).map(([day, items]) => (
            <div key={day} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h2>
              {items.map((n) => {
                const s = impactStyles[n.impact];
                const time = new Date(n.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={n.id} className={`rounded-lg border p-3 ${s.bg}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{time}</span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold">
                            {n.currency || n.country} · {s.label}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-medium">{n.title}</div>
                        <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                          {n.actual && <span>A: <b className="text-foreground">{n.actual}</b></span>}
                          {n.forecast && <span>F: {n.forecast}</span>}
                          {n.previous && <span>P: {n.previous}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default NewsPage;
