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

  // State to track advice errors
  const [hasError, setHasError] = useState(false);
  
  // Auto-fetch advice when component loads
  const { isLoading: isInitialAdviceLoading, error: initialAdviceError } = useQuery({
    queryKey: ['/api/advice', 'initial'],
    queryFn: async () => {
      if (!user || initialLoadCompleted.current) return null;
      
      try {
        const advice = await getFinanceAdvice();
        setMessages(prev => [...prev, advice]);
        initialLoadCompleted.current = true;
        setHasError(false);
        return advice;
      } catch (error) {
        console.error("Failed to get initial advice:", error);
        setHasError(true);
        throw error; // Let React Query handle the error
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: !!user,
    retry: 1  // Only retry once to avoid multiple error messages
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
      // Add user message immediately
      const userMessage: FinanceAdvice = {
        message: inputValue,
        timestamp: new Date(),
        isUser: true
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Store the question before clearing
      const question = inputValue;
      
      // Clear input right away for better UX
      setInputValue("");
      
      // Send question to get AI response
      sendQuestion.mutate(question);
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
        
        <div className="max-h-[300px] overflow-y-auto mb-4 px-1">
          {messages.map((message, index) => (
            <div className={`flex mb-4 ${message.isUser ? 'justify-end' : ''}`} key={index}>
              {!message.isUser && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <i className="ri-robot-line text-primary"></i>
                </div>
              )}
              <div 
                className={`p-4 max-w-[80%] ${message.isUser 
                  ? 'bg-primary text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl ml-auto' 
                  : 'ml-4 bg-background rounded-tr-xl rounded-br-xl rounded-bl-xl'}`}
              >
                <p className={`text-sm ${message.isLoading ? 'animate-pulse-slow' : ''}`}>
                  {message.message}
                </p>
                <div className="text-xs mt-2 opacity-70 text-right">
                  {message.timestamp?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {message.isUser && (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
                  <i className="ri-user-line text-white"></i>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {(sendQuestion.isPending || refreshAdvice.isPending) && (
            <div className="flex mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-line text-primary"></i>
              </div>
              <div className="ml-4 p-4 bg-background rounded-tr-xl rounded-br-xl rounded-bl-xl animate-pulse-slow">
                <div className="flex space-x-2 items-center">
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-xs ml-2 text-muted-foreground">Coach is typing...</span>
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
