import React, { useEffect } from 'react';
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
import { Loader2, Tag, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define category types
type CategoryType = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
};

// Define the form schema
const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: CategoryType | null;
  onSuccess?: () => void;
}

export default function CategoryDialog({ 
  isOpen, 
  onClose, 
  initialData = null,
  onSuccess
}: CategoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  // Set up form with validation
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'expense',
      icon: initialData?.icon || '',
      color: initialData?.color || '',
    },
  });
  
  // Reset form when dialog is opened/closed or initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
        type: initialData?.type || 'expense',
        icon: initialData?.icon || '',
        color: initialData?.color || '',
      });
    }
  }, [isOpen, initialData, form]);
  
  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const response = await apiRequest('POST', '/api/categories', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create category');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: 'Category created',
        description: 'Your transaction category has been created successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create category',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const response = await apiRequest('PUT', `/api/categories/${initialData?.id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: 'Category updated',
        description: 'Your transaction category has been updated successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to update category',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CategoryFormValues) => {
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
            {isEditing ? 'Edit Category' : 'Add Transaction Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your transaction category details below.' 
              : 'Create a new transaction category to organize your finances.'}
          </DialogDescription>
        </DialogHeader>
        
        {isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Note about editing categories</AlertTitle>
            <AlertDescription>
              Editing a category will affect all transactions that use this category.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a descriptive name for this transaction category
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
                  <FormLabel>Category Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose whether this is an income or expense category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input placeholder="e.g., ri-shopping-cart-line" {...field} value={field.value || ''} />
                      {field.value && (
                        <div className="bg-muted p-2 rounded h-10 w-10 flex items-center justify-center">
                          <i className={`${field.value} text-lg`}></i>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter a Remix icon class (e.g., ri-shopping-cart-line)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input placeholder="e.g., bg-blue-500" {...field} value={field.value || ''} />
                      {field.value && (
                        <div className={`h-6 w-6 rounded ${field.value}`}></div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter a Tailwind CSS color class (e.g., bg-blue-500)
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
                  isEditing ? 'Update Category' : 'Create Category'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}