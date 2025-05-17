import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, PlusCircle } from "lucide-react";
import CSVUploadDialog from "@/components/transactions/CSVUploadDialog";

export default function TransactionsPageSimplified() {
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/transactions');
      return res.json();
    }
  });

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
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline"
              onClick={() => setIsCSVUploadOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </div>
        </div>

        {/* CSV Upload Dialog */}
        <CSVUploadDialog
          isOpen={isCSVUploadOpen}
          onClose={() => setIsCSVUploadOpen(false)}
        />
      </main>

      {/* Mobile Nav - Mobile only */}
      <MobileNav />
    </div>
  );
}