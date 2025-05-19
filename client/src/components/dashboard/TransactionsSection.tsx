import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PencilIcon } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, formatDate, getCategoryIconAndColor } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import { useLocation } from "wouter";

export type Transaction = {
  id: string;
  amount: number;
  date: string;
  merchant: string;
  category: string;
  account: string;
  type: "income" | "expense";
  notes?: string;
  source?: string; // 'manual', 'csv', or 'plaid'
  isDuplicate?: boolean;
};

export default function TransactionsSection() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expenses">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Create a date that uses local time zone to fix the date picker issue
  const today = new Date();
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(localDate);
  const [editDate, setEditDate] = useState<Date | undefined>(localDate);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [newTransaction, setNewTransaction] = useState({
    amount: "",
    merchant: "",
    category: "",
    account: "Credit Card",
    date: localDate.toISOString().split('T')[0], // Default to today's date in YYYY-MM-DD format, using local time
  });
  const [editTransaction, setEditTransaction] = useState({
    id: "",
    amount: "",
    merchant: "",
    category: "",
    account: "",
    type: "expense" as "income" | "expense",
    date: "",
    notes: ""
  });

  // Fetch transactions
  const { data: transactions = [], isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"]
  });

  // Fetch categories for the select dropdown
  const { data: categories = [] } = useQuery<{id: string, name: string}[]>({
    queryKey: ["/api/budget-categories"],
  });
  
  // Update transaction date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setNewTransaction(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);
  
  // Update edit transaction date when editDate changes
  useEffect(() => {
    if (editDate) {
      setEditTransaction(prev => ({
        ...prev,
        date: editDate.toISOString().split('T')[0]
      }));
    }
  }, [editDate]);
  
  // Open edit dialog and populate form with transaction data
  const handleEditTransaction = (transaction: Transaction) => {
    // Convert string date to Date object for the calendar
    const txDate = transaction.date ? new Date(transaction.date) : new Date();
    setEditDate(txDate);
    
    setEditTransaction({
      id: transaction.id,
      amount: transaction.amount.toString(),
      merchant: transaction.merchant,
      category: transaction.category,
      account: transaction.account || '',
      type: transaction.type || 'expense',
      date: transaction.date,
      notes: transaction.notes || ''
    });
    
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  // Create a new transaction
  const createMutation = useMutation({
    mutationFn: async (transactionData: {
      amount: number;
      merchant: string;
      category: string;
      account: string;
      date: string;
    }) => {
      return apiRequest("POST", "/api/transactions", transactionData);
    },
    onSuccess: () => {
      // Use the helper function to invalidate all related queries
      invalidateRelatedQueries('transaction');
      
      // Reset form and close dialog
      setIsAddDialogOpen(false);
      setNewTransaction({
        amount: "",
        merchant: "",
        category: "",
        account: "Credit Card",
        date: new Date().toISOString().split('T')[0], // Reset to today
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newTransaction.amount);
    
    if (!isNaN(amount) && amount > 0) {
      createMutation.mutate({
        amount,
        merchant: newTransaction.merchant || "Uncategorized",
        category: newTransaction.category || "Other",
        account: newTransaction.account || "Credit Card",
        date: newTransaction.date || new Date().toISOString().split('T')[0]
      });
    }
  };
  
  // Update an existing transaction
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string, updates: any }) => {
      return apiRequest("PUT", `/api/transactions/${data.id}`, data.updates);
    },
    onSuccess: () => {
      // Use the helper function to invalidate all related queries
      invalidateRelatedQueries('transaction');
      
      // Reset form and close dialog
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
    },
  });
  
  // Handle edit form submission
  const handleUpdateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTransaction) return;
    
    const updatedData = {
      amount: parseFloat(editTransaction.amount),
      merchant: editTransaction.merchant,
      category: editTransaction.category,
      account: editTransaction.account,
      type: editTransaction.type,
      date: editTransaction.date,
      notes: editTransaction.notes
    };
    
    updateMutation.mutate({ 
      id: selectedTransaction.id, 
      updates: updatedData 
    });
  };

  // Filter transactions based on active tab and exclude duplicates
  const filteredTransactions = transactions.filter((transaction) => {
    // First filter out duplicates (don't show transactions marked as duplicates)
    if (transaction.isDuplicate === true) return false;
    
    // Then apply tab filters
    if (activeTab === "all") return true;
    if (activeTab === "income") return transaction.type === "income";
    if (activeTab === "expenses") return transaction.type === "expense";
    return true;
  });

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Recent Transactions</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              className="text-primary hover:underline text-sm font-medium"
              onClick={() => setIsAddDialogOpen(true)}
            >
              Add
            </Button>
            <Button 
              variant="ghost" 
              className="text-primary hover:underline text-sm font-medium"
              onClick={() => setLocation('/transactions')}
            >
              View All
            </Button>
          </div>
        </div>

        {/* Transactions Tab Navigation */}
        <div className="border-b border-border mb-6">
          <div className="flex -mb-px">
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === "all" ? "tab-active" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === "income" ? "tab-active" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("income")}
            >
              Income
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === "expenses" ? "tab-active" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("expenses")}
            >
              Expenses
            </button>
          </div>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-muted rounded-lg mr-3"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No recent transactions found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsAddDialogOpen(true)}
            >
              Add your first transaction
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction: Transaction) => {
              const { icon, color } = getCategoryIconAndColor(transaction.merchant) || 
                                      getCategoryIconAndColor(transaction.category);
              const isIncome = transaction.type === "income";
              
              return (
                <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-background/40 rounded-lg transition-colors group">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${color.split(' ')[0]} rounded-lg flex items-center justify-center mr-3`}>
                      <i className={`${icon} ${color.split(' ')[1]}`}></i>
                    </div>
                    <div>
                      <p className="font-medium">{transaction.merchant}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(new Date(transaction.date))} • {transaction.category} •&nbsp;
                        <span className="text-xs italic">
                          {transaction.source === 'csv' ? 'CSV Import' : 
                           transaction.source === 'plaid' ? 'Bank Connection' : 
                           'Manual Entry'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-medium ${isIncome ? 'text-[#00C2A8]' : 'text-[#FF4D4F]'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{transaction.account}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Transaction Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="transaction-amount">Amount</Label>
                  <Input
                    id="transaction-amount"
                    placeholder="Enter amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-merchant">Merchant</Label>
                  <Input
                    id="transaction-merchant"
                    placeholder="e.g., Starbucks"
                    value={newTransaction.merchant}
                    onChange={(e) => setNewTransaction({ ...newTransaction, merchant: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-category">Category</Label>
                  <Select 
                    value={newTransaction.category} 
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: { id: string, name: string }) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-account">Account</Label>
                  <Select 
                    value={newTransaction.account} 
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, account: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
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
                  disabled={
                    !newTransaction.amount || 
                    !newTransaction.merchant ||
                    !newTransaction.category ||
                    createMutation.isPending
                  }
                >
                  {createMutation.isPending ? "Adding..." : "Add Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Transaction Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTransaction}>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editTransaction.amount}
                    onChange={(e) => setEditTransaction({...editTransaction, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-merchant">Merchant/Description</Label>
                  <Input
                    id="edit-merchant"
                    value={editTransaction.merchant}
                    onChange={(e) => setEditTransaction({...editTransaction, merchant: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                    value={editTransaction.category} 
                    onValueChange={(value) => setEditTransaction({...editTransaction, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editTransaction.type}
                    onValueChange={(value: "income" | "expense") => 
                      setEditTransaction({...editTransaction, type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-account">Account</Label>
                  <Select
                    value={editTransaction.account}
                    onValueChange={(value) => setEditTransaction({...editTransaction, account: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-transaction-date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editDate ? format(editDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editDate}
                        onSelect={setEditDate}
                        initialFocus
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editTransaction.notes}
                    onChange={(e) => setEditTransaction({...editTransaction, notes: e.target.value})}
                  />
                </div>
                {/* Source field removed - all transactions are manual */}
              </div>
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    !editTransaction.amount || 
                    !editTransaction.merchant ||
                    !editTransaction.category ||
                    updateMutation.isPending
                  }
                >
                  {updateMutation.isPending ? "Updating..." : "Update Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
