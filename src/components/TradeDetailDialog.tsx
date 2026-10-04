import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signedChartUrl } from "@/lib/chartImage";

export type TradeDetail = {
  id: string;
  pair: string;
  direction: string;
  notes: string;
  sentiment: string | null;
  created_at: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  outcome: string;
  ai_review: string | null;
  chart_image_url: string | null;
  chart_analysis?: string | null;
  risk_reward: number | null;
  risk_percent: number | null;
  lot_size: number | null;
  strategy: string | null;
  tags: string[] | null;
  pnl?: number | null;
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-md border border-border p-2">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm font-bold break-words">{value ?? "—"}</div>
  </div>
);

const TradeCard = ({ t }: { t: TradeDetail }) => {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { signedChartUrl(t.chart_image_url).then(setImg); }, [t.chart_image_url]);
  return (
    <div className="space-y-3 border-b border-border pb-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">{t.pair}</span>
        <span className="rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background">{t.direction}</span>
        <span className="rounded border border-border px-2 py-0.5 text-xs font-semibold">{t.outcome}</span>
        <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Entry" value={t.entry_price} />
        <Field label="Stop Loss" value={t.stop_loss} />
        <Field label="Take Profit" value={t.take_profit} />
        <Field label="R:R" value={t.risk_reward != null ? `1:${t.risk_reward}` : null} />
        <Field label="Risk %" value={t.risk_percent != null ? `${t.risk_percent}%` : null} />
        <Field label="Lot Size" value={t.lot_size} />
        <Field label="P&L" value={t.pnl} />
        <Field label="Mood" value={t.sentiment} />
        <Field label="Strategy" value={t.strategy} />
      </div>
      {t.tags && t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.tags.map((x) => <span key={x} className="rounded bg-secondary px-2 py-0.5 text-xs">#{x}</span>)}
        </div>
      )}
      {img && <img src={img} alt="Trade chart" className="w-full rounded border border-border object-contain" />}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes / Psychology</div>
        <p className="whitespace-pre-wrap text-sm">{t.notes}</p>
      </div>
      {t.chart_analysis && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chart Analysis</div>
          <p className="whitespace-pre-wrap text-sm">{t.chart_analysis}</p>
        </div>
      )}
      {t.ai_review && (
        <div className="rounded-md border border-border p-3 text-sm [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Review</div>
          <ReactMarkdown>{t.ai_review}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

const TradeDetailDialog = ({ trades, title, onClose }: { trades: TradeDetail[] | null; title?: string; onClose: () => void }) => (
  <Dialog open={!!trades} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
      <DialogHeader><DialogTitle>{title ?? "Trade Details"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        {trades?.length ? trades.map((t) => <TradeCard key={t.id} t={t} />) : <p className="text-sm text-muted-foreground">No trades.</p>}
      </div>
    </DialogContent>
  </Dialog>
);

export default TradeDetailDialog;
