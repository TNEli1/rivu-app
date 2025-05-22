# Rivu Frontend Application

This is the frontend client for the Rivu personal finance platform.

## Technology Stack
- React with TypeScript
- Vite for building and development
- TanStack Query for data fetching
- Tailwind CSS for styling
- Shadcn UI components
- Wouter for routing

## Environment Setup
Create a `.env` file in the client directory with the following variables:
```
VITE_API_URL=https://api.tryrivu.com
```

For local development, you can use:
```
VITE_API_URL=http://localhost:8080
```

## Development
```bash
npm install
npm run dev
```

## Building for Production
```bash
npm run build
```

## Deployment to Vercel
1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in the Vercel dashboard
4. Deploy!

## Project Structure
- `src/` - Main source code
  - `components/` - Reusable UI components
  - `lib/` - Utilities and configuration
  - `pages/` - Application pages
  - `hooks/` - Custom React hooks
  - `layouts/` - Page layouts and templates
  - `App.tsx` - Application entry point
  - `main.tsx` - React root

## API Integration
The application is configured to use the backend API through environment variables. The `getApiBaseUrl()` function in `src/lib/queryClient.ts` handles this configuration:

```typescript
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'tryrivu.com' || window.location.hostname.endsWith('.vercel.app')
      ? 'https://api.tryrivu.com' // Production API URL
      : ''); // Use relative URLs for development (same domain)
};
```

This ensures that API requests are sent to the correct endpoint in both development and production environments.