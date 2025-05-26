// Transaction category mapping and icon system for Rivu Inc
export interface CategoryInfo {
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

// Enhanced category mapping with icons and keywords for intelligent categorization
export const CATEGORY_MAPPINGS: Record<string, CategoryInfo> = {
  'Groceries': {
    name: 'Groceries',
    icon: '🛒',
    color: 'bg-green-500',
    keywords: ['grocery', 'supermarket', 'whole foods', 'trader joe', 'safeway', 'kroger', 'walmart', 'costco', 'target', 'food', 'produce']
  },
  'Dining': {
    name: 'Dining',
    icon: '🍽️',
    color: 'bg-orange-500',
    keywords: ['restaurant', 'cafe', 'starbucks', 'mcdonalds', 'burger', 'pizza', 'dining', 'food delivery', 'uber eats', 'doordash', 'grubhub']
  },
  'Transportation': {
    name: 'Transportation',
    icon: '🚗',
    color: 'bg-blue-500',
    keywords: ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'metro', 'bus', 'train', 'parking', 'toll', 'car wash', 'automotive']
  },
  'Entertainment': {
    name: 'Entertainment',
    icon: '🎬',
    color: 'bg-purple-500',
    keywords: ['netflix', 'spotify', 'movie', 'theater', 'gaming', 'steam', 'xbox', 'playstation', 'concert', 'entertainment']
  },
  'Subscriptions': {
    name: 'Subscriptions',
    icon: '💳',
    color: 'bg-indigo-500',
    keywords: ['subscription', 'monthly', 'annual', 'recurring', 'membership', 'premium', 'plus', 'pro']
  },
  'Utilities': {
    name: 'Utilities',
    icon: '💡',
    color: 'bg-yellow-500',
    keywords: ['electric', 'water', 'gas', 'internet', 'phone', 'utility', 'power', 'energy', 'cable', 'wifi']
  },
  'Health': {
    name: 'Health',
    icon: '⚕️',
    color: 'bg-red-500',
    keywords: ['pharmacy', 'doctor', 'medical', 'hospital', 'health', 'dental', 'vision', 'cvs', 'walgreens', 'clinic']
  },
  'Shopping': {
    name: 'Shopping',
    icon: '🛍️',
    color: 'bg-pink-500',
    keywords: ['amazon', 'shop', 'store', 'retail', 'clothing', 'apparel', 'fashion', 'electronics', 'purchase']
  },
  'Travel': {
    name: 'Travel',
    icon: '✈️',
    color: 'bg-teal-500',
    keywords: ['airline', 'hotel', 'airbnb', 'flight', 'booking', 'travel', 'vacation', 'trip', 'expedia', 'kayak']
  },
  'Income': {
    name: 'Income',
    icon: '💰',
    color: 'bg-emerald-500',
    keywords: ['salary', 'payroll', 'wage', 'income', 'payment', 'earnings', 'bonus', 'refund', 'cashback']
  },
  'Uncategorized': {
    name: 'Uncategorized',
    icon: '❓',
    color: 'bg-gray-500',
    keywords: []
  }
};

// Intelligent categorization function using keywords and merchant names
export function categorizeTransaction(merchantName: string, description?: string): CategoryInfo {
  const searchText = `${merchantName} ${description || ''}`.toLowerCase();
  
  // Check each category for keyword matches
  for (const [categoryKey, categoryInfo] of Object.entries(CATEGORY_MAPPINGS)) {
    if (categoryKey === 'Uncategorized') continue;
    
    for (const keyword of categoryInfo.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return categoryInfo;
      }
    }
  }
  
  return CATEGORY_MAPPINGS['Uncategorized'];
}

// Map Plaid categories to our internal categories
export function mapPlaidCategory(plaidCategory: string[]): CategoryInfo {
  if (!plaidCategory || plaidCategory.length === 0) {
    return CATEGORY_MAPPINGS['Uncategorized'];
  }
  
  const primary = plaidCategory[0]?.toLowerCase();
  const secondary = plaidCategory[1]?.toLowerCase();
  
  // Map Plaid categories to our categories
  const plaidMappings: Record<string, string> = {
    'food and drink': 'Dining',
    'shops': 'Shopping',
    'recreation': 'Entertainment',
    'transportation': 'Transportation',
    'healthcare': 'Health',
    'service': 'Utilities',
    'payment': 'Subscriptions',
    'travel': 'Travel',
    'deposit': 'Income',
    'payroll': 'Income'
  };
  
  // Check for specific subcategories first
  if (secondary === 'groceries' || secondary === 'supermarkets') {
    return CATEGORY_MAPPINGS['Groceries'];
  }
  
  // Map primary category
  const mappedCategory = plaidMappings[primary];
  return mappedCategory ? CATEGORY_MAPPINGS[mappedCategory] : CATEGORY_MAPPINGS['Uncategorized'];
}

// Get category insights for monthly analysis
export function getCategoryInsights(transactions: any[], previousMonthTransactions: any[] = []) {
  const currentMonthByCategory: Record<string, number> = {};
  const previousMonthByCategory: Record<string, number> = {};
  
  // Analyze current month
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      currentMonthByCategory[tx.category] = (currentMonthByCategory[tx.category] || 0) + amount;
    }
  });
  
  // Analyze previous month
  previousMonthTransactions.forEach(tx => {
    if (tx.type === 'expense') {
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      previousMonthByCategory[tx.category] = (previousMonthByCategory[tx.category] || 0) + amount;
    }
  });
  
  // Calculate insights
  const insights = [];
  const categories = [...new Set([...Object.keys(currentMonthByCategory), ...Object.keys(previousMonthByCategory)])];
  
  for (const category of categories) {
    const current = currentMonthByCategory[category] || 0;
    const previous = previousMonthByCategory[category] || 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    insights.push({
      category,
      currentAmount: current,
      previousAmount: previous,
      percentChange: Math.round(change),
      categoryInfo: CATEGORY_MAPPINGS[category] || CATEGORY_MAPPINGS['Uncategorized']
    });
  }
  
  // Sort by current amount (highest first)
  return insights.sort((a, b) => b.currentAmount - a.currentAmount);
}