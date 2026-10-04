import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Target, TrendingDown, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type PFA = {
  id: string;
  firm_name: string;
  account_size: number;
  starting_balance: number;
  current_balance: number;
  profit_target: number;
  daily_drawdown_limit: number;
  max_drawdown_limit: number;
  start_date: string;
  status: string;
};

const PropFirmPage = () => {
  const { profile, user } = useAuth();
  const [accounts, setAccounts] = useState<PFA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firm_name: "FTMO",
    account_size: "100000",
    profit_target_pct: "10",
    daily_dd_pct: "5",
    max_dd_pct: "10",
  });

  const load = async () => {
    const { data } = await supabase.from("prop_firm_accounts").select("*").order("created_at", { ascending: false });
    setAccounts((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createAccount = async () => {
    if (!user) return;
    const size = parseFloat(form.account_size);
    const { error } = await supabase.from("prop_firm_accounts").insert({
      user_id: user.id,
      firm_name: form.firm_name,
      account_size: size,
      starting_balance: size,
      current_balance: size,
      profit_target: size * (parseFloat(form.profit_target_pct) / 100),
      daily_drawdown_limit: size * (parseFloat(form.daily_dd_pct) / 100),
      max_drawdown_limit: size * (parseFloat(form.max_dd_pct) / 100),
    });
    if (error) toast.error(error.message);
    else { toast.success("Account created"); setShowForm(false); load(); }
  };

  const updateBalance = async (id: string, newBal: number) => {
    await supabase.from("prop_firm_accounts").update({ current_balance: newBal }).eq("id", id);
    load();
  };

  if (!profile?.is_premium) {
    return <AppLayout><PremiumGate feature="Prop Firm Tracker" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Prop Firm</h1>
            <p className="text-sm text-muted-foreground">Track challenge objectives</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /></Button>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/import-trades"><Upload className="h-4 w-4 mr-2" /> Import MT4 / MT5 history (CSV)</Link>
        </Button>

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-lg">New Challenge</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Firm Name</Label><Input value={form.firm_name} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} /></div>
              <div><Label>Account Size ($)</Label><Input type="number" value={form.account_size} onChange={(e) => setForm({ ...form, account_size: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Target %</Label><Input type="number" value={form.profit_target_pct} onChange={(e) => setForm({ ...form, profit_target_pct: e.target.value })} /></div>
                <div><Label className="text-xs">Daily DD %</Label><Input type="number" value={form.daily_dd_pct} onChange={(e) => setForm({ ...form, daily_dd_pct: e.target.value })} /></div>
                <div><Label className="text-xs">Max DD %</Label><Input type="number" value={form.max_dd_pct} onChange={(e) => setForm({ ...form, max_dd_pct: e.target.value })} /></div>
              </div>
              <Button onClick={createAccount} className="w-full">Create</Button>
            </CardContent>
          </Card>
        )}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> :
          accounts.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No prop firm accounts yet.</CardContent></Card> :
          accounts.map((a) => {
            const pnl = a.current_balance - a.starting_balance;
            const profitPct = (pnl / a.profit_target) * 100;
            const drawdown = Math.max(0, a.starting_balance - a.current_balance);
            const ddPct = (drawdown / a.max_drawdown_limit) * 100;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{a.firm_name} — ${a.account_size.toLocaleString()}</CardTitle>
                    <span className={`text-sm font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Profit Target</span>
                      <span>${pnl.toFixed(0)} / ${a.profit_target.toFixed(0)}</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, profitPct))} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Max Drawdown</span>
                      <span>${drawdown.toFixed(0)} / ${a.max_drawdown_limit.toFixed(0)}</span>
                    </div>
                    <Progress value={Math.min(100, ddPct)} className={ddPct > 80 ? "bg-destructive/20" : ""} />
                    {ddPct > 80 && <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> Danger zone</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Update balance:</Label>
                    <Input
                      type="number"
                      defaultValue={a.current_balance}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (v && v !== a.current_balance) updateBalance(a.id, v);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>
    </AppLayout>
  );
};

export default PropFirmPage;
