import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, calculatePercentage, formatPercentage, getStatusColor, getProgressColor, getCategoryIconAndColor } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type BudgetCategory = {
  id: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
};

export default function BudgetSection() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", budgetAmount: "" });

  // Fetch budget categories
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/budget-categories"],
  });

  // Create a new budget category
  const createMutation = useMutation({
    mutationFn: async (categoryData: { name: string; budgetAmount: number }) => {
      return apiRequest("POST", "/api/budget-categories", categoryData);
    },
    onSuccess: () => {
      refetch();
      setIsAddDialogOpen(false);
      setNewCategory({ name: "", budgetAmount: "" });
    },
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

        {isLoading ? (
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
        ) : (
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
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(category.spentAmount)}</span>
                      <span className="text-muted-foreground">/{formatCurrency(category.budgetAmount)}</span>
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
        )}

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
      </CardContent>
    </Card>
  );
}
