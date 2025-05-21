import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

// Define the account type
type TransactionAccount = {
  id: string;
  name: string;
  type: string;
  institutionName?: string;
  lastFour?: string;
};

// Define the form schema
const accountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.string().min(1, 'Account type is required'),
  institutionName: z.string().optional(),
  lastFour: z.string().max(4, 'Last four should be at most 4 digits').optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface TransactionAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TransactionAccount | null;
  onSuccess?: () => void;
}

export default function TransactionAccountDialog({ 
  isOpen, 
  onClose, 
  initialData = null,
  onSuccess
}: TransactionAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  // Set up form with validation
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || '',
      institutionName: initialData?.institutionName || '',
      lastFour: initialData?.lastFour || '',
    },
  });
  
  // Reset form when dialog is opened/closed or initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
        type: initialData?.type || '',
        institutionName: initialData?.institutionName || '',
        lastFour: initialData?.lastFour || '',
      });
    }
  }, [isOpen, initialData, form]);
  
  // Create account mutation
  const createMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const response = await apiRequest('POST', '/api/accounts', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Account created',
        description: 'Your transaction account has been created successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create account',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const response = await apiRequest('PUT', `/api/accounts/${initialData?.id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: 'Account updated',
        description: 'Your transaction account has been updated successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to update account',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: AccountFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Check if mutation is in progress
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Account' : 'Add Transaction Account'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your transaction account details below.' 
              : 'Create a new transaction account to categorize your expenses and income.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Checking Account" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a name that helps you identify this account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="institutionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Name <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Chase Bank" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>
                    The financial institution this account belongs to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastFour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Four Digits <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 1234" 
                      maxLength={4}
                      {...field} 
                      value={field.value || ''}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Last four digits of the account number for identification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Account' : 'Create Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}