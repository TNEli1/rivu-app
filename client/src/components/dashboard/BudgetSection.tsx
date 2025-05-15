import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, calculatePercentage, formatPercentage, getStatusColor, getProgressColor, getCategoryIconAndColor } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Loader2 } from "lucide-react";
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

export type BudgetCategory = {
  id: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
};

export default function BudgetSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditSpentDialogOpen, setIsEditSpentDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", budgetAmount: "" });
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [newSpentAmount, setNewSpentAmount] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  
  // Fetch budget categories
  const { data: categories = [], isLoading, refetch } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
  });

  // Create a new budget category
  const createMutation = useMutation({
    mutationFn: async (categoryData: { name: string; budgetAmount: number }) => {
      return apiRequest("POST", "/api/budget-categories", categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rivu-score"] });
      setIsAddDialogOpen(false);
      setNewCategory({ name: "", budgetAmount: "" });
      toast({
        title: "Budget category added",
        description: "Your new budget category has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add category",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update budget category
  const updateSpentMutation = useMutation({
    mutationFn: async ({ 
      id, 
      spentAmount, 
      budgetAmount 
    }: { 
      id: string, 
      spentAmount: number,
      budgetAmount?: number 
    }) => {
      const updateData: { spentAmount: number, budgetAmount?: number } = { spentAmount };
      if (budgetAmount !== undefined) {
        updateData.budgetAmount = budgetAmount;
      }
      
      const res = await apiRequest("PUT", `/api/budget-categories/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rivu-score"] });
      setIsEditSpentDialogOpen(false);
      setEditingCategory(null);
      toast({
        title: "Spent amount updated",
        description: "Your budget category has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Delete budget category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/budget-categories/${id}`);
      return res.status === 204;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rivu-score"] });
      toast({
        title: "Budget category deleted",
        description: "Your budget category has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newCategory.budgetAmount);
    
    if (newCategory.name && !isNaN(amount) && amount > 0) {
      createMutation.mutate({
        name: newCategory.name,
        budgetAmount: amount,
      });
    }
  };

  const renderBudgetCategories = () => {
    if (isLoading) {
      return (
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-muted rounded-lg mr-3"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
              <div className="h-2 bg-muted rounded-full"></div>
            </div>
          ))}
        </div>
      );
    }
    
    if (categories.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-lg font-medium text-foreground mb-2">No budget categories yet</div>
          <p className="text-muted-foreground mb-4">
            Create budget categories to track your spending and stay on top of your finances.
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <i className="ri-add-line mr-1"></i> Add Your First Category
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-5">
        {categories.map((category: BudgetCategory) => {
          const percentage = calculatePercentage(category.spentAmount, category.budgetAmount);
          const { icon, color } = getCategoryIconAndColor(category.name);
          const statusColor = getStatusColor(percentage);
          const progressColor = getProgressColor(percentage);
          
          return (
            <div key={category.id}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className={`w-8 h-8 ${color.split(' ')[0]} rounded-lg flex items-center justify-center mr-3`}>
                    <i className={`${icon} ${color.split(' ')[1]}`}></i>
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="text-right flex items-center space-x-2">
                  <div>
                    <span className="font-medium">{formatCurrency(category.spentAmount)}</span>
                    <span className="text-muted-foreground">/{formatCurrency(category.budgetAmount)}</span>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingCategory(category);
                        setNewSpentAmount(String(category.spentAmount));
                        setIsEditSpentDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{category.name}" budget category.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(category.id)}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              <div className="h-2 bg-border/40 rounded-full overflow-hidden">
                <div 
                  className={`h-2 ${progressColor} rounded-full budget-progress`} 
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${percentage > 100 ? 'text-[#FF4D4F]' : 'text-muted-foreground'}`}>
                  {percentage > 100 
                    ? `${formatPercentage(percentage - 100)} over budget` 
                    : `${formatPercentage(percentage)} used`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Monthly Budget</h2>
          <Button 
            variant="ghost" 
            className="text-primary hover:underline text-sm font-medium flex items-center"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <i className="ri-add-line mr-1"></i> Add Category
          </Button>
        </div>

        {renderBudgetCategories()}

        {/* Add Category Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Food & Dining"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget-amount">Monthly Budget</Label>
                  <Input
                    id="budget-amount"
                    placeholder="Enter amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCategory.budgetAmount}
                    onChange={(e) => setNewCategory({ ...newCategory, budgetAmount: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!newCategory.name || !newCategory.budgetAmount || createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Spent Amount Dialog */}
        <Dialog open={isEditSpentDialogOpen} onOpenChange={setIsEditSpentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Spent Amount</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const amount = parseFloat(newSpentAmount);
                if (!isNaN(amount) && amount >= 0) {
                  updateSpentMutation.mutate({
                    id: editingCategory.id,
                    spentAmount: amount
                  });
                }
              }}>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <p className="text-foreground font-medium">{editingCategory.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Monthly Budget</Label>
                    <p className="text-foreground font-medium">{formatCurrency(editingCategory.budgetAmount)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spent-amount">Amount Spent</Label>
                    <Input
                      id="spent-amount"
                      placeholder="Enter amount spent"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newSpentAmount}
                      onChange={(e) => setNewSpentAmount(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditSpentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!newSpentAmount || updateSpentMutation.isPending}
                  >
                    {updateSpentMutation.isPending ? "Updating..." : "Update Spent Amount"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
