import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function calculatePercentage(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return (spent / budget) * 100;
}

export function getStatusColor(percentage: number): string {
  if (percentage > 100) return 'text-red';
  if (percentage > 80) return 'text-lime';
  return 'text-text-secondary';
}

export function getProgressColor(percentage: number): string {
  if (percentage > 100) return 'bg-[#FF4D4F]';
  if (percentage > 80) return 'bg-[#D0F500]';
  return 'bg-[#00C2A8]';
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

// Category Icons mapping
export const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'ri-restaurant-line', color: 'bg-[#D0F500]/10 text-[#D0F500]' },
  'Rent/Mortgage': { icon: 'ri-home-4-line', color: 'bg-[#2F80ED]/10 text-[#2F80ED]' },
  'Transportation': { icon: 'ri-car-line', color: 'bg-[#00C2A8]/10 text-[#00C2A8]' },
  'Entertainment': { icon: 'ri-film-line', color: 'bg-[#FF4D4F]/10 text-[#FF4D4F]' },
  'Shopping': { icon: 'ri-shopping-bag-line', color: 'bg-[#D0F500]/10 text-[#D0F500]' },
  'Income': { icon: 'ri-bank-line', color: 'bg-[#2F80ED]/10 text-[#2F80ED]' },
  'Coffee': { icon: 'ri-coffee-line', color: 'bg-[#D0F500]/10 text-[#D0F500]' },
  'Uber': { icon: 'ri-taxi-line', color: 'bg-[#00C2A8]/10 text-[#00C2A8]' },
};

export const DEFAULT_ICON = { icon: 'ri-money-dollar-circle-line', color: 'bg-[#00C2A8]/10 text-[#00C2A8]' };

// Get icon and color based on category or merchant name
export function getCategoryIconAndColor(category: string): { icon: string; color: string } {
  return CATEGORY_ICONS[category] || DEFAULT_ICON;
}
