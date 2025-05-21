import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type QuickAction = {
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
  path?: string;
};

export default function QuickActionsCard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
  const [isGenerateReportOpen, setIsGenerateReportOpen] = useState(false);
  
  const quickActions: QuickAction[] = [
    {
      title: "Add Transaction",
      icon: "ri-add-line",
      iconBg: "bg-[#00C2A8]/10",
      iconColor: "text-[#00C2A8]",
      onClick: () => setLocation("/transactions?action=add"),
      path: "/transactions"
    },
    {
      title: "Add Budget",
      icon: "ri-pie-chart-line",
      iconBg: "bg-[#D0F500]/10",
      iconColor: "text-[#D0F500]",
      onClick: () => setLocation("/budget?action=add"),
      path: "/budget"
    },
    {
      title: "Insights",
      icon: "ri-line-chart-line",
      iconBg: "bg-[#2F80ED]/10",
      iconColor: "text-[#2F80ED]",
      onClick: () => setLocation("/insights"),
      path: "/insights"
    },
    {
      title: "Settings",
      icon: "ri-settings-line",
      iconBg: "bg-[#FF4D4F]/10",
      iconColor: "text-[#FF4D4F]",
      onClick: () => setLocation("/settings"),
      path: "/settings"
    },
  ];

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline" 
              className="bg-background hover:bg-background/70 p-4 rounded-lg flex flex-col items-center justify-center transition-colors h-auto"
              onClick={action.onClick}
            >
              <div className={`w-10 h-10 rounded-full ${action.iconBg} flex items-center justify-center mb-2`}>
                <i className={`${action.icon} ${action.iconColor}`}></i>
              </div>
              <span className="text-xs text-foreground">{action.title}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
