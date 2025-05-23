/**
 * Development proxy for connecting Express API to Vite dev server
 * Only used in development mode
 */
import { Express, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

/**
 * Configure development proxy to connect Express to Vite dev server
 * This ensures we can run the Express API alongside Vite for frontend development
 */
export function configureDevelopmentProxy(app: Express): void {
  if (process.env.NODE_ENV !== 'production') {
    // In development, forward non-API requests to Vite dev server
    const VITE_PORT = process.env.VITE_PORT || 5173;
    const VITE_DEV_SERVER = process.env.VITE_DEV_SERVER || `http://localhost:${VITE_PORT}`;
    
    console.log(`Setting up development proxy to Vite server at ${VITE_DEV_SERVER}`);
    
    // Setup proxy middleware for development only
    const proxyOptions: Options = {
      target: VITE_DEV_SERVER,
      changeOrigin: true,
      // Log proxy activity
      logLevel: 'silent',
      // @ts-ignore - filter is a valid property in http-proxy-middleware
      filter: (pathStr: string) => !pathStr.startsWith('/api'),
      onProxyReq: (proxyReq: any, req: Request) => {
        console.log(`[DEV PROXY] ${req.method} ${req.url} → Vite`);
      },
      onError: (err: Error, req: Request, res: Response) => {
        console.error(`[DEV PROXY ERROR] ${req.method} ${req.url}:`, err.message);
        res.status(500).send(`
          <h1>Development Proxy Error</h1>
          <p>The Vite development server is not running. Please start it with:</p>
          <pre>cd client && npm run dev</pre>
          <p>Error: ${err.message}</p>
        `);
      }
    };
    
    app.use(createProxyMiddleware(proxyOptions));
    
    // Add a fallback for when Vite server is not running
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.url.startsWith('/api')) {
        return axios.get(VITE_DEV_SERVER)
          .then(() => next())
          .catch(() => {
            res.status(503).send(`
              <h1>Development Server Not Running</h1>
              <p>Please start the Vite development server:</p>
              <pre>cd client && npm run dev</pre>
            `);
          });
      }
      next();
    });
  }
}