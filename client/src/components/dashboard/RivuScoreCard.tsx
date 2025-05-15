import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

type ScoreFactor = {
  name: string;
  percentage: number;
  rating: string;
  color: string;
};

// Define expected response type
type RivuScoreResponse = {
  score: number;
  factors: ScoreFactor[];
};

export default function RivuScoreCard() {
  const [offset, setOffset] = useState(339.292); // Full circle circumference (2 * PI * 54)
  
  // Fetch Rivu score data with proper type
  const { data, isLoading } = useQuery<RivuScoreResponse>({
    queryKey: ["/api/rivu-score"],
  });

  // Only use actual data, don't default to anything
  const score = data?.score;
  const scoreFactors = data?.factors;
  
  // Check if we have real data
  const hasNoRealData = !data || score === 0 || !scoreFactors || scoreFactors.length === 0;

  useEffect(() => {
    // Only animate if we have real data
    if (!hasNoRealData && score !== undefined) {
      const timer = setTimeout(() => {
        const newOffset = 339.292 - (score / 100) * 339.292;
        setOffset(newOffset);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [score, hasNoRealData]);

  // Determine score color
  const getScoreColor = () => {
    if (!score) return "#3A3A3A"; // gray/neutral for no data
    if (score >= 80) return "#00C2A8"; // green
    if (score >= 60) return "#D0F500"; // yellow
    return "#FF4D4F"; // red
  };

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">Your Rivu Score</h2>
        
        <div className="flex flex-col items-center">
          {/* SVG Score Circle */}
          <div className="relative w-48 h-48 mb-6">
            <svg width="100%" height="100%" viewBox="0 0 120 120">
              {/* Background Circle */}
              <circle cx="60" cy="60" r="54" fill="none" stroke="#3A3A3A" strokeWidth="12" />
              
              {/* Progress Circle */}
              <circle 
                className="progress-ring-circle" 
                cx="60" 
                cy="60" 
                r="54" 
                fill="none" 
                stroke={getScoreColor()} 
                strokeWidth="12" 
                strokeLinecap="round" 
                strokeDasharray="339.292" 
                strokeDashoffset={offset} 
              />
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-10 w-16 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </div>
              ) : (
                <>
                  <span className="text-4xl font-bold">{score}</span>
                  <span className="text-muted-foreground text-sm">out of 100</span>
                </>
              )}
            </div>
          </div>
          
          {/* Score Breakdown */}
          <div className="w-full space-y-3">
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <div className="flex items-center justify-between animate-pulse" key={index}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-muted mr-2"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </div>
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </div>
              ))
            ) : (
              scoreFactors.map((factor, index) => (
                <div className="flex items-center justify-between" key={index}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${factor.color} mr-2`}></div>
                    <span className="text-sm">{factor.name}</span>
                  </div>
                  <span className="text-sm font-medium">{factor.rating} ({factor.percentage}%)</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
