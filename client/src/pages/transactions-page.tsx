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
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getCategoryIconAndColor } from "@/lib/utils";
import Papa from 'papaparse';
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
  FileText
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
// Removed Plaid import to focus on manual transactions only

type Transaction = {
  id: number;
  type: string;
  date: string;
  amount: string;
  merchant: string;
  category: string;
  subcategory?: string; // Added subcategory support
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
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  
  // CSV import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvStep, setCsvStep] = useState<'upload' | 'preview' | 'mapping' | 'confirm'>('upload');
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [possibleDuplicates, setPossibleDuplicates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
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
      }
      
      // Perform client-side validation
      // Required fields: description (merchant) and amount
      if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      if (!data.merchant.trim()) {
        throw new Error("Please enter a description for the transaction");
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
      
      // Date is optional, will default to today if not provided
      const currentDate = new Date().toISOString().split('T')[0];
      if (!data.date) {
        data.date = currentDate;
      } else if (isNaN(new Date(data.date).getTime())) {
        throw new Error("Please select a valid date");
      }
      
      // Type is optional, default to expense
      if (!data.type) {
        data.type = 'expense';
      }
      
      // Remove unnecessary fields before sending to API
      const { customCategory, customAccount, ...cleanData } = data;
      
      const res = await apiRequest('POST', '/api/transactions', {
        ...cleanData,
        category,
        account,
        amount: parseFloat(data.amount),
        date: new Date(data.date).toISOString(),
        type: data.type || 'expense',
        // All transactions are now manual entry
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
      
      // Process custom fields
      let category = updates.category;
      let account = updates.account;
      
      if (updates.category === 'Other' && updates.customCategory) {
        category = updates.customCategory;
        updates.category = updates.customCategory;
      }
      
      if (updates.account === 'Other' && updates.customAccount) {
        account = updates.customAccount;
        updates.account = updates.customAccount;
      }
      
      // Perform validation
      // Required fields check for updates: only amount and merchant are required
      if (updates.amount !== undefined && (isNaN(parseFloat(updates.amount)) || parseFloat(updates.amount) <= 0)) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      if (updates.merchant !== undefined && !updates.merchant.trim()) {
        throw new Error("Please enter a description for the transaction");
      }
      
      // Category and account now get default values if missing
      if (updates.category !== undefined && !updates.category) {
        updates.category = updates.type === 'income' ? 'General Income' : 'Uncategorized';
      }
      
      if (updates.account !== undefined && !updates.account) {
        updates.account = 'Default Account';
      }
      
      // Date is optional, will default to current date if not provided
      if (updates.date === '') {
        updates.date = new Date().toISOString().split('T')[0];
      } else if (updates.date && isNaN(new Date(updates.date).getTime())) {
        throw new Error("Please select a valid date");
      }
      
      // Type is optional, default to expense
      if (!updates.type) {
        updates.type = 'expense';
      }
      
      // Remove custom fields before sending to API
      const { customCategory, customAccount, ...cleanUpdates } = updates;
      
      // Convert amount to string if present
      if (cleanUpdates.amount) {
        cleanUpdates.amount = cleanUpdates.amount.toString();
      }
      
      // Convert date to ISO string if present
      if (cleanUpdates.date) {
        cleanUpdates.date = new Date(cleanUpdates.date).toISOString();
      }
      
      const res = await apiRequest('PUT', `/api/transactions/${data.id}`, cleanUpdates);
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
      account: "",
      notes: '',
    });
  };
  
  // CSV file upload handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Check if it's a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setImportError('Please upload a valid CSV file');
      return;
    }
    
    setCsvFile(file);
    parseCsvFile(file);
  };
  
  // Parse CSV data
  const parseCsvFile = (file: File) => {
    setIsParsingCsv(true);
    setImportError(null);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Check if there's parsing errors
        if (results.errors && results.errors.length > 0) {
          setImportError(`Error parsing CSV: ${results.errors[0].message}`);
          setIsParsingCsv(false);
          return;
        }
        
        // Validate that required fields are present
        const data = results.data as any[];
        if (data.length === 0) {
          setImportError('CSV file is empty or has invalid format');
          setIsParsingCsv(false);
          return;
        }
        
        // Check if required columns exist
        const firstRow = data[0];
        const requiredFields = ['date', 'amount', 'merchant'];
        const missingFields = requiredFields.filter(field => 
          !Object.keys(firstRow).some(key => key.toLowerCase() === field.toLowerCase())
        );
        
        if (missingFields.length > 0) {
          setImportError(`Missing required fields in CSV: ${missingFields.join(', ')}`);
          setIsParsingCsv(false);
          return;
        }
        
        setCsvData(data);
        setCsvStep('preview');
        setIsParsingCsv(false);
      },
      error: (error) => {
        setImportError(`Error parsing CSV: ${error.message}`);
        setIsParsingCsv(false);
      }
    });
  };
  
  // Check for duplicate transactions
  const checkForDuplicates = (newTransactions: any[]) => {
    // For each new transaction, check if it exists in the current transactions
    const potentialDuplicates = newTransactions.filter(newTrans => {
      return transactions.some(existingTrans => {
        // Check by amount and merchant (within 48-72 hrs)
        const newDate = new Date(newTrans.date);
        const existingDate = new Date(existingTrans.date);
        const timeDiff = Math.abs(existingDate.getTime() - newDate.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        return (
          parseFloat(newTrans.amount) === parseFloat(existingTrans.amount) &&
          newTrans.merchant.toLowerCase() === existingTrans.merchant.toLowerCase() &&
          hoursDiff <= 72 // Within 72 hours
        );
      });
    });
    
    return potentialDuplicates;
  };
  
  // Import transactions from CSV
  const importTransactionsFromCsv = async () => {
    if (csvData.length === 0) {
      setImportError('No data to import');
      return;
    }
    
    try {
      // Check for duplicates
      const duplicates = checkForDuplicates(csvData);
      
      if (duplicates.length > 0) {
        setPossibleDuplicates(duplicates);
        // We could show a confirmation dialog here, but for now we'll just warn and continue
        toast({
          title: 'Possible duplicates detected',
          description: `${duplicates.length} transactions may be duplicates. Review carefully.`,
        });
      }
      
      // Process the data and import
      const formattedTransactions = csvData.map(row => ({
        date: row.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(row.amount.toString().replace(/[^\d.-]/g, '')),
        merchant: row.merchant || 'Imported Transaction',
        category: row.category || 'Uncategorized',
        subcategory: row.subcategory || '',
        account: row.account || 'Imported',
        type: (row.type || 'expense').toLowerCase() === 'income' ? 'income' : 'expense',
        notes: row.notes || `Imported from CSV on ${new Date().toLocaleDateString()}`,
        source: 'csv' // Tag the source
      }));
      
      // Create transactions one by one
      for (const transaction of formattedTransactions) {
        await addMutation.mutate(transaction);
      }
      
      // Success
      toast({
        title: 'Import Successful',
        description: `${formattedTransactions.length} transactions imported successfully`,
      });
      
      // Close dialog and reset state
      setIsCsvDialogOpen(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvStep('upload');
      setPossibleDuplicates([]);
    } catch (error: any) {
      setImportError(error.message || 'Failed to import transactions');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure required fields are filled
    if (!formData.amount || !formData.merchant || !formData.category || !formData.account) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description, category, account, and amount.",
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
    
    // Validate date is provided and in the correct format
    if (!formData.date) {
      toast({
        title: "Validation error",
        description: "Please select a valid date for the transaction.",
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
    
    // Ensure required fields are filled
    if (!formData.amount || !formData.merchant || !formData.category || !formData.account) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields: description, category, account, and amount.",
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

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // Convert ISO date to YYYY-MM-DD for the input
    const date = new Date(transaction.date).toISOString().split('T')[0];
    
    // Set selected main category to properly load subcategories
    setSelectedMainCategory(transaction.category);
    
    setFormData({
      type: transaction.type as 'expense' | 'income',
      date,
      amount: transaction.amount,
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
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Transactions</h1>
            <p className="text-muted-foreground">View and manage your financial transactions</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Button 
              variant="outline" 
              onClick={() => setIsCsvDialogOpen(true)}
              className="flex items-center"
            >
              <FileText className="mr-2 h-4 w-4" /> Import CSV
            </Button>
          </div>
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
                    <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => {
                        console.log("Date changed to:", e.target.value);
                        setFormData({...formData, date: e.target.value});
                      }}
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
                          // Reset subcategory when main category changes
                          subcategory: ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_SUGGESTIONS).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      If left blank, will default to "Uncategorized" or "General Income"
                    </p>
                  </div>
                  
                  {/* Subcategory selection - only show if a main category is selected */}
                  {formData.category && availableSubcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <Select 
                        value={formData.subcategory} 
                        onValueChange={(value) => setFormData({...formData, subcategory: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubcategories.map((subcat) => (
                            <SelectItem key={subcat} value={subcat}>
                              {subcat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Further categorize your {formData.type}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account">Account <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
                      <br />
                      If left blank, will default to "Default Account"
                    </div>
                  </div>
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
                    Start tracking your finances by adding your transactions manually.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add transaction
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsCsvDialogOpen(true)}
                    >
                      <FileText className="mr-2 h-4 w-4" /> Import CSV
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
                    <th className="text-left p-4 font-medium">Source</th>
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
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span>{transaction.merchant}</span>
                            {false && (
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
                                <span className="text-xs text-muted-foreground">
                                  {transaction.subcategory}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{transaction.account}</td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline">
                            Manual Entry
                          </Badge>
                        </td>
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

      {/* CSV Import Dialog */}
      <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Transactions from CSV</DialogTitle>
          </DialogHeader>

          {csvStep === 'upload' && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border border-dashed border-muted-foreground/50">
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Upload CSV file</p>
                    <p className="text-xs text-muted-foreground">
                      File should include date, amount, merchant, and optional category/account fields
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="w-full max-w-xs"
                  />
                </div>
              </div>
              
              {importError && (
                <div className="bg-destructive/10 p-3 rounded text-destructive text-sm">
                  {importError}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Required CSV columns:</strong> date, amount, merchant</p>
                <p><strong>Optional columns:</strong> category, account, notes, type (income/expense)</p>
                <p><strong>Example:</strong> 2025-05-16,45.99,Groceries,Food,Checking Account,Weekly shopping,expense</p>
              </div>
            </div>
          )}

          {csvStep === 'preview' && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">Preview ({csvData.length} transactions)</p>
                <div className="max-h-[300px] overflow-y-auto mt-2 border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-left">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{row.date}</td>
                          <td className="p-2">{row.merchant}</td>
                          <td className="p-2 text-right">${parseFloat(row.amount.toString()).toFixed(2)}</td>
                          <td className="p-2">{row.category || 'Uncategorized'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 10 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">
                      Showing 10 of {csvData.length} transactions
                    </div>
                  )}
                </div>
              </div>
              
              {importError && (
                <div className="bg-destructive/10 p-3 rounded text-destructive text-sm">
                  {importError}
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvStep('upload');
                    setCsvFile(null);
                    setCsvData([]);
                  }}
                >
                  Back
                </Button>
                <Button 
                  onClick={importTransactionsFromCsv}
                  disabled={isParsingCsv}
                >
                  {isParsingCsv ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : 'Import Transactions'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}