import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState } from "react";
import TosAcceptanceModal from "@/components/legal/tos-acceptance-modal";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, isTokenExpired } = useAuth();
  const [showTosModal, setShowTosModal] = useState(false);

  // Detect OAuth token in query params to allow initial Dashboard load
  const hasAuthParam =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('auth');

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // If authentication check fails or no user, redirect to auth page
  if ((isTokenExpired || !user) && !hasAuthParam) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Critical: Check TOS acceptance before any other checks
  // Google OAuth users should have tosAcceptedAt automatically set
  const needsTosAcceptance = user && !user.tosAcceptedAt && user.authMethod !== 'google';
  
  if (needsTosAcceptance) {
    return (
      <Route path={path}>
        <div className="min-h-screen bg-gray-50">
          <TosAcceptanceModal 
            open={true} 
            onAccept={() => {
              setShowTosModal(false);
              // Force refresh user data after TOS acceptance
              window.location.reload();
            }} 
          />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Legal Compliance Required</h2>
              <p className="text-gray-600">Please accept our Terms of Service to continue.</p>
            </div>
          </div>
        </div>
      </Route>
    );
  }

  // Google/OAuth users should bypass onboarding and go directly to dashboard
  // Only redirect to onboarding for non-Google users who haven't completed it
  const isGoogleUser = user.emailVerified && user.email && !user.demographics?.completed;
  if (
    user.demographics && 
    !user.demographics.completed && 
    !user.demographics.skipPermanently &&
    !isGoogleUser && // Skip onboarding for verified users (likely Google)
    path !== "/onboarding"
  ) {
    return (
      <Route path={path}>
        <Redirect to="/onboarding" />
      </Route>
    );
  }

  // User is authenticated and compliant, render the component
  return <Route path={path} component={Component} />
}