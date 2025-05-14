import React from "react";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  change: number;
  changeText: string;
  progressPercent?: number;
};

function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  change,
  changeText,
  progressPercent,
}: StatCardProps) {
  const isPositive = change >= 0;
  const changeTextColor = isPositive ? "text-[#00C2A8]" : "text-[#FF4D4F]";
  const changeIcon = isPositive ? "ri-arrow-up-line" : "ri-arrow-down-line";

  return (
    <Card className="bg-card p-6 rounded-xl card-hover">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-muted-foreground text-sm mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">
            {formatCurrency(value)}
          </h3>
        </div>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <i className={`${icon} ${iconColor}`}></i>
        </div>
      </div>
      <div className="flex items-center">
        <span className={`${changeTextColor} text-sm font-medium`}>
          {change > 0 ? "+" : ""}
          {change}%
        </span>
        <span className="text-muted-foreground text-sm ml-2">{changeText}</span>
      </div>
      {progressPercent !== undefined && (
        <div className="flex items-center mt-2">
          <div className="w-full bg-border/40 rounded-full h-1.5">
            <div
              className="bg-[#2F80ED] h-1.5 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-muted-foreground text-sm ml-2">
            {progressPercent}%
          </span>
        </div>
      )}
    </Card>
  );
}

export default function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Monthly Spending"
        value={2847.95}
        icon="ri-arrow-down-line"
        iconBg="bg-[#FF4D4F]/10"
        iconColor="text-[#FF4D4F]"
        change={14.5}
        changeText="vs last month"
      />
      
      <StatCard
        title="Monthly Savings"
        value={524.12}
        icon="ri-arrow-up-line"
        iconBg="bg-[#00C2A8]/10"
        iconColor="text-[#00C2A8]"
        change={3.2}
        changeText="vs last month"
      />
      
      <StatCard
        title="Monthly Income"
        value={4250.00}
        icon="ri-arrow-up-line"
        iconBg="bg-[#D0F500]/10"
        iconColor="text-[#D0F500]"
        change={0.0}
        changeText="vs last month"
      />
      
      <StatCard
        title="Active Goals"
        value={3}
        icon="ri-flag-line"
        iconBg="bg-[#2F80ED]/10"
        iconColor="text-[#2F80ED]"
        change={0}
        changeText="60%"
        progressPercent={60}
      />
    </div>
  );
}
