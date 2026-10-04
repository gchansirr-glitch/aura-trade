import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, ImageIcon, Crown, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/journal", icon: BookOpen, label: "Journal" },
  { to: "/tools", icon: Sparkles, label: "Tools" },
  { to: "/chart-analysis", icon: ImageIcon, label: "Chart AI" },
  { to: "/subscription", icon: Crown, label: "Premium" },
];

const BottomNav = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = isAdmin
    ? [...baseNavItems, { to: "/admin", icon: Shield, label: "Admin" }]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
              <span className={active ? "font-semibold" : "font-normal"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
