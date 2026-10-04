import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PremiumGate = ({ feature }: { feature: string }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary p-8 text-center animate-fade-in">
      <Lock className="mb-4 h-10 w-10 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-bold">{feature}</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        This feature requires a Premium subscription.
      </p>
      <button
        onClick={() => navigate("/subscription")}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
      >
        Unlock Premium
      </button>
    </div>
  );
};

export default PremiumGate;
