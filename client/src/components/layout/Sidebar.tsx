import React from "react";
import { Link, useLocation } from "wouter";

type NavItem = {
  title: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: "ri-dashboard-fill" },
  { title: "Budget", href: "/budget", icon: "ri-wallet-3-fill" },
  { title: "Transactions", href: "/transactions", icon: "ri-exchange-dollar-fill" },
  { title: "Insights", href: "/insights", icon: "ri-line-chart-line-fill" },
  { title: "Settings", href: "/settings", icon: "ri-settings-4-line" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 fixed h-full">
      <div className="flex items-center mb-10">
        <i className="ri-line-chart-fill text-primary text-3xl mr-2"></i>
        <h1 className="text-2xl font-bold text-foreground">Rivu</h1>
      </div>
      
      <nav className="flex-grow">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <li className="mb-4" key={item.href}>
                <Link href={item.href}>
                  <div className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-card/80 text-foreground"
                  }`}>
                    <i className={`${item.icon} mr-3 text-xl`}></i>
                    <span className="font-medium">{item.title}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto pt-6 border-t border-border">
        <div className="flex items-center px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-medium">JS</span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-foreground">Jamie Smith</div>
            <div className="text-xs text-muted-foreground">jamie@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
