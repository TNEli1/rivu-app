import { apiRequest } from "./queryClient";

export type FinanceAdvice = {
  message: string;
  timestamp: Date;
  isLoading?: boolean;
  isUser?: boolean;
};

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
    return {
      message: "You're doing great — keep it up! Continue tracking your expenses to improve your financial health.",
      timestamp: new Date(),
    };
  }
}
