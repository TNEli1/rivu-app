import { apiRequest } from "./queryClient";

export type FinanceAdvice = {
  message: string;
  timestamp: Date;
  isLoading?: boolean;
  isUser?: boolean;
};

// Simplify text to make it more accessible
export async function simplifyText(text: string): Promise<string> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/simplify",
      { 
        text,
        instructions: "Rewrite this to a 6th-grade reading level using plain language and simple, actionable advice. Keep tone friendly, casual, and non-judgmental."
      }
    );
    
    const data = await response.json();
    return data.simplifiedText || text; // Fallback to original text if simplification fails
  } catch (error) {
    console.error("Error simplifying text:", error);
    return text; // Return original text if simplification fails
  }
}

// Request AI-powered finance advice from the server
export async function getFinanceAdvice(
  prompt?: string
): Promise<FinanceAdvice> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/advice",
      { prompt }
    );
    
    const data = await response.json();
    return {
      message: data.message,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error fetching AI advice:", error);
    throw new Error(
      "Unable to fetch personalized advice. Please try again later or contact support if the problem persists."
    );
  }
}
