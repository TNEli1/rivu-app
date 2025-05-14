import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type QuickAction = {
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
};

export default function QuickActionsCard() {
  const quickActions: QuickAction[] = [
    {
      title: "Add Account",
      icon: "ri-add-line",
      iconBg: "bg-[#00C2A8]/10",
      iconColor: "text-[#00C2A8]",
      onClick: () => console.log("Add Account clicked"),
    },
    {
      title: "Set Goal",
      icon: "ri-line-chart-line",
      iconBg: "bg-[#D0F500]/10",
      iconColor: "text-[#D0F500]",
      onClick: () => console.log("Set Goal clicked"),
    },
    {
      title: "Generate Report",
      icon: "ri-file-text-line",
      iconBg: "bg-[#2F80ED]/10",
      iconColor: "text-[#2F80ED]",
      onClick: () => console.log("Generate Report clicked"),
    },
    {
      title: "Get Help",
      icon: "ri-question-line",
      iconBg: "bg-[#FF4D4F]/10",
      iconColor: "text-[#FF4D4F]",
      onClick: () => console.log("Get Help clicked"),
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
