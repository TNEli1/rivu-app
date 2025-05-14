import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceAdvice, getFinanceAdvice } from "@/lib/openai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function AICoachingCard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FinanceAdvice[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadCompleted = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-fetch advice when component loads
  const { isLoading: isInitialAdviceLoading } = useQuery({
    queryKey: ['/api/advice', 'initial'],
    queryFn: async () => {
      if (!user || initialLoadCompleted.current) return null;
      
      try {
        const advice = await getFinanceAdvice();
        setMessages(prev => [...prev, advice]);
        initialLoadCompleted.current = true;
        return advice;
      } catch (error) {
        console.error("Failed to get initial advice:", error);
        return null;
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!user
  });

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
