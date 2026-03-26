import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { useAuth, AuthProvider } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Categories from "@/pages/categories";
import Analytics from "@/pages/analytics";
import Assets from "@/pages/assets";
import Import from "@/pages/import";
import ReceiptScan from "@/pages/receipt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/categories" component={Categories} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/assets" component={Assets} />
      <Route path="/receipt" component={ReceiptScan} />
      <Route path="/import" component={Import} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { isLoading, isAuthenticated, login, register } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AuthGate />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
