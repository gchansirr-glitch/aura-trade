import AppLayout from "@/components/AppLayout";
import { Link } from "react-router-dom";
import { Brain, Briefcase, Calculator, Trophy, Upload } from "lucide-react";

const tools = [
  { to: "/psychology", icon: Brain, label: "AI Psychology", desc: "Detect FOMO, revenge & bias" },
  { to: "/prop-firm", icon: Briefcase, label: "Prop Firm Tracker", desc: "Daily loss & drawdown limits" },
  { to: "/import-trades", icon: Upload, label: "Import MT4/MT5 CSV", desc: "Upload funded account history" },
  { to: "/risk-calculator", icon: Calculator, label: "Risk Calculator", desc: "Lot size & pip value" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard", desc: "Global discipline ranking" },
];

const ToolsPage = () => (
  <AppLayout>
    <div className="space-y-4 animate-slide-up">
      <h1 className="text-2xl font-bold">Tools</h1>
      <p className="text-sm text-muted-foreground">Advanced AI features for serious traders.</p>
      <div className="grid grid-cols-1 gap-3">
        {tools.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 hover:bg-secondary transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Icon className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default ToolsPage;
