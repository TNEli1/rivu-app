import { Switch, Route } from "wouter";
import React from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/auth-page";
import AccountPage from "@/pages/account-page";
import OnboardingPage from "@/pages/onboarding-page";
import BudgetPage from "@/pages/budget-page";
import TransactionsPage from "@/pages/transactions-page";
import InsightsPage from "@/pages/insights-page";
import SettingsPage from "@/pages/settings-page";
import GoalsPage from "@/pages/goals-page";
import RivUPage from "@/pages/rivu-page";
import ConnectPage from "@/pages/connect-page";
import PlaidCallback from "@/pages/plaid-callback";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PrivacyPage from "@/pages/privacy-page";
import TermsPage from "@/pages/terms-page";
import RivuScoreInfoPage from "@/pages/rivu-score-info-page";
import LandingPage from "@/pages/landing-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/legal/privacy" component={PrivacyPage} />
      <Route path="/legal/terms" component={TermsPage} />
      <Route path="/callback" component={PlaidCallback} />
      <Route path="/plaid-callback" component={PlaidCallback} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/budget" component={BudgetPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/goals" component={GoalsPage} />
      <ProtectedRoute path="/insights" component={InsightsPage} />
      <ProtectedRoute path="/rivu" component={RivUPage} />
      <ProtectedRoute path="/connect" component={ConnectPage} />
      <ProtectedRoute path="/account" component={AccountPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <ProtectedRoute path="/rivu-score-info" component={RivuScoreInfoPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
