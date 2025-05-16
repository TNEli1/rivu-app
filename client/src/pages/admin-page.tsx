import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import DemoAccountsGenerator from '@/components/admin/DemoAccountsGenerator';

export default function AdminPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Tools</h1>
              <p className="text-muted-foreground">Manage and configure the Rivu platform</p>
            </div>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Demo Accounts</h2>
                <DemoAccountsGenerator />
              </section>
            </div>
          </div>
        </main>
        
        <MobileNav />
      </div>
    </div>
  );
}