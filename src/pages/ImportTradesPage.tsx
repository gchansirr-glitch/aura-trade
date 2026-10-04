import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type ParsedTrade = {
  pair: string;
  direction: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number | null;
  pnl: number | null;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  notes: string;
  opened_at?: string;
};

// Flexible CSV parser — handles comma / semicolon / tab and quoted fields
function parseCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") {/* skip */}
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v.trim().length));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/[\s,]/g, "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function mapRows(rows: string[][]): ParsedTrade[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(norm);
  const idx = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));

  const iSymbol = idx(["symbol", "pair", "instrument"]);
  const iType = idx(["type", "side", "direction", "action"]);
  const iVolume = idx(["volume", "lots", "size", "qty"]);
  const iEntry = idx(["openprice", "entryprice", "price", "open"]);
  const iSL = idx(["sl", "stoploss"]);
  const iTP = idx(["tp", "takeprofit"]);
  const iProfit = idx(["profit", "pnl", "netpl", "pl"]);
  const iOpenTime = idx(["opentime", "openeddate", "time"]);

  if (iSymbol === -1 || iType === -1) return [];

  const out: ParsedTrade[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const symbol = (row[iSymbol] ?? "").trim();
    const typeRaw = (row[iType] ?? "").trim().toLowerCase();
    if (!symbol || !typeRaw) continue;
    const dir = typeRaw.includes("sell") || typeRaw.includes("short") ? "SHORT" : "LONG";
    const pnl = iProfit >= 0 ? num(row[iProfit]) : null;
    const outcome: ParsedTrade["outcome"] =
      pnl == null ? "BREAKEVEN" : pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BREAKEVEN";
    out.push({
      pair: symbol.toUpperCase(),
      direction: dir,
      entry_price: iEntry >= 0 ? num(row[iEntry]) : null,
      stop_loss: iSL >= 0 ? num(row[iSL]) : null,
      take_profit: iTP >= 0 ? num(row[iTP]) : null,
      lot_size: iVolume >= 0 ? num(row[iVolume]) : null,
      pnl,
      outcome,
      notes: `Imported from MT4/MT5 history${iOpenTime >= 0 && row[iOpenTime] ? ` • ${row[iOpenTime]}` : ""}`,
      opened_at: iOpenTime >= 0 ? row[iOpenTime] : undefined,
    });
  }
  return out;
}

const ImportTradesPage = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<ParsedTrade[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setImported(0);
    try {
      const text = await f.text();
      const rows = parseCSV(text);
      const parsed = mapRows(rows);
      if (!parsed.length) {
        toast.error("No valid trades found. Check that your CSV has Symbol & Type columns.");
        setTrades([]);
        return;
      }
      setTrades(parsed);
      toast.success(`Parsed ${parsed.length} trades`);
    } catch (err: any) {
      toast.error(err.message || "Failed to read file");
    }
  };

  const importAll = async () => {
    if (!user || !trades.length) return;
    setImporting(true);
    const payload = trades.map((t) => ({
      user_id: user.id,
      pair: t.pair,
      direction: t.direction,
      notes: t.notes,
      entry_price: t.entry_price,
      stop_loss: t.stop_loss,
      take_profit: t.take_profit,
      lot_size: t.lot_size,
      pnl: t.pnl,
      outcome: t.outcome,
    }));
    const { error, count } = await supabase
      .from("journal_entries")
      .insert(payload, { count: "exact" });
    setImporting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setImported(count ?? trades.length);
    toast.success(`Imported ${count ?? trades.length} trades into journal`);
    setTrades([]);
  };

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = trades.filter((t) => t.outcome === "WIN").length;

  return (
    <AppLayout>
      <div className="space-y-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-black">Import MT4 / MT5 Trades</h1>
          <p className="text-sm text-muted-foreground">
            Upload your funded account history as a CSV file.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> How to export
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>MT5:</strong> Toolbox → History → right-click → Report → "Save as CSV".</p>
            <p><strong>MT4:</strong> Account History tab → right-click → "Save as Detailed Report" (HTM), then open in Excel and save as CSV.</p>
            <p>The parser auto-detects Symbol, Type, Volume, Open Price, S/L, T/P, and Profit columns.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label>CSV file</Label>
            <Input type="file" accept=".csv,text/csv" onChange={handleFile} />
            {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
          </CardContent>
        </Card>

        {trades.length > 0 && (
          <>
            <Card>
              <CardContent className="pt-6 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Trades</div>
                  <div className="text-lg font-bold">{trades.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Win rate</div>
                  <div className="text-lg font-bold">
                    {trades.length ? Math.round((wins / trades.length) * 100) : 0}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Net P&L</div>
                  <div className={`text-lg font-bold ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-72 overflow-auto text-xs">
                  <table className="w-full">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left p-2">Pair</th>
                        <th className="text-left p-2">Side</th>
                        <th className="text-right p-2">Lots</th>
                        <th className="text-right p-2">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 50).map((t, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="p-2 font-mono">{t.pair}</td>
                          <td className="p-2">{t.direction}</td>
                          <td className="p-2 text-right">{t.lot_size ?? "-"}</td>
                          <td className={`p-2 text-right ${(t.pnl ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                            {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {trades.length > 50 && (
                    <p className="p-2 text-center text-muted-foreground">+ {trades.length - 50} more…</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button onClick={importAll} disabled={importing} className="w-full">
              {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</> :
                <><Upload className="h-4 w-4 mr-2" /> Import {trades.length} trades to journal</>}
            </Button>
          </>
        )}

        {imported > 0 && (
          <Card className="border-success">
            <CardContent className="pt-6 flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">{imported} trades imported successfully</span>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportTradesPage;
