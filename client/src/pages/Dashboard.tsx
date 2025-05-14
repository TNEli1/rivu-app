import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import StatCards from "@/components/dashboard/StatCards";
import BudgetSection from "@/components/dashboard/BudgetSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import RivuScoreCard from "@/components/dashboard/RivuScoreCard";
import AICoachingCard from "@/components/dashboard/AICoachingCard";
import QuickActionsCard from "@/components/dashboard/QuickActionsCard";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center">
            <i className="ri-line-chart-fill text-primary text-2xl mr-2"></i>
            <h1 className="text-xl font-bold text-foreground">Rivu</h1>
          </div>
          <Button variant="outline" size="icon" className="p-2 rounded-lg bg-card">
            <i className="ri-menu-line text-xl"></i>
          </Button>
        </header>

        {/* Welcome Section */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome back, Jamie</h1>
              <p className="text-muted-foreground mt-1">Here's your financial snapshot for July</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium flex items-center">
                <i className="ri-add-line mr-1.5"></i> Add Transaction
              </Button>
            </div>
          </div>
        </section>

        {/* Top Stats Cards */}
        <StatCards />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Budget and Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <BudgetSection />
            <TransactionsSection />
          </div>

          {/* Right Column - Rivu Score and AI Coaching */}
          <div className="lg:col-span-1 space-y-6">
            <RivuScoreCard />
            <AICoachingCard />
            <QuickActionsCard />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
