/**
 * Transaction Categorization Engine
 * Maps Plaid transaction categories to simplified, user-friendly categories with icons
 */

export interface CategoryMapping {
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

// Core category mappings with icons and colors
export const CATEGORY_MAPPINGS: Record<string, CategoryMapping> = {
  // Food & Dining
  'Food and Drink': {
    name: 'Food & Dining',
    icon: '🍽️',
    color: '#FF6B6B',
    keywords: ['restaurant', 'fast food', 'coffee', 'bar', 'cafes', 'food', 'dining', 'takeout']
  },
  'Restaurants': {
    name: 'Food & Dining', 
    icon: '🍽️',
    color: '#FF6B6B',
    keywords: ['restaurant', 'dining', 'food']
  },
  
  // Groceries
  'Shops': {
    name: 'Groceries',
    icon: '🛒',
    color: '#4ECDC4',
    keywords: ['grocery', 'supermarket', 'walmart', 'target', 'costco', 'market']
  },
  'Food and Drink, Groceries': {
    name: 'Groceries',
    icon: '🛒', 
    color: '#4ECDC4',
    keywords: ['grocery', 'food']
  },
  
  // Transportation
  'Transportation': {
    name: 'Transportation',
    icon: '🚗',
    color: '#45B7D1',
    keywords: ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'parking', 'toll', 'transit', 'car']
  },
  'Transportation, Gas Stations': {
    name: 'Transportation',
    icon: '⛽',
    color: '#45B7D1', 
    keywords: ['gas', 'fuel', 'station']
  },
  
  // Shopping
  'Shops, General Merchandise': {
    name: 'Shopping',
    icon: '🛍️',
    color: '#96CEB4',
    keywords: ['amazon', 'retail', 'shopping', 'merchandise', 'store']
  },
  'Shops, Clothing and Accessories': {
    name: 'Shopping',
    icon: '👕',
    color: '#96CEB4',
    keywords: ['clothing', 'fashion', 'accessories', 'apparel']
  },
  
  // Bills & Utilities
  'Payment, Rent': {
    name: 'Housing',
    icon: '🏠',
    color: '#DDA0DD',
    keywords: ['rent', 'mortgage', 'housing', 'property']
  },
  'Bills': {
    name: 'Bills & Utilities',
    icon: '💡',
    color: '#F39C12',
    keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'utility', 'bill']
  },
  
  // Entertainment
  'Recreation': {
    name: 'Entertainment',
    icon: '🎬',
    color: '#E74C3C',
    keywords: ['movie', 'entertainment', 'streaming', 'netflix', 'spotify', 'gaming']
  },
  'Arts and Entertainment': {
    name: 'Entertainment',
    icon: '🎭',
    color: '#E74C3C',
    keywords: ['arts', 'entertainment', 'theater', 'museum']
  },
  
  // Health & Fitness
  'Healthcare': {
    name: 'Healthcare',
    icon: '⚕️',
    color: '#2ECC71',
    keywords: ['doctor', 'hospital', 'pharmacy', 'medical', 'health', 'dental']
  },
  
  // Travel
  'Travel': {
    name: 'Travel',
    icon: '✈️',
    color: '#3498DB',
    keywords: ['airline', 'hotel', 'travel', 'vacation', 'booking', 'airbnb']
  },
  
  // Income
  'Deposit': {
    name: 'Income',
    icon: '💰',
    color: '#27AE60',
    keywords: ['salary', 'paycheck', 'deposit', 'income', 'payment', 'refund']
  },
  'Payroll': {
    name: 'Income',
    icon: '💼',
    color: '#27AE60',
    keywords: ['payroll', 'salary', 'wage']
  },
  
  // Financial Services
  'Bank Fees': {
    name: 'Fees & Charges',
    icon: '🏦',
    color: '#E67E22',
    keywords: ['fee', 'charge', 'atm', 'bank', 'overdraft']
  },
  'Transfer': {
    name: 'Transfers',
    icon: '🔄',
    color: '#9B59B6',
    keywords: ['transfer', 'payment', 'venmo', 'paypal', 'zelle']
  }
};

/**
 * Categorizes a transaction based on Plaid category and merchant info
 */
export function categorizeTransaction(
  plaidCategory: string[] | null | undefined,
  merchant: string,
  amount: number
): { category: string; icon: string; color: string } {
  
  // Handle income vs expense
  const isIncome = amount > 0;
  if (isIncome) {
    return {
      category: 'Income',
      icon: '💰', 
      color: '#27AE60'
    };
  }
  
  // If no Plaid category, try to categorize by merchant name
  if (!plaidCategory || plaidCategory.length === 0) {
    return categorizeByMerchant(merchant);
  }
  
  // Try to match Plaid category hierarchy (most specific first)
  const fullCategory = plaidCategory.join(', ');
  
  // Check for exact matches first
  if (CATEGORY_MAPPINGS[fullCategory]) {
    const mapping = CATEGORY_MAPPINGS[fullCategory];
    return {
      category: mapping.name,
      icon: mapping.icon,
      color: mapping.color
    };
  }
  
  // Check for primary category matches
  const primaryCategory = plaidCategory[0];
  if (CATEGORY_MAPPINGS[primaryCategory]) {
    const mapping = CATEGORY_MAPPINGS[primaryCategory];
    return {
      category: mapping.name,
      icon: mapping.icon, 
      color: mapping.color
    };
  }
  
  // Fallback to merchant-based categorization
  return categorizeByMerchant(merchant);
}

/**
 * Fallback categorization based on merchant name
 */
function categorizeByMerchant(merchant: string): { category: string; icon: string; color: string } {
  const merchantLower = merchant.toLowerCase();
  
  // Check each category's keywords
  for (const mapping of Object.values(CATEGORY_MAPPINGS)) {
    for (const keyword of mapping.keywords) {
      if (merchantLower.includes(keyword.toLowerCase())) {
        return {
          category: mapping.name,
          icon: mapping.icon,
          color: mapping.color
        };
      }
    }
  }
  
  // Default category for unmatched transactions
  return {
    category: 'Other',
    icon: '📄',
    color: '#95A5A6'
  };
}

/**
 * Generates spending insights for categorized transactions
 */
export function generateSpendingInsights(transactions: any[]): {
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
    icon: string;
    color: string;
  }>;
  totalSpent: number;
  monthOverMonth: Record<string, number>;
  alerts: Array<{
    type: 'warning' | 'info';
    message: string;
    category?: string;
  }>;
} {
  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
  // Group by category
  const categoryTotals: Record<string, { amount: number; icon: string; color: string }> = {};
  
  transactions.forEach(transaction => {
    if (transaction.amount >= 0) return; // Skip income
    
    const { category, icon, color } = categorizeTransaction(
      transaction.categoryId ? [transaction.categoryId] : null,
      transaction.merchant,
      transaction.amount
    );
    
    if (!categoryTotals[category]) {
      categoryTotals[category] = { amount: 0, icon, color };
    }
    categoryTotals[category].amount += Math.abs(transaction.amount);
  });
  
  // Convert to sorted array
  const topCategories = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: (data.amount / totalSpent) * 100,
      icon: data.icon,
      color: data.color
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8); // Top 8 categories
  
  // Generate alerts
  const alerts: Array<{ type: 'warning' | 'info'; message: string; category?: string }> = [];
  
  // Check for overspending in dining
  const diningSpend = categoryTotals['Food & Dining']?.amount || 0;
  if (diningSpend > 500) {
    alerts.push({
      type: 'warning',
      message: `You've spent $${diningSpend.toFixed(0)} on dining this month. Consider cooking more meals at home to save money.`,
      category: 'Food & Dining'
    });
  }
  
  // Check for high shopping spend
  const shoppingSpend = categoryTotals['Shopping']?.amount || 0;
  if (shoppingSpend > 800) {
    alerts.push({
      type: 'warning', 
      message: `Shopping expenses are high at $${shoppingSpend.toFixed(0)} this month. Review your recent purchases for savings opportunities.`,
      category: 'Shopping'
    });
  }
  
  // Positive insight for transportation savings
  const transportSpend = categoryTotals['Transportation']?.amount || 0;
  if (transportSpend < 200) {
    alerts.push({
      type: 'info',
      message: `Great job keeping transportation costs low at $${transportSpend.toFixed(0)} this month!`,
      category: 'Transportation'
    });
  }
  
  return {
    topCategories,
    totalSpent,
    monthOverMonth: {}, // TODO: Implement month-over-month comparison
    alerts
  };
}

/**
 * Gets category icon for display
 */
export function getCategoryIcon(category: string): string {
  // Find matching category mapping
  for (const mapping of Object.values(CATEGORY_MAPPINGS)) {
    if (mapping.name === category) {
      return mapping.icon;
    }
  }
  return '📄'; // Default icon
}

/**
 * Gets category color for display  
 */
export function getCategoryColor(category: string): string {
  // Find matching category mapping
  for (const mapping of Object.values(CATEGORY_MAPPINGS)) {
    if (mapping.name === category) {
      return mapping.color;
    }
  }
  return '#95A5A6'; // Default color
}