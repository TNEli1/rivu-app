import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, Pencil, Trash2, Search, XCircle, FolderX, FilterX
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

type Transaction = {
  id: number;
  type: string;
  date: string;
  amount: string;
  merchant: string;
  category: string;
  subcategory?: string;
  account: string;
  notes?: string;
};

type BudgetCategory = {
  id: number;
  name: string;
};

type TransactionFormData = {
  type: 'expense' | 'income';
  date: string;
  amount: string;
  merchant: string;
  category: string;
  subcategory?: string;
  account: string;
  customCategory?: string;
  customAccount?: string;
  notes?: string;
};

export default function TransactionsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    merchant: '',
    category: '',
    account: '',
    notes: ''
  });
  
  // Category suggestions based on existing data
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);

  // Query for transactions
  const { 
    data: transactions = [], 
    isLoading
  } = useQuery({
    queryKey: ['/api/transactions'],
    select: (data) => data.sort((a: Transaction, b: Transaction) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
  });

  // Query for budget categories
  useQuery({
    queryKey: ['/api/budget-categories'],
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setCategories(data);
      }
    }
  });

  // Extract unique accounts from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const uniqueAccounts = [...new Set(transactions.map((t: Transaction) => t.account))];
      setAccounts(uniqueAccounts);
    }
  }, [transactions]);

  // Mutations
  const queryClient = useQueryClient();
  
  const addMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return apiRequest('/api/transactions', {
        method: 'POST',
        data: {
          type: data.type,
          date: data.date,
          amount: parseFloat(data.amount), 
          merchant: data.merchant,
          category: data.customCategory || data.category,
          subcategory: data.subcategory,
          account: data.customAccount || data.account,
          notes: data.notes || '',
          source: 'manual'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsAddDialogOpen(false);
      resetForm();
      
      toast({
        title: "Transaction added",
        description: "Transaction has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number, data: Partial<TransactionFormData> }) => {
      return apiRequest(`/api/transactions/${data.id}`, {
        method: 'PUT',
        data: {
          type: data.data.type,
          date: data.data.date,
          amount: data.data.amount ? parseFloat(data.data.amount.toString()) : undefined, 
          merchant: data.data.merchant,
          category: data.data.customCategory || data.data.category,
          subcategory: data.data.subcategory,
          account: data.data.customAccount || data.data.account,
          notes: data.data.notes
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsEditDialogOpen(false);
      
      toast({
        title: "Transaction updated",
        description: "Transaction has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTransaction) {
      updateMutation.mutate({
        id: selectedTransaction.id,
        data: formData
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      merchant: '',
      category: '',
      account: '',
      notes: ''
    });
  };

  // Handle opening the edit dialog for a transaction
  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type as 'expense' | 'income',
      date: new Date(transaction.date).toISOString().split('T')[0],
      amount: Math.abs(parseFloat(transaction.amount.toString())).toString(),
      merchant: transaction.merchant,
      category: transaction.category,
      subcategory: transaction.subcategory,
      account: transaction.account,
      notes: transaction.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction: Transaction) => {
      // Search term filter - check multiple fields
      const searchMatch = !searchTerm || 
        transaction.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const typeMatch = !typeFilter || transaction.type.toLowerCase() === typeFilter.toLowerCase();
      
      // Category filter
      const categoryMatch = !categoryFilter || transaction.category === categoryFilter;
      
      // Account filter
      const accountMatch = !accountFilter || transaction.account === accountFilter;
      
      return searchMatch && typeMatch && categoryMatch && accountMatch;
    });
  }, [transactions, searchTerm, typeFilter, categoryFilter, accountFilter]);

  // Get unique categories and accounts for filters
  const uniqueCategories = useMemo(() => {
    return [...new Set(transactions.map((t: Transaction) => t.category))].filter(Boolean);
  }, [transactions]);

  const uniqueAccounts = useMemo(() => {
    return [...new Set(transactions.map((t: Transaction) => t.account))].filter(Boolean);
  }, [transactions]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter(null);
    setCategoryFilter(null);
    setAccountFilter(null);
  };

  const hasActiveFilters = typeFilter !== null || categoryFilter !== null || accountFilter !== null || searchTerm !== "";

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Transactions</h1>
            <p className="text-muted-foreground">View and manage your financial transactions</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            <Button 
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8" 
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              <Select value={typeFilter || ""} onValueChange={(value) => setTypeFilter(value || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter || ""} onValueChange={(value) => setCategoryFilter(value || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={accountFilter || ""} onValueChange={(value) => setAccountFilter(value || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Accounts</SelectItem>
                  {uniqueAccounts.map((account) => (
                    <SelectItem key={account} value={account}>{account}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
        
        {/* Transactions List */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <FolderX className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-2" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search terms" 
                  : "Start by adding your first transaction"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
              ) : (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4">Account</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction: Transaction) => {
                    const isExpense = transaction.type === 'expense';
                    const amount = parseFloat(transaction.amount.toString());
                    
                    return (
                      <tr key={transaction.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="p-4 whitespace-nowrap">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 max-w-[200px] truncate" title={transaction.merchant}>
                          {transaction.merchant}
                        </td>
                        <td className="p-4 max-w-[150px] truncate" title={transaction.category}>
                          {transaction.category}
                        </td>
                        <td className="p-4 max-w-[150px] truncate" title={transaction.account}>
                          {transaction.account}
                        </td>
                        <td className={`p-4 whitespace-nowrap text-right font-medium ${isExpense ? 'text-destructive' : 'text-green-600'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(Math.abs(amount))}
                        </td>
                        <td className="p-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(transaction)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this transaction? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(transaction.id)}
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Add Transaction Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value as 'expense' | 'income'})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant / Source</Label>
                <Input 
                  id="merchant" 
                  placeholder="Enter merchant or source of transaction"
                  value={formData.merchant}
                  onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <div className="space-y-2">
                  <Input 
                    id="category" 
                    placeholder="Enter category (e.g., Groceries, Utilities)" 
                    value={formData.category}
                    onChange={(e) => setFormData({
                      ...formData, 
                      category: e.target.value
                    })}
                    autoComplete="off"
                  />
                  {categories.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Suggestions: {categories.slice(0, 3).map(cat => cat.name).join(', ')}
                      {categories.length > 3 && ', and more'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <div className="space-y-2">
                  <Input 
                    id="account" 
                    placeholder="Enter account (e.g., Checking, Credit Card)" 
                    value={formData.account}
                    onChange={(e) => setFormData({
                      ...formData, 
                      account: e.target.value
                    })}
                    autoComplete="off"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Common accounts: Checking, Savings, Credit Card, Cash
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add additional details"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!formData.amount || !formData.merchant || !formData.category || !formData.account || addMutation.isPending}
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : 'Add Transaction'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Transaction Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value as 'expense' | 'income'})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input 
                    id="edit-date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount ($)</Label>
                <Input 
                  id="edit-amount" 
                  type="number" 
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-merchant">Merchant / Source</Label>
                <Input 
                  id="edit-merchant" 
                  value={formData.merchant}
                  onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <div className="space-y-2">
                  <Input 
                    id="edit-category" 
                    placeholder="Enter category (e.g., Groceries, Utilities)" 
                    value={formData.category}
                    onChange={(e) => setFormData({
                      ...formData, 
                      category: e.target.value
                    })}
                    autoComplete="off"
                  />
                  {categories.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Suggestions: {categories.slice(0, 3).map(cat => cat.name).join(', ')}
                      {categories.length > 3 && ', and more'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-account">Account</Label>
                <div className="space-y-2">
                  <Input 
                    id="edit-account" 
                    placeholder="Enter account (e.g., Checking, Credit Card)" 
                    value={formData.account}
                    onChange={(e) => setFormData({
                      ...formData, 
                      account: e.target.value
                    })}
                    autoComplete="off"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Common accounts: Checking, Savings, Credit Card, Cash
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea 
                  id="edit-notes" 
                  placeholder="Add additional details"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!formData.amount || !formData.merchant || !formData.category || !formData.account || updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : 'Update Transaction'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}