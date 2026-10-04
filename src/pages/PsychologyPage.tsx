import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Bias = { name: string; severity: "low" | "medium" | "high"; evidence: string };
type Audit = {
  id: string;
  summary: string;
  biases: Bias[];
  score: number;
  trade_count_at_audit: number;
  created_at: string;
};

const severityColor = (s: string) =>
  s === "high" ? "bg-destructive text-destructive-foreground" :
  s === "medium" ? "bg-orange-500 text-white" :
  "bg-muted text-foreground";

const PsychologyPage = () => {
  const { profile } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("psych_audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setAudits((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("psychological-audit");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Audit complete — Score ${data.score}/100`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  if (!profile?.is_premium) {
    return <AppLayout><PremiumGate feature="AI Psychological Audit" /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><Brain /> Psychology</h1>
            <p className="text-sm text-muted-foreground">AI mental state audit</p>
          </div>
          <Button onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run Audit"}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : audits.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No audits yet. Log 3+ trades and run your first audit.</CardContent></Card>
        ) : (
          audits.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mental Score: {a.score}/100</CardTitle>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-line">{a.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {(a.biases ?? []).map((b, i) => (
                    <Badge key={i} className={severityColor(b.severity)}>
                      {b.name === "Discipline" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {b.name} ({b.severity})
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1">
                  {(a.biases ?? []).map((b, i) => (
                    <p key={i} className="text-xs text-muted-foreground"><strong>{b.name}:</strong> {b.evidence}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default PsychologyPage;
