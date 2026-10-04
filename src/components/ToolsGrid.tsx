import { Link } from "react-router-dom";
import { Brain, Briefcase, Calculator, Trophy, Newspaper } from "lucide-react";

const tools = [
  { to: "/news", icon: Newspaper, label: "News" },
  { to: "/psychology", icon: Brain, label: "Psychology" },
  { to: "/prop-firm", icon: Briefcase, label: "Prop Firm" },
  { to: "/risk-calculator", icon: Calculator, label: "Risk Calc" },
  { to: "/leaderboard", icon: Trophy, label: "Leaderboard" },
];

const ToolsGrid = () => (
  <div className="grid grid-cols-4 gap-2">
    {tools.map(({ to, icon: Icon, label }) => (
      <Link
        key={to}
        to={to}
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background p-3 hover:bg-secondary transition-colors"
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
        <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
      </Link>
    ))}
  </div>
);

export default ToolsGrid;
