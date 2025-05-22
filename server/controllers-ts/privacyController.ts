import { Request, Response } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { 
  users, 
  transactions, 
  savingsGoals, 
  budgetCategories,
  userConsents,
  categories,
  subcategories,
  plaidItems,
  plaidAccounts,
  rivuScores
} from '../../shared/schema';

// Extend Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user: {
    _id: string;  // MongoDB uses _id
    [key: string]: any;
  };
}
import { storage } from '../storage';

/**
 * @desc    Export all user data in JSON format (GDPR/privacy compliance)
 * @route   GET /api/privacy/export-data
 * @access  Private
 */
export const exportUserData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.user.id);
    
    // Fetch all user's data from various tables
    const userData = await db.select().from(users).where(eq(users.id, userId));
    const transactionsData = await db.select().from(transactions).where(eq(transactions.userId, userId));
    const goalsData = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
    const budgetData = await db.select().from(budgetCategories).where(eq(budgetCategories.userId, userId));
    const categoriesData = await db.select().from(categories).where(eq(categories.userId, userId));
    const consentData = await db.select().from(userConsents).where(eq(userConsents.userId, userId));
    const scoresData = await db.select().from(rivuScores).where(eq(rivuScores.userId, userId));
    
    // Fetch related data
    const subcategoriesData = [];
    for (const category of categoriesData) {
      const subs = await db.select().from(subcategories).where(eq(subcategories.categoryId, category.id));
      subcategoriesData.push(...subs);
    }
    
    // For Plaid data, only include non-sensitive information
    const plaidItemsData = await db.select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
      status: plaidItems.status,
      createdAt: plaidItems.createdAt,
      lastUpdated: plaidItems.lastUpdated
    }).from(plaidItems).where(eq(plaidItems.userId, userId));
    
    const plaidAccountsData = await db.select({
      id: plaidAccounts.id,
      name: plaidAccounts.name,
      officialName: plaidAccounts.officialName,
      type: plaidAccounts.type,
      subtype: plaidAccounts.subtype,
      mask: plaidAccounts.mask,
      createdAt: plaidAccounts.createdAt
    }).from(plaidAccounts).where(eq(plaidAccounts.userId, userId));

    // Compile all data into a single object
    const userDataExport = {
      user: userData[0] ? {
        ...userData[0],
        password: undefined // Remove sensitive data
      } : null,
      transactions: transactionsData,
      savingsGoals: goalsData,
      budgetCategories: budgetData,
      categories: categoriesData,
      subcategories: subcategoriesData,
      consents: consentData,
      rivuScores: scoresData,
      plaidItems: plaidItemsData,
      plaidAccounts: plaidAccountsData
    };

    // Set filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `rivu-data-export-${timestamp}.json`;
    
    // Set headers to prompt download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/json');
    
    // Send data
    res.json(userDataExport);
    
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ 
      message: 'Failed to export user data',
      code: 'EXPORT_FAILED'
    });
  }
};

/**
 * @desc    Export user data in CSV format
 * @route   GET /api/privacy/export-data/csv
 * @access  Private
 */
export const exportUserDataCSV = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user.id);
    
    // Fetch transactions for CSV export (most commonly needed in CSV format)
    const transactionsData = await db.select().from(transactions).where(eq(transactions.userId, userId));
    
    // Helper function to convert object to CSV row
    const objectToCSV = (obj: any) => {
      const headers = Object.keys(obj[0]).join(',');
      const rows = obj.map(item => {
        return Object.values(item).map(value => {
          // Handle values with commas by wrapping in quotes
          if (value === null || value === undefined) return '""';
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"`
            : `"${value}"`;
        }).join(',');
      }).join('\n');
      
      return `${headers}\n${rows}`;
    };
    
    // Build CSV content
    const csvContent = objectToCSV(transactionsData);
    
    // Set filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `rivu-transactions-export-${timestamp}.csv`;
    
    // Set headers to prompt download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'text/csv');
    
    // Send data
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting CSV data:', error);
    res.status(500).json({ 
      message: 'Failed to export CSV data',
      code: 'CSV_EXPORT_FAILED'
    });
  }
};

/**
 * @desc    Delete user account and all associated data (GDPR right to be forgotten)
 * @route   DELETE /api/privacy/delete-account
 * @access  Private
 */
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user.id);
    
    // Require confirmation with password
    const { password, confirmation } = req.body;
    
    if (!password) {
      return res.status(400).json({
        message: 'Password is required to delete your account',
        code: 'PASSWORD_REQUIRED'
      });
    }
    
    if (confirmation !== 'DELETE_MY_ACCOUNT_PERMANENTLY') {
      return res.status(400).json({
        message: 'Please provide correct confirmation phrase to delete your account',
        code: 'INVALID_CONFIRMATION'
      });
    }
    
    // Verify password before proceeding with deletion
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check password using bcrypt
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Incorrect password',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Log the deletion request for compliance
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    await db.insert(userConsents).values({
      userId,
      consentType: 'account_deletion',
      ipAddress,
      userAgent,
      consentValue: true,
      consentVersion: '1.0',
    });
    
    // Delete all user data - let the database CASCADE handle related deletions
    // Due to foreign key constraints and CASCADE delete, this will remove:
    // - user's transactions
    // - user's goals
    // - user's budgets
    // - user's categories and subcategories
    // - user's consents
    // - user's plaid connections
    await db.delete(users).where(eq(users.id, userId));
    
    // Send success response
    res.json({
      message: 'Your account and all associated data have been permanently deleted',
      code: 'ACCOUNT_DELETED'
    });
    
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ 
      message: 'Failed to delete account',
      code: 'DELETION_FAILED'
    });
  }
};

/**
 * @desc    Log user's privacy consent
 * @route   POST /api/privacy/consent
 * @access  Private
 */
export const logPrivacyConsent = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user.id);
    const { consentType, consentValue, consentVersion } = req.body;
    
    if (!consentType) {
      return res.status(400).json({
        message: 'Consent type is required',
        code: 'MISSING_CONSENT_TYPE'
      });
    }
    
    // Log the user's consent with IP address and user agent for compliance
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    await db.insert(userConsents).values({
      userId,
      consentType,
      ipAddress,
      userAgent,
      consentValue: consentValue !== false, // Default to true if not explicitly false
      consentVersion: consentVersion || '1.0',
    });
    
    // If this is data processing consent, update the user record
    if (consentType === 'data_processing') {
      await db.update(users)
        .set({ 
          dataConsentGiven: consentValue !== false,
          dataConsentDate: new Date()
        })
        .where(eq(users.id, userId));
    }
    
    // If this is marketing consent, update the user record
    if (consentType === 'marketing') {
      await db.update(users)
        .set({ marketingConsentGiven: consentValue !== false })
        .where(eq(users.id, userId));
    }
    
    // If this is privacy policy acceptance, update the user record
    if (consentType === 'privacy_policy') {
      await db.update(users)
        .set({ lastPrivacyPolicyAccepted: new Date() })
        .where(eq(users.id, userId));
    }
    
    res.json({
      message: 'Privacy consent recorded successfully',
      consentType,
      consentValue: consentValue !== false
    });
    
  } catch (error) {
    console.error('Error recording privacy consent:', error);
    res.status(500).json({ 
      message: 'Failed to record privacy consent',
      code: 'CONSENT_RECORDING_FAILED'
    });
  }
};

/**
 * @desc    Detect and store user's country code based on IP
 * @route   POST /api/privacy/detect-country
 * @access  Private
 */
export const detectCountry = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.user.id);
    // Client may send country code if they detect it client-side
    const { countryCode: clientCountryCode } = req.body;
    
    // Use client-provided country code if available
    let countryCode = clientCountryCode;
    
    // If not provided, try to detect from IP
    if (!countryCode) {
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      
      // Simple logic to detect if IP might be non-US
      // In a production environment, you would use a proper IP geolocation service
      const isLocalIP = ipAddress.startsWith('127.') || 
                        ipAddress.startsWith('10.') || 
                        ipAddress.startsWith('192.168.') ||
                        ipAddress === '::1';
                        
      // For demo purposes, default to US if local IP
      countryCode = isLocalIP ? 'US' : 'UNKNOWN';
    }
    
    // Store the country code in user profile
    await db.update(users)
      .set({ countryCode })
      .where(eq(users.id, userId));
    
    res.json({
      message: 'Country detected and saved',
      countryCode
    });
    
  } catch (error) {
    console.error('Error detecting country:', error);
    res.status(500).json({ 
      message: 'Failed to detect country',
      code: 'COUNTRY_DETECTION_FAILED'
    });
  }
};