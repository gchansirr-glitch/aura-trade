import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import JournalPage from "./pages/JournalPage.tsx";
import ChartAnalysisPage from "./pages/ChartAnalysisPage.tsx";
import SubscriptionPage from "./pages/SubscriptionPage.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import PsychologyPage from "./pages/PsychologyPage.tsx";
import PropFirmPage from "./pages/PropFirmPage.tsx";
import RiskCalculatorPage from "./pages/RiskCalculatorPage.tsx";
import LeaderboardPage from "./pages/LeaderboardPage.tsx";
import ToolsPage from "./pages/ToolsPage.tsx";
import ImportTradesPage from "./pages/ImportTradesPage.tsx";
import NewsPage from "./pages/NewsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
            <Route path="/chart-analysis" element={<ProtectedRoute><ChartAnalysisPage /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
            <Route path="/psychology" element={<ProtectedRoute><PsychologyPage /></ProtectedRoute>} />
            <Route path="/prop-firm" element={<ProtectedRoute><PropFirmPage /></ProtectedRoute>} />
            <Route path="/risk-calculator" element={<ProtectedRoute><RiskCalculatorPage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            <Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
            <Route path="/import-trades" element={<ProtectedRoute><ImportTradesPage /></ProtectedRoute>} />
            <Route path="/news" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
