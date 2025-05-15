import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, getProgressColor } from "@/lib/utils";
import { Goal, GoalFormData, GoalContributionData } from "@/types/goal";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Target, Trash2, PiggyBank, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function GoalsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  
  // Helper function to get the goal ID
  const getGoalId = (goal: Goal): string | number => {
    return goal._id || goal.id || 0;
  };
  
  const [formData, setFormData] = useState<GoalFormData>({
    name: "",
    targetAmount: "",
    targetDate: undefined
  });
  
  const [contributionData, setContributionData] = useState<GoalContributionData>({
    amountToAdd: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get goals
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/goals');
      return res.json();
    }
  });
  
  // Calculate summary stats
  const summary = {
    activeGoals: goals.length,
    totalSaved: goals.reduce((acc, goal) => acc + goal.currentAmount, 0),
    totalTarget: goals.reduce((acc, goal) => acc + goal.targetAmount, 0),
    totalProgress: goals.length > 0 
      ? Math.round(goals.reduce((acc, goal) => acc + goal.progressPercentage, 0) / goals.length) 
      : 0
  };

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const res = await apiRequest('POST', '/api/goals', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      toast({
        title: "Goal created",
        description: "Your savings goal has been created successfully!",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating goal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number, data: GoalFormData }) => {
      const res = await apiRequest('PUT', `/api/goals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      toast({
        title: "Goal updated",
        description: "Your savings goal has been updated successfully!",
      });
      setIsEditDialogOpen(false);
      setSelectedGoal(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating goal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Contribute to goal mutation
  const contributeToGoalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number, data: GoalContributionData }) => {
      const res = await apiRequest('PUT', `/api/goals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      toast({
        title: "Contribution added",
        description: "Your contribution has been added to the goal!",
      });
      setIsContributeDialogOpen(false);
      setSelectedGoal(null);
      setContributionData({ amountToAdd: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding contribution",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiRequest('DELETE', `/api/goals/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      toast({
        title: "Goal deleted",
        description: "Your savings goal has been deleted.",
      });
      setSelectedGoal(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting goal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Populate form data when editing
  useEffect(() => {
    if (selectedGoal && isEditDialogOpen) {
      setFormData({
        name: selectedGoal.name,
        targetAmount: selectedGoal.targetAmount.toString(),
        targetDate: selectedGoal.targetDate 
          ? typeof selectedGoal.targetDate === 'string' 
            ? selectedGoal.targetDate.split('T')[0] 
            : format(new Date(selectedGoal.targetDate), 'yyyy-MM-dd')
          : undefined
      });
      
      if (selectedGoal.targetDate) {
        setDate(new Date(selectedGoal.targetDate));
      }
    }
  }, [selectedGoal, isEditDialogOpen]);

  // Check URL parameters for actions
  useEffect(() => {
    // Check if we should auto-open the add dialog from URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setIsAddDialogOpen(true);
      // Clean up the URL to prevent reopening on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContributionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContributionData({ amountToAdd: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name for your goal.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.targetAmount || isNaN(parseFloat(formData.targetAmount)) || parseFloat(formData.targetAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please provide a valid target amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
  

  // Create or update
    if (isEditDialogOpen && selectedGoal) {
      updateGoalMutation.mutate({ 
        id: getGoalId(selectedGoal), 
        data: formData 
      });
    } else {
      createGoalMutation.mutate(formData);
    }
  };

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoal) return;
    
    // Validate contribution amount
    if (!contributionData.amountToAdd || 
        isNaN(parseFloat(contributionData.amountToAdd)) || 
        parseFloat(contributionData.amountToAdd) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please provide a valid contribution amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    contributeToGoalMutation.mutate({
      id: getGoalId(selectedGoal),
      data: contributionData
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      targetAmount: "",
      targetDate: undefined
    });
    setDate(undefined);
  };

  function getRecommendedContribution(goal: Goal): string {
    const remaining = goal.targetAmount - goal.currentAmount;
    
    // If goal has a target date, calculate monthly payment to reach it
    if (goal.targetDate) {
      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      
      // If target date is in the past, recommend at least 10% of remaining
      if (targetDate < now) {
        return formatCurrency(Math.max(remaining * 0.1, 10));
      }
      
      // Calculate months remaining
      const monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + 
                             (targetDate.getMonth() - now.getMonth());
      
      if (monthsRemaining <= 0) {
        return formatCurrency(remaining);
      }
      
      return formatCurrency(Math.ceil(remaining / monthsRemaining));
    }
    
    // Without target date, suggest 10% of remaining
    return formatCurrency(Math.max(remaining * 0.1, 10));
  }

  function getEstimatedCompletionDate(goal: Goal): string {
    if (goal.progressPercentage >= 100) return "Completed!";
    if (goal.progressPercentage <= 0) return "Not started";
    
    // Calculate monthly average contribution
    const monthlyContributions = goal.monthlySavings || [];
    if (monthlyContributions.length === 0) return "Calculating...";
    
    // Calculate average monthly contribution over the last 3 months or all available data
    const relevantMonths = monthlyContributions.slice(-3);
    const averageMonthlyContribution = relevantMonths.reduce((sum, month) => sum + month.amount, 0) / relevantMonths.length;
    
    if (averageMonthlyContribution <= 0) return "Insufficient data";
    
    // Calculate months needed
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsNeeded = Math.ceil(remaining / averageMonthlyContribution);
    
    // Calculate completion date
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
    
    return format(completionDate, 'MMM yyyy');
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground">
            Create and track your savings goals towards financial freedom
          </p>
        </div>
        
        <Button onClick={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Goal
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-muted-foreground">Active Goals</p>
            </div>
            <p className="text-2xl font-bold">{summary.activeGoals}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-green-500" />
              <p className="text-sm text-muted-foreground">Total Saved</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalSaved)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <p className="text-sm text-muted-foreground">Total Target</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalTarget)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center ${getProgressColor(summary.totalProgress)}`}>
                <span className="text-xs text-white font-medium">{summary.totalProgress}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
            <Progress value={summary.totalProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>
      
      {/* Empty State */}
      {!isLoading && goals.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-6 pb-8 flex flex-col items-center justify-center text-center space-y-4">
            <PiggyBank className="h-12 w-12 text-muted-foreground/60" />
            <CardTitle className="text-xl">No Savings Goals Yet</CardTitle>
            <p className="text-muted-foreground max-w-md">
              Start saving by creating your first goal. Whether it's for a vacation, 
              emergency fund, or retirement, setting specific goals helps you stay on track.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Goals List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-[220px]">
                  <div className="bg-muted h-4 w-1/2 rounded mb-4"></div>
                  <div className="bg-muted h-8 w-1/3 rounded mb-2"></div>
                  <div className="bg-muted h-2 w-full rounded mt-6 mb-2"></div>
                  <div className="flex justify-between">
                    <div className="bg-muted h-4 w-1/4 rounded"></div>
                    <div className="bg-muted h-4 w-1/4 rounded"></div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <div className="bg-muted h-8 w-10 rounded"></div>
                    <div className="bg-muted h-8 w-10 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            goals.map(goal => (
              <Card key={getGoalId(goal).toString()} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="truncate font-bold">{goal.name}</CardTitle>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-sm text-muted-foreground">
                      of {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-6 pt-0 space-y-4">
                  <div>
                    <Progress 
                      value={goal.progressPercentage > 100 ? 100 : goal.progressPercentage} 
                      className="h-2" 
                    />
                    <div className="flex justify-between mt-1">
                      <span className={`text-xs font-medium ${getProgressColor(goal.progressPercentage)}`}>
                        {Math.round(goal.progressPercentage)}%
                      </span>
                      {goal.targetDate && (
                        <span className="text-xs text-muted-foreground">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Est. completion:</span>
                    <span className="font-medium">{getEstimatedCompletionDate(goal)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsContributeDialogOpen(true);
                        setContributionData({ amountToAdd: "" });
                      }}
                    >
                      <PiggyBank className="h-4 w-4 mr-1" />
                      Contribute
                    </Button>
                    
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this goal? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => goal && deleteGoalMutation.mutate(goal._id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Add Goal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Savings Goal</DialogTitle>
            <DialogDescription>
              Set a specific target to save towards. Add a target date to help you stay on track.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Vacation, Emergency Fund, New Car, etc."
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount</Label>
              <Input
                id="targetAmount"
                name="targetAmount"
                type="number"
                min="1"
                step="0.01"
                placeholder="5000"
                value={formData.targetAmount}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate) {
                        setFormData(prev => ({
                          ...prev,
                          targetDate: format(newDate, 'yyyy-MM-dd')
                        }));
                      } else {
                        setFormData(prev => ({...prev, targetDate: undefined}));
                      }
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending && (
                  <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                )}
                Create Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your savings goal details.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Goal Name</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Vacation, Emergency Fund, New Car, etc."
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-targetAmount">Target Amount</Label>
              <Input
                id="edit-targetAmount"
                name="targetAmount"
                type="number"
                min="1"
                step="0.01"
                placeholder="5000"
                value={formData.targetAmount}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-targetDate">Target Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-targetDate"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate) {
                        setFormData(prev => ({
                          ...prev,
                          targetDate: format(newDate, 'yyyy-MM-dd')
                        }));
                      } else {
                        setFormData(prev => ({...prev, targetDate: undefined}));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedGoal(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateGoalMutation.isPending}
              >
                {updateGoalMutation.isPending && (
                  <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                )}
                Update Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Contribute to Goal Dialog */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to Goal</DialogTitle>
            <DialogDescription>
              Add money towards your savings goal: {selectedGoal?.name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amountToAdd">Contribution Amount</Label>
              <Input
                id="amountToAdd"
                name="amountToAdd"
                type="number"
                min="1"
                step="0.01"
                placeholder={selectedGoal ? getRecommendedContribution(selectedGoal) : "100"}
                value={contributionData.amountToAdd}
                onChange={handleContributionChange}
                required
              />
              {selectedGoal && (
                <p className="text-xs text-muted-foreground">
                  Suggested contribution: {getRecommendedContribution(selectedGoal)}
                </p>
              )}
            </div>
            
            {selectedGoal && (
              <div className="border rounded-md p-3 bg-muted/50">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Current balance:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedGoal.currentAmount)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Remaining target:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Progress:</span>
                  <span className={`text-sm font-medium ${getProgressColor(selectedGoal.progressPercentage)}`}>
                    {Math.round(selectedGoal.progressPercentage)}%
                  </span>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsContributeDialogOpen(false);
                  setSelectedGoal(null);
                  setContributionData({ amountToAdd: "" });
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={contributeToGoalMutation.isPending}
              >
                {contributeToGoalMutation.isPending && (
                  <span className="mr-2 h-4 w-4 animate-spin">◌</span>
                )}
                Add Contribution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}