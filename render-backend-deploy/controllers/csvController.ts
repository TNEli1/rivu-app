import { Request, Response } from 'express';
import multer from 'multer';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Custom Request type that includes user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username?: string;
    [key: string]: any;
  };
}

// Configure multer for file upload
const csvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'tmp');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Create unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware for handling file upload
export const uploadCSV = csvUpload.single('csv');

// Controller for processing CSV import
export const importTransactionsFromCSV = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get user ID from authenticated session
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Convert userId to number if it's a string (which it often is from auth)
    const userId = typeof req.user.id === 'string' ? parseInt(req.user.id, 10) : req.user.id;
    
    console.log(`Importing CSV transactions for authenticated user ID: ${userId}`);
    
    // Read file content
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Import transactions with explicit user ID verification
    const result = await storage.importTransactionsFromCSV(userId, fileContent);
    
    // Delete temporary file
    fs.unlinkSync(filePath);
    
    return res.status(200).json({
      message: 'CSV import completed',
      imported: result.imported,
      duplicates: result.duplicates
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to import transactions from CSV' 
    });
  }
};

// Controller for marking a transaction as not a duplicate
export const markTransactionAsNotDuplicate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactionId = parseInt(req.params.id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    
    const result = await storage.markTransactionAsNotDuplicate(transactionId);
    
    if (!result) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    return res.status(200).json({ 
      message: 'Transaction marked as not a duplicate',
      success: true
    });
  } catch (error) {
    console.error('Error marking transaction as not duplicate:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to update transaction'
    });
  }
};