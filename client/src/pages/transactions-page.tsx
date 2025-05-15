import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import MobileHeader from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getCategoryIconAndColor } from "@/lib/utils";
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Calendar, 
  Search,
  ChevronDown,
  FilterX,
  Link2,
  CreditCard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Transaction = {
  id: number;
  type: string;
  date: string;
  amount: string;
  merchant: string;
  category: string;
  account: string;
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
  account: string;
};

// List of accounts (in a real app, this would come from the database)
const ACCOUNTS = [
  "Chase Checking",
  "Bank of America Savings",
  "Capital One Credit",
  "Cash"
];

export default function TransactionsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: "",
    merchant: "",
    category: "",
    account: ACCOUNTS[0],
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/transactions');
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

  // Get budget categories for the dropdown
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/budget-categories');
      return res.json();
    }
  });

  // Add new transaction
  const addMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const res = await apiRequest('POST', '/api/transactions', {
        ...data,
        amount: data.amount.toString(),
        date: new Date(data.date).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update transaction
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<TransactionFormData> }) => {
      const updates = {...data.updates};
      
      // Convert amount to string if present
      if (updates.amount) {
        updates.amount = updates.amount.toString();
      }
      
      // Convert date to ISO string if present
      if (updates.date) {
        updates.date = new Date(updates.date).toISOString();
      }
      
      const res = await apiRequest('PUT', `/api/transactions/${data.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete transaction
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/transactions/${id}`);
      return res.status === 204;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      toast({
        title: "Transaction deleted",
        description: "Your transaction has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: "",
      merchant: "",
      category: "",
      account: ACCOUNTS[0],
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.merchant || !formData.category) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    updateMutation.mutate({
      id: selectedTransaction.id,
      updates: formData
    });
  };

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // Convert ISO date to YYYY-MM-DD for the input
    const date = new Date(transaction.date).toISOString().split('T')[0];
    
    setFormData({
      type: transaction.type as 'expense' | 'income',
      date,
      amount: transaction.amount,
      merchant: transaction.merchant,
      category: transaction.category,
      account: transaction.account,
    });
    
    setIsEditDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter(null);
    setCategoryFilter(null);
    setAccountFilter(null);
  };

  // Apply filters to transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Text search (case insensitive)
    const matchesSearch = searchTerm === "" || 
      transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = typeFilter === null || transaction.type === typeFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === null || transaction.category === categoryFilter;
    
    // Account filter
    const matchesAccount = accountFilter === null || transaction.account === accountFilter;
    
    return matchesSearch && matchesType && matchesCategory && matchesAccount;
  });

  // Sort transactions by date (newest first)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Get unique categories and accounts for filter dropdowns
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category)));
  const uniqueAccounts = Array.from(new Set(transactions.map(t => t.account)));

  // Check if any filters are active
  const hasActiveFilters = typeFilter !== null || categoryFilter !== null || accountFilter !== null || searchTerm !== "";

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-20 md:pb-8">
        {/* Mobile Header */}
        <MobileHeader />
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Transactions</h1>
            <p className="text-muted-foreground">View and manage your financial transactions</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 bg-primary hover:bg-primary/90 text-white">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </DialogTrigger>
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
                  <Label htmlFor="amount">Amount</Label>
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
                    placeholder="e.g., Starbucks, Employer" 
                    value={formData.merchant}
                    onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === 'income' && (
                        <SelectItem value="Income">Income</SelectItem>
                      )}
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {/* Allow for custom categories */}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Select 
                    value={formData.account} 
                    onValueChange={(value) => setFormData({...formData, account: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.map((account) => (
                        <SelectItem key={account} value={account}>
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
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
                    ) : 'Add Transaction'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    Type <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTypeFilter('expense')}>
                    Expense
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('income')}>
                    Income
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    Category <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {uniqueCategories.map(category => (
                    <DropdownMenuItem 
                      key={category}
                      onClick={() => setCategoryFilter(category)}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    Account <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {uniqueAccounts.map(account => (
                    <DropdownMenuItem 
                      key={account}
                      onClick={() => setAccountFilter(account)}
                    >
                      {account}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  onClick={clearAllFilters}
                  className="text-destructive"
                >
                  <FilterX className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Active filters */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {typeFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {typeFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setTypeFilter(null)}
                  />
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {categoryFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setCategoryFilter(null)}
                  />
                </Badge>
              )}
              {accountFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Account: {accountFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setAccountFilter(null)}
                  />
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <Trash2 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          {isTransactionsLoading ? (
            <div className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="text-center py-8">
              {hasActiveFilters ? (
                <div>
                  <p className="text-muted-foreground mb-4">No transactions match your filters.</p>
                  <Button 
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="px-6 max-w-md mx-auto">
                  <div className="text-6xl mb-4 opacity-50 flex justify-center">
                    <CreditCard />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No transactions available</h3>
                  <p className="text-muted-foreground mb-6">
                    No transactions available. Link a bank account or add transactions manually.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add manually
                    </Button>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={() => {
                        toast({
                          title: "Coming soon",
                          description: "Bank linking functionality will be available soon.",
                        });
                      }}
                    >
                      <Link2 className="mr-2 h-4 w-4" /> Link bank account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Description</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Account</th>
                    <th className="text-right p-4 font-medium">Amount</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
                    const { icon, color } = getCategoryIconAndColor(transaction.category);
                    const isExpense = transaction.type === 'expense';
                    
                    return (
                      <tr key={transaction.id} className="border-b hover:bg-muted/20">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(new Date(transaction.date))}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{transaction.merchant}</td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${color.split(' ')[0]}`}>
                              <i className={`${icon} text-sm`}></i>
                            </div>
                            <span>{transaction.category}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{transaction.account}</td>
                        <td className={`p-4 align-middle text-right font-medium ${isExpense ? 'text-destructive' : 'text-[#00C2A8]'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount))}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(transaction)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the transaction from {transaction.merchant} for {formatCurrency(parseFloat(transaction.amount))}.
                                    This action cannot be undone.
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
      </main>

      {/* Edit Dialog */}
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
              <Label htmlFor="edit-amount">Amount</Label>
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
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({...formData, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === 'income' && (
                    <SelectItem value="Income">Income</SelectItem>
                  )}
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-account">Account</Label>
              <Select 
                value={formData.account} 
                onValueChange={(value) => setFormData({...formData, account: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((account) => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                ) : 'Update Transaction'}
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