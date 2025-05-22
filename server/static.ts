/**
 * Static file server configuration for production environment
 * Used when deploying to Render as a unified application
 */
import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Configure Express to serve static files and handle SPA routing
 * @param app Express application instance
 */
export function configureStaticFileServing(app: Express): void {
  // Path to the client build directory for production
  const clientBuildPath = path.join(process.cwd(), 'dist/public');
  
  console.log(`Configuring static file serving from: ${clientBuildPath}`);
  
  // Serve static assets with caching headers
  app.use(express.static(clientBuildPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true
  }));
  
  // Handle SPA routing - serve index.html for any non-API routes
  app.get('*', (req: Request, res: Response) => {
    // Skip API routes - they're handled by the API controllers
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        message: 'API endpoint not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Send the React app's index.html for client-side routing
    const indexPath = path.join(clientBuildPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      console.error(`[ERROR] Frontend build not found at: ${indexPath}`);
      return res.status(404).send('Application not found. Please check if the frontend has been built.');
    }
  });
}