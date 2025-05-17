import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Loader2, AlertCircle, FileText, Upload as UploadIcon, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CSVUploadDialog({ isOpen, onClose }: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    // Reset states when selecting a new file
    setFile(selectedFile);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResult(null);
    setErrorMessage(null);
    
    // Basic file validation
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setErrorMessage('Please select a valid CSV file');
        setFile(null);
      } else if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('File size should be less than 5MB');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a CSV file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(10);

      // Create form data
      const formData = new FormData();
      formData.append('csv', file);

      // Simulate progress (for UX purposes)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 200);

      // Upload the CSV file
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload CSV file');
      }

      const result = await response.json();
      setUploadResult(result);
      setUploadStatus('success');
      
      // Invalidate queries to refresh transaction data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      
      toast({
        title: "Import successful",
        description: `Imported ${result.imported} transactions. ${result.duplicates} duplicates were detected.`,
      });
      
      // Auto close dialog after a successful upload (optional)
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('CSV upload error:', error);
      
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Failed to import transactions from CSV',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Reset states when closing the dialog
    if (!isUploading) {
      onClose();
      setFile(null);
      setUploadStatus('idle');
      setUploadProgress(0);
      setUploadResult(null);
      setErrorMessage(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your transactions to import them into Rivu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {uploadStatus === 'success' && uploadResult && (
            <Alert className="mb-4 bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-900 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import Successful</AlertTitle>
              <AlertDescription>
                Imported {uploadResult.imported} transactions. 
                {uploadResult.duplicates > 0 ? 
                  ` ${uploadResult.duplicates} potential duplicates were detected and marked.` : 
                  ' No duplicates were detected.'}
              </AlertDescription>
            </Alert>
          )}
          
          {uploadStatus !== 'success' && (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
              <FileText className="h-10 w-10 mb-4 text-muted-foreground" />
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {file ? file.name : 'Click to select or drag and drop a CSV file'}
                </p>
                {file && (
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                )}
              </div>
              <label htmlFor="csv-file" className="cursor-pointer">
                <div className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  {file ? 'Change File' : 'Browse Files'}
                </div>
                <input 
                  id="csv-file" 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
          
          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Expected CSV Format:</p>
            <p className="mb-2">Your CSV file should have the following columns:</p>
            <code className="block bg-muted p-2 rounded text-xs overflow-x-auto whitespace-pre mb-2">
              date,amount,merchant,category,subcategory,account,type
            </code>
            <p>Date format should be YYYY-MM-DD or MM/DD/YYYY</p>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-end">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleUpload}
            disabled={!file || isUploading || uploadStatus === 'success'}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}