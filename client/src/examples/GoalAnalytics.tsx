// Example code showing how to use PostHog analytics for goal creation
import React, { useState } from 'react';
import { useAnalytics } from '@/lib/AnalyticsContext';

export function GoalCreationForm() {
  const { trackGoalCreated } = useAnalytics();
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalCategory, setGoalCategory] = useState('travel');
  const [hasTargetDate, setHasTargetDate] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create goal with your existing logic
    // ...
    
    // Track the goal creation event
    trackGoalCreated(
      goalCategory, 
      parseFloat(goalAmount), 
      hasTargetDate
    );
    
    // Continue with your form submission logic
    console.log('Goal created successfully');
    // Reset form or redirect
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Goal Name</label>
        <input
          type="text"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium">Amount</label>
        <input
          type="number"
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium">Category</label>
        <select
          value={goalCategory}
          onChange={(e) => setGoalCategory(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="travel">Travel</option>
          <option value="home">Home</option>
          <option value="education">Education</option>
          <option value="retirement">Retirement</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={hasTargetDate}
            onChange={(e) => setHasTargetDate(e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="ml-2">Set Target Date</span>
        </label>
      </div>
      
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Create Goal
      </button>
    </form>
  );
}