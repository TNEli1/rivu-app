import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, BellRing, ArrowRight, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";

// Define the Nudge type based on the schema
type Nudge = {
  id: number;
  userId: number;
  type: string;
  message: string;
  status: string;
  triggerCondition: string;
  dueDate?: string;
  createdAt: string;
  dismissedAt?: string;
  completedAt?: string;
};

// Component to display nudges as a banner or card on the dashboard
export default function NudgesBanner() {
  const { theme } = useTheme();
  const [expandedNudgeId, setExpandedNudgeId] = useState<number | null>(null);
  
  // Track which nudges have been handled locally
  const [handledNudgeIds, setHandledNudgeIds] = useState<number[]>([]);
  
  // Enhanced sample nudges that demonstrate the new behavioral nudge engine
  const [sampleNudges, setSampleNudges] = useState<Nudge[]>([
    // Budget overspending nudge
    {
      id: 10001,
      userId: 7,
      type: 'budget_warning',
      message: "You've spent 85% of your dining budget and it's only the 12th.",
      status: 'active',
      triggerCondition: '{"type":"budget_at_risk","categoryId":22,"percentUsed":85,"dayOfMonth":12}',
      createdAt: new Date().toISOString(),
    },
    // Goal progress nudge
    {
      id: 10002,
      userId: 7,
      type: 'goal_reminder',
      message: "You're $75 behind pace for your emergency fund. Want to adjust?",
      status: 'active',
      triggerCondition: '{"type":"goal_behind_pace","goalId":1,"amountBehind":75}',
      createdAt: new Date().toISOString(),
    },
    // Rivu Score drop nudge
    {
      id: 10003,
      userId: 7,
      type: 'score_alert',
      message: "Your score dropped 12 points this week. Want to review your activity?",
      status: 'active',
      triggerCondition: '{"type":"score_decrease","pointsDropped":12}',
      createdAt: new Date().toISOString(),
    },
    // Inactivity nudge
    {
      id: 10004,
      userId: 7,
      type: 'activity_reminder',
      message: "You haven't checked in this week. Let's review your budget in 2 minutes.",
      status: 'active',
      triggerCondition: '{"type":"inactivity","daysSinceLogin":7}',
      createdAt: new Date().toISOString(),
    }
  ]);

  // Fetch active nudges from API - limit to max 3 nudges to avoid overwhelming the user
  const { data: apiNudges = [], isLoading, refetch } = useQuery<Nudge[]>({
    queryKey: ['/api/nudges'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/nudges?status=active');
        const data = await res.json();
        // Only show up to 3 most recent nudges
        return Array.isArray(data) ? data.slice(0, 3) : [];
      } catch (error) {
        console.error('Error fetching nudges:', error);
        return [];
      }
    },
    // Don't auto-refetch on window focus to reduce noise
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Filter out nudges that have been handled locally
  const filteredApiNudges = apiNudges.filter(nudge => 
    !handledNudgeIds.includes(nudge.id)
  );

  // Dismiss nudge mutation
  const dismissNudge = useMutation({
    mutationFn: async (nudgeId: number) => {
      // For sample nudges, handle locally
      if (nudgeId > 10000) {
        setSampleNudges(prev => prev.filter(nudge => nudge.id !== nudgeId));
        return { message: 'Nudge dismissed successfully' };
      }
      
      // Immediately mark as handled locally
      setHandledNudgeIds(prev => [...prev, nudgeId]);
      
      try {
        // For API nudges
        const res = await apiRequest('PUT', `/api/nudges/${nudgeId}/dismiss`);
        return res.json();
      } catch (error) {
        console.error('Error dismissing nudge:', error);
        // Still considered success for UI purposes since we handled it locally
        return { message: 'Nudge dismissed locally' };
      }
    },
    onSuccess: () => {
      // No need to refetch - we're already handling locally
      // This prevents race conditions with the server
    }
  });

  // Complete nudge mutation
  const completeNudge = useMutation({
    mutationFn: async (nudgeId: number) => {
      // For sample nudges, handle locally
      if (nudgeId > 10000) {
        setSampleNudges(prev => prev.filter(nudge => nudge.id !== nudgeId));
        return { message: 'Nudge completed successfully' };
      }
      
      // Immediately mark as handled locally
      setHandledNudgeIds(prev => [...prev, nudgeId]);
      
      try {
        // For API nudges
        const res = await apiRequest('PUT', `/api/nudges/${nudgeId}/complete`);
        return res.json();
      } catch (error) {
        console.error('Error completing nudge:', error);
        // Still considered success for UI purposes since we handled it locally
        return { message: 'Nudge completed locally' };
      }
    },
    onSuccess: () => {
      // No need to refetch - we're already handling locally
      // This prevents race conditions with the server
    }
  });

  // Enhanced helper function to get icon based on nudge type
  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'onboarding':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'budget_warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'goal_reminder':
        return <ArrowRight className="h-5 w-5 text-purple-500" />;
      case 'transaction_reminder':
        return <BellRing className="h-5 w-5 text-green-500" />;
      case 'score_alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'activity_reminder':
        return <BellRing className="h-5 w-5 text-blue-500" />;
      default:
        return <BellRing className="h-5 w-5 text-primary" />;
    }
  };

  // Combine sample nudges with filtered API nudges (max 3 total)
  const combinedNudges = [...sampleNudges, ...filteredApiNudges].slice(0, 3);

  // If there are no active nudges or still loading, don't show anything
  if (combinedNudges.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {combinedNudges.map((nudge) => (
        <Card 
          key={nudge.id}
          className={`shadow-sm border-l-4 ${
            nudge.type === 'budget_warning' 
              ? 'border-l-amber-500' 
              : nudge.type === 'goal_reminder'
                ? 'border-l-purple-500'
                : nudge.type === 'transaction_reminder'
                  ? 'border-l-green-500'
                  : nudge.type === 'score_alert'
                    ? 'border-l-red-500'
                    : nudge.type === 'activity_reminder'
                      ? 'border-l-blue-500'
                      : 'border-l-blue-500'
          } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {getNudgeIcon(nudge.type)}
                </div>
                <div>
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                    {nudge.type.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </h3>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {nudge.message}
                  </p>
                  
                  {/* Additional content when expanded */}
                  {expandedNudgeId === nudge.id && (
                    <div className={`mt-3 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p>Created: {new Date(nudge.createdAt).toLocaleDateString()}</p>
                      {nudge.dueDate && <p>Due: {new Date(nudge.dueDate).toLocaleDateString()}</p>}
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => completeNudge.mutate(nudge.id)}
                      disabled={completeNudge.isPending}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      {completeNudge.isPending ? 'Marking...' : 'Mark as Done'}
                    </Button>
                    
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setExpandedNudgeId(expandedNudgeId === nudge.id ? null : nudge.id)}
                      className="text-xs"
                    >
                      {expandedNudgeId === nudge.id ? 'Less' : 'More'}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Dismiss button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => dismissNudge.mutate(nudge.id)}
                disabled={dismissNudge.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}