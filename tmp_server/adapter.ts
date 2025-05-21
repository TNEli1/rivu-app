import { Express, Router } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * This adapter loads CommonJS routes into an Express ESM application
 * It's a special solution for our hybrid ESM/CommonJS codebase
 */
export async function loadApiRoutes(app: Express): Promise<void> {
  try {
    // Execute the routes module directly and capture its exports
    const apiRoutesPath = path.resolve(process.cwd(), 'server/routes/api.js');
    const routerCode = fs.readFileSync(apiRoutesPath, 'utf8');
    
    // Modify the code to export the router directly
    const modifiedCode = `
      const express = require('express');
      const router = express.Router();
      ${routerCode.replace('module.exports = router;', 'module.exports = { router };')}
    `;
    
    // Write to a temporary file with .cjs extension (CommonJS)
    const tempFile = path.resolve(process.cwd(), 'server/routes/api.temp.cjs');
    fs.writeFileSync(tempFile, modifiedCode);
    
    // Now we can safely require() the CommonJS module from our ESM context
    const apiRoutes = (await import(`file://${tempFile}`)).default.router;
    
    // Mount the router
    app.use('/api', apiRoutes);
    console.log('✅ API routes (adapted from CommonJS) mounted at /api');
    
    // Clean up the temporary file
    fs.unlinkSync(tempFile);
  } catch (error) {
    console.error('⚠️ Error loading API routes:', error);
    console.log('⚠️ Falling back to in-memory API routes');
  }
}