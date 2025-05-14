import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceAdvice, getFinanceAdvice } from "@/lib/openai";
import { useMutation } from "@tanstack/react-query";

export default function AICoachingCard() {
  const [messages, setMessages] = useState<FinanceAdvice[]>([
    {
      message: "Based on your recent spending patterns, I noticed you've spent more than usual on entertainment this month. Consider setting a stricter budget for this category next month to help improve your savings rate.",
      timestamp: new Date(),
    },
    {
      message: "Your monthly food expenses are well-managed. I recommend maintaining your current budget for this category and potentially reallocating any savings to your emergency fund.",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get new advice
  const refreshAdvice = useMutation({
    mutationFn: () => getFinanceAdvice(),
    onSuccess: (newAdvice) => {
      setMessages([...messages, newAdvice]);
    }
  });

  // Send user question
  const sendQuestion = useMutation({
    mutationFn: (question: string) => getFinanceAdvice(question),
    onSuccess: (newAdvice) => {
      setMessages([...messages, newAdvice]);
      setInputValue("");
    }
  });

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendQuestion.mutate(inputValue);
    }
  };

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">AI Financial Coach</h2>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center"
            onClick={() => refreshAdvice.mutate()}
            disabled={refreshAdvice.isPending}
          >
            <i className={`ri-refresh-line text-muted-foreground ${refreshAdvice.isPending ? 'animate-spin' : ''}`}></i>
          </Button>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto mb-4">
          {messages.map((message, index) => (
            <div className="flex mb-4" key={index}>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-line text-primary"></i>
              </div>
              <div className="ml-4 p-4 bg-background rounded-tr-xl rounded-br-xl rounded-bl-xl">
                <p className={`text-sm text-foreground ${message.isLoading ? 'animate-pulse-slow' : ''}`}>
                  {message.message}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {(sendQuestion.isPending || refreshAdvice.isPending) && (
            <div className="flex mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-line text-primary"></i>
              </div>
              <div className="ml-4 p-4 bg-background rounded-tr-xl rounded-br-xl rounded-bl-xl">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                  <div className="h-2 w-2 rounded-full bg-muted"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Ask AI Input */}
        <form onSubmit={handleSendQuestion} className="mt-6 relative">
          <Input
            type="text"
            placeholder="Ask your AI coach a question..."
            className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sendQuestion.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost" 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary"
            disabled={!inputValue.trim() || sendQuestion.isPending}
          >
            <i className="ri-send-plane-fill"></i>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
