import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, isTokenExpired } = useAuth();

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

  // If token expired or no user, redirect to auth page
  if (isTokenExpired || !user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If user has not completed onboarding and is trying to access a page other than onboarding
  // redirect to onboarding page, but only if they haven't chosen to skip permanently
  if (
    user.demographics && 
    !user.demographics.completed && 
    !user.demographics.skipPermanently &&
    path !== "/onboarding"
  ) {
    return (
      <Route path={path}>
        <Redirect to="/onboarding" />
      </Route>
    );
  }

  // User is authenticated, render the component
  return <Route path={path} component={Component} />
}