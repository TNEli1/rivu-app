import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define subcategory type
type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
};

// Define category for parent relationship
type Category = {
  id: string;
  name: string;
};

// Define the form schema
const subcategoryFormSchema = z.object({
  name: z.string().min(1, 'Subcategory name is required'),
});

type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>;

interface SubcategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category; // Parent category
  initialData?: Subcategory | null;
  onSuccess?: () => void;
}

export default function SubcategoryDialog({ 
  isOpen, 
  onClose, 
  category,
  initialData = null,
  onSuccess
}: SubcategoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  // Set up form with validation
  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: {
      name: initialData?.name || '',
    },
  });
  
  // Reset form when dialog is opened/closed or initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: initialData?.name || '',
      });
    }
  }, [isOpen, initialData, form]);
  
  // Create subcategory mutation
  const createMutation = useMutation({
    mutationFn: async (data: SubcategoryFormValues) => {
      const response = await apiRequest('POST', `/api/categories/${category.id}/subcategories`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create subcategory');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${category.id}/subcategories`] });
      toast({
        title: 'Subcategory created',
        description: 'Your subcategory has been created successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create subcategory',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Update subcategory mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SubcategoryFormValues) => {
      const response = await apiRequest('PUT', `/api/subcategories/${initialData?.id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update subcategory');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${category.id}/subcategories`] });
      toast({
        title: 'Subcategory updated',
        description: 'Your subcategory has been updated successfully.',
      });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Failed to update subcategory',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: SubcategoryFormValues) => {
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
            {isEditing ? 'Edit Subcategory' : 'Add Subcategory'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Update subcategory for "${category.name}".` 
              : `Create a new subcategory for "${category.name}".`}
          </DialogDescription>
        </DialogHeader>
        
        {isEditing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Note about editing subcategories</AlertTitle>
            <AlertDescription>
              Editing a subcategory will affect all transactions that use this subcategory.
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
                  <FormLabel>Subcategory Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fast Food, Coffee" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a specific subcategory name within {category.name}
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
                  isEditing ? 'Update Subcategory' : 'Create Subcategory'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}