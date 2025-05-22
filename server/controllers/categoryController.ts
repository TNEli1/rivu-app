import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertCategorySchema, insertSubcategorySchema } from '@shared/schema';
import { z } from 'zod';

// Custom Request type that includes user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

// Get all categories for the authenticated user
export const getCategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if a type filter was specified (expense or income)
    const type = req.query.type as string | undefined;
    
    const categories = await storage.getCategories(req.user.id, type);
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch categories'
    });
  }
};

// Get a specific category by ID
export const getCategoryById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if this category belongs to the authenticated user
    if (category.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to category' });
    }
    
    return res.status(200).json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch category'
    });
  }
};

// Create a new category for the authenticated user
export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Validate request body
    const validationResult = insertCategorySchema.safeParse({
      ...req.body,
      userId: req.user.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid category data',
        errors: validationResult.error.format()
      });
    }
    
    // Create the category
    const category = await storage.createCategory(validationResult.data);
    
    return res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ 
      message: 'Failed to create category'
    });
  }
};

// Update an existing category
export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // Fetch the existing category to verify ownership
    const existingCategory = await storage.getCategory(categoryId);
    
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if this category belongs to the authenticated user
    if (existingCategory.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to category' });
    }
    
    // Update the category
    const updatedCategory = await storage.updateCategory(categoryId, req.body);
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    return res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ 
      message: 'Failed to update category'
    });
  }
};

// Delete a category
export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // Fetch the existing category to verify ownership
    const existingCategory = await storage.getCategory(categoryId);
    
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if this category belongs to the authenticated user
    if (existingCategory.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to category' });
    }
    
    // Delete the category
    const result = await storage.deleteCategory(categoryId);
    
    if (!result) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    return res.status(200).json({
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ 
      message: 'Failed to delete category'
    });
  }
};

// Get all subcategories for a category
export const getSubcategories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // First verify that the category belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if this category belongs to the authenticated user
    if (category.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to category' });
    }
    
    const subcategories = await storage.getSubcategories(categoryId);
    return res.status(200).json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch subcategories'
    });
  }
};

// Create a new subcategory for a category
export const createSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // First verify that the category belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if this category belongs to the authenticated user
    if (category.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to category' });
    }
    
    // Validate request body
    const validationResult = insertSubcategorySchema.safeParse({
      ...req.body,
      categoryId
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid subcategory data',
        errors: validationResult.error.format()
      });
    }
    
    // Create the subcategory
    const subcategory = await storage.createSubcategory(validationResult.data);
    
    return res.status(201).json({
      message: 'Subcategory created successfully',
      subcategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return res.status(500).json({ 
      message: 'Failed to create subcategory'
    });
  }
};

// Update an existing subcategory
export const updateSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subcategoryId = parseInt(req.params.id);
    
    if (isNaN(subcategoryId)) {
      return res.status(400).json({ message: 'Invalid subcategory ID' });
    }
    
    // Fetch the existing subcategory to get its category ID
    const existingSubcategory = await storage.getSubcategory(subcategoryId);
    
    if (!existingSubcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }
    
    // Get the category to verify ownership
    const category = await storage.getCategory(existingSubcategory.categoryId);
    
    // Check if the category belongs to the authenticated user
    if (!category || category.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to subcategory' });
    }
    
    // Update the subcategory
    const updatedSubcategory = await storage.updateSubcategory(subcategoryId, req.body);
    
    if (!updatedSubcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }
    
    return res.status(200).json({
      message: 'Subcategory updated successfully',
      subcategory: updatedSubcategory
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return res.status(500).json({ 
      message: 'Failed to update subcategory'
    });
  }
};

// Delete a subcategory
export const deleteSubcategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subcategoryId = parseInt(req.params.id);
    
    if (isNaN(subcategoryId)) {
      return res.status(400).json({ message: 'Invalid subcategory ID' });
    }
    
    // Fetch the existing subcategory to get its category ID
    const existingSubcategory = await storage.getSubcategory(subcategoryId);
    
    if (!existingSubcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }
    
    // Get the category to verify ownership
    const category = await storage.getCategory(existingSubcategory.categoryId);
    
    // Check if the category belongs to the authenticated user
    if (!category || category.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to subcategory' });
    }
    
    // Delete the subcategory
    const result = await storage.deleteSubcategory(subcategoryId);
    
    if (!result) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }
    
    return res.status(200).json({
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return res.status(500).json({ 
      message: 'Failed to delete subcategory'
    });
  }
};