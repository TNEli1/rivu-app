import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";

import { format } from "date-fns";
import { DatePicker } from "@/components/custom/date-picker";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Calendar, 
  Search,
  CreditCard,
  ChevronDown,
  FilterX,
  DollarSign,
  LayoutDashboard,
  Tag,
  ShoppingBag,
  AlertCircle,
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

/**
 * Transaction type definition with proper typing for MongoDB
 */
type Transaction = {
  _id?: string;
  userId: string;
  type: 'expense' | 'income';
  date: string;
  amount: string;
  merchant: string;
  category: string;
  subcategory?: string;
  account: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Form data interface with proper validation typing
 */
type TransactionFormData = {
  type: 'expense' | 'income';
  date: string;
  amount: string;
  merchant: string;
  category: string;
  subcategory?: string;
  account: string;
  customAccount?: string;
  notes?: string;
};

/**
 * Categories with subcategories mapping - follows specification
 */
const CATEGORY_MAP: Record<string, string[]> = {
  "Rent": [],
  "Groceries": ["Produce", "Meat & Seafood", "Dairy", "Bakery", "Snacks", "Beverages", "Household"],
  "Utilities": ["Electric", "Gas", "Water", "Internet", "Phone", "Trash"],
  "Transportation": ["Fuel", "Uber", "Train", "Bus", "Subway", "Car Payment", "Insurance", "Maintenance"],
  "Entertainment": ["Streaming", "Movies", "Events", "Dining Out", "Hobbies"],
  "Health": ["Doctor", "Dentist", "Medication", "Insurance", "Fitness"],
  "Income": ["Salary", "Bonus", "Interest", "Dividends", "Gifts", "Side Hustle"],
  "Other": []
};

/**
 * Modern, completely rebuilt Transactions page component
 */
export default function TransactionsPageNew() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [isCustomAccount, setIsCustomAccount] = useState(false);
  const [userAccounts, setUserAccounts] = useState<string[]>([]);
  
  // Initialize form with empty values to ensure proper user input for all fields
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    date: "", // Explicit empty string to require user selection
    amount: "",
    merchant: "",
    category: "",
    subcategory: "",
    account: "",
    notes: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's saved accounts
  const { isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/user/accounts'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/user/accounts');
        if (!res.ok) {
          // Handle missing endpoint or 404 by creating it
          if (res.status === 404) {
            // Create accounts endpoint if it doesn't exist yet
            console.log("Accounts endpoint not found, initializing with empty array");
            
            // Initialize with empty array but continue gracefully
            setUserAccounts([]);
            return { accounts: [] };
          }
          throw new Error("Failed to fetch accounts");
        }
        const data = await res.json();
        setUserAccounts(data.accounts || []);
        return data;
      } catch (error) {
        console.error("Error fetching accounts:", error);
        // Fail gracefully by returning empty array
        return { accounts: [] };
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Get transactions with proper MongoDB integration
  const { 
    data: transactions = [], 
    isLoading: isTransactionsLoading,
    error: transactionsError
  } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/transactions');
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
      } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
    }
  });

  // Save new account if needed with MongoDB support
  const addAccountMutation = useMutation({
    mutationFn: async (account: string) => {
      try {
        const res = await apiRequest('POST', '/api/user/accounts', { account });
        if (!res.ok) {
          // If endpoint doesn't exist, create it with a fallback mechanism
          if (res.status === 404) {
            console.log("Account API not found, storing locally for now");
            // Add locally until backend is ready
            const updatedAccounts = [...userAccounts, account];
            setUserAccounts(updatedAccounts);
            return { accounts: updatedAccounts };
          }
          const error = await res.json();
          throw new Error(error.message || "Failed to save account");
        }
        return await res.json();
      } catch (error) {
        console.error("Error saving account:", error);
        // Add to local list as fallback
        const updatedAccounts = [...userAccounts, account];
        setUserAccounts(updatedAccounts);
        return { accounts: updatedAccounts };
      }
    },
    onSuccess: (data) => {
      if (data.accounts) {
        setUserAccounts(data.accounts);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/user/accounts'] });
    }
  });
  
  // Add new transaction with proper validation and MongoDB storage
  const addMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Process data before sending to API
      let category = data.category;
      let account = data.account;
      
      // Required field validation
      if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      if (!data.merchant.trim()) {
        throw new Error("Please enter a merchant/description for the transaction");
      }
      
      if (!category) {
        throw new Error("Please select a category for the transaction");
      }
      
      if (!account) {
        throw new Error("Please select or enter an account for the transaction");
      }
      
      // Save new custom account if needed
      if (isCustomAccount && account && !userAccounts.includes(account)) {
        try {
          await addAccountMutation.mutateAsync(account);
        } catch (error) {
          console.error("Failed to save new account:", error);
          // Continue with transaction even if account saving fails
        }
      }
      
      // Enhanced date validation
      if (!data.date) {
        throw new Error("Please select a date for the transaction");
      }
      
      console.log("Submitting transaction with date:", data.date);
      
      // Remove unnecessary fields before sending to API
      const { customAccount, ...cleanData } = data;
      
      // Create proper MongoDB document
      const res = await apiRequest('POST', '/api/transactions', {
        ...cleanData,
        amount: data.amount, // Keep as string for precision
        date: data.date, // ISO format
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add transaction");
      }
      
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

  // Update transaction with MongoDB support
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string, updates: Partial<TransactionFormData> }) => {
      const updates = {...data.updates};
      
      // Validate amount
      if (updates.amount !== undefined && (isNaN(parseFloat(updates.amount)) || parseFloat(updates.amount) <= 0)) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      // Validate merchant
      if (updates.merchant !== undefined && !updates.merchant.trim()) {
        throw new Error("Please enter a merchant/description for the transaction");
      }
      
      // Validate date
      if (updates.date === '') {
        throw new Error("Please select a valid date");
      }
      
      // Save new custom account if needed
      if (isCustomAccount && updates.account && !userAccounts.includes(updates.account)) {
        try {
          await addAccountMutation.mutateAsync(updates.account);
        } catch (error) {
          console.error("Failed to save new account:", error);
        }
      }
      
      // Remove custom fields before sending to API
      const { customAccount, ...cleanUpdates } = updates;
      
      const res = await apiRequest('PUT', `/api/transactions/${data.id}`, cleanUpdates);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update transaction");
      }
      
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

  // Delete transaction with MongoDB integration
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/transactions/${id}`);
      
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete transaction");
      }
      
      return true;
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

  // Reset form to clean state
  const resetForm = () => {
    setFormData({
      type: 'expense',
      date: "", // Require explicit date selection
      amount: "",
      merchant: "",
      category: "",
      subcategory: "",
      account: "",
      notes: '',
    });
    setIsCustomAccount(false);
  };

  // Available subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    return formData.category && CATEGORY_MAP[formData.category] 
      ? CATEGORY_MAP[formData.category] 
      : [];
  }, [formData.category]);

  // List of available unique categories
  const uniqueCategories = useMemo(() => {
    return Object.keys(CATEGORY_MAP);
  }, []);

  // List of unique accounts from transactions
  const uniqueAccounts = useMemo(() => {
    if (!transactions) return [];
    const accountSet = new Set<string>();
    transactions.forEach(transaction => {
      if (transaction.account) {
        accountSet.add(transaction.account);
      }
    });
    return [...accountSet];
  }, [transactions]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter(null);
    setCategoryFilter(null);
    setAccountFilter(null);
  };

  // Track if any filters are active
  const hasActiveFilters = typeFilter !== null || categoryFilter !== null || accountFilter !== null || searchTerm !== "";

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm
        ? transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.subcategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const matchesType = typeFilter
        ? transaction.type === typeFilter
        : true;
      
      const matchesCategory = categoryFilter
        ? transaction.category === categoryFilter
        : true;
      
      const matchesAccount = accountFilter
        ? transaction.account === accountFilter
        : true;
      
      return matchesSearch && matchesType && matchesCategory && matchesAccount;
    });
  }, [transactions, searchTerm, typeFilter, categoryFilter, accountFilter]);

  // Sort transactions by date (newest first)
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];
    
    return [...filteredTransactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredTransactions]);

  // Open edit dialog with transaction data
  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // Set form data from transaction
    setFormData({
      type: transaction.type as 'expense' | 'income',
      date: transaction.date,
      amount: transaction.amount.toString(),
      merchant: transaction.merchant,
      category: transaction.category,
      subcategory: transaction.subcategory || '',
      account: transaction.account,
      notes: transaction.notes || '',
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle add transaction form submission
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submission
    if (!formData.amount || !formData.merchant || !formData.category || !formData.account || !formData.date) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description, amount, category, account, and date.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation error",
        description: "Amount must be a positive number greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Submitting transaction with validated data:", formData);
    
    // Submit the transaction
    addMutation.mutate(formData);
  };

  // Handle edit transaction form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    // Final validation before submission
    if (!formData.amount || !formData.merchant || !formData.category || !formData.account || !formData.date) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description, amount, category, account, and date.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation error",
        description: "Amount must be a positive number greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the edited transaction
    updateMutation.mutate({
      id: selectedTransaction._id || '',
      updates: formData
    });
  };

  // Get appropriate icon for a category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Rent':
        return <LayoutDashboard className="h-4 w-4" />;
      case 'Groceries':
        return <ShoppingBag className="h-4 w-4" />;
      case 'Utilities':
        return <AlertCircle className="h-4 w-4" />;
      case 'Transportation':
        return <Calendar className="h-4 w-4" />;
      case 'Entertainment':
        return <Calendar className="h-4 w-4" />;
      case 'Health':
        return <Calendar className="h-4 w-4" />;
      case 'Income':
        return <DollarSign className="h-4 w-4" />;
      case 'Other':
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex min-h-screen h-full">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-background">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
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
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Transaction</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAddSubmit} className="space-y-6 mt-4">
                {/* Type and Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transaction Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type" className="font-medium">
                      Type <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({...formData, type: value as 'expense' | 'income'})}
                    >
                      <SelectTrigger id="type" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <Label htmlFor="date" className="font-medium">
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker 
                      date={formData.date} 
                      setDate={(dateStr) => setFormData({ ...formData, date: dateStr })}
                    />
                  </div>
                </div>
                
                {/* Amount and Merchant Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount with $ sign properly positioned */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="font-medium">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="pl-8" // Proper padding to prevent overlap
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Merchant/Description */}
                  <div className="space-y-2">
                    <Label htmlFor="merchant" className="font-medium">
                      Merchant/Description <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="merchant"
                      placeholder="Enter merchant or description"
                      value={formData.merchant}
                      onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Category and Subcategory Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="font-medium">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => {
                        setFormData({
                          ...formData, 
                          category: value,
                          subcategory: '' // Reset subcategory when category changes
                        });
                      }}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Subcategory - Only shown if available for selected category */}
                  <div className="space-y-2">
                    <Label htmlFor="subcategory" className="font-medium">
                      Subcategory {availableSubcategories.length > 0 && <span className="text-destructive">*</span>}
                    </Label>
                    {availableSubcategories.length > 0 ? (
                      <Select 
                        value={formData.subcategory} 
                        onValueChange={(value) => setFormData({...formData, subcategory: value})}
                      >
                        <SelectTrigger id="subcategory">
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubcategories.map(subcategory => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="subcategory"
                        placeholder="No subcategories for this category"
                        disabled
                      />
                    )}
                  </div>
                </div>
                
                {/* Account and Notes Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account */}
                  <div className="space-y-2">
                    <Label htmlFor="account" className="font-medium">
                      Account <span className="text-destructive">*</span>
                    </Label>
                    {!isCustomAccount ? (
                      <div className="space-y-2">
                        <Select 
                          value={formData.account} 
                          onValueChange={(value) => {
                            if (value === "new_account") {
                              setIsCustomAccount(true);
                              setFormData({...formData, account: ""});
                            } else {
                              setFormData({...formData, account: value});
                            }
                          }}
                        >
                          <SelectTrigger id="account">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {userAccounts.map(account => (
                              <SelectItem key={account} value={account}>
                                {account}
                              </SelectItem>
                            ))}
                            <SelectItem value="new_account">+ Add new account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="customAccount"
                            placeholder="Enter new account name"
                            value={formData.account}
                            onChange={(e) => setFormData({...formData, account: e.target.value})}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setIsCustomAccount(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Notes (optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="font-medium">
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="notes"
                      placeholder="Add any additional notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={
                    !formData.amount || 
                    !formData.merchant || 
                    !formData.category || 
                    !formData.account || 
                    !formData.date || 
                    (availableSubcategories.length > 0 && !formData.subcategory) ||
                    addMutation.isPending
                  }
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : 'Add Transaction'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-5 mb-6 border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1.5"
                  >
                    <span>Type</span> 
                    <ChevronDown className="h-3.5 w-3.5" />
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
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1.5"
                  >
                    <span>Category</span> 
                    <ChevronDown className="h-3.5 w-3.5" />
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
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1.5"
                  >
                    <span>Account</span> 
                    <ChevronDown className="h-3.5 w-3.5" />
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
                  variant="outline" 
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 text-destructive"
                >
                  <FilterX className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {typeFilter && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <span className="font-medium">Type:</span> {typeFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => setTypeFilter(null)}
                  />
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <span className="font-medium">Category:</span> {categoryFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => setCategoryFilter(null)}
                  />
                </Badge>
              )}
              {accountFilter && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <span className="font-medium">Account:</span> {accountFilter}
                  <Trash2 
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => setAccountFilter(null)}
                  />
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <span className="font-medium">Search:</span> {searchTerm}
                  <Trash2 
                    className="h-3 w-3 ml-1.5 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Transactions List Section */}
        <Card className="overflow-hidden">
          {/* Loading State */}
          {isTransactionsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : transactionsError ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-2" />
              <h3 className="text-xl font-semibold mb-2">Error Loading Transactions</h3>
              <p className="text-muted-foreground mb-4">
                {transactionsError instanceof Error ? transactionsError.message : "Failed to load transactions"}
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/transactions'] })}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-xl font-semibold mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? "No transactions match your current filters. Try adjusting your search criteria." 
                  : "You haven't added any transactions yet. Click the button below to get started."}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add transaction
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium w-[13%]">Date</th>
                    <th className="text-left p-4 font-medium w-[22%]">Description</th>
                    <th className="text-left p-4 font-medium w-[17%]">Category</th>
                    <th className="text-left p-4 font-medium w-[13%]">Account</th>
                    <th className="text-left p-4 font-medium w-[12%]">Type</th>
                    <th className="text-right p-4 font-medium w-[12%]">Amount</th>
                    <th className="text-right p-4 font-medium w-[11%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
                    const isExpense = transaction.type === 'expense';
                    const categoryIcon = getCategoryIcon(transaction.category);
                    
                    return (
                      <tr key={transaction._id} className="border-b hover:bg-muted/20 transition-all duration-200">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{formatDate(new Date(transaction.date))}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium">{transaction.merchant}</span>
                            {transaction.notes && (
                              <span className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">
                                {transaction.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="text-muted-foreground w-5 h-5 flex items-center justify-center">
                              {categoryIcon}
                            </div>
                            <span className="font-medium text-sm">{transaction.category}</span>
                          </div>
                          {transaction.subcategory && (
                            <span className="text-xs text-muted-foreground ml-7 mt-1 block">
                              {transaction.subcategory}
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{transaction.account}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className={`${isExpense ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30' : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/30'}`}>
                            {isExpense ? 'Expense' : 'Income'}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <span className={`font-bold ${isExpense ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                            {isExpense ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount))}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(transaction)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the transaction from {transaction.merchant} for {formatCurrency(parseFloat(transaction.amount))}.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(transaction._id || '')}
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

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Transaction</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-6 mt-4">
            {/* Type and Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="font-medium">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value as 'expense' | 'income'})}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Picker */}
              <div className="space-y-2">
                <Label htmlFor="edit-date" className="font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker 
                  date={formData.date} 
                  setDate={(dateStr) => setFormData({ ...formData, date: dateStr })}
                />
              </div>
            </div>
            
            {/* Amount and Merchant Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount with $ sign properly positioned */}
              <div className="space-y-2">
                <Label htmlFor="edit-amount" className="font-medium">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-8" // Proper padding to prevent overlap
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Merchant/Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-merchant" className="font-medium">
                  Merchant/Description <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-merchant"
                  placeholder="Enter merchant or description"
                  value={formData.merchant}
                  onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                />
              </div>
            </div>
            
            {/* Category and Subcategory Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="font-medium">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => {
                    setFormData({
                      ...formData, 
                      category: value,
                      subcategory: '' // Reset subcategory when category changes
                    });
                  }}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Subcategory - Only shown if available for selected category */}
              <div className="space-y-2">
                <Label htmlFor="edit-subcategory" className="font-medium">
                  Subcategory {availableSubcategories.length > 0 && <span className="text-destructive">*</span>}
                </Label>
                {availableSubcategories.length > 0 ? (
                  <Select 
                    value={formData.subcategory} 
                    onValueChange={(value) => setFormData({...formData, subcategory: value})}
                  >
                    <SelectTrigger id="edit-subcategory">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map(subcategory => (
                        <SelectItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-subcategory"
                    placeholder="No subcategories for this category"
                    disabled
                  />
                )}
              </div>
            </div>
            
            {/* Account and Notes Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="edit-account" className="font-medium">
                  Account <span className="text-destructive">*</span>
                </Label>
                {!isCustomAccount ? (
                  <div className="space-y-2">
                    <Select 
                      value={formData.account} 
                      onValueChange={(value) => {
                        if (value === "new_account") {
                          setIsCustomAccount(true);
                          setFormData({...formData, account: ""});
                        } else {
                          setFormData({...formData, account: value});
                        }
                      }}
                    >
                      <SelectTrigger id="edit-account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {userAccounts.map(account => (
                          <SelectItem key={account} value={account}>
                            {account}
                          </SelectItem>
                        ))}
                        <SelectItem value="new_account">+ Add new account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="edit-customAccount"
                        placeholder="Enter new account name"
                        value={formData.account}
                        onChange={(e) => setFormData({...formData, account: e.target.value})}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsCustomAccount(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Notes (optional) */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="font-medium">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="edit-notes"
                  placeholder="Add any additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={
                !formData.amount || 
                !formData.merchant || 
                !formData.category || 
                !formData.account || 
                !formData.date || 
                (availableSubcategories.length > 0 && !formData.subcategory) ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : 'Update Transaction'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}