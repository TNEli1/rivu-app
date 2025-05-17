import { storage } from '../storage';
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set up multer for temporary file storage
const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Export the middleware for route setup
export const uploadCSV = upload.single('file');

/**
 * @desc    Import transactions from CSV file
 */
export const importCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'MISSING_FILE'
      });
    }

    const userId = (req as any).user.id;
    
    // Read the CSV file
    const csvData = fs.readFileSync(req.file.path, 'utf8');
    
    // Import transactions from the CSV
    const result = await storage.importTransactionsFromCSV(userId, csvData);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: `Successfully imported ${result.imported} transactions (${result.duplicates} potential duplicates detected)`,
      importedCount: result.imported,
      duplicatesCount: result.duplicates
    });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: error.message || 'Error importing transactions from CSV',
      code: 'IMPORT_ERROR'
    });
  }
};

/**
 * @desc    Handle errors from multer middleware
 */
export const handleMulterError = (err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File is too large. Maximum size is 2MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      message: err.message || 'An unknown error occurred during upload',
      code: 'UNKNOWN_ERROR'
    });
  }
  
  // If no error, continue
  next();
};