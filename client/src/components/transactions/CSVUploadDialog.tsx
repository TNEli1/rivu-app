import React, { useState, useEffect } from 'react';
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
import { 
  Loader2, 
  AlertCircle, 
  FileText, 
  Upload as UploadIcon, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

// Available fields for mapping
const availableFields = [
  { id: "date", label: "Date" },
  { id: "amount", label: "Amount" },
  { id: "merchant", label: "Merchant/Payee" },
  { id: "category", label: "Category" },
  { id: "subcategory", label: "Subcategory" },
  { id: "account", label: "Account" },
  { id: "type", label: "Type (income/expense)" },
  { id: "notes", label: "Notes/Description" },
  { id: "none", label: "Do not import" }
];

// Common CSV header variations
const headerMappings: { [key: string]: string } = {
  // Date variations
  date: "date",
  "transaction date": "date",
  "trans date": "date",
  "post date": "date",
  
  // Amount variations
  amount: "amount",
  "transaction amount": "amount",
  sum: "amount",
  total: "amount",
  
  // Merchant variations
  merchant: "merchant",
  payee: "merchant",
  description: "merchant",
  vendor: "merchant",
  name: "merchant",
  
  // Category variations
  category: "category",
  "transaction category": "category",
  "expense category": "category",
  type: "category",
  
  // Account variations
  account: "account",
  "account name": "account",
  "account number": "account",
  "from account": "account",
  
  // Type variations
  "transaction type": "type",
  "debit/credit": "type",
  "inflow/outflow": "type",
  "income/expense": "type",
  
  // Notes variations
  notes: "notes",
  memo: "notes",
  details: "notes",
  comments: "notes",
};

export default function CSVUploadDialog({ isOpen, onClose }: CSVUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [activeTab, setActiveTab] = useState<string>("upload");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse CSV data from file
  const parseCSV = (text: string): CSVData => {
    // Split by newlines and handle different line endings
    const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse headers and rows
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    
    return { headers, rows };
  };
  
  // Parse a single CSV line, handling quotes and commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle quotes
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        // Add character to current field
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  };
  
  // Auto-detect column mappings based on header names
  const detectColumnMappings = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Try to match with our known header variations
      if (headerMappings[lowerHeader]) {
        mapping[index.toString()] = headerMappings[lowerHeader];
      } else {
        // Try fuzzy matching
        for (const [key, value] of Object.entries(headerMappings)) {
          if (lowerHeader.includes(key)) {
            mapping[index.toString()] = value;
            break;
          }
        }
        
        // Default to not importing if no match found
        if (!mapping[index.toString()]) {
          mapping[index.toString()] = 'none';
        }
      }
    });
    
    return mapping;
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    // Reset states when selecting a new file
    setFile(selectedFile);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadResult(null);
    setErrorMessage(null);
    setCsvData(null);
    setColumnMapping({});
    setCurrentStep('upload');
    
    // Basic file validation
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setErrorMessage('Please select a valid CSV file');
        setFile(null);
        return;
      } else if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('File size should be less than 5MB');
        setFile(null);
        return;
      }
      
      // Read file contents for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        try {
          // Parse CSV data
          const parsedData = parseCSV(text);
          setCsvData(parsedData);
          
          // Auto-detect column mappings
          const detectedMapping = detectColumnMappings(parsedData.headers);
          setColumnMapping(detectedMapping);
          
          // Move to mapping step
          setCurrentStep('mapping');
          setActiveTab('mapping');
        } catch (error) {
          setErrorMessage(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setFile(null);
        }
      };
      
      reader.onerror = () => {
        setErrorMessage('Failed to read the file');
        setFile(null);
      };
      
      reader.readAsText(selectedFile);
    }
  };

  // Prepare mapped data for upload
  const prepareDataForUpload = () => {
    if (!csvData) return null;
    
    // Create the mapped data structure
    const mappedRows = csvData.rows.map(row => {
      const mappedRow: Record<string, string> = {};
      
      // Apply column mappings
      Object.entries(columnMapping).forEach(([index, field]) => {
        if (field !== 'none') {
          // Get the value from the row using the index
          const value = row[parseInt(index)] || '';
          mappedRow[field] = value;
        }
      });
      
      return mappedRow;
    });
    
    return mappedRows;
  };
  
  // Handle column mapping change
  const handleMappingChange = (columnIndex: string, newMapping: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnIndex]: newMapping
    }));
  };
  
  // Proceed to preview after mapping
  const handleProceedToPreview = () => {
    // Check if required fields are mapped
    const requiredFields = ['date', 'amount', 'merchant'];
    const mappedFields = Object.values(columnMapping);
    
    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingFields.length > 0) {
      setErrorMessage(`Missing required fields: ${missingFields.join(', ')}. Please map these fields to continue.`);
      return;
    }
    
    setCurrentStep('preview');
    setActiveTab('preview');
    setErrorMessage(null);
  };
  
  // Move back from preview to mapping
  const handleBackToMapping = () => {
    setCurrentStep('mapping');
    setActiveTab('mapping');
  };

  const handleUpload = async () => {
    if (!file || !csvData) {
      setErrorMessage('Please select a CSV file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setUploadProgress(10);
      
      // Prepare the data
      const mappedData = prepareDataForUpload();
      
      if (!mappedData || mappedData.length === 0) {
        throw new Error('No valid data to upload');
      }

      // Simulate progress (for UX purposes)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 200);

      // Upload the mapped data
      const response = await fetch('/api/transactions/import-mapped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: mappedData }),
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
      setCurrentStep('success');
      
      // Force invalidate and refresh queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/transactions/summary'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      
      // Explicitly force refetch all transaction-related data
      await queryClient.refetchQueries({ queryKey: ['/api/transactions'] });
      await queryClient.refetchQueries({ queryKey: ['/api/transactions/summary'] });
      
      console.log('Transaction data refreshed after CSV import');
      
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
      setCsvData(null);
      setColumnMapping({});
      setCurrentStep('upload');
      setActiveTab('upload');
    }
  };

  // Render the mapping tab
  const renderMappingTab = () => {
    if (!csvData || !file) return null;
    
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV Column</TableHead>
                <TableHead>Map To</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvData.headers.map((header, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell>
                    <Select
                      value={columnMapping[index.toString()] || 'none'}
                      onValueChange={(value) => handleMappingChange(index.toString(), value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {csvData.rows.length > 0 ? csvData.rows[0][index] : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Map each column in your CSV file to the corresponding field in Rivu. <span className="font-medium">Date</span>, <span className="font-medium">Amount</span>, and <span className="font-medium">Merchant</span> are required.
          </p>
        </div>
      </div>
    );
  };

  // Render the preview tab
  const renderPreviewTab = () => {
    if (!csvData || !file) return null;
    
    const mappedData = prepareDataForUpload();
    if (!mappedData || mappedData.length === 0) return null;
    
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card overflow-hidden max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappedData.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date || '-'}</TableCell>
                  <TableCell>{row.merchant || '-'}</TableCell>
                  <TableCell>{row.category || '-'}</TableCell>
                  <TableCell className="text-right">{row.amount || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Preview of the first 10 transactions that will be imported. Total transactions: {mappedData.length}
          </p>
        </div>
      </div>
    );
  };

  // Render the upload tab
  const renderUploadTab = () => {
    return (
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
        
        <div className="text-xs text-muted-foreground mt-6 max-w-sm">
          <p className="font-medium mb-1">Common CSV Formats Supported:</p>
          <p className="mb-2">We support many column headers including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Date, Date Posted, Transaction Date</li>
            <li>Amount, Sum, Debit/Credit</li>
            <li>Description, Merchant, Payee, Vendor</li>
            <li>Category, Type, Transaction Type</li>
            <li>Account, Account Name, Account Number</li>
          </ul>
        </div>
      </div>
    );
  };

  // Render tab content based on current step
  const renderTabContent = () => {
    if (uploadStatus === 'success' && uploadResult) {
      return (
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
      );
    }
    
    switch (activeTab) {
      case 'upload':
        return renderUploadTab();
      case 'mapping':
        return renderMappingTab();
      case 'preview':
        return renderPreviewTab();
      default:
        return renderUploadTab();
    }
  };

  // Render upload progress
  const renderProgress = () => {
    if (uploadStatus === 'uploading') {
      return (
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      );
    }
    return null;
  };

  // Render footer buttons based on current step
  const renderFooterButtons = () => {
    if (uploadStatus === 'success') {
      return (
        <Button 
          onClick={handleClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      );
    }
    
    switch (currentStep) {
      case 'upload':
        return (
          <>
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            {file && csvData && (
              <Button 
                onClick={() => {
                  setCurrentStep('mapping');
                  setActiveTab('mapping');
                }}
                disabled={isUploading}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        );
      case 'mapping':
        return (
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentStep('upload');
                setActiveTab('upload');
              }}
              disabled={isUploading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button 
              onClick={handleProceedToPreview}
              disabled={isUploading}
            >
              Preview <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        );
      case 'preview':
        return (
          <>
            <Button 
              variant="outline" 
              onClick={handleBackToMapping}
              disabled={isUploading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Adjust Mapping
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4" />
                  Import Transactions
                </>
              )}
            </Button>
          </>
        );
      default:
        return (
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your transactions to import them into Rivu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {currentStep !== 'success' && csvData && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" disabled={currentStep !== 'upload'}>Upload</TabsTrigger>
                <TabsTrigger value="mapping" disabled={currentStep !== 'mapping' && currentStep !== 'upload'}>Column Mapping</TabsTrigger>
                <TabsTrigger value="preview" disabled={currentStep !== 'preview' && currentStep !== 'mapping'}>Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          {renderTabContent()}
          {renderProgress()}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}