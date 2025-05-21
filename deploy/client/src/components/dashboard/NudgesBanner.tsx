import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, CheckCircle, BellRing, ArrowRight, AlertCircle, 
  TrendingUp, BarChart3, DollarSign, Calendar, 
  ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/use-theme";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

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
  // Additional fields for enhanced nudges
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  actionPath?: string; // URL to redirect user for action
  actionText?: string; // Button text for action
  details?: {
    // Detailed information based on nudge type
    [key: string]: any;
    title?: string; 
    description?: string;
    currentValue?: number;
    targetValue?: number;
    percentComplete?: number;
    impact?: string; // Impact on financial health if addressed
    suggestionText?: string; // AI-generated suggestion text
  };
};

// Component to display nudges as a banner or card on the dashboard
export default function NudgesBanner() {
  const { theme } = useTheme();
  const [expandedNudgeId, setExpandedNudgeId] = useState<number | null>(null);
  
  // Track which nudges have been handled locally
  const [handledNudgeIds, setHandledNudgeIds] = useState<number[]>([]);
  
  // No more sample nudges - we'll use only real data from the API

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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

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
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      case 'activity_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'saving_opportunity':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <BellRing className="h-5 w-5 text-primary" />;
    }
  };
  
  // Get priority badge
  const getPriorityBadge = (priority?: 'low' | 'medium' | 'high') => {
    if (!priority) return null;
    
    const badgeColors = {
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    };
    
    return (
      <Badge variant="outline" className={`capitalize text-xs ${badgeColors[priority]}`}>
        {priority} priority
      </Badge>
    );
  };

  // Use only filtered API nudges (max 3)
  const activeNudges = filteredApiNudges.slice(0, 3);

  // If there are no active nudges or still loading, don't show anything
  if (activeNudges.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {activeNudges.map((nudge) => (
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
                      : nudge.type === 'saving_opportunity'
                        ? 'border-l-green-500'
                        : 'border-l-blue-500'
          } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} transition-all duration-200 ease-in-out`}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 flex-shrink-0">
                  {getNudgeIcon(nudge.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                      {nudge.details?.title || nudge.type.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                    {getPriorityBadge(nudge.priority)}
                  </div>
                  
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {nudge.message}
                  </p>
                  
                  {/* If it's a budget or goal nudge with current and target values */}
                  {expandedNudgeId === nudge.id && nudge.details && (nudge.type === 'budget_warning' || nudge.type === 'goal_reminder') && 
                    typeof nudge.details.currentValue === 'number' && 
                    typeof nudge.details.targetValue === 'number' && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatCurrency(nudge.details.currentValue)}
                        </span>
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatCurrency(nudge.details.targetValue)}
                        </span>
                      </div>
                      <Progress 
                        value={nudge.details.percentComplete || (nudge.details.currentValue / nudge.details.targetValue * 100)} 
                        className={`h-2 ${
                          nudge.type === 'budget_warning' ? 'bg-amber-100 dark:bg-amber-950' : 'bg-purple-100 dark:bg-purple-950'
                        }`}
                      />
                    </div>
                  )}
                  
                  {/* Additional content when expanded */}
                  {expandedNudgeId === nudge.id && (
                    <div className={`mt-3 space-y-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {nudge.details?.description && (
                        <p className="text-sm">{nudge.details.description}</p>
                      )}
                      
                      {nudge.details?.impact && (
                        <div className="flex items-start gap-1 text-xs">
                          <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-green-600 dark:text-green-400">{nudge.details.impact}</p>
                        </div>
                      )}
                      
                      {nudge.details?.suggestionText && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md text-xs mt-2">
                          <p className="font-medium mb-1">AI Suggestion:</p>
                          <p>{nudge.details.suggestionText}</p>
                        </div>
                      )}
                      
                      <div className="text-xs flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {new Date(nudge.createdAt).toLocaleDateString()}</span>
                        {nudge.dueDate && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(nudge.dueDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap gap-2">
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
                    
                    {nudge.actionPath && nudge.actionText && (
                      <Link to={nudge.actionPath}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          {nudge.actionText}
                        </Button>
                      </Link>
                    )}
                    
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setExpandedNudgeId(expandedNudgeId === nudge.id ? null : nudge.id)}
                      className="text-xs"
                    >
                      {expandedNudgeId === nudge.id ? (
                        <>Less <ChevronUp className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>More <ChevronDown className="h-3 w-3 ml-1" /></>
                      )}
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