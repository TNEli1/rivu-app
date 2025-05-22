import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

/**
 * Get color based on progress percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get appropriate icon and color for transaction category
 */
export function getCategoryIconAndColor(category: string): { icon: string, color: string } {
  // Default icon and color
  let icon = 'ri-shopping-bag-line';
  let color = 'bg-blue-500 text-white';

  // Map category to icon and color
  switch (category.toLowerCase()) {
    case 'food & dining':
    case 'food':
    case 'dining':
    case 'restaurants':
      icon = 'ri-restaurant-line';
      color = 'bg-orange-500 text-white';
      break;
    case 'shopping':
    case 'retail':
      icon = 'ri-shopping-bag-line';
      color = 'bg-pink-500 text-white';
      break;
    case 'housing':
    case 'rent':
    case 'mortgage':
      icon = 'ri-home-4-line';
      color = 'bg-indigo-500 text-white';
      break;
    case 'transportation':
    case 'gas':
    case 'car':
    case 'auto':
      icon = 'ri-car-line';
      color = 'bg-cyan-500 text-white';
      break;
    case 'utilities':
    case 'bills':
      icon = 'ri-flashlight-line';
      color = 'bg-yellow-500 text-white';
      break;
    case 'health':
    case 'healthcare':
    case 'medical':
      icon = 'ri-heart-pulse-line';
      color = 'bg-red-500 text-white';
      break;
    case 'entertainment':
    case 'recreation':
      icon = 'ri-film-line';
      color = 'bg-purple-500 text-white';
      break;
    case 'personal':
    case 'personal care':
      icon = 'ri-user-line';
      color = 'bg-teal-500 text-white';
      break;
    case 'travel':
    case 'vacation':
      icon = 'ri-plane-line';
      color = 'bg-blue-500 text-white';
      break;
    case 'education':
    case 'school':
      icon = 'ri-book-open-line';
      color = 'bg-green-500 text-white';
      break;
    case 'income':
    case 'salary':
    case 'wages':
      icon = 'ri-money-dollar-circle-line';
      color = 'bg-emerald-500 text-white';
      break;
    default:
      // Default already set
      break;
  }

  return { icon, color };
}