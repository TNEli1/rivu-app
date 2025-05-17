import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileWarning, 
  Check, 
  Info, 
  Loader2 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CSVUploadDialog({ isOpen, onClose }: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/transactions/import-csv', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error uploading CSV file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Import Successful",
        description: data.message || `Successfully imported transactions`,
      });
      
      // Invalidate transactions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Close the dialog after successful upload
      setTimeout(() => {
        setFile(null);
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('CSV Upload Error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import transactions from CSV",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Check if it's a CSV file
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size should be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    uploadMutation.mutate(formData);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const resetState = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your transaction data. The file should have headers and include date, amount, and merchant columns.
          </DialogDescription>
        </DialogHeader>
        
        {uploadMutation.isSuccess ? (
          <div className="py-6">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-600 dark:text-green-400">Import Successful</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                {uploadMutation.data?.message || "Your transactions have been imported successfully"}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            <div 
              className={`
                flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 
                ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600'} 
                ${file ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}
                transition-all duration-200
              `}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {file ? (
                <div className="text-center">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="mt-2"
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="font-medium mb-1">Drag & drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mb-4">or</p>
                  <Button
                    variant="secondary"
                    onClick={handleFileSelect}
                    disabled={uploadMutation.isPending}
                  >
                    Select CSV File
                  </Button>
                </>
              )}
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                CSV should contain columns for date, amount, merchant/description. 
                Additional columns like category and account will be used if present.
              </AlertDescription>
            </Alert>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={resetState} disabled={uploadMutation.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Transactions'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}