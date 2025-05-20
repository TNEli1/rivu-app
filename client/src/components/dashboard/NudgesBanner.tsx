import React, { useState } from "react";
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

  // Fetch active nudges
  const { data: nudges = [], isLoading } = useQuery<Nudge[]>({
    queryKey: ['/api/nudges'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/nudges?status=active');
      return res.json();
    }
  });

  // Dismiss nudge mutation
  const dismissNudge = useMutation({
    mutationFn: async (nudgeId: number) => {
      const res = await apiRequest('PUT', `/api/nudges/${nudgeId}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nudges'] });
    }
  });

  // Complete nudge mutation
  const completeNudge = useMutation({
    mutationFn: async (nudgeId: number) => {
      const res = await apiRequest('PUT', `/api/nudges/${nudgeId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nudges'] });
    }
  });

  // Helper function to get icon based on nudge type
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
      default:
        return <BellRing className="h-5 w-5 text-primary" />;
    }
  };

  // If there are no active nudges or still loading, don't show anything
  if ((nudges.length === 0 && !isLoading) || isLoading) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {nudges.map((nudge) => (
        <Card 
          key={nudge.id}
          className={`shadow-sm border-l-4 ${
            nudge.type === 'budget_warning' 
              ? 'border-l-amber-500' 
              : nudge.type === 'goal_reminder'
                ? 'border-l-purple-500'
                : nudge.type === 'transaction_reminder'
                  ? 'border-l-green-500'
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
                    {nudge.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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