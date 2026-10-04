import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, Medal } from "lucide-react";

type Row = { display_name: string; total_points: number; level: number; longest_streak: number; user_id: string };

const LeaderboardPage = () => {
  const { profile, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("leaderboard_view" as any)
        .select("*")
        .order("total_points", { ascending: false })
        .limit(50);
      setRows(((data as unknown) ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  if (!profile?.is_premium) {
    return <AppLayout><PremiumGate feature="Global Leaderboard" /></AppLayout>;
  }

  const myRank = rows.findIndex((r) => r.user_id === user?.id) + 1;

  return (
    <AppLayout>
      <div className="space-y-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Trophy /> Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Ranked by Discipline Points</p>
          {myRank > 0 && <p className="text-xs mt-1">Your rank: <strong>#{myRank}</strong></p>}
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : (
          <div className="space-y-2">
            {rows.map((r, i) => {
              const isMe = r.user_id === user?.id;
              return (
                <Card key={r.user_id} className={isMe ? "border-primary border-2" : ""}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                        i === 0 ? "bg-yellow-500 text-white" :
                        i === 1 ? "bg-gray-400 text-white" :
                        i === 2 ? "bg-orange-600 text-white" : "bg-muted"
                      }`}>
                        {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{r.display_name}{isMe && " (You)"}</div>
                        <div className="text-xs text-muted-foreground">Lvl {r.level} • Streak {r.longest_streak}</div>
                      </div>
                    </div>
                    <div className="text-lg font-black">{r.total_points}</div>
                  </CardContent>
                </Card>
              );
            })}
            {rows.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No traders ranked yet.</CardContent></Card>}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LeaderboardPage;
