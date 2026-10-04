import AppLayout from "@/components/AppLayout";
import RiskCalculator from "@/components/RiskCalculator";

const RiskCalculatorPage = () => (
  <AppLayout>
    <div className="space-y-4 animate-slide-up">
      <h1 className="text-2xl font-black">Risk Calculator</h1>
      <p className="text-sm text-muted-foreground">
        Calculate exact lot size from your account balance, risk %, and stop loss.
      </p>
      <RiskCalculator />
    </div>
  </AppLayout>
);

export default RiskCalculatorPage;
