import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure for Railway deployment - disable WebSocket in production to avoid certificate issues
if (process.env.NODE_ENV === 'production') {
  // Use HTTP mode in production for Railway compatibility
  neonConfig.fetchConnectionCache = true;
  neonConfig.useSecureWebSocket = false; // Disable WebSocket in production
  neonConfig.pipelineConnect = false;
} else {
  // Use WebSocket in development
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Additional Railway-specific configuration
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle({ client: pool, schema });
