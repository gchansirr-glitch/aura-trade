import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Pip value per 1 standard lot in USD (approximations for USD-quote accounts)
const PAIR_PIP_VALUE: Record<string, { label: string; pipValue: number }> = {
  major: { label: "Major (EURUSD, GBPUSD, etc.)", pipValue: 10 },
  jpy: { label: "JPY pairs (USDJPY, etc.)", pipValue: 9.1 },
  xau: { label: "XAUUSD (Gold)", pipValue: 10 },
  xag: { label: "XAGUSD (Silver)", pipValue: 50 },
  indices: { label: "Indices (US30, NAS100)", pipValue: 1 },
  btc: { label: "BTCUSD", pipValue: 1 },
};

const RiskCalculator = () => {
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [stopPips, setStopPips] = useState("20");
  const [pairType, setPairType] = useState("major");

  const result = useMemo(() => {
    const b = parseFloat(balance) || 0;
    const r = parseFloat(riskPct) || 0;
    const sl = parseFloat(stopPips) || 0;
    const pipVal = PAIR_PIP_VALUE[pairType].pipValue;
    if (b <= 0 || r <= 0 || sl <= 0) return null;
    const riskAmount = (b * r) / 100;
    const lotSize = riskAmount / (sl * pipVal);
    return {
      riskAmount,
      lotSize,
      pipValue: pipVal,
      microLots: Math.round(lotSize * 100) / 100,
    };
  }, [balance, riskPct, stopPips, pairType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Smart Risk Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Account Balance ($)</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div>
            <Label>Risk %</Label>
            <Input type="number" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </div>
          <div>
            <Label>Stop Loss (pips)</Label>
            <Input type="number" value={stopPips} onChange={(e) => setStopPips(e.target.value)} />
          </div>
          <div>
            <Label>Instrument</Label>
            <Select value={pairType} onValueChange={setPairType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAIR_PIP_VALUE).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {result && (
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Amount</span>
              <span className="font-bold">${result.riskAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pip Value (per lot)</span>
              <span className="font-bold">${result.pipValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold">Recommended Lot Size</span>
              <span className="text-2xl font-black">{result.microLots.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Approximation for USD-denominated accounts. Verify with your broker before trading.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskCalculator;
