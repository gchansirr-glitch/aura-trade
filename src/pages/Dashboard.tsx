import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import DisciplineWidget from "@/components/DisciplineWidget";
import ToolsGrid from "@/components/ToolsGrid";
import { ChevronLeft, ChevronRight, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TradeDetailDialog, { TradeDetail } from "@/components/TradeDetailDialog";

type EntryRow = TradeDetail;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const formatK = (n: number) => {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const v = n / 1000;
    return `${v >= 0 ? "" : ""}${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toFixed(0);
};

const formatMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Dashboard = () => {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayTrades, setDayTrades] = useState<{ title: string; trades: TradeDetail[] } | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*").order("created_at");
      if (!error) setEntries((data ?? []) as EntryRow[]);
      setLoading(false);
    })();
  }, []);

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Filter entries to current month
  const monthEntries = useMemo(
    () =>
      entries.filter((e) => {
        const d = new Date(e.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [entries, year, month],
  );

  // Monthly stats
  const monthStats = useMemo(() => {
    const closed = monthEntries.filter((e) => e.outcome !== "OPEN");
    const wins = closed.filter((e) => e.outcome === "WIN").length;
    const totalPnl = monthEntries.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    return {
      trades: monthEntries.length,
      wins,
      profit: totalPnl,
      percent: winRate,
    };
  }, [monthEntries]);

  // Group by day-of-month
  const dayMap = useMemo(() => {
    const map = new Map<number, { pnl: number; count: number }>();
    for (const e of monthEntries) {
      const day = new Date(e.created_at).getDate();
      const cur = map.get(day) ?? { pnl: 0, count: 0 };
      cur.pnl += e.pnl ?? 0;
      cur.count += 1;
      map.set(day, cur);
    }
    return map;
  }, [monthEntries]);

  // Build 6-week grid
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const nextMonth = new Date(year, month + 1, 1);

    const cells: { date: Date; inMonth: boolean }[] = [];
    // Leading days from prev month
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        inMonth: false,
      });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    // Trailing
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const idx = cells.length - (startOffset + daysInMonth);
      cells.push({
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), idx + 1),
        inMonth: false,
      });
    }

    // Split into weeks of 7 (6 rows total)
    const rows: { cells: typeof cells; total: number; tradeCount: number }[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      let total = 0;
      let tradeCount = 0;
      for (const c of week) {
        if (!c.inMonth) continue;
        const info = dayMap.get(c.date.getDate());
        if (info) {
          total += info.pnl;
          tradeCount += info.count;
        }
      }
      rows.push({ cells: week, total, tradeCount });
    }
    return rows;
  }, [year, month, dayMap]);

  const goPrev = () => setCursor(new Date(year, month - 1, 1));
  const goNext = () => setCursor(new Date(year, month + 1, 1));

  return (
    <AppLayout>
      <div className="space-y-4 animate-slide-up">
        <DisciplineWidget />
        <ToolsGrid />
        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold">{monthLabel}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-secondary"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Monthly stats card */}
        <div className="rounded-lg border border-border p-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trades</div>
              <div className="mt-0.5 text-sm font-bold">{monthStats.trades}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Wins</div>
              <div className="mt-0.5 text-sm font-bold">{monthStats.wins}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Profits</div>
              <div
                className={`mt-0.5 text-sm font-bold ${
                  monthStats.profit > 0
                    ? "text-success"
                    : monthStats.profit < 0
                    ? "text-destructive"
                    : ""
                }`}
              >
                {formatMoney(monthStats.profit)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Percent</div>
              <div className="mt-0.5 text-sm font-bold">{monthStats.percent.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* Calendar header */}
        <div className="grid grid-cols-8 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
          <div className="rounded-sm bg-primary py-1 text-primary-foreground">Total</div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {weeks.map((week, wi) => {
              const totalPositive = week.total > 0;
              const totalNegative = week.total < 0;
              return (
                <div key={wi} className="grid grid-cols-8 gap-1">
                  {week.cells.map((c, ci) => {
                    const day = c.date.getDate();
                    const info = c.inMonth ? dayMap.get(day) : undefined;
                    const positive = (info?.pnl ?? 0) > 0;
                    const negative = (info?.pnl ?? 0) < 0;
                    return (
                      <div
                        key={ci}
                        onClick={() => {
                          if (!info || !c.inMonth) return;
                          const trades = monthEntries.filter((e) => new Date(e.created_at).getDate() === day);
                          setDayTrades({ title: c.date.toDateString(), trades });
                        }}
                        className={`aspect-square rounded-md border p-1 text-center ${info && c.inMonth ? "cursor-pointer " : ""}${
                          !c.inMonth
                            ? "border-transparent text-muted-foreground/40"
                            : positive
                            ? "border-success/60 bg-success/5"
                            : negative
                            ? "border-destructive/60 bg-destructive/5"
                            : "border-border"
                        }`}
                      >
                        <div className="text-[10px] font-medium leading-none">{day}</div>
                        {info && c.inMonth && (
                          <>
                            <div
                              className={`mt-1 text-[10px] font-bold leading-none ${
                                positive ? "text-success" : negative ? "text-destructive" : ""
                              }`}
                            >
                              {info.pnl !== 0 ? `${info.pnl > 0 ? "" : "-"}${formatK(Math.abs(info.pnl))}` : "—"}
                            </div>
                            <div className="mt-0.5 text-[9px] leading-none text-muted-foreground">{info.count}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {/* Weekly total */}
                  <div
                    className={`aspect-square rounded-md border-2 p-1 text-center ${
                      totalPositive
                        ? "border-success bg-success/10"
                        : totalNegative
                        ? "border-destructive bg-destructive/10"
                        : "border-border"
                    }`}
                  >
                    {week.tradeCount > 0 ? (
                      <>
                        <div
                          className={`mt-2 text-xs font-bold leading-none ${
                            totalPositive ? "text-success" : totalNegative ? "text-destructive" : ""
                          }`}
                        >
                          {`${week.total > 0 ? "" : week.total < 0 ? "-" : ""}${formatK(Math.abs(week.total))}`}
                        </div>
                        <div className="mt-1 text-[10px] leading-none text-muted-foreground">{week.tradeCount}</div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TradeDetailDialog trades={dayTrades?.trades ?? null} title={dayTrades?.title} onClose={() => setDayTrades(null)} />
    </AppLayout>
  );
};

export default Dashboard;
