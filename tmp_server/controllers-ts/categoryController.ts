import { storage } from '../storage';
import { z } from 'zod';
import { insertCategorySchema, insertSubcategorySchema } from '@shared/schema';

/**
 * @desc    Get all categories for the current user
 */
export const getCategories = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const type = req.query.type; // Optional filter by type (expense/income)
    
    const categories = await storage.getCategories(userId, type);
    
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching categories',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a single category by ID
 */
export const getCategoryById = async (req: any, res: any) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    // Security check - ensure the category belongs to the current user
    if (category.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to access this category',
        code: 'FORBIDDEN'
      });
    }
    
    res.json(category);
  } catch (error: any) {
    console.error('Error fetching category:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new category
 */
export const createCategory = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Validate input
    const schema = insertCategorySchema.extend({
      name: z.string().min(1, 'Category name is required'),
      type: z.string().min(1, 'Category type is required')
    });
    
    const validatedData = schema.parse({
      ...req.body,
      userId
    });
    
    const newCategory = await storage.createCategory(validatedData);
    
    res.status(201).json(newCategory);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error creating category:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a category
 */
export const updateCategory = async (req: any, res: any) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);
    
    // First, check if the category exists and belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    if (category.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to update this category',
        code: 'FORBIDDEN'
      });
    }
    
    // Validate input
    const validatedData = z.object({
      name: z.string().optional(),
      type: z.string().optional()
    }).parse(req.body);
    
    const updatedCategory = await storage.updateCategory(categoryId, validatedData);
    
    res.json(updatedCategory);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error updating category:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a category
 */
export const deleteCategory = async (req: any, res: any) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);
    
    // First, check if the category exists and belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    if (category.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this category',
        code: 'FORBIDDEN'
      });
    }
    
    // Don't allow deleting default categories
    if (category.isDefault) {
      return res.status(400).json({
        message: 'Cannot delete default category',
        code: 'CANNOT_DELETE_DEFAULT'
      });
    }
    
    await storage.deleteCategory(categoryId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting category',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get all subcategories for a category
 */
export const getSubcategories = async (req: any, res: any) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    
    // First, check if the category exists and belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    if (category.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to access subcategories for this category',
        code: 'FORBIDDEN'
      });
    }
    
    const subcategories = await storage.getSubcategories(categoryId);
    
    res.json(subcategories);
  } catch (error: any) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching subcategories',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new subcategory
 */
export const createSubcategory = async (req: any, res: any) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    
    // First, check if the category exists and belongs to the user
    const category = await storage.getCategory(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }
    
    if (category.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to create subcategories for this category',
        code: 'FORBIDDEN'
      });
    }
    
    // Validate input
    const schema = insertSubcategorySchema.extend({
      name: z.string().min(1, 'Subcategory name is required')
    });
    
    const validatedData = schema.parse({
      ...req.body,
      categoryId
    });
    
    const newSubcategory = await storage.createSubcategory(validatedData);
    
    res.status(201).json(newSubcategory);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error creating subcategory:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating subcategory',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a subcategory
 */
export const updateSubcategory = async (req: any, res: any) => {
  try {
    const subcategoryId = parseInt(req.params.id, 10);
    
    // First, get the subcategory
    const subcategory = await storage.getSubcategory(subcategoryId);
    
    if (!subcategory) {
      return res.status(404).json({ 
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND'
      });
    }
    
    // Get the parent category to verify ownership
    const category = await storage.getCategory(subcategory.categoryId);
    
    if (!category || category.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to update this subcategory',
        code: 'FORBIDDEN'
      });
    }
    
    // Validate input
    const validatedData = z.object({
      name: z.string().optional()
    }).parse(req.body);
    
    const updatedSubcategory = await storage.updateSubcategory(subcategoryId, validatedData);
    
    res.json(updatedSubcategory);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error updating subcategory:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating subcategory',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a subcategory
 */
export const deleteSubcategory = async (req: any, res: any) => {
  try {
    const subcategoryId = parseInt(req.params.id, 10);
    
    // First, get the subcategory
    const subcategory = await storage.getSubcategory(subcategoryId);
    
    if (!subcategory) {
      return res.status(404).json({ 
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND'
      });
    }
    
    // Get the parent category to verify ownership
    const category = await storage.getCategory(subcategory.categoryId);
    
    if (!category || category.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this subcategory',
        code: 'FORBIDDEN'
      });
    }
    
    // Don't allow deleting default subcategories
    if (subcategory.isDefault) {
      return res.status(400).json({
        message: 'Cannot delete default subcategory',
        code: 'CANNOT_DELETE_DEFAULT'
      });
    }
    
    await storage.deleteSubcategory(subcategoryId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting subcategory',
      code: 'SERVER_ERROR'
    });
  }
};