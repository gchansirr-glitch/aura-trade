import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Flame } from "lucide-react";

const DisciplineWidget = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ total_points: number; level: number; current_streak: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("discipline_scores")
        .select("total_points,level,current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      setStats((data as any) ?? { total_points: 0, level: 1, current_streak: 0 });
    })();
  }, [user]);

  if (!stats) return null;

  return (
    <div className="rounded-lg border-2 border-primary bg-primary/5 p-3 grid grid-cols-3 gap-2 text-center">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Discipline</div>
        <div className="text-lg font-black flex items-center justify-center gap-1"><Trophy className="h-4 w-4" />{stats.total_points}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Level</div>
        <div className="text-lg font-black">{stats.level}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div>
        <div className="text-lg font-black flex items-center justify-center gap-1"><Flame className="h-4 w-4" />{stats.current_streak}</div>
      </div>
    </div>
  );
};

export default DisciplineWidget;
