import React from "react";
import { useLocation } from "wouter";

type NavItem = {
  title: string;
  href: string;
  icon: string;
};

const mobileNavItems: NavItem[] = [
  { title: "Home", href: "/", icon: "ri-dashboard-fill" },
  { title: "Budget", href: "/budget", icon: "ri-wallet-3-line" },
  { title: "Transactions", href: "/transactions", icon: "ri-exchange-dollar-line" },
  { title: "Profile", href: "/profile", icon: "ri-user-line" },
];

export default function MobileNav() {
  const [location, setLocation] = useLocation();

  // Handle navigation manually to avoid nesting issues with Link
  const handleNavigation = (href: string) => {
    setLocation(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-10">
      {mobileNavItems.map((item) => {
        const isActive = location === item.href;
        // Determine icon based on active state
        const iconClass = isActive && item.icon.includes('-line') 
          ? item.icon.replace('-line', '-fill') 
          : item.icon;
          
        return (
          <div 
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <i className={`${iconClass} text-xl`}></i>
            <span className="text-xs mt-1">{item.title}</span>
          </div>
        );
      })}
    </nav>
  );
}
