import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  title: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: "ri-dashboard-fill" },
  { title: "Budget", href: "/budget", icon: "ri-wallet-3-fill" },
  { title: "Transactions", href: "/transactions", icon: "ri-exchange-dollar-fill" },
  { title: "Goals", href: "/goals", icon: "ri-target-fill" },
  { title: "Insights", href: "/insights", icon: "ri-line-chart-line-fill" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Handle navigation manually instead of using Link
  const handleNavigation = (href: string) => {
    setLocation(href);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return "?";
    
    const firstInitial = user.firstName ? user.firstName.charAt(0) : "";
    const lastInitial = user.lastName ? user.lastName.charAt(0) : "";
    
    if (firstInitial || lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }
    
    // Fallback to first letter of username or email
    return user.username.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();
  };

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
                <div 
                  onClick={() => handleNavigation(item.href)}
                  className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-card/80 text-foreground"
                  }`}
                >
                  <i className={`${item.icon} mr-3 text-xl`}></i>
                  <span className="font-medium">{item.title}</span>
                </div>
              </li>
            );
          })}
        </ul>
        
        <Separator className="my-6" />
        
        <ul className="space-y-1">
          <li className="mb-4">
            <div 
              onClick={() => handleNavigation("/account")}
              className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                location === "/account" ? "bg-primary/10 text-primary" : "hover:bg-card/80 text-foreground"
              }`}
            >
              <i className="ri-user-settings-line mr-3 text-xl"></i>
              <span className="font-medium">Account</span>
            </div>
          </li>
          <li className="mb-4">
            <div 
              onClick={() => handleNavigation("/settings")}
              className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                location === "/settings" ? "bg-primary/10 text-primary" : "hover:bg-card/80 text-foreground"
              }`}
            >
              <i className="ri-settings-4-line mr-3 text-xl"></i>
              <span className="font-medium">Settings</span>
            </div>
          </li>
          <li className="mb-4">
            <div 
              onClick={() => handleNavigation("/admin")}
              className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                location === "/admin" ? "bg-primary/10 text-primary" : "hover:bg-card/80 text-foreground"
              }`}
            >
              <i className="ri-admin-line mr-3 text-xl"></i>
              <span className="font-medium">Admin</span>
            </div>
          </li>
        </ul>
      </nav>
      
      {user && (
        <div className="mt-auto pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium">{getInitials()}</span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-foreground">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              title="Logout"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
