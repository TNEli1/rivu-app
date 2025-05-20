import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

type NavItem = {
  title: string;
  href: string;
  icon: string;
};

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  // Create nav items based on authentication status
  const mobileNavItems: NavItem[] = [
    { title: "Dashboard", href: "/", icon: "ri-dashboard-line" },
    { title: "Budget", href: "/budget", icon: "ri-wallet-3-line" },
    { title: "Transactions", href: "/transactions", icon: "ri-exchange-dollar-line" },
    { title: "Goals", href: "/goals", icon: "ri-target-line" },
    { title: "RivU", href: "/rivu", icon: "ri-book-open-line" },
    { title: "Account", href: "/account", icon: "ri-user-settings-line" },
  ];

  // Handle navigation manually to avoid nesting issues with Link
  const handleNavigation = (href: string) => {
    setLocation(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-2 z-50 w-full">
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
            className={`flex flex-col items-center py-2 px-1 cursor-pointer w-full max-w-[80px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {/* Show initials in the account icon if user is logged in */}
            {item.href === "/account" && user ? (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                {(user.firstName?.charAt(0) || user.username.charAt(0) || "?").toUpperCase()}
              </div>
            ) : (
              <i className={`${iconClass} text-xl`}></i>
            )}
            <span className="text-xs mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.title}</span>
          </div>
        );
      })}
    </nav>
  );
}
