// Example code showing how to use PostHog analytics for budget setting
import React, { useState } from 'react';
import { useAnalytics } from '@/lib/AnalyticsContext';

export function BudgetSettingForm() {
  const { trackBudgetSet } = useAnalytics();
  const [budgetTotal, setBudgetTotal] = useState('');
  const [categories, setCategories] = useState([
    { id: 1, name: 'Housing', amount: '' },
    { id: 2, name: 'Food', amount: '' },
    { id: 3, name: 'Transportation', amount: '' }
  ]);
  
  const handleCategoryChange = (id: number, amount: string) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, amount } : cat
    ));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate total from all categories
    const total = parseFloat(budgetTotal);
    const categoryCount = categories.filter(cat => cat.amount && parseFloat(cat.amount) > 0).length;
    
    // Save budget with your existing logic
    // ...
    
    // Track the budget setting event
    trackBudgetSet(total, categoryCount);
    
    // Continue with your form submission logic
    console.log('Budget set successfully');
    // Reset form or redirect
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Total Monthly Budget</label>
        <input
          type="number"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Budget Categories</h3>
        {categories.map(category => (
          <div key={category.id} className="flex items-center space-x-2">
            <span className="w-32">{category.name}</span>
            <input
              type="number"
              value={category.amount}
              onChange={(e) => handleCategoryChange(category.id, e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm"
              placeholder="Amount"
            />
          </div>
        ))}
      </div>
      
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Save Budget
      </button>
    </form>
  );
}