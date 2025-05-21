import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceAdvice, getFinanceAdvice } from "@/lib/openai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AICoachingCard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FinanceAdvice[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadCompleted = useRef(false);

  // Suggested prompts that users can quickly click
  const suggestedPrompts = [
    "What are my top spending categories?",
    "How can I save more money?",
    "Which bill should I pay off first?",
    "How much should I budget for groceries?",
    "Give me 3 quick ways to cut expenses"
  ];

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
    mutationFn: async (question: string) => {
      // Show typing indicator for at least 1 second to give a more human-like experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getFinanceAdvice(question);
    },
    onSuccess: (newAdvice) => {
      // Remove the loading message and add the real response
      setMessages(prev => {
        // Filter out loading messages
        const withoutLoading = prev.filter(message => !message.isLoading);
        // Add the new advice
        return [...withoutLoading, newAdvice];
      });
      setInputValue("");
    },
    onError: (error) => {
      // Remove loading message and add an error message
      setMessages(prev => {
        // Filter out loading messages
        const withoutLoading = prev.filter(message => !message.isLoading);
        // Add error message
        return [...withoutLoading, {
          message: "Sorry, I couldn't get an answer right now. Please try again.",
          timestamp: new Date(),
          isUser: false
        }];
      });
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
      
      // Show loading message
      const loadingMessage: FinanceAdvice = {
        message: "...",
        timestamp: new Date(),
        isLoading: true
      };
      
      setMessages(prev => [...prev, loadingMessage]);
      
      // Send question to get AI response
      sendQuestion.mutate(question);
    }
  };
  
  // Handle key presses - Enter to submit, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion(e as unknown as React.FormEvent);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    // Set the input value to the suggested prompt
    setInputValue(prompt);
  };

  return (
    <Card className="bg-card rounded-xl shadow-md overflow-hidden border border-border/50 hover:border-border/80 transition-all duration-300">
      <CardContent className="p-6 bg-gradient-to-br from-background to-background/70">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mr-2">
              <i className="ri-robot-line text-primary text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-foreground">AI Financial Coach</h2>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all"
                  onClick={() => refreshAdvice.mutate()}
                  disabled={refreshAdvice.isPending}
                >
                  <i className={`ri-refresh-line text-primary ${refreshAdvice.isPending ? 'animate-spin' : ''}`}></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh advice</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto mb-4 px-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {messages.map((message, index) => (
            <div className={`flex mb-4 ${message.isUser ? 'justify-end' : ''}`} key={index}>
              {!message.isUser && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <i className="ri-robot-line text-primary"></i>
                </div>
              )}
              <div 
                className={`p-4 max-w-[80%] shadow-sm ${message.isUser 
                  ? 'bg-primary text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl ml-auto transition-transform hover:translate-x-[-2px]' 
                  : 'ml-4 bg-background/90 backdrop-blur-sm rounded-tr-xl rounded-br-xl rounded-bl-xl transition-transform hover:translate-x-[2px]'}`}
              >
                <p className={`text-sm ${message.isLoading ? 'animate-pulse-slow' : ''}`}>
                  {message.message}
                </p>
                <div className="text-xs mt-2 opacity-70 text-right">
                  {message.timestamp?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {message.isUser && (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2 shadow-md">
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
              <div className="ml-4 p-4 bg-background/90 backdrop-blur-sm rounded-tr-xl rounded-br-xl rounded-bl-xl animate-pulse-slow shadow-sm">
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
        
        {/* Suggested Prompts with improved display */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <Badge 
                key={index}
                variant="outline"
                title={prompt} /* Add title attribute to show full text on hover */
                className="cursor-pointer px-3 py-1.5 bg-background/80 hover:bg-primary/10 transition-colors text-xs border-primary/20 max-w-full whitespace-normal"
                onClick={() => {
                  handleSuggestedPrompt(prompt);
                  // Auto-submit after a short delay to give user time to see what was selected
                  setTimeout(() => {
                    const event = new Event('submit', { bubbles: true });
                    document.querySelector('form')?.dispatchEvent(event);
                  }, 300);
                }}
              >
                <span className="mr-1">💬</span> {prompt}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Ask AI Input */}
        <form onSubmit={handleSendQuestion} className="mt-4 relative">
          <Input
            type="text"
            placeholder="Ask your AI coach a question... (Enter to send)"
            className="w-full bg-background/80 border border-border/50 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:border-primary shadow-sm transition-all focus:ring-1 focus:ring-primary/20"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sendQuestion.isPending}
            onKeyDown={handleKeyDown}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost" 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary hover:bg-primary/10 rounded-full"
            disabled={!inputValue.trim() || sendQuestion.isPending}
          >
            <i className="ri-send-plane-fill"></i>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
