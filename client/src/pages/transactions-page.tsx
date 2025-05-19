import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CSVUploadDialog from "@/components/transactions/CSVUploadDialog";
import PlaidConnectionDialog from "@/components/transactions/PlaidConnectionDialog";
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
  CreditCard,
  Upload,
  Building
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
  id: string;
  amount: number;
  date: string;
  merchant: string;
  category: string;
  subcategory?: string;
  account: string;
  type: 'income' | 'expense';
  notes?: string;
  source?: 'manual' | 'csv' | 'plaid';
  isDuplicate?: boolean;
};

type BudgetCategory = {
  id: string;
  name: string;
  budgetAmount: string;
  spentAmount: string;
};

type TransactionAccount = {
  id: string;
  name: string;
  type: string;
  institutionName?: string;
  lastFour?: string;
};

type TransactionFormData = {
  type: 'expense' | 'income';
  date: string;
  amount: string;
  merchant: string; // This is the required description field
  category: string;
  subcategory?: string; // Added subcategory support
  account: string;
  // Additional fields for custom entry
  customCategory?: string;
  customAccount?: string;
  notes?: string;
};

// Categories with subcategories - per spec requirements
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "Housing": ["Rent", "Mortgage", "Property Tax", "HOA Fees"],
  "Utilities": ["Electric", "Water", "Gas", "Internet", "Trash"],
  "Groceries": ["Produce", "Meat & Seafood", "Snacks", "Beverages"],
  "Transportation": ["Gas", "Car Payment", "Insurance", "Rideshare"],
  "Entertainment": ["Streaming", "Dining Out", "Movies", "Events"],
  "Health": ["Doctor", "Dentist", "Pharmacy", "Insurance"],
  "Savings": ["Emergency Fund", "Vacation", "Investments"],
  "Income": ["Primary Job", "Side Hustle", "Freelance"],
  "Other": []
};

export default function TransactionsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const [isPlaidConnectionOpen, setIsPlaidConnectionOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  
  // Create a date object using local date values to avoid timezone issues
  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    date: localDate.toISOString().split('T')[0],
    amount: "",
    merchant: "",
    category: "",
    subcategory: "",
    account: "",
    notes: ""
  });
  
  // State to track currently selected main category
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("");
  
  // Get subcategories based on selected main category
  const availableSubcategories = useMemo(() => {
    return selectedMainCategory && CATEGORY_SUGGESTIONS[selectedMainCategory] 
      ? CATEGORY_SUGGESTIONS[selectedMainCategory] 
      : [];
  }, [selectedMainCategory]);
  
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
  
  // Get transaction accounts for the dropdown
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/accounts');
      return res.json();
    }
  });

  // Add new transaction
  const addMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Process data before sending to API
      let category = data.category;
      let account = data.account;
      
      // Use custom values if appropriate
      if (data.category === 'Other' && data.customCategory) {
        category = data.customCategory;
      }
      
      if (data.account === 'Other' && data.customAccount) {
        account = data.customAccount;
        
        // Create a new transaction account that will persist in the database
        try {
          // Ensure customAccount is defined before using it
          if (!data.customAccount) {
            console.log('Custom account name is empty, using "Other" as account name');
            account = 'Other';
            return; // Skip account creation
          }
          
          const customAccount = data.customAccount || '';
          console.log('Creating new custom account:', customAccount);
          
          // First check if this account already exists to avoid duplicates
          const existingAccount = accounts.find(
            (a: any) => a.name.toLowerCase() === customAccount.toLowerCase()
          );
          
          if (!existingAccount && data.customAccount) {
            // Create a new account
            const accountRes = await apiRequest('POST', '/api/accounts', {
              name: data.customAccount,
              type: 'manual',
              institutionName: 'Custom'
            });
            console.log('New account created:', await accountRes.json());
            
            // Make sure to refresh accounts after we're done
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
          } else {
            console.log('Account already exists, using existing record:', existingAccount);
          }
        } catch (error) {
          console.error('Error creating account:', error);
          // Continue with transaction creation even if account creation fails
        }
      }
      
      // Category and account are now optional but will use default values if missing
      if (!data.category) {
        // Default category for expenses and income
        data.category = data.type === 'expense' ? 'Uncategorized' : 'General Income';
      }
      
      if (!data.account) {
        // Default account
        data.account = 'Default Account';
      }
      
      // Fix date handling to ensure accurate date selection
      if (!data.date) {
        // If no date provided, use local date (current day in user's timezone)
        const now = new Date();
        const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        data.date = localDate.toISOString().split('T')[0];
        console.log(`No date provided, using local date: ${data.date}`);
      } else if (isNaN(new Date(data.date).getTime())) {
        throw new Error("Please select a valid date");
      } else {
        // Ensure date is handled in user's local timezone
        console.log(`Using provided date: ${data.date}`);
      }
      
      // Type is optional, default to expense
      if (!data.type) {
        data.type = 'expense';
      }
      
      // Remove unnecessary fields before sending to API
      const { customCategory, customAccount, ...cleanData } = data;
      
      // Fix date issues by keeping the exact date string from the form
      // This prevents timezone conversion issues where the date shifts
      console.log(`Using exact date from form: ${data.date}`);
      
      // CRITICAL FIX: Fix date handling to prevent timezone shift
      console.log(`Original date from form: ${data.date}`);
      
      // Extract the date parts to explicitly construct a date that won't shift
      let adjustedDate = data.date;
      
      // If it's an ISO date string, keep it as is to avoid timezone issues
      // This ensures the date sent is the exact one the user selected
      console.log(`Using exact user-selected date: ${adjustedDate}`);
      
      const res = await apiRequest('POST', '/api/transactions', {
        ...cleanData,
        category,
        account,
        amount: parseFloat(data.amount),
        // Pass the date exactly as entered without any conversion
        date: adjustedDate,
        type: data.type || 'expense',
        source: 'manual'
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
        description: "An error occurred while adding your transaction.",
        variant: "destructive",
      });
      console.error("Transaction add error:", error);
    },
  });

  // Update transaction
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: TransactionFormData }) => {
      const res = await apiRequest('PUT', `/api/transactions/${id}`, {
        ...updates,
        amount: parseFloat(updates.amount),
        date: new Date(updates.date).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update transaction",
        description: "An error occurred while updating your transaction.",
        variant: "destructive",
      });
      console.error("Transaction update error:", error);
    },
  });

  // Delete transaction
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/transactions/${id}`);
      // For 204 responses (no content), don't try to parse JSON
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      toast({
        title: "Transaction deleted",
        description: "Your transaction has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete transaction",
        description: "An error occurred while deleting your transaction.",
        variant: "destructive",
      });
      console.error("Transaction delete error:", error);
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'expense',
      date: localDate.toISOString().split('T')[0],
      amount: "",
      merchant: "",
      category: "",
      subcategory: "",
      account: "",
      notes: ""
    });
    setSelectedMainCategory("");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure only truly required fields are filled
    if (!formData.amount || !formData.merchant) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description and amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate amount is > 0
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation error",
        description: "Amount must be a positive number greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Submitting transaction with date:", formData.date);
    
    // Ensure we have defaults for optional fields but preserve user-selected date
    const submissionData: TransactionFormData = {
      ...formData,
      type: formData.type || 'expense',
      // Important: Keep the original date selected by user, don't default to today
      date: formData.date,
      // Keep amount as string in the form data as required by the type
      amount: formData.amount,
      notes: formData.notes || ''
    };
    
    addMutation.mutate(submissionData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    // Only amount and merchant are required
    if (!formData.amount || !formData.merchant) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description and amount.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate amount is > 0
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation error",
        description: "Amount must be a positive number greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure we have defaults for optional fields
    const submissionData = {
      ...formData,
      type: formData.type || 'expense',
      date: formData.date || new Date().toISOString().split('T')[0]
    };
    
    updateMutation.mutate({
      id: selectedTransaction.id,
      updates: submissionData
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      type: transaction.type,
      date: new Date(transaction.date).toISOString().split('T')[0],
      amount: transaction.amount.toString(),
      merchant: transaction.merchant,
      category: transaction.category,
      subcategory: transaction.subcategory || '',
      account: transaction.account,
      notes: transaction.notes || '',
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
      <main className="flex-1 p-8 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-gray-800 dark:text-gray-100">Transactions</h1>
            <p className="text-gray-700 dark:text-gray-400">View and manage your financial transactions</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline"
              onClick={() => setIsPlaidConnectionOpen(true)}
              className="gap-2 border-gray-300 text-gray-700 hover:text-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <Building className="h-4 w-4" /> Connect Bank
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsCSVUploadOpen(true)}
              className="gap-2 border-gray-300 text-gray-700 hover:text-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') => setFormData({...formData, type: value})}
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
                    <div className="space-y-2">
                      <Input 
                        id="date" 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select any date for this transaction
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input 
                        id="amount" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className="pl-7"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required: Enter a positive number
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="merchant">Description <span className="text-destructive">*</span></Label>
                    <Input 
                      id="merchant" 
                      placeholder="e.g., Starbucks, Employer" 
                      value={formData.merchant}
                      onChange={(e) => setFormData({...formData, merchant: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required: Briefly describe what this transaction is for
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => {
                          setSelectedMainCategory(value);
                          setFormData({
                            ...formData, 
                            category: value,
                            subcategory: ''
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CATEGORY_SUGGESTIONS).map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem value="Other">Other (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {formData.category === 'Other' && (
                        <Input 
                          placeholder="Enter custom category" 
                          value={formData.customCategory || ''}
                          onChange={(e) => setFormData({
                            ...formData, 
                            customCategory: e.target.value
                          })}
                          className="mt-2"
                        />
                      )}
                    </div>
                    
                    {formData.category && availableSubcategories.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="subcategory">Subcategory <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Select 
                          value={formData.subcategory} 
                          onValueChange={(value) => setFormData({...formData, subcategory: value})}
                        >
                          <SelectTrigger>
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
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="account">Account <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Select 
                      value={formData.account} 
                      onValueChange={(value) => setFormData({...formData, account: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts && accounts.length > 0 ? (
                          accounts.map((account: TransactionAccount) => (
                            <SelectItem key={account.id} value={account.name}>
                              {account.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Checking">Checking</SelectItem>
                            <SelectItem value="Savings">Savings</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                          </>
                        )}
                        <SelectItem value="Other">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {formData.account === 'Other' && (
                      <Input 
                        placeholder="Enter custom account" 
                        value={formData.customAccount || ''}
                        onChange={(e) => setFormData({
                          ...formData, 
                          customAccount: e.target.value
                        })}
                        className="mt-2"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input 
                      id="notes" 
                      placeholder="Add any additional details here" 
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!formData.amount || !formData.merchant || addMutation.isPending}
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
                    <DropdownMenuItem key={category} onClick={() => setCategoryFilter(category)}>
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
                    <DropdownMenuItem key={account} onClick={() => setAccountFilter(account)}>
                      {account}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearAllFilters} className="flex items-center">
                  <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        <Card className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Common action buttons - Always visible at the top */}
          <div className="p-6 flex flex-wrap justify-end gap-2 border-b dark:border-gray-700">
            <Button 
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsCSVUploadOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            {transactions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Transactions</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete ALL transactions? This action cannot be undone and will permanently remove all your transaction history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        const deleteAllMutation = async () => {
                          try {
                            setIsLoading(true); // Show loading state while deleting
                            
                            // First, get a count of current transactions to verify before/after
                            const currentTransactionsRes = await fetch('/api/transactions');
                            const currentTransactions = await currentTransactionsRes.json();
                            const initialCount = currentTransactions.length;
                            
                            console.log(`Before deletion: ${initialCount} transactions in the list`);
                            
                            // Get the user info to ensure we have the correct user ID
                            const userRes = await fetch('/api/user');
                            const user = await userRes.json();
                            console.log(`Attempting to delete all transactions for user ID: ${user.id}`);
                            
                            // Execute the delete operation with explicit error handling
                            const res = await fetch('/api/transactions/all', {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            if (!res.ok) {
                              const errorText = await res.text();
                              throw new Error(`Failed to delete transactions: ${res.status} ${errorText}`);
                            }
                            
                            const data = await res.json();
                            console.log('Delete response:', data);
                            
                            // Complete cache invalidation to ensure fresh data
                            queryClient.removeQueries();
                            console.log('Cleared all queries from cache');
                            
                            // Add a small delay to ensure DB operations complete
                            await new Promise(resolve => setTimeout(resolve, 300));
                            
                            // Explicitly fetch fresh data
                            const refreshedDataRes = await fetch('/api/transactions');
                            const refreshedTransactions = await refreshedDataRes.json();
                            console.log(`After deletion: ${refreshedTransactions.length} transactions remain`);
                            
                            // Force refresh all relevant queries
                            queryClient.invalidateQueries();
                            
                            // Show success or error message based on actual result
                            if (refreshedTransactions.length === 0) {
                              toast({
                                title: "All transactions cleared",
                                description: `Successfully deleted all ${initialCount} transactions.`,
                              });
                            } else {
                              toast({
                                title: "Transaction deletion issue",
                                description: `${refreshedTransactions.length} transactions remain. Please try again.`,
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error('Error clearing all transactions:', error);
                            toast({
                              title: "Error",
                              description: error instanceof Error 
                                ? error.message 
                                : "There was an error clearing all transactions.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsLoading(false); // Hide loading state
                          }
                        };
                        
                        // Execute the deletion
                        deleteAllMutation();
                      }}
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {isTransactionsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-full max-w-sm" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="p-8 py-16">
              {hasActiveFilters ? (
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">No matching transactions</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters to see more transactions.
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="px-6 max-w-md mx-auto">
                  <div className="text-6xl mb-4 opacity-50 flex justify-center">
                    <CreditCard />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No transactions available</h3>
                  <p className="text-muted-foreground mb-6">
                    Start tracking your finances by adding your transactions manually.
                  </p>
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
                    <th className="text-left p-4 font-medium">Source</th>
                    <th className="text-right p-4 font-medium">Amount</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => {
                    const { icon, color } = getCategoryIconAndColor(transaction.category);
                    const isIncome = transaction.type === 'income';
                    
                    return (
                      <tr key={transaction.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(new Date(transaction.date))}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span>{transaction.merchant}</span>
                            {transaction.isDuplicate && (
                              <div className="flex flex-col mt-1">
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800">
                                  Possible Duplicate
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-1 h-7 text-xs"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await apiRequest('PUT', `/api/transactions/${transaction.id}/not-duplicate`);
                                      
                                      // Invalidate and refetch transactions
                                      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
                                      
                                      toast({
                                        title: "Marked as not duplicate",
                                        description: "This transaction will no longer be flagged as a duplicate."
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to mark transaction as not duplicate.",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  Not a duplicate
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${color.split(' ')[0]}`}>
                              <i className={`${icon} text-sm`}></i>
                            </div>
                            <div className="flex flex-col">
                              <span>{transaction.category}</span>
                              {transaction.subcategory && (
                                <span className="text-xs text-muted-foreground">{transaction.subcategory}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{transaction.account}</td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="capitalize">
                            {transaction.source || 'manual'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right align-middle">
                          <span className={isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        </td>
                        <td className="p-4 text-right align-middle">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
                                    onClick={() => deleteMutation.mutate(transaction.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteMutation.isPending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting...
                                      </>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({...formData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-2">
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_SUGGESTIONS).map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-account">Account</Label>
              <div className="space-y-2">
                <Select 
                  value={formData.account} 
                  onValueChange={(value) => setFormData({...formData, account: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts && accounts.length > 0 ? (
                      accounts.map((account: TransactionAccount) => (
                        <SelectItem key={account.id} value={account.name}>
                          {account.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Checking">Checking</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input 
                id="edit-notes" 
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
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
      
      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
      />
      
      {/* Plaid Connection Dialog */}
      <PlaidConnectionDialog
        isOpen={isPlaidConnectionOpen}
        onClose={() => setIsPlaidConnectionOpen(false)}
      />
      
      {/* We no longer need this hidden dialog element since we're using AlertDialog directly */}
    </div>
  );
}