import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, calculatePercentage, getProgressColor } from "@/lib/utils";
import { Loader2, PlusCircle, Pencil, Trash2, PieChart, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

type BudgetCategory = {
  id: number;
  name: string;
  budgetAmount: string;
  spentAmount: string;
};

type BudgetFormData = {
  name: string;
  budgetAmount: string;
  spentAmount: string;
};

export default function BudgetPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    name: "",
    budgetAmount: "",
    spentAmount: "0",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get budget categories
  const { data: categories = [], isLoading } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/budget-categories');
      return res.json();
    }
  });
  
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

  // Add new budget category
  const addMutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const res = await apiRequest('POST', '/api/budget-categories', {
        name: data.name,
        budgetAmount: parseFloat(data.budgetAmount),
        spentAmount: 0  // Explicitly set spent amount to 0 for new categories
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate budget categories and Rivu score
      queryClient.invalidateQueries({ queryKey: ['/api/budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      setIsAddDialogOpen(false);
      setFormData({ name: "", budgetAmount: "", spentAmount: "0" });
      toast({
        title: "Budget category added",
        description: "Your budget category has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add category",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update budget category
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<BudgetFormData> }) => {
      const res = await apiRequest('PUT', `/api/budget-categories/${data.id}`, {
        name: data.updates.name,
        budgetAmount: data.updates.budgetAmount ? parseFloat(data.updates.budgetAmount) : undefined,
        spentAmount: data.updates.spentAmount ? parseFloat(data.updates.spentAmount) : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate budget categories and Rivu score
      queryClient.invalidateQueries({ queryKey: ['/api/budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      
      // Reset all form state after successful update
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ name: "", budgetAmount: "", spentAmount: "0" });
      
      toast({
        title: "Budget category updated",
        description: "Your budget category has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete budget category
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/budget-categories/${id}`);
      return res.status === 204;
    },
    onSuccess: () => {
      // Invalidate budget categories and Rivu score
      queryClient.invalidateQueries({ queryKey: ['/api/budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      toast({
        title: "Budget category deleted",
        description: "Your budget category has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.budgetAmount) {
      toast({
        title: "Validation error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    
    updateMutation.mutate({
      id: selectedCategory.id,
      updates: formData
    });
  };

  const openEditDialog = (category: BudgetCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      budgetAmount: category.budgetAmount,
      spentAmount: category.spentAmount,
    });
    setIsEditDialogOpen(true);
  };

  // Fetch monthly expense data to match dashboard calculation
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/dashboard/summary'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/dashboard/summary');
      return res.json();
    }
  });
  
  // Calculate budget totals
  const totalBudget = categories.reduce((sum, cat) => {
    const budgetAmount = typeof cat.budgetAmount === 'string' 
      ? parseFloat(cat.budgetAmount) 
      : (cat.budgetAmount || 0);
    
    return isNaN(budgetAmount) ? sum : sum + budgetAmount;
  }, 0);
  
  const totalSpent = categories.reduce((sum, cat) => {
    const spentAmount = typeof cat.spentAmount === 'string' 
      ? parseFloat(cat.spentAmount) 
      : (cat.spentAmount || 0);
    
    return isNaN(spentAmount) ? sum : sum + spentAmount;
  }, 0);
  
  // We should use the budget categories' own spent amounts - that's the most accurate source
  // Dashboard will now also use this same calculation for consistency
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Budget Categories</h1>
            <p className="text-gray-700 dark:text-gray-400">Manage and track your spending across categories</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Budget Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g., Groceries, Rent, Entertainment" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monthly Budget Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({...formData, budgetAmount: e.target.value})}
                  />
                </div>
{/* Removed Amount Spent field from Add Budget form */}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : 'Add Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Budget Overview Card */}
        <Card className="p-6 mb-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Monthly Budget Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>Overall Budget Used</span>
              <span className="font-medium">{overallProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor(overallProgress)}`} 
                style={{ width: `${Math.min(100, overallProgress)}%` }}
              ></div>
            </div>
          </div>
        </Card>

        {/* Budget Categories */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Your Budget Categories</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                <Skeleton className="h-6 w-24 mb-2 bg-gray-100 dark:bg-gray-700" />
                <Skeleton className="h-8 w-32 mb-4 bg-gray-100 dark:bg-gray-700" />
                <Skeleton className="h-4 w-full mb-2 bg-gray-100 dark:bg-gray-700" />
                <Skeleton className="h-2 w-full mb-4 bg-gray-100 dark:bg-gray-700" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-20 bg-gray-100 dark:bg-gray-700" />
                  <Skeleton className="h-8 w-20 bg-gray-100 dark:bg-gray-700" />
                </div>
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 px-6 max-w-md mx-auto">
            <div className="text-6xl mb-4 text-gray-400 dark:text-gray-600 flex justify-center">
              <PieChart />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">No budgets created</h3>
            <p className="text-gray-700 dark:text-gray-400 mb-6">
              No budgets created. Start by adding a category to track your spending.
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Create your first category
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const spent = parseFloat(category.spentAmount);
              const budget = parseFloat(category.budgetAmount);
              const percentage = calculatePercentage(spent, budget);
              
              return (
                <Card key={category.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate mr-2">{category.name}</h3>
                    <div className="flex space-x-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100" 
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
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
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {formatCurrency(spent)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">of {formatCurrency(budget)}</span>
                      </p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Update Spent
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Amount Spent</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const newSpent = formData.get('spentAmount') as string;
                            
                            if (newSpent && !isNaN(parseFloat(newSpent))) {
                              updateMutation.mutate({
                                id: category.id,
                                updates: {
                                  name: category.name,
                                  budgetAmount: category.budgetAmount,
                                  spentAmount: newSpent
                                }
                              });
                            }
                          }} className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor={`spent-amount-${category.id}`}>Amount Spent</Label>
                              <Input 
                                id={`spent-amount-${category.id}`}
                                name="spentAmount"
                                type="number" 
                                step="0.01"
                                placeholder="0.00" 
                                defaultValue={spent.toString()}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <DialogTrigger asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                              </DialogTrigger>
                              <Button 
                                type="submit"
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : 'Update'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span>Used</span>
                      <span className="font-medium">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(percentage)}`} 
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {budget > spent 
                        ? `${formatCurrency(budget - spent)} remaining` 
                        : `${formatCurrency(spent - budget)} over budget`}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input 
                id="edit-name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Monthly Budget Amount</Label>
              <Input 
                id="edit-amount" 
                type="number" 
                value={formData.budgetAmount}
                onChange={(e) => setFormData({...formData, budgetAmount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-spent">Amount Spent</Label>
              <Input 
                id="edit-spent" 
                type="number" 
                value={formData.spentAmount}
                onChange={(e) => setFormData({...formData, spentAmount: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Manually set how much you've spent in this category
              </p>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : 'Update Category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}